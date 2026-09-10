/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { StatsOverview } from './components/StatsOverview.tsx';
import { MonitorsList } from './components/MonitorsList.tsx';
import { AddMonitorModal } from './components/AddMonitorModal.tsx';
import { BatchImportModal } from './components/BatchImportModal.tsx';
import { ChangeHistoryView } from './components/ChangeHistoryView.tsx';
import { EmailLogsView } from './components/EmailLogsView.tsx';
import { SnapshotsModal } from './components/SnapshotsModal.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import type { MonitoredUrl, ChangeRecord, EmailNotificationLog, AppSettings } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitors' | 'changes' | 'emails' | 'settings'>('monitors');
  const [monitors, setMonitors] = useState<MonitoredUrl[]>([]);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    alertEmail: 'benefi365sl@gmail.com',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    cronSchedule: '0 8 * * *',
    cronEnabled: true,
    onlyAlertOnChanges: true,
    useGeminiSummary: true,
    cronSecretToken: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<MonitoredUrl | null>(null);
  const [inspectSnapshotMonitor, setInspectSnapshotMonitor] = useState<MonitoredUrl | null>(null);
  const [selectedMonitorFilter, setSelectedMonitorFilter] = useState<string | undefined>(undefined);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [monitorsRes, changesRes, emailRes, settingsRes] = await Promise.all([
        fetch('/api/monitors'),
        fetch('/api/changes'),
        fetch('/api/email-logs'),
        fetch('/api/settings'),
      ]);

      if (monitorsRes.ok) {
        const data = await monitorsRes.json();
        setMonitors(data);
      }
      if (changesRes.ok) {
        const data = await changesRes.json();
        setChanges(data);
      }
      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmailLogs(data);
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    // Periodic light polling every 20s
    const timer = setInterval(fetchAllData, 20000);
    return () => clearInterval(timer);
  }, [fetchAllData]);

  // Check single URL
  const handleCheckSingle = async (id: string) => {
    setCheckingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al comprobar la URL');

      if (result.isFirstRun) {
        showToast('Primera línea base establecida para la URL.', 'info');
      } else if (result.hasChanged) {
        showToast('¡Cambios detectados! Alerta generada y registrada.', 'success');
      } else {
        showToast('Comprobación completada: Sin cambios en el contenido.', 'info');
      }
      await fetchAllData();
    } catch (err: any) {
      showToast('Fallo en la comprobación: ' + err.message, 'warning');
      await fetchAllData();
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Check all active monitors
  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    showToast('Iniciando comprobación de todas las URLs activas...', 'info');
    try {
      const res = await fetch('/api/check-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar comprobación global');

      if (data.changesDetected > 0) {
        showToast(`Comprobación finalizada: ${data.changesDetected} páginas con cambios detectados y avisos tramitados.`, 'success');
      } else {
        showToast(`Comprobación finalizada en ${data.totalChecked} URLs: Sin novedades detectadas hoy.`, 'info');
      }
      await fetchAllData();
    } catch (err: any) {
      showToast('Error en la comprobación: ' + err.message, 'warning');
    } finally {
      setIsCheckingAll(false);
    }
  };

  // Toggle monitor enabled / paused
  const handleToggleEnabled = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current }),
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete monitor
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta URL de la monitorización? Se borrarán sus capturas asociadas.')) {
      return;
    }
    try {
      const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('URL eliminada de la monitorización.', 'info');
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save monitor (add or edit)
  const handleSaveMonitor = async (data: {
    url: string;
    label?: string;
    selector?: string;
    checkFrequency?: 'daily' | 'hourly';
  }) => {
    if (editingMonitor) {
      const res = await fetch(`/api/monitors/${editingMonitor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar');
      }
      showToast('URL actualizada con éxito.', 'success');
      setEditingMonitor(null);
    } else {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }
      showToast('Nueva URL agregada. Se está generando la captura inicial en segundo plano...', 'success');
    }
    await fetchAllData();
  };

  // Batch import
  const handleBatchImport = async (urls: string[]) => {
    const res = await fetch('/api/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al importar lote');
    }
    const data = await res.json();
    showToast(`¡Lote importado con éxito! Se añadieron ${data.count} URLs.`, 'success');
    await fetchAllData();
  };

  // Save Settings
  const handleSaveSettings = async (updated: Partial<AppSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar configuración');
    }
    const saved = await res.json();
    setSettings(saved);
  };

  // Send Test Email
  const handleSendTestEmail = async (email?: string) => {
    const res = await fetch('/api/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || settings.alertEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al enviar email de prueba');
    }
    await fetchAllData();
    return data;
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans">
      {/* Navigation Topbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        monitors={monitors}
        changes={changes}
        emailLogs={emailLogs}
        isCheckingAll={isCheckingAll}
        onCheckAll={handleCheckAll}
        alertEmail={settings.alertEmail}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toast alert banner */}
        {toastMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium shadow-xs flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toastMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Overview Stats (Always visible or in monitors tab) */}
        {activeTab === 'monitors' && (
          <StatsOverview
            monitors={monitors}
            changes={changes}
            emailLogs={emailLogs}
            isCheckingAll={isCheckingAll}
            onCheckAll={handleCheckAll}
            onOpenAdd={() => {
              setEditingMonitor(null);
              setIsAddOpen(true);
            }}
            onOpenBatch={() => setIsBatchOpen(true)}
          />
        )}

        {/* Tab 1: Monitored URLs */}
        {activeTab === 'monitors' && (
          <MonitorsList
            monitors={monitors}
            checkingIds={checkingIds}
            onCheckUrl={handleCheckSingle}
            onToggleEnabled={handleToggleEnabled}
            onDeleteUrl={handleDelete}
            onSelectMonitorChanges={(id) => {
              setSelectedMonitorFilter(id);
              setActiveTab('changes');
            }}
            onEditMonitor={(m) => {
              setEditingMonitor(m);
              setIsAddOpen(true);
            }}
            onInspectSnapshots={(m) => setInspectSnapshotMonitor(m)}
          />
        )}

        {/* Tab 2: Changes & Diff History */}
        {activeTab === 'changes' && (
          <ChangeHistoryView
            changes={changes}
            monitors={monitors}
            selectedMonitorId={selectedMonitorFilter}
            onSelectMonitorFilter={setSelectedMonitorFilter}
            onPreviewEmailForChange={(change) => {
              // Switch to emails tab and highlight the message
              setActiveTab('emails');
            }}
          />
        )}

        {/* Tab 3: Email Notification Logs */}
        {activeTab === 'emails' && (
          <EmailLogsView
            logs={emailLogs}
            settings={settings}
            onSendTestEmail={handleSendTestEmail}
          />
        )}

        {/* Tab 4: Settings & Hosting Guide */}
        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onSendTestEmail={handleSendTestEmail}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Web Change Monitor & Alertas</strong> — Supervisión automática diaria de texto y documentos PDF.
          </span>
          <span className="text-slate-400">
            Avisos automáticos dirigidos a: <strong className="text-slate-700">{settings.alertEmail}</strong>
          </span>
        </div>
      </footer>

      {/* Modals */}
      <AddMonitorModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingMonitor(null);
        }}
        onSave={handleSaveMonitor}
        editingMonitor={editingMonitor}
      />

      <BatchImportModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onImport={handleBatchImport}
      />

      <SnapshotsModal
        monitor={inspectSnapshotMonitor}
        isOpen={Boolean(inspectSnapshotMonitor)}
        onClose={() => setInspectSnapshotMonitor(null)}
      />
    </div>
  );
}
