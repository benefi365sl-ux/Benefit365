import React, { useState } from 'react';
import {
  ExternalLink,
  Play,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  Eye,
} from 'lucide-react';
import type { MonitoredUrl, Snapshot } from '../types.ts';

interface MonitorsListProps {
  monitors: MonitoredUrl[];
  checkingIds: Set<string>;
  onCheckUrl: (id: string) => void;
  onToggleEnabled: (id: string, current: boolean) => void;
  onDeleteUrl: (id: string) => void;
  onSelectMonitorChanges: (id: string) => void;
  onEditMonitor: (monitor: MonitoredUrl) => void;
  onInspectSnapshots: (monitor: MonitoredUrl) => void;
}

export const MonitorsList: React.FC<MonitorsListProps> = ({
  monitors,
  checkingIds,
  onCheckUrl,
  onToggleEnabled,
  onDeleteUrl,
  onSelectMonitorChanges,
  onEditMonitor,
  onInspectSnapshots,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'changed' | 'error' | 'ok' | 'disabled'>('all');

  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.url.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'disabled') return !m.enabled;
    if (statusFilter === 'changed') return m.lastStatus === 'changed';
    if (statusFilter === 'error') return m.lastStatus === 'error';
    if (statusFilter === 'ok') return m.lastStatus === 'ok';

    return true;
  });

  return (
    <div id="monitors-list-container" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Search and Filters Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-monitors"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o URL..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtrar:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todas ({monitors.length})
          </button>
          <button
            onClick={() => setStatusFilter('changed')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              statusFilter === 'changed'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Con Cambios
          </button>
          <button
            onClick={() => setStatusFilter('ok')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              statusFilter === 'ok'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Sin Cambios
          </button>
          <button
            onClick={() => setStatusFilter('error')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              statusFilter === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Con Error
          </button>
        </div>
      </div>

      {/* Monitors List / Table */}
      {filteredMonitors.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-700">No se encontraron páginas web</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba a cambiar el filtro de búsqueda o añade nuevas URLs para supervisar (recomendado: 6 a 20 URLs).
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredMonitors.map((m) => {
            const isChecking = checkingIds.has(m.id);

            return (
              <div
                key={m.id}
                id={`monitor-row-${m.id}`}
                className={`p-4 transition-colors hover:bg-slate-50/75 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !m.enabled ? 'opacity-60 bg-slate-50/40' : ''
                }`}
              >
                {/* Left: Monitor Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {m.label}
                    </h3>
                    {/* Status Badge */}
                    {getStatusBadge(m)}
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {m.checkFrequency === 'hourly' ? 'Horario' : 'Diario (Automático)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline truncate max-w-md"
                      title={m.url}
                    >
                      <span className="truncate">{m.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span>
                      Última revisión:{' '}
                      <strong className="text-slate-700 font-medium">
                        {m.lastCheckedAt
                          ? new Date(m.lastCheckedAt).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Pendiente de primer análisis'}
                      </strong>
                    </span>
                    <span>
                      Comprobaciones: <strong className="text-slate-700 font-medium">{m.stats.totalChecks || 0}</strong>
                    </span>
                    <span>
                      Cambios detectados: <strong className="text-amber-600 font-medium">{m.stats.totalChanges || 0}</strong>
                    </span>
                    {m.selector && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-mono">
                        Selector: {m.selector}
                      </span>
                    )}
                    {m.lastErrorMessage && (
                      <span className="text-red-600 font-medium text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {m.lastErrorMessage}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Enable/Pause Toggle */}
                  <button
                    onClick={() => onToggleEnabled(m.id, m.enabled)}
                    title={m.enabled ? 'Pausar monitorización' : 'Activar monitorización'}
                    className={`p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      m.enabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {m.enabled ? 'Activa' : 'Pausada'}
                  </button>

                  {/* Snapshots / Docs Viewer */}
                  <button
                    onClick={() => onInspectSnapshots(m)}
                    title="Ver capturas y documentos PDF encontrados"
                    className="p-2 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Capturas & PDFs</span>
                  </button>

                  {/* View Differences if changed */}
                  <button
                    onClick={() => onSelectMonitorChanges(m.id)}
                    className="p-2 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Diferencias ({m.stats.totalChanges || 0})</span>
                  </button>

                  {/* Check Now button */}
                  <button
                    onClick={() => onCheckUrl(m.id)}
                    disabled={isChecking}
                    className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg text-white transition-all cursor-pointer ${
                      isChecking
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{isChecking ? 'Analizando...' : 'Comprobar'}</span>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => onEditMonitor(m)}
                    title="Editar configuración"
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteUrl(m.id)}
                    title="Eliminar URL"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function getStatusBadge(m: MonitoredUrl) {
  if (!m.lastStatus || !m.lastCheckedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
        Pendiente
      </span>
    );
  }

  if (m.lastStatus === 'changed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        ¡Cambios detectados!
      </span>
    );
  }

  if (m.lastStatus === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Sin cambios (OK)
      </span>
    );
  }

  if (m.lastStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3 text-red-600" />
        Error de conexión
      </span>
    );
  }

  return null;
}
