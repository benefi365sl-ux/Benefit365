import * as jsdiff from 'diff';
import type { Snapshot, DocumentItem, DiffChunk, ChangeRecord, MonitoredUrl } from '../src/types.js';

export interface CompareResult {
  hasChanged: boolean;
  textDiffSummary: {
    addedLines: number;
    removedLines: number;
    totalLines: number;
  };
  diffChunks: DiffChunk[];
  addedDocuments: DocumentItem[];
  removedDocuments: DocumentItem[];
}

export function compareSnapshots(previous: Snapshot, current: Snapshot): CompareResult {
  // Compare documents
  const prevDocUrls = new Map(previous.documents.map((d) => [d.url, d]));
  const currDocUrls = new Map(current.documents.map((d) => [d.url, d]));

  const addedDocuments: DocumentItem[] = [];
  const removedDocuments: DocumentItem[] = [];

  for (const [url, doc] of currDocUrls.entries()) {
    if (!prevDocUrls.has(url)) {
      addedDocuments.push(doc);
    }
  }

  for (const [url, doc] of prevDocUrls.entries()) {
    if (!currDocUrls.has(url)) {
      removedDocuments.push(doc);
    }
  }

  // Compare text lines
  const rawDiff = jsdiff.diffLines(previous.textContent, current.textContent, {
    ignoreWhitespace: true,
  });

  let addedLines = 0;
  let removedLines = 0;
  const diffChunks: DiffChunk[] = [];

  for (const part of rawDiff) {
    const lines = part.value.split('\n').filter((l) => l.trim().length > 0);
    if (part.added) {
      addedLines += lines.length;
      diffChunks.push({ type: 'added', value: part.value });
    } else if (part.removed) {
      removedLines += lines.length;
      diffChunks.push({ type: 'removed', value: part.value });
    } else {
      // Keep only context chunks (e.g., first 3 lines and last 3 lines if long)
      if (lines.length > 6) {
        const sample = [...lines.slice(0, 3), '...', ...lines.slice(-3)].join('\n');
        diffChunks.push({ type: 'unchanged', value: sample });
      } else {
        diffChunks.push({ type: 'unchanged', value: part.value });
      }
    }
  }

  const totalLines = current.textContent.split('\n').length;
  const docsChanged = addedDocuments.length > 0 || removedDocuments.length > 0;
  const textChanged = addedLines > 0 || removedLines > 0;
  const hashChanged = previous.contentHash !== current.contentHash;

  const hasChanged = hashChanged || docsChanged || textChanged;

  return {
    hasChanged,
    textDiffSummary: {
      addedLines,
      removedLines,
      totalLines,
    },
    diffChunks: diffChunks.slice(0, 50), // limit chunk size for storage/display
    addedDocuments,
    removedDocuments,
  };
}

