import { Storage } from './storage.js';
import { scrapeUrl } from './scraper.js';
import { compareSnapshots } from './differ.js';
import { sendChangeAlertEmail } from './mailer.js';
import { summarizeChangesWithGemini } from './gemini.js';
import type { CheckRunResult, Snapshot, ChangeRecord, MonitoredUrl } from '../src/types.js';

export async function checkSingleUrl(urlId: string): Promise<CheckRunResult> {
  const monitor = Storage.getMonitor(urlId);
  if (!monitor) {
    throw new Error(`URL monitoreada con ID "${urlId}" no encontrada`);
  }

  try {
    const scrape = await scrapeUrl(monitor.url, monitor.selector);
    const prevSnapshot = Storage.getLatestSnapshot(monitor.id);

    const newSnapshot: Snapshot = {
      id: 'snap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      urlId: monitor.id,
      url: monitor.url,
      timestamp: new Date().toISOString(),
      title: scrape.title,
      contentHash: scrape.contentHash,
      textContent: scrape.textContent,
      documents: scrape.documents,
      httpStatus: scrape.httpStatus,
      byteSize: scrape.byteSize,
    };

    // First run baseline
    if (!prevSnapshot) {
      Storage.saveSnapshot(newSnapshot);
      monitor.lastCheckedAt = new Date().toISOString();
      monitor.lastStatus = 'ok';
      monitor.lastErrorMessage = undefined;
      monitor.lastSnapshotId = newSnapshot.id;
      monitor.stats.totalChecks = (monitor.stats.totalChecks || 0) + 1;
      Storage.saveMonitor(monitor);

      return {
        urlId: monitor.id,
        url: monitor.url,
        hasChanged: false,
        isFirstRun: true,
      };
    }

    // Compare with previous
    const comparison = compareSnapshots(prevSnapshot, newSnapshot);
    const settings = Storage.getSettings();

    if (comparison.hasChanged) {
      // Build sample strings for AI summary
      const addedSample = comparison.diffChunks
        .filter((c) => c.type === 'added')
        .map((c) => c.value)
        .join('\n');
      const removedSample = comparison.diffChunks
        .filter((c) => c.type === 'removed')
        .map((c) => c.value)
        .join('\n');

      let aiSummary: string | undefined = undefined;
      if (settings.useGeminiSummary) {
        aiSummary = await summarizeChangesWithGemini({
          url: monitor.url,
          title: scrape.title,
          addedLinesSample: addedSample,
          removedLinesSample: removedSample,
          addedDocs: comparison.addedDocuments,
          removedDocs: comparison.removedDocuments,
        });
      }

      const changeRecord: ChangeRecord = {
        id: 'change-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        urlId: monitor.id,
        url: monitor.url,
        timestamp: new Date().toISOString(),
        previousSnapshotId: prevSnapshot.id,
        currentSnapshotId: newSnapshot.id,
        textDiffSummary: comparison.textDiffSummary,
        diffChunks: comparison.diffChunks,
        addedDocuments: comparison.addedDocuments,
        removedDocuments: comparison.removedDocuments,
        aiSummary,
        emailSent: false,
        emailRecipient: settings.alertEmail,
      };

      // Always save new snapshot on change
      Storage.saveSnapshot(newSnapshot);

      // Send email alert only on change
      const emailResult = await sendChangeAlertEmail(monitor, changeRecord);
      changeRecord.emailSent = emailResult.success;
      if (emailResult.error) {
        changeRecord.emailError = emailResult.error;
      }

      Storage.saveChange(changeRecord);

      monitor.lastCheckedAt = new Date().toISOString();
      monitor.lastStatus = 'changed';
      monitor.lastErrorMessage = undefined;
      monitor.lastSnapshotId = newSnapshot.id;
      monitor.stats.totalChecks = (monitor.stats.totalChecks || 0) + 1;
      monitor.stats.totalChanges = (monitor.stats.totalChanges || 0) + 1;
      Storage.saveMonitor(monitor);

      return {
        urlId: monitor.id,
        url: monitor.url,
        hasChanged: true,
        isFirstRun: false,
        changeRecord,
        emailSent: emailResult.success,
      };
    } else {
      // No changes detected: update last checked timestamp, do NOT send email
      monitor.lastCheckedAt = new Date().toISOString();
      monitor.lastStatus = 'ok';
      monitor.lastErrorMessage = undefined;
      monitor.stats.totalChecks = (monitor.stats.totalChecks || 0) + 1;
      Storage.saveMonitor(monitor);

      return {
        urlId: monitor.id,
        url: monitor.url,
        hasChanged: false,
        isFirstRun: false,
      };
    }
  } catch (err: any) {
    console.error(`Error checking URL ${monitor.url}:`, err);
    monitor.lastCheckedAt = new Date().toISOString();
    monitor.lastStatus = 'error';
    monitor.lastErrorMessage = err.message || 'Error desconocido al comprobar la web';
    monitor.stats.totalChecks = (monitor.stats.totalChecks || 0) + 1;
    Storage.saveMonitor(monitor);

    return {
      urlId: monitor.id,
      url: monitor.url,
      hasChanged: false,
      isFirstRun: false,
      error: err.message || 'Error al conectar con la página',
    };
  }
}

export async function checkAllMonitors(): Promise<CheckRunResult[]> {
  const monitors = Storage.getMonitors().filter((m) => m.enabled);
  console.log(`[Monitor] Iniciando comprobación de ${monitors.length} URLs activas...`);
  const results: CheckRunResult[] = [];

  // Sequential or light concurrency to be respectful of target servers
  for (const monitor of monitors) {
    try {
      const res = await checkSingleUrl(monitor.id);
      results.push(res);
      // Small pause between scrapes
      await new Promise((r) => setTimeout(r, 800));
    } catch (err: any) {
      results.push({
        urlId: monitor.id,
        url: monitor.url,
        hasChanged: false,
        isFirstRun: false,
        error: err.message,
      });
    }
  }

  const changedCount = results.filter((r) => r.hasChanged).length;
  console.log(`[Monitor] Comprobación terminada. ${changedCount} cambios detectados de ${results.length} URLs analizadas.`);
  return results;
}
