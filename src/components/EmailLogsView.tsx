import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, Send, Eye, Clock, X, ExternalLink } from 'lucide-react';
import type { EmailNotificationLog, AppSettings } from '../types.ts';

interface EmailLogsViewProps {
  logs: EmailNotificationLog[];
  settings: AppSettings;
  onSendTestEmail: (email?: string) => Promise<any>;
}

export const EmailLogsView: React.FC<EmailLogsViewProps> = ({
  logs,
  settings,
  onSendTestEmail,
}) => {
  const [selectedLog, setSelectedLog] = useState<EmailNotificationLog | null>(null);
  const [testEmailInput, setTestEmailInput] = useState(settings.alertEmail || '');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatusMessage, setTestStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    setTestStatusMessage(null);
    try {
      const res = await onSendTestEmail(testEmailInput);
      setTestStatusMessage({
        text: res.message || 'Prueba completada con éxito.',
        type: 'success',
      });
    } catch (err: any) {
      setTestStatusMessage({
        text: err.message || 'Error al enviar email de prueba.',
        type: 'error',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div id="email-logs-section" className="space-y-4">
      {/* Header and Test Email Box */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Bandeja de Avisos por Correo Electrónico
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Destinatario configurado: <strong className="text-slate-800">{settings.alertEmail || 'benefi365sl@gmail.com'}</strong>. Se envían <strong>exclusivamente cuando se detectan cambios</strong>.
          </p>
        </div>

        {/* Quick Test Email Trigger */}
        <form onSubmit={handleSendTest} className="flex items-center gap-2">
          <input
            type="email"
            required
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            placeholder="benefi365sl@gmail.com"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-60"
          />
          <button
            type="submit"
            disabled={isSendingTest}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingTest ? 'Enviando...' : 'Enviar Prueba'}</span>
          </button>
        </form>
      </div>

      {testStatusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            testStatusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {testStatusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{testStatusMessage.text}</span>
        </div>
      )}

      {/* Logs Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Bandeja de avisos vacía</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Los correos se generan automáticamente al ejecutarse la revisión diaria si alguna página presenta novedades. Puedes enviar una prueba arriba.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div
                  key={log.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/75 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {log.subject}
                      </h4>
                      {getStatusPill(log.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Para: <strong className="text-slate-700">{log.recipient}</strong></span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {dateStr}
                      </span>
                      {log.url && (
                        <span className="truncate max-w-xs text-slate-400">
                          {log.url}
                        </span>
                      )}
                    </div>
                    {log.errorMessage && (
                      <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {log.errorMessage}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedLog(log)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver Mensaje Completo</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Preview Drawer for Full Rendered Email */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Vista Previa del Aviso por Correo
                </span>
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-xl">
                  {selectedLog.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Meta details */}
            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs text-slate-600 flex flex-wrap gap-x-6 gap-y-1">
              <span><strong>Para:</strong> {selectedLog.recipient}</span>
              <span><strong>Fecha:</strong> {new Date(selectedLog.timestamp).toLocaleString('es-ES')}</span>
              <span><strong>Estado:</strong> {selectedLog.status === 'sent' ? 'Enviado por SMTP' : 'Generado / Vista Previa'}</span>
            </div>

            {/* Rendered HTML Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div
                className="bg-white rounded-xl shadow-xs p-2 max-w-2xl mx-auto overflow-hidden"
                dangerouslySetInnerHTML={{ __html: selectedLog.previewHtml }}
              />
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 bg-white flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getStatusPill(status: 'sent' | 'failed' | 'simulated') {
  if (status === 'sent') {
    return (
      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Enviado
      </span>
    );
  }
  if (status === 'simulated') {
    return (
      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
        Listo (Vista Previa)
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
      <AlertCircle className="w-3 h-3 text-red-600" /> Error de envío
    </span>
  );
}
