import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { DocumentItem } from '../src/types.js';

export interface ScrapeResult {
  title: string;
  textContent: string;
  documents: DocumentItem[];
  contentHash: string;
  httpStatus: number;
  byteSize: number;
}

const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.zip', '.csv'];

export async function scrapeUrl(targetUrl: string, selector?: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (WebChangeMonitor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const byteSize = Buffer.byteLength(html, 'utf-8');

    const $ = cheerio.load(html);

    // Get page title
    const title = ($('title').first().text() || $('h1').first().text() || targetUrl).trim();

    // Extract documents before stripping tags
    const documentsMap = new Map<string, DocumentItem>();

    $('a[href]').each((_, el) => {
      const rawHref = $(el).attr('href');
      if (!rawHref) return;

      try {
        const fullUrl = new URL(rawHref, targetUrl).href;
        const lowerUrl = fullUrl.toLowerCase().split('?')[0].split('#')[0];
        const extMatch = DOCUMENT_EXTENSIONS.find((ext) => lowerUrl.endsWith(ext));

        if (extMatch) {
          const rawText = $(el).text().trim() || $(el).attr('title')?.trim() || $(el).attr('aria-label')?.trim() || pathFromUrl(fullUrl);
          const cleanText = rawText.replace(/\s+/g, ' ').slice(0, 150);

          if (!documentsMap.has(fullUrl)) {
            documentsMap.set(fullUrl, {
              url: fullUrl,
              text: cleanText,
              extension: extMatch.replace('.', '').toUpperCase(),
              firstSeenAt: new Date().toISOString(),
            });
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });

    const documents = Array.from(documentsMap.values());

    // Clean DOM of scripts, styles, metadata
    $('script, style, noscript, iframe, svg, canvas, link, meta').remove();
    // Optional banner/cookie removals
    $('[class*="cookie"], [id*="cookie"], [class*="banner-consent"]').remove();

    let targetElement = selector && $(selector).length > 0 ? $(selector) : $('body');
    if (targetElement.length === 0) {
      targetElement = $('html');
    }

    // Extract structured readable text
    const textLines: string[] = [];
    targetElement.find('h1, h2, h3, h4, h5, h6, p, li, tr, dt, dd, blockquote, div').each((_, el) => {
      // only direct text or leaf text to avoid duplication
      const text = $(el).clone().children().remove().end().text().trim();
      if (text && text.length > 2) {
        textLines.push(text.replace(/\s+/g, ' '));
      }
    });

    // Fallback if structured extractor yielded too few lines
    let textContent = textLines.join('\n');
    if (textContent.length < 50) {
      textContent = targetElement.text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
    }

    // Stable Hash calculation
    const docsDigest = documents.map((d) => `${d.extension}:${d.url}`).sort().join('|');
    const hashPayload = `${title}\n${textContent}\nDOCS:${docsDigest}`;
    const contentHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    return {
      title,
      textContent,
      documents,
      contentHash,
      httpStatus: response.status,
      byteSize,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function pathFromUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1] || 'Documento');
  } catch {
    return 'Documento';
  }
}
