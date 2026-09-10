import cron, { type ScheduledTask } from 'node-cron';
import { Storage } from './storage.js';
import { checkAllMonitors } from './checker.js';

let activeCronTask: ScheduledTask | null = null;

export function initScheduler() {
  if (process.env.VERCEL) {
    console.log('[Scheduler] Entorno Serverless (Vercel) detectado: el cron se gestiona mediante Vercel Cron Jobs (/api/cron/run).');
    return;
  }

  const settings = Storage.getSettings();

  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
  }

  if (!settings.cronEnabled) {
    console.log('[Scheduler] Cron automático desactivado en la configuración.');
    return;
  }

  const scheduleExpression = settings.cronSchedule || '0 8 * * *';

  if (!cron.validate(scheduleExpression)) {
    console.warn(`[Scheduler] Expresión cron inválida: "${scheduleExpression}". Usando valor por defecto diario "0 8 * * *".`);
  }

  const validExpr = cron.validate(scheduleExpression) ? scheduleExpression : '0 8 * * *';

  console.log(`[Scheduler] Programador cron diario iniciado con regla: "${validExpr}"`);

  activeCronTask = cron.schedule(validExpr, async () => {
    console.log(`[Scheduler] ⏰ Disparador cron ejecutado (${new Date().toISOString()}). Comprobando páginas web...`);
    try {
      await checkAllMonitors();
    } catch (err) {
      console.error('[Scheduler] Error durante la ejecución del cron:', err);
    }
  });
}
