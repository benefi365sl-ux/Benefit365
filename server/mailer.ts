import nodemailer from 'nodemailer';
import { Storage } from './storage.js';
import type { MonitoredUrl, ChangeRecord, EmailNotificationLog } from '../src/types.js';
import { generateEmailHtml } from './differ.js';

export async function sendChangeAlertEmail(
  monitor: MonitoredUrl,
  change: ChangeRecord,
): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  const settings = Storage.getSettings();
  const recipient = settings.alertEmail;

  if (!recipient) {
    return { success: false, simulated: false, error: 'No se ha configurado ninguna dirección de email de destino.' };
  }

  const { subject, html } = generateEmailHtml({ monitor, change });
  const logId = 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

  // Check if SMTP credentials are provided
  const hasSmtp = Boolean(settings.smtpHost && settings.smtpUser && settings.smtpPass);

  if (!hasSmtp) {
    // Save to preview / simulated email inbox so the user can inspect exactly what was prepared
    const log: EmailNotificationLog = {
      id: logId,
      urlId: monitor.id,
      url: monitor.url,
      timestamp: new Date().toISOString(),
      recipient,
      subject,
      previewHtml: html,
      status: 'simulated',
      errorMessage: 'SMTP no configurado en Ajustes. El email fue generado y almacenado en vista previa.',
    };
    Storage.saveEmailLog(log);
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: settings.smtpFrom || `"Web Change Monitor" <${settings.smtpUser}>`,
      to: recipient,
      subject,
      html,
    });

    const log: EmailNotificationLog = {
      id: logId,
      urlId: monitor.id,
      url: monitor.url,
      timestamp: new Date().toISOString(),
      recipient,
      subject,
      previewHtml: html,
      status: 'sent',
    };
    Storage.saveEmailLog(log);
    return { success: true, simulated: false };
  } catch (err: any) {
    console.error('Failed to send real email via SMTP:', err);
    const log: EmailNotificationLog = {
      id: logId,
      urlId: monitor.id,
      url: monitor.url,
      timestamp: new Date().toISOString(),
      recipient,
      subject,
      previewHtml: html,
      status: 'failed',
      errorMessage: err.message || 'Error desconocido al conectar con el servidor SMTP',
    };
    Storage.saveEmailLog(log);
    return { success: false, simulated: false, error: err.message };
  }
}

export async function sendTestEmail(targetEmail?: string): Promise<{ success: boolean; simulated: boolean; message: string }> {
  const settings = Storage.getSettings();
  const recipient = targetEmail || settings.alertEmail;

  if (!recipient) {
    throw new Error('Debes indicar un correo electrónico destinatario.');
  }

  const subject = `[Prueba] Verificación de alertas - Web Change Monitor (${new Date().toLocaleTimeString('es-ES')})`;
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b;">
      <h2 style="color: #0284c7;">✅ Configuración de Alertas Comprobada</h2>
      <p>Este es un correo de prueba enviado desde tu aplicación <strong>Web Change Monitor</strong>.</p>
      <p>Tu sistema de monitorización diaria enviará alertas a esta dirección <strong>únicamente cuando se detecten cambios de texto o nuevos documentos PDF</strong> en las URLs observadas.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <div style="font-size: 12px; color: #64748b;">
        Fecha de envío: ${new Date().toLocaleString('es-ES')}
      </div>
    </div>
  `;

  const logId = 'test-' + Date.now();
  const hasSmtp = Boolean(settings.smtpHost && settings.smtpUser && settings.smtpPass);

  if (!hasSmtp) {
    const log: EmailNotificationLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      recipient,
      subject,
      previewHtml: html,
      status: 'simulated',
      errorMessage: 'SMTP no configurado. Mensaje de prueba registrado en la bandeja de previsualización.',
    };
    Storage.saveEmailLog(log);
    return {
      success: true,
      simulated: true,
      message: 'Prueba generada con éxito. Como no hay credenciales SMTP configuradas aún, se guardó en la Bandeja de Notificaciones para previsualizar.',
    };
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: settings.smtpFrom || `"Web Change Monitor" <${settings.smtpUser}>`,
    to: recipient,
    subject,
    html,
  });

  const log: EmailNotificationLog = {
    id: logId,
    timestamp: new Date().toISOString(),
    recipient,
    subject,
    previewHtml: html,
    status: 'sent',
  };
  Storage.saveEmailLog(log);

  return {
    success: true,
    simulated: false,
    message: `¡Correo de prueba enviado con éxito a ${recipient}!`,
  };
}
