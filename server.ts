import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Storage } from './server/storage.js';
import { checkSingleUrl, checkAllMonitors } from './server/checker.js';
import { scrapeUrl } from './server/scraper.js';
import { sendTestEmail } from './server/mailer.js';
import { initScheduler } from './server/scheduler.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get all monitors
  app.get('/api/monitors', (req, res) => {
    const monitors = Storage.getMonitors();
    res.json(monitors);
  });

  // Create single monitor or batch
  app.post('/api/monitors', async (req, res) => {
    try {
      const { url, urls, label, selector, checkFrequency } = req.body;

      // Handle batch import (e.g. 6-20 URLs pasted)
      if (Array.isArray(urls) && urls.length > 0) {
        const createdList = [];
        for (const rawUrl of urls) {
          const cleanUrl = (rawUrl || '').trim();
          if (!cleanUrl) continue;
          try {
            const parsed = new URL(cleanUrl);
            const id = 'url-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
            const monitor = Storage.saveMonitor({
              id,
              url: parsed.href,
              label: parsed.hostname,
              enabled: true,
              checkFrequency: 'daily',
              createdAt: new Date().toISOString(),
              stats: { totalChecks: 0, totalChanges: 0 },
            });
            createdList.push(monitor);
          } catch {
            // invalid URL, skip
          }
        }
        return res.status(201).json({ created: createdList, count: createdList.length });
      }

      // Single monitor creation
      if (!url) {
        return res.status(400).json({ error: 'La URL es obligatoria' });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
      } catch {
        return res.status(400).json({ error: 'Formato de URL no válido (ej: https://ejemplo.com)' });
      }

      const id = 'url-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newMonitor = Storage.saveMonitor({
        id,
        url: parsedUrl.href,
        label: label?.trim() || parsedUrl.hostname,
        enabled: true,
        selector: selector?.trim() || undefined,
        checkFrequency: checkFrequency || 'daily',
        createdAt: new Date().toISOString(),
        stats: { totalChecks: 0, totalChanges: 0 },
      });

      // Optionally perform initial baseline check in the background
      checkSingleUrl(newMonitor.id).catch((err) => {
        console.warn('Initial background baseline scrape failed:', err);
      });

      return res.status(201).json(newMonitor);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Update monitor
  app.put('/api/monitors/:id', (req, res) => {
    const { id } = req.params;
    const existing = Storage.getMonitor(id);
    if (!existing) {
      return res.status(404).json({ error: 'Monitor no encontrado' });
    }

    const { url, label, enabled, selector, checkFrequency } = req.body;
    if (url) existing.url = url;
    if (label !== undefined) existing.label = label;
    if (enabled !== undefined) existing.enabled = Boolean(enabled);
    if (selector !== undefined) existing.selector = selector ? selector.trim() : undefined;
    if (checkFrequency) existing.checkFrequency = checkFrequency;

    Storage.saveMonitor(existing);
    return res.json(existing);
  });

  // Delete monitor
  app.delete('/api/monitors/:id', (req, res) => {
    const { id } = req.params;
    const success = Storage.deleteMonitor(id);
    return res.json({ success, deletedId: id });
  });

  // Test scrap a URL on the fly (before saving or for testing selector)
  app.post('/api/test-url', async (req, res) => {
    const { url, selector } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Falta la URL a probar' });
    }
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const result = await scrapeUrl(fullUrl, selector);
      return res.json({
        title: result.title,
        documents: result.documents,
        documentCount: result.documents.length,
        textPreview: result.textContent.slice(0, 800),
        totalTextLength: result.textContent.length,
        byteSize: result.byteSize,
        contentHash: result.contentHash,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error al conectar con la página web' });
    }
  });

  // Run check on single monitor
  app.post('/api/monitors/:id/check', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await checkSingleUrl(id);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Run check on all enabled monitors
  app.post('/api/check-all', async (req, res) => {
    try {
      const results = await checkAllMonitors();
      return res.json({
        totalChecked: results.length,
        changesDetected: results.filter((r) => r.hasChanged).length,
        results,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get change records / history
  app.get('/api/changes', (req, res) => {
    const urlId = req.query.urlId as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const changes = Storage.getChanges(urlId, limit);
    return res.json(changes);
  });

  // Get snapshots for a monitor
  app.get('/api/snapshots/:urlId', (req, res) => {
    const { urlId } = req.params;
    const snapshots = Storage.getSnapshots(urlId);
    return res.json(snapshots);
  });

  // Get email notification logs
  app.get('/api/email-logs', (req, res) => {
    const logs = Storage.getEmailLogs();
    return res.json(logs);
  });

  // Get settings
  app.get('/api/settings', (req, res) => {
    const s = Storage.getSettings();
    return res.json({
      ...s,
      smtpPass: s.smtpPass ? '••••••••' : '',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // Update settings
  app.post('/api/settings', (req, res) => {
    try {
      const payload = req.body;
      const current = Storage.getSettings();

      // Don't overwrite password with masked value
      if (payload.smtpPass === '••••••••') {
        delete payload.smtpPass;
      }

      const updated = Storage.saveSettings({
        ...payload,
        smtpPort: Number(payload.smtpPort) || 587,
        smtpSecure: Boolean(payload.smtpSecure),
        cronEnabled: Boolean(payload.cronEnabled),
        onlyAlertOnChanges: Boolean(payload.onlyAlertOnChanges),
        useGeminiSummary: Boolean(payload.useGeminiSummary),
      });

      // Reload scheduler with new cron settings
      initScheduler();

      return res.json({
        ...updated,
        smtpPass: updated.smtpPass ? '••••••••' : '',
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Send test email
  app.post('/api/test-email', async (req, res) => {
    try {
      const { email } = req.body;
      const result = await sendTestEmail(email);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // External webhook endpoint for Crontab / Cloud Scheduler / GitHub Actions
  app.get('/api/cron/run', async (req, res) => {
    const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
    const settings = Storage.getSettings();

    if (!token || token !== settings.cronSecretToken) {
      return res.status(401).json({ error: 'Token de acceso no autorizado para disparador cron' });
    }

    try {
      const results = await checkAllMonitors();
      return res.json({
        status: 'success',
        executedAt: new Date().toISOString(),
        totalChecked: results.length,
        changesDetected: results.filter((r) => r.hasChanged).length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Start internal automated scheduler
  initScheduler();

  // Vite development middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WebChangeMonitor] Servidor listo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
