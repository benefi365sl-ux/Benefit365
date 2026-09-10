#!/usr/bin/env node
/**
 * Script ejecutable directamente desde consola o crontab del sistema:
 * Uso: node scripts/run-cli.mjs
 * Ejemplo en crontab de Linux (todos los días a las 08:00 AM):
 * 0 8 * * * cd /ruta/al/proyecto && /usr/bin/node scripts/run-cli.mjs >> /var/log/web-monitor.log 2>&1
 */
import { checkAllMonitors } from '../server/checker.js';

console.log(`[CLI Monitor] Iniciando comprobación manual/cron: ${new Date().toISOString()}`);

checkAllMonitors()
  .then((results) => {
    const changes = results.filter((r) => r.hasChanged).length;
    console.log(`[CLI Monitor] Finalizado con éxito. Evaluadas: ${results.length}, Cambios con alerta enviada: ${changes}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('[CLI Monitor] Error crítico en la ejecución:', err);
    process.exit(1);
  });
