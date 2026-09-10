import React, { useState } from 'react';
import { X, Globe, Check, AlertCircle, Sparkles } from 'lucide-react';
import { extractErrorMessage } from '../lib/api.ts';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (urls: string[]) => Promise<void>;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Extract valid URLs from lines
  const parsedUrls = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && (l.startsWith('http://') || l.startsWith('https://') || l.includes('.')));

  const handleImport = async () => {
    if (parsedUrls.length === 0) {
      setError('Pega al menos una URL válida para importar.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onImport(parsedUrls);
      setRawText('');
      onClose();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Error al importar las URLs'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadExampleList = () => {
    const example = [
      'https://www.boe.es/diario_boe/',
      'https://ec.europa.eu/commission/presscorner/home/en',
      'https://news.ycombinator.com',
      'https://www.w3.org/standards/news/',
      'https://blog.google/technology/ai/',
      'https://nodejs.org/en/blog',
      'https://www.cnmv.es/portal/home.aspx',
      'https://elpais.com/tecnologia/',
      'https://openai.com/news/',
      'https://www.bde.es/wbe/es/',
    ].join('\n');
    setRawText(example);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Importación Rápida por Lote (6 a 20 URLs)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pega una lista de enlaces (uno por línea). El sistema creará los monitores y su línea base inicial.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Pega aquí las URLs (una por línea):
            </span>
            <button
              type="button"
              onClick={loadExampleList}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Cargar 10 URLs de ejemplo
            </button>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
            placeholder={`https://pagina-oficial.es/anuncios\nhttps://universidad.edu/resoluciones\nhttps://empresa.com/boletines\nhttps://licitaciones.es/convocatorias...`}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
          />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {parsedUrls.length} URLs detectadas
              </span>
              <span className="text-[11px] text-slate-400">
                (Capacidad recomendada para seguimiento diario: 6 a 20)
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isSubmitting || parsedUrls.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Importando...' : `Importar ${parsedUrls.length} URLs`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
