import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { MonitoredUrl, Snapshot, ChangeRecord, EmailNotificationLog, AppSettings } from '../src/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  monitors: MonitoredUrl[];
  snapshots: Snapshot[];
  changes: ChangeRecord[];
  emailLogs: EmailNotificationLog[];
  settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  alertEmail: process.env.ALERT_EMAIL_TO || 'benefi365sl@gmail.com',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.ALERT_EMAIL_FROM || 'Web Change Monitor <no-reply@monitor.local>',
  cronSchedule: process.env.CRON_SCHEDULE || '0 8 * * *',
  cronEnabled: true,
  onlyAlertOnChanges: true,
  useGeminiSummary: true,
  cronSecretToken: crypto.randomBytes(16).toString('hex'),
};

const DEFAULT_MONITORS: MonitoredUrl[] = [
  {
    id: 'url-1',
    url: 'https://www.boe.es/diario_boe/',
    label: 'BOE - Boletín Oficial del Estado (España)',
    enabled: true,
    checkFrequency: 'daily',
    createdAt: new Date().toISOString(),
    stats: { totalChecks: 0, totalChanges: 0 },
  },
  {
    id: 'url-2',
    url: 'https://news.ycombinator.com',
    label: 'Hacker News (Frontpage updates)',
    enabled: true,
    checkFrequency: 'daily',
    createdAt: new Date().toISOString(),
    stats: { totalChecks: 0, totalChanges: 0 },
  },
  {
    id: 'url-3',
    url: 'https://ec.europa.eu/commission/presscorner/home/en',
    label: 'European Commission - Press & Policy Documents',
    enabled: true,
    checkFrequency: 'daily',
    createdAt: new Date().toISOString(),
    stats: { totalChecks: 0, totalChanges: 0 },
  },
  {
    id: 'url-4',
    url: 'https://www.w3.org/standards/news/',
    label: 'W3C World Wide Web Standards & Tech News',
    enabled: true,
    checkFrequency: 'daily',
    createdAt: new Date().toISOString(),
    stats: { totalChecks: 0, totalChanges: 0 },
  },
  {
    id: 'url-5',
    url: 'https://blog.google/technology/ai/',
    label: 'Google The Keyword - AI News & Research',
    enabled: true,
    checkFrequency: 'daily',
    createdAt: new Date().toISOString(),
    stats: { totalChecks: 0, totalChanges: 0 },
  },
  {
    id: 'url-6',
    url: 'https://nodejs.org/en/blog',
    label: 'Node.js Official Releases & Security Updates',
    enabled: true,
    checkFrequency: 'daily',
    createdAt: new Date().toISOString(),
    stats: { totalChecks: 0, totalChanges: 0 },
  },
];

function initDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return {
        monitors: data.monitors || DEFAULT_MONITORS,
        snapshots: data.snapshots || [],
        changes: data.changes || [],
        emailLogs: data.emailLogs || [],
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
      };
    }
  } catch (err) {
    console.error('Error reading database file, resetting to defaults:', err);
  }

  const initial: DatabaseSchema = {
    monitors: DEFAULT_MONITORS,
    snapshots: [],
    changes: [],
    emailLogs: [],
    settings: DEFAULT_SETTINGS,
  };
  saveDb(initial);
  return initial;
}

let dbCache: DatabaseSchema = initDb();

function saveDb(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    dbCache = db;
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

export const Storage = {
  getMonitors(): MonitoredUrl[] {
    return dbCache.monitors;
  },
  getMonitor(id: string): MonitoredUrl | undefined {
    return dbCache.monitors.find((m) => m.id === id);
  },
  saveMonitor(monitor: MonitoredUrl): MonitoredUrl {
    const idx = dbCache.monitors.findIndex((m) => m.id === monitor.id);
    if (idx >= 0) {
      dbCache.monitors[idx] = monitor;
    } else {
      dbCache.monitors.push(monitor);
    }
    saveDb(dbCache);
    return monitor;
  },
  deleteMonitor(id: string): boolean {
    const before = dbCache.monitors.length;
    dbCache.monitors = dbCache.monitors.filter((m) => m.id !== id);
    // clean snapshots and changes for this monitor
    dbCache.snapshots = dbCache.snapshots.filter((s) => s.urlId !== id);
    dbCache.changes = dbCache.changes.filter((c) => c.urlId !== id);
    saveDb(dbCache);
    return dbCache.monitors.length < before;
  },
  getSnapshots(urlId: string, limit = 10): Snapshot[] {
    return dbCache.snapshots
      .filter((s) => s.urlId === urlId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },
  getLatestSnapshot(urlId: string): Snapshot | undefined {
    const snaps = this.getSnapshots(urlId, 1);
    return snaps[0];
  },
  saveSnapshot(snapshot: Snapshot): Snapshot {
    dbCache.snapshots.unshift(snapshot);
    // Keep max 20 snapshots per url to conserve space
    const urlSnaps = dbCache.snapshots.filter((s) => s.urlId === snapshot.urlId);
    if (urlSnaps.length > 20) {
      const toKeep = new Set(urlSnaps.slice(0, 20).map((s) => s.id));
      dbCache.snapshots = dbCache.snapshots.filter(
        (s) => s.urlId !== snapshot.urlId || toKeep.has(s.id),
      );
    }
    saveDb(dbCache);
    return snapshot;
  },
  getChanges(urlId?: string, limit = 50): ChangeRecord[] {
    let list = dbCache.changes;
    if (urlId) {
      list = list.filter((c) => c.urlId === urlId);
    }
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },
  saveChange(change: ChangeRecord): ChangeRecord {
    dbCache.changes.unshift(change);
    if (dbCache.changes.length > 200) {
      dbCache.changes = dbCache.changes.slice(0, 200);
    }
    saveDb(dbCache);
    return change;
  },
  getEmailLogs(limit = 50): EmailNotificationLog[] {
    return dbCache.emailLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },
  saveEmailLog(log: EmailNotificationLog): EmailNotificationLog {
    dbCache.emailLogs.unshift(log);
    if (dbCache.emailLogs.length > 100) {
      dbCache.emailLogs = dbCache.emailLogs.slice(0, 100);
    }
    saveDb(dbCache);
    return log;
  },
  getSettings(): AppSettings {
    return dbCache.settings;
  },
  saveSettings(settings: Partial<AppSettings>): AppSettings {
    dbCache.settings = { ...dbCache.settings, ...settings };
    saveDb(dbCache);
    return dbCache.settings;
  },
};
