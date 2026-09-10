import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/createApp.js';
import { initScheduler } from './server/scheduler.js';

async function startServer() {
  const app = createApiApp();
  const PORT = 3000;

  // Start internal automated scheduler
  initScheduler();

  // Determine if running in production mode:
  // True if NODE_ENV=production, or running compiled .cjs bundle, or when src/main.tsx is absent (production image)
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' && __filename.endsWith('.cjs')) ||
    !fs.existsSync(path.join(process.cwd(), 'src', 'main.tsx'));

  // Vite development middleware or production static serving
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Not Found: dist/index.html. Run npm run build.');
        }
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WebChangeMonitor] Servidor listo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
