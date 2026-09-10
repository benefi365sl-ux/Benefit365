import React, { useState } from 'react';
import {
  Settings,
  Mail,
  Clock,
  Server,
  ShieldCheck,
  Check,
  Copy,
  Terminal,
  ExternalLink,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import type { AppSettings } from '../types.ts';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (updated: Partial<AppSettings>) => Promise<void>;
  onSendTestEmail: (email?: string) => Promise<any>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onSendTestEmail,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeHostTab, setActiveHostTab] = useState<'docker' | 'vps' | 'render' | 'cron'>('docker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Error al guardar ajustes: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const webhookUrl = `${appOrigin}/api/cron/run?token=${formData.cronSecretToken}`;

  return (
    <div id="settings-view-section" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            Configuración del Sistema & Despliegue en Hosting
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura el correo electrónico de avisos, el servidor de envío SMTP, el programador diario y la guía de despliegue.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Settings Form (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Email & Alert Settings Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Mail className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Cuenta de Correo y Envío de Avisos
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo destinatario de las alertas <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.alertEmail}
                onChange={(e) => setFormData({ ...formData, alertEmail: e.target.value })}
                placeholder="benefi365sl@gmail.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Todas las notificaciones de cambios de texto y documentos PDF se enviarán a esta dirección.
              </p>
            </div>

            {/* Rule checkbox: Only when changes occur */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.onlyAlertOnChanges}
                  onChange={(e) => setFormData({ ...formData, onlyAlertOnChanges: e.target.checked })}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Solo enviar avisos cuando haya cambios detectados (Regla #3)
                  </span>
                  <span className="text-[11px] text-emerald-800 leading-tight block mt-0.5">
                    Si la página no ha sufrido alteraciones respecto a la última comprobación, no se genera ni envía ningún correo spam.
                  </span>
                </div>
              </label>
            </div>

            {/* AI Summary toggle */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.useGeminiSummary}
                  onChange={(e) => setFormData({ ...formData, useGeminiSummary: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Resumen inteligente con IA (Gemini 2.5) en los avisos
                  </span>
                  <span className="text-[11px] text-blue-800 leading-tight block mt-0.5">
                    Genera una síntesis ejecutiva en español explicando qué convocatorias, acuerdos o párrafos nuevos se detectaron.
                  </span>
                </div>
              </label>
            </div>

            {/* SMTP Settings */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                Servidor SMTP para Entrega Real de Correos (Opcional)
              </span>
              <p className="text-[11px] text-slate-500">
                Puedes usar Gmail (contraseña de aplicación), Brevo, SendGrid o el SMTP de tu hosting. Si se deja vacío, los correos se almacenan en la Bandeja para previsualizar.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Servidor SMTP (Host)
                  </label>
                  <input
                    type="text"
                    value={formData.smtpHost}
                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Puerto
                  </label>
                  <input
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => setFormData({ ...formData, smtpPort: Number(e.target.value) })}
                    placeholder="587"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Usuario SMTP / Email de salida
                  </label>
                  <input
                    type="text"
                    value={formData.smtpUser}
                    onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                    placeholder="tu-correo@gmail.com"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Contraseña SMTP / App Password
                  </label>
                  <input
                    type="password"
                    value={formData.smtpPass}
                    onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                    placeholder="Contraseña de aplicación"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nombre de Remitente (From)
                </label>
                <input
                  type="text"
                  value={formData.smtpFrom}
                  onChange={(e) => setFormData({ ...formData, smtpFrom: e.target.value })}
                  placeholder='"Monitor de Cambios" <alertas@midominio.com>'
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Daily Schedule (Cron) Settings Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Programador Automático Diario (Cron)
              </h3>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cronEnabled}
                onChange={(e) => setFormData({ ...formData, cronEnabled: e.target.checked })}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Activar comprobación periódica automática en segundo plano
              </span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expresión Cron de Programación
              </label>
              <input
                type="text"
                value={formData.cronSchedule}
                onChange={(e) => setFormData({ ...formData, cronSchedule: e.target.value })}
                placeholder="0 8 * * *"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
              />
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono">
                  0 8 * * *
                </span>
                <span>= Todos los días a las 08:00 AM UTC (Recomendado)</span>
              </div>
            </div>

            {/* External Webhook trigger */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-xs font-bold text-slate-800 block">
                Disparador Webhook para Cron Externo (Cloud / cPanel / EasyCron)
              </span>
              <p className="text-[11px] text-slate-500">
                Si tu hosting suspende el servidor en inactividad, puedes llamar a esta URL segura para despertar la comprobación diaria:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-2.5 py-1.5 text-[11px] bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-600 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                  className="px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'webhook' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> ¡Configuración guardada correctamente!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
          </div>
        </form>

        {/* Right column: Hosting Deployment Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Server className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Guía de Despliegue en Cualquier Hosting (Requisito #4)
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Esta aplicación está empaquetada para funcionar con cero dependencias externas complejas. Puedes alojarla en cualquier VPS, contenedor Docker o plataforma en la nube.
            </p>

            {/* Hosting tabs */}
            <div className="flex border-b border-slate-200 text-xs font-medium gap-1">
              <button
                type="button"
                onClick={() => setActiveHostTab('docker')}
                className={`pb-2 px-2 border-b-2 cursor-pointer transition-colors ${
                  activeHostTab === 'docker'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Docker
              </button>
              <button
                type="button"
                onClick={() => setActiveHostTab('vps')}
                className={`pb-2 px-2 border-b-2 cursor-pointer transition-colors ${
                  activeHostTab === 'vps'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                VPS / Linux
              </button>
              <button
                type="button"
                onClick={() => setActiveHostTab('render')}
                className={`pb-2 px-2 border-b-2 cursor-pointer transition-colors ${
                  activeHostTab === 'render'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Render / PaaS
              </button>
              <button
                type="button"
                onClick={() => setActiveHostTab('cron')}
                className={`pb-2 px-2 border-b-2 cursor-pointer transition-colors ${
                  activeHostTab === 'cron'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                CLI / Crontab
              </button>
            </div>

            {/* Tab content */}
            {activeHostTab === 'docker' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Despliegue inmediato en 1 comando usando el <code className="bg-slate-100 px-1 rounded">docker-compose.yml</code> ya incluido en el proyecto:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
{`# 1. Iniciar en segundo plano
docker compose up -d

# 2. Comprobar registros
docker compose logs -f`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('docker compose up -d', 'cmd-docker')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                  >
                    {copiedKey === 'cmd-docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                  El volumen persistente <code className="font-mono">./data:/app/data</code> guarda todas las capturas, configuraciones y listas de URLs automáticamente sin perderse tras reiniciar.
                </div>
              </div>
            )}

            {activeHostTab === 'vps' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  En cualquier servidor Linux (Ubuntu, Debian, AlmaLinux) con Node.js 20+:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
{`npm install
npm run build
npm start`}
                  </pre>
                </div>
                <p className="text-slate-600 mt-2">
                  O usando <strong>PM2</strong> para mantenerlo siempre activo:
                </p>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
{`pm2 start dist/server.cjs --name web-monitor
pm2 startup && pm2 save`}
                </pre>
              </div>
            )}

            {activeHostTab === 'render' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Para Render, Railway, Fly.io o Heroku:
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-700 list-disc pl-4">
                  <li><strong>Build Command:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">npm install && npm run build</code></li>
                  <li><strong>Start Command:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">npm start</code></li>
                  <li><strong>Puerto:</strong> 3000</li>
                  <li><strong>Variables de entorno:</strong> <code className="font-mono">ALERT_EMAIL_TO=benefi365sl@gmail.com</code></li>
                </ul>
              </div>
            )}

            {activeHostTab === 'cron' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Si prefieres no tener un servidor web 24/7 y ejecutarlo solo como tarea cron en tu máquina o servidor:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
{`# Editar crontab del sistema
crontab -e

# Añadir esta línea (todos los días a las 08:00 AM):
0 8 * * * cd /ruta/al/proyecto && node scripts/run-cli.mjs >> /var/log/monitor.log 2>&1`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
