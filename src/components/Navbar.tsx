import React from 'react';
import { Globe, FileText, Mail, Settings, RefreshCw, Activity, Shield } from 'lucide-react';
import type { MonitoredUrl, ChangeRecord, EmailNotificationLog } from '../types.ts';

interface NavbarProps {
  activeTab: 'monitors' | 'changes' | 'emails' | 'settings';
  setActiveTab: (tab: 'monitors' | 'changes' | 'emails' | 'settings') => void;
  monitors: MonitoredUrl[];
  changes: ChangeRecord[];
  emailLogs: EmailNotificationLog[];
  isCheckingAll: boolean;
  onCheckAll: () => void;
  alertEmail: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  monitors,
  changes,
  emailLogs,
  isCheckingAll,
  onCheckAll,
  alertEmail,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  Web Change Monitor
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cron Diario Activo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-sm">
                Avisos automáticos a <span className="font-semibold text-slate-700">{alertEmail || 'benefi365sl@gmail.com'}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              id="tab-monitors"
              onClick={() => setActiveTab('monitors')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'monitors'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>URLs ({monitors.length})</span>
            </button>

            <button
              id="tab-changes"
              onClick={() => setActiveTab('changes')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'changes'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Cambios</span>
              {changes.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {changes.length}
                </span>
              )}
            </button>

            <button
              id="tab-emails"
              onClick={() => setActiveTab('emails')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'emails'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Avisos Email</span>
              {emailLogs.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {emailLogs.length}
                </span>
              )}
            </button>

            <button
              id="tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Ajustes & Hosting</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
