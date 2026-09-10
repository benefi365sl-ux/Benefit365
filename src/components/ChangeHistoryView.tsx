import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  ExternalLink,
  PlusCircle,
  MinusCircle,
  Mail,
  Sparkles,
  Calendar,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ChangeRecord, MonitoredUrl } from '../types.ts';

interface ChangeHistoryViewProps {
  changes: ChangeRecord[];
  monitors: MonitoredUrl[];
  selectedMonitorId?: string;
  onSelectMonitorFilter: (id?: string) => void;
  onPreviewEmailForChange: (change: ChangeRecord) => void;
}

export const ChangeHistoryView: React.FC<ChangeHistoryViewProps> = ({
  changes,
  monitors,
  selectedMonitorId,
  onSelectMonitorFilter,
  onPreviewEmailForChange,
}) => {
  const [expandedChangeId, setExpandedChangeId] = useState<string | null>(
    changes[0]?.id || null,
  );

  const monitorMap = new Map<string, MonitoredUrl>(monitors.map((m) => [m.id, m]));

  const filteredChanges = selectedMonitorId
    ? changes.filter((c) => c.urlId === selectedMonitorId)
    : changes;

  return (
    <div id="changes-history-section" className="space-y-4">
      {/* Header & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Historial de Cambios Detectados
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro detallado de variaciones de texto y documentos PDF añadidos o eliminados. Solo se enviaron avisos cuando hubo cambios reales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Filtrar por URL:</label>
          <select
            value={selectedMonitorId || ''}
            onChange={(e) => onSelectMonitorFilter(e.target.value || undefined)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Todas las páginas ({changes.length} cambios)</option>
            {monitors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({changes.filter((c) => c.urlId === m.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredChanges.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {selectedMonitorId ? 'Sin cambios registrados en esta página' : 'No hay cambios detectados todavía'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            El sistema sólo registra eventos y envía avisos por correo <strong>cuando detecta modificaciones reales</strong> en el contenido o nuevos archivos PDF.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChanges.map((change) => {
            const monitor = monitorMap.get(change.urlId);
            const isExpanded = expandedChangeId === change.id;
            const dateStr = new Date(change.timestamp).toLocaleString('es-ES', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={change.id}
                id={`change-card-${change.id}`}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Summary bar */}
                <div
                  onClick={() => setExpandedChangeId(isExpanded ? null : change.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/75 select-none"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {monitor?.label || change.url}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {dateStr}
                      </span>
                      {change.emailSent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Mail className="w-3 h-3" /> Aviso Enviado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        +{change.textDiffSummary.addedLines} líneas
                      </span>
                      <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded text-[11px]">
                        -{change.textDiffSummary.removedLines} líneas
                      </span>
                      {change.addedDocuments.length > 0 && (
                        <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                          <PlusCircle className="w-3 h-3" /> {change.addedDocuments.length} PDF/Docs nuevos
                        </span>
                      )}
                      {change.removedDocuments.length > 0 && (
                        <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                          <MinusCircle className="w-3 h-3" /> {change.removedDocuments.length} PDF/Docs quitados
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewEmailForChange(change);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Email Enviado</span>
                    </button>

                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    {/* Gemini AI Executive Summary if available */}
                    {change.aiSummary && (
                      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 uppercase tracking-wide">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span>Resumen Inteligente de Novedades (Gemini AI)</span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed">
                          {change.aiSummary}
                        </p>
                      </div>
                    )}

                    {/* PDF Documents Changes */}
                    {(change.addedDocuments.length > 0 || change.removedDocuments.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Added Documents */}
                        {change.addedDocuments.length > 0 && (
                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
                              <PlusCircle className="w-4 h-4 text-emerald-600" />
                              Documentos PDF Añadidos ({change.addedDocuments.length})
                            </h4>
                            <ul className="space-y-1.5 text-xs">
                              {change.addedDocuments.map((doc, idx) => (
                                <li key={idx} className="bg-white p-2 rounded-lg border border-emerald-100">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-slate-800 truncate">
                                      {doc.text || doc.url}
                                    </span>
                                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase">
                                      {doc.extension}
                                    </span>
                                  </div>
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1 mt-1 break-all"
                                  >
                                    <span>Descargar / Abrir documento</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Removed Documents */}
                        {change.removedDocuments.length > 0 && (
                          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
                            <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5 mb-2">
                              <MinusCircle className="w-4 h-4 text-rose-600" />
                              Documentos PDF Retirados / Quitados ({change.removedDocuments.length})
                            </h4>
                            <ul className="space-y-1.5 text-xs">
                              {change.removedDocuments.map((doc, idx) => (
                                <li key={idx} className="bg-white p-2 rounded-lg border border-rose-100">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-slate-700 line-through truncate">
                                      {doc.text || doc.url}
                                    </span>
                                    <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase">
                                      {doc.extension}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 break-all block mt-0.5">
                                    {doc.url}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text Diff View */}
                    {change.diffChunks && change.diffChunks.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">
                            Diferencias exactas en el texto del contenido:
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Verde = Añadido | Rojo = Eliminado
                          </span>
                        </div>
                        <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-xs max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
                          {change.diffChunks.map((chunk, idx) => {
                            if (chunk.type === 'added') {
                              return (
                                <div
                                  key={idx}
                                  className="bg-emerald-950/70 text-emerald-300 border-l-3 border-emerald-500 px-2 py-0.5 my-0.5 rounded-r"
                                >
                                  + {chunk.value.trim()}
                                </div>
                              );
                            }
                            if (chunk.type === 'removed') {
                              return (
                                <div
                                  key={idx}
                                  className="bg-rose-950/70 text-rose-300 border-l-3 border-rose-500 px-2 py-0.5 my-0.5 rounded-r"
                                >
                                  - {chunk.value.trim()}
                                </div>
                              );
                            }
                            return (
                              <div key={idx} className="text-slate-400 px-2 py-0.5 opacity-70">
                                {chunk.value.trim()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