export function generateEmailHtml(params: {
  monitor: MonitoredUrl;
  change: ChangeRecord;
  appUrl?: string;
}): { subject: string; html: string } {
  const { monitor, change } = params;
  const dateStr = new Date(change.timestamp).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `[Cambios Detectados] ${monitor.label || monitor.url} - ${dateStr}`;

  const addedDocsHtml =
    change.addedDocuments.length > 0
      ? `
      <div style="margin-top: 20px; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #166534; font-size: 16px; display: flex; align-items: center;">
          📄 Documentos Nuevos Añadidos (${change.addedDocuments.length})
        </h3>
        <ul style="margin: 8px 0; padding-left: 20px;">
          ${change.addedDocuments
            .map(
              (doc) => `
            <li style="margin-bottom: 8px;">
              <span style="background: #22c55e; color: #fff; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">
                ${doc.extension}
              </span>
              <a href="${doc.url}" target="_blank" style="color: #15803d; text-decoration: underline; font-weight: 600;">
                ${escapeHtml(doc.text || doc.url)}
              </a>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px; word-break: break-all;">
                ${escapeHtml(doc.url)}
              </div>
            </li>
          `,
            )
            .join('')}
        </ul>
      </div>
    `
      : '';

  const removedDocsHtml =
    change.removedDocuments.length > 0
      ? `
      <div style="margin-top: 16px; padding: 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #991b1b; font-size: 16px;">
          🗑️ Documentos Retirados/Eliminados (${change.removedDocuments.length})
        </h3>
        <ul style="margin: 8px 0; padding-left: 20px;">
          ${change.removedDocuments
            .map(
              (doc) => `
            <li style="margin-bottom: 8px;">
              <span style="background: #ef4444; color: #fff; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">
                ${doc.extension}
              </span>
              <span style="color: #64748b; text-decoration: line-through;">
                ${escapeHtml(doc.text || doc.url)}
              </span>
              <div style="font-size: 12px; color: #94a3b8; word-break: break-all;">
                ${escapeHtml(doc.url)}
              </div>
            </li>
          `,
            )
            .join('')}
        </ul>
      </div>
    `
      : '';

  const aiSummaryHtml = change.aiSummary
    ? `
      <div style="margin-top: 20px; padding: 16px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0;">
        <div style="font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
          Resumen Inteligente de Cambios (Gemini AI)
        </div>
        <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
          ${escapeHtml(change.aiSummary)}
        </p>
      </div>
    `
    : '';

  // Text diff highlights
  const diffSnippetHtml =
    change.diffChunks && change.diffChunks.length > 0
      ? `
      <div style="margin-top: 20px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Detalle de diferencias de texto:</h4>
        <div style="background-color: #0f172a; color: #f8fafc; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; line-height: 1.5; overflow-x: auto; max-height: 380px;">
          ${change.diffChunks
            .slice(0, 25)
            .map((chunk) => {
              if (chunk.type === 'added') {
                return `<div style="background-color: rgba(34, 197, 94, 0.25); color: #86efac; padding: 2px 4px; border-left: 3px solid #22c55e;">+ ${escapeHtml(chunk.value.trim())}</div>`;
              }
              if (chunk.type === 'removed') {
                return `<div style="background-color: rgba(239, 68, 68, 0.25); color: #fca5a5; padding: 2px 4px; border-left: 3px solid #ef4444;">- ${escapeHtml(chunk.value.trim())}</div>`;
              }
              return `<div style="color: #94a3b8; padding: 2px 4px;">  ${escapeHtml(chunk.value.trim())}</div>`;
            })
            .join('')}
        </div>
      </div>
    `
      : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: #1e293b; padding: 24px; color: #ffffff;">
              <div style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                Monitor de Cambios Web Automático
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #f8fafc;">
                ${escapeHtml(monitor.label || monitor.url)}
              </h1>
              <div style="margin-top: 8px; font-size: 13px; color: #cbd5e1;">
                URL monitoreada: <a href="${monitor.url}" target="_blank" style="color: #38bdf8; text-decoration: none;">${escapeHtml(monitor.url)}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1;">
                  <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Líneas Añadidas</div>
                  <div style="font-size: 20px; font-weight: 700; color: #16a34a;">+${change.textDiffSummary.addedLines}</div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1;">
                  <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Líneas Eliminadas</div>
                  <div style="font-size: 20px; font-weight: 700; color: #dc2626;">-${change.textDiffSummary.removedLines}</div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1;">
                  <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Documentos PDF/Nuevos</div>
                  <div style="font-size: 20px; font-weight: 700; color: #2563eb;">+${change.addedDocuments.length}</div>
                </div>
              </div>

              ${aiSummaryHtml}
              ${addedDocsHtml}
              ${removedDocsHtml}
              ${diffSnippetHtml}

              <div style="margin-top: 24px; text-align: center;">
                <a href="${monitor.url}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Abrir Página Web Original
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center;">
              Este aviso se envía automáticamente <strong>solo cuando se detectan cambios</strong> en el contenido o documentos de la URL monitoreada.<br/>
              Fecha de comprobación: ${dateStr}
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
