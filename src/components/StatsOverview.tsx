import React from 'react';
import { Globe, Clock, CheckCircle2, AlertTriangle, FileText, BellRing } from 'lucide-react';
import type { MonitoredUrl, ChangeRecord, EmailNotificationLog } from '../types.ts';

interface StatsOverviewProps {
  monitors: MonitoredUrl[];
  changes: ChangeRecord[];
  emailLogs: EmailNotificationLog[];
  isCheckingAll: boolean;
  onCheckAll: () => void;
  onOpenAdd: () => void;
  onOpenBatch: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  monitors,
  changes,
  emailLogs,
  isCheckingAll,
  onCheckAll,
  onOpenAdd,
  onOpenBatch,
}) => {
  const activeCount = monitors.filter((m) => m.enabled).length;
  const changedTodayCount = changes.filter((c) => {
    const today = new Date().toDateString();
    return new Date(c.timestamp).toDateString() === today;
  }).length;

  const totalPdfsTracked = monitors.reduce((acc, m) => acc + (m.stats.totalChanges || 0), 0);
  const emailsSent = emailLogs.length;

  return (
    <div id="stats-overview-section" className="space-y-4">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Control de Monitorización Diaria
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión continua de contenido y documentos PDF. Alertas automáticas enviadas <strong>solo cuando se detectan cambios</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-open-batch-import"
            onClick={onOpenBatch}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-slate-600" />
            Importar Lote (6-20 URLs)
          </button>
          <button
            id="btn-open-add-url"
            onClick={onOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <span className="text-sm font-bold">+</span>
            Añadir URL
          </button>
          <button
            id="btn-check-all-now"
            onClick={onCheckAll}
            disabled={isCheckingAll || activeCount === 0}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white rounded-lg transition-all cursor-pointer shadow-xs ${
              isCheckingAll
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isCheckingAll ? 'animate-spin' : ''}`} />
            {isCheckingAll ? 'Comprobando todas...' : 'Comprobar Todas Ahora'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div id="stat-card-urls" className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">URLs en Seguimiento</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{monitors.length}</span>
            <span className="text-xs text-slate-500 font-medium">({activeCount} activas)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Recomendado: 6 a 20 URLs</p>
        </div>

        <div id="stat-card-changes" className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cambios Hoy</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{changedTodayCount}</span>
            <span className="text-xs text-slate-500 font-medium">({changes.length} totales)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Texto y documentos PDF</p>
        </div>

        <div id="stat-card-emails" className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avisos por Email</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{emailsSent}</span>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              Solo con cambios
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sin spam en páginas sin cambios</p>
        </div>

        <div id="stat-card-frequency" className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Frecuencia Automática</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-purple-900">Diario</span>
            <span className="text-xs text-slate-500 font-mono">08:00 UTC</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cron interno activo</p>
        </div>
      </div>
    </div>
  );
};
