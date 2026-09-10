/**
 * Cliente API seguro con protección total contra errores de parseo JSON
 * (ej: "JSON.parse: unexpected character at line 1 column 1 of the JSON data").
 */

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export function safeJsonParse<T = any>(text: string, fallback: T | null = null): T | null {
  if (!text || typeof text !== 'string') return fallback;
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return fallback;

  // Si empieza por '<' (HTML como <!doctype html> o <pre>) sabemos que NO es JSON
  if (trimmed.startsWith('<')) {
    return fallback;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const headers = new Headers(options?.headers);
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (options?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text();

    // Comprobar si el texto devuelto es HTML o vacío
    const trimmedText = rawText.trim();
    const isHtml = trimmedText.startsWith('<') || contentType.includes('text/html');

    if (isHtml) {
      // Extraer posible mensaje de error si es un error del servidor en HTML
      let extractedMsg = `El servidor devolvió una página HTML en lugar de JSON (HTTP ${res.status})`;
      if (res.status === 404) {
        extractedMsg = `Ruta de API no encontrada: ${url} (404)`;
      } else if (res.status >= 500) {
        extractedMsg = `Error interno del servidor al procesar ${url} (HTTP ${res.status})`;
      }
      return {
        ok: false,
        status: res.status,
        data: null,
        error: extractedMsg,
      };
    }

    // Parsear de forma segura
    const parsed = safeJsonParse<T>(rawText, null);

    if (parsed === null && rawText.trim().length > 0) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Respuesta con formato no válido del servidor (${rawText.slice(0, 100)})`,
      };
    }

    if (!res.ok) {
      const errorMsg =
        (parsed as any)?.error ||
        (parsed as any)?.message ||
        `Error HTTP ${res.status}: ${res.statusText || 'Error en la petición'}`;

      return {
        ok: false,
        status: res.status,
        data: parsed,
        error: errorMsg,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: parsed,
    };
  } catch (err: any) {
    console.error(`[apiFetch Error] ${url}:`, err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Error de conexión con el servidor',
    };
  }
}
