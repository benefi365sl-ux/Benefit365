import express from 'express';
import { Storage } from './storage.js';
import { checkSingleUrl, checkAllMonitors } from './checker.js';
import { scrapeUrl } from './scraper.js';
import { sendTestEmail } from './mailer.js';
import { initScheduler } from './scheduler.js';

export function createApiApp(): express.Express {
  const app = express();

  // CORS headers for cross-origin hosting or reverse proxies
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Handle invalid JSON body syntax errors (e.g. malformed JSON in POST body)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Cuerpo de la petición JSON no válido o mal formado.' });
    }
    next(err);
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    });
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

  // External webhook endpoint for Crontab / Cloud Scheduler / GitHub Actions / Vercel Cron
  app.get('/api/cron/run', async (req, res) => {
    const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
    const settings = Storage.getSettings();

    // Vercel Cron sends header "x-vercel-cron: 1" and optional Bearer CRON_SECRET
    const isVercelCron = req.headers['x-vercel-cron'] === '1';
    const cronSecret = process.env.CRON_SECRET;
    const isValidCronSecret = Boolean(cronSecret && token === cronSecret);
    const isTokenValid = Boolean(token && token === settings.cronSecretToken);

    if (!isVercelCron && !isValidCronSecret && !isTokenValid) {
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

  // PREVENT FALLTHROUGH: Ensure all /api and /api/* routes that don't match return JSON 404, never Vite HTML
  app.all('/api*', (req, res) => {
    res.status(404).json({
      error: `Ruta de API no encontrada: ${req.method} ${req.originalUrl || req.url}`,
    });
  });

  // API Error Handler: Ensure any uncaught API error returns clean JSON, never HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
      console.error('[API Server Error]:', err);
      const errMsg =
        typeof err?.message === 'string'
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Error interno del servidor';
      return res.status(err.status || 500).json({
        error: errMsg,
      });
    }
    next(err);
  });

  return app;
}
