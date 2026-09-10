import React, { useState, useEffect } from 'react';
import { X, FileText, ExternalLink, Calendar, Hash, Download, CheckCircle2 } from 'lucide-react';
import type { MonitoredUrl, Snapshot } from '../types.ts';

interface SnapshotsModalProps {
  monitor: MonitoredUrl | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotsModal: React.FC<SnapshotsModalProps> = ({
  monitor,
  isOpen,
  onClose,
}) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (monitor && isOpen) {
      setLoading(true);
      fetch(`/api/snapshots/${monitor.id}`)
        .then((res) => res.json())
        .then((data) => {
          setSnapshots(data || []);
          if (data && data.length > 0) {
            setSelectedSnapshot(data[0]);
          } else {
            setSelectedSnapshot(null);
          }
        })
        .catch((err) => console.error('Error fetching snapshots:', err))
        .finally(() => setLoading(false));
    }
  }, [monitor, isOpen]);

  if (!isOpen || !monitor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">
              Capturas & Documentos Detectados
            </span>
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {monitor.label}
            </h3>
            <span className="text-xs text-slate-500 truncate block">{monitor.url}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Cargando capturas...</div>
        ) : snapshots.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Aún no se ha completado el primer rastreo para esta URL. Pulsa "Comprobar" en la lista.
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar with timeline of snapshots */}
            <div className="w-full md:w-64 border-r border-slate-200 overflow-y-auto p-3 space-y-1.5 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 px-2 uppercase">
                Historial de Capturas ({snapshots.length})
              </span>
              {snapshots.map((snap, idx) => {
                const isSelected = selectedSnapshot?.id === snap.id;
                const dateStr = new Date(snap.timestamp).toLocaleString('es-ES', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });

                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className={`p-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'hover:bg-slate-200/70 text-slate-700 bg-white border border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{idx === 0 ? 'Última Versión' : `Versión #${snapshots.length - idx}`}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {snap.documents.length} PDFs
                      </span>
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {dateStr}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main snapshot inspector */}
            {selectedSnapshot && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Meta details */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap gap-4 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Fecha Captura</span>
                    <strong className="text-slate-800">{new Date(selectedSnapshot.timestamp).toLocaleString('es-ES')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Documentos PDF</span>
                    <strong className="text-blue-600">{selectedSnapshot.documents.length} archivos</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Tamaño de Descarga</span>
                    <strong className="text-slate-800">{Math.round(selectedSnapshot.byteSize / 1024)} KB</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Huella SHA-256</span>
                    <span className="font-mono text-[10px] text-slate-600">{selectedSnapshot.contentHash.slice(0, 16)}...</span>
                  </div>
                </div>

                {/* Documents List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span>Documentos PDF & Descargas Detectadas ({selectedSnapshot.documents.length}):</span>
                  </h4>
                  {selectedSnapshot.documents.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
                      No se detectaron enlaces directos a archivos PDF en esta página web.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {selectedSnapshot.documents.map((doc, i) => (
                        <div
                          key={i}
                          className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="bg-emerald-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded">
                              {doc.extension}
                            </span>
                            <span className="font-medium text-slate-800 truncate" title={doc.text}>
                              {doc.text || doc.url}
                            </span>
                          </div>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline shrink-0 inline-flex items-center gap-1 font-medium text-[11px]"
                          >
                            <span>Abrir</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Text Content Preview */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">
                    Texto Extraído de la Página (Limpio):
                  </h4>
                  <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {selectedSnapshot.textContent.slice(0, 2000) || '(Sin texto extraído)'}
                    {selectedSnapshot.textContent.length > 2000 && (
                      <div className="text-slate-500 mt-2 text-[10px]">
                        ... ({selectedSnapshot.textContent.length - 2000} caracteres más no mostrados)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
