import React, { useState, useEffect } from 'react';
import { X, Search, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import type { MonitoredUrl } from '../types.ts';

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { url: string; label?: string; selector?: string; checkFrequency?: 'daily' | 'hourly' }) => Promise<void>;
  editingMonitor?: MonitoredUrl | null;
}

export const AddMonitorModal: React.FC<AddMonitorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMonitor,
}) => {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [selector, setSelector] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'hourly'>('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Live tester state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState('');

  useEffect(() => {
    if (editingMonitor) {
      setUrl(editingMonitor.url);
      setLabel(editingMonitor.label);
      setSelector(editingMonitor.selector || '');
      setFrequency(editingMonitor.checkFrequency === 'hourly' ? 'hourly' : 'daily');
    } else {
      setUrl('');
      setLabel('');
      setSelector('');
      setFrequency('daily');
    }
    setTestResult(null);
    setTestError('');
    setErrorMessage('');
  }, [editingMonitor, isOpen]);

  if (!isOpen) return null;

  const handleTestUrl = async () => {
    if (!url.trim()) {
      setTestError('Introduce una URL para probar.');
      return;
    }
    setIsTesting(true);
    setTestError('');
    setTestResult(null);

    try {
      const res = await apiFetch<any>('/api/test-url', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim(), selector: selector.trim() || undefined }),
      });
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Error al conectar con la URL');
      }
      const data = res.data;
      setTestResult(data);
      if (!label && data.title) {
        setLabel(data.title.slice(0, 80));
      }
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMessage('La dirección URL es obligatoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSave({
        url: url.trim(),
        label: label.trim() || undefined,
        selector: selector.trim() || undefined,
        checkFrequency: frequency,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la URL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {editingMonitor ? 'Editar URL Monitoreada' : 'Añadir Nueva URL para Monitoreo'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión diaria automática con alertas por email cuando cambie el texto o documentos PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dirección URL a Supervisar <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.es/noticias o https://ayuntamiento.es/tablon"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestUrl}
                disabled={isTesting || !url}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Probar Acceso'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Etiqueta o Nombre Descriptivo
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Boletín Oficial, Tablón de Edictos, Convocatorias 2026..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selector CSS (Opcional)
              </label>
              <input
                type="text"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                placeholder="Ej: main, #contenido, .noticias"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Aísla un bloque específico de la página si deseas evitar cabeceras o banners dinámicos.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Frecuencia de Comprobación
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'daily' | 'hourly')}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="daily">Diaria (Automática cada día a las 08:00 UTC)</option>
                <option value="hourly">Horaria (Cada hora)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Solo se enviará correo si se detectan cambios en el contenido.
              </p>
            </div>
          </div>

          {/* Test URL Feedback Result */}
          {testResult && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Página accesible correctamente</span>
              </div>
              <p className="text-xs text-slate-700">
                <strong>Título:</strong> {testResult.title || '(Sin título)'}
              </p>
              <div className="flex gap-4 text-xs text-slate-600">
                <span>
                  📄 <strong>{testResult.documentCount}</strong> documentos PDF/archivos detectados
                </span>
                <span>
                  📝 <strong>{Math.round(testResult.totalTextLength / 5)}</strong> palabras de contenido
                </span>
              </div>
              {testResult.documents?.length > 0 && (
                <div className="mt-2 text-[11px] bg-white p-2 rounded border border-emerald-100 max-h-24 overflow-y-auto">
                  <span className="font-semibold text-slate-700">PDFs encontrados en este momento:</span>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-600">
                    {testResult.documents.slice(0, 5).map((d: any, idx: number) => (
                      <li key={idx} className="truncate">
                        [{d.extension}] {d.text || d.url}
                      </li>
                    ))}
                    {testResult.documents.length > 5 && (
                      <li className="text-slate-400">...y {testResult.documents.length - 5} más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {testError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>No se pudo conectar a la web: {testError}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : editingMonitor ? 'Actualizar Cambios' : 'Añadir a Monitorización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
