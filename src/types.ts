export interface DocumentItem {
  url: string;
  text: string;
  extension: string;
  firstSeenAt?: string;
}

export interface MonitoredUrl {
  id: string;
  url: string;
  label: string;
  enabled: boolean;
  selector?: string; // Optional CSS selector to isolate content
  checkFrequency: 'daily' | 'hourly' | 'manual';
  createdAt: string;
  lastCheckedAt?: string;
  lastStatus?: 'ok' | 'changed' | 'error' | 'pending' | 'new';
  lastErrorMessage?: string;
  lastSnapshotId?: string;
  stats: {
    totalChecks: number;
    totalChanges: number;
  };
}

export interface Snapshot {
  id: string;
  urlId: string;
  url: string;
  timestamp: string;
  title: string;
  contentHash: string;
  textContent: string;
  documents: DocumentItem[];
  httpStatus: number;
  byteSize: number;
}

export interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface ChangeRecord {
  id: string;
  urlId: string;
  url: string;
  timestamp: string;
  previousSnapshotId: string;
  currentSnapshotId: string;
  textDiffSummary: {
    addedLines: number;
    removedLines: number;
    totalLines: number;
  };
  diffChunks?: DiffChunk[];
  addedDocuments: DocumentItem[];
  removedDocuments: DocumentItem[];
  aiSummary?: string;
  emailSent: boolean;
  emailRecipient?: string;
  emailError?: string;
}

export interface EmailNotificationLog {
  id: string;
  urlId?: string;
  url?: string;
  timestamp: string;
  recipient: string;
  subject: string;
  previewHtml: string;
  status: 'sent' | 'failed' | 'simulated';
  errorMessage?: string;
}

export interface AppSettings {
  alertEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  cronSchedule: string;
  cronEnabled: boolean;
  onlyAlertOnChanges: boolean;
  useGeminiSummary: boolean;
  cronSecretToken: string;
}

export interface CheckRunResult {
  urlId: string;
  url: string;
  hasChanged: boolean;
  isFirstRun: boolean;
  error?: string;
  changeRecord?: ChangeRecord;
  emailSent?: boolean;
}
