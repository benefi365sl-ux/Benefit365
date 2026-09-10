/**
 * Cliente API seguro con protección total contra errores de parseo JSON y [object Object]
 * (ej: "JSON.parse: unexpected character at line 1 column 1 of the JSON data").
 */

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Extrae siempre un mensaje de error legible en formato string.
 * Previene que cualquier objeto de error termine mostrándose como "[object Object]".
 */
export function extractErrorMessage(err: unknown, defaultMsg = 'Ha ocurrido un error inesperado'): string {
  if (!err) return defaultMsg;

  if (typeof err === 'string') {
    const trimmed = err.trim();
    return trimmed && trimmed !== '[object Object]' ? trimmed : defaultMsg;
  }

  if (err instanceof Error) {
    if (err.message && typeof err.message === 'string' && err.message !== '[object Object]') {
      return err.message;
    }
  }

  if (typeof err === 'object') {
    const anyErr = err as any;

    if (typeof anyErr.error === 'string' && anyErr.error !== '[object Object]') {
      return anyErr.error;
    }
    if (typeof anyErr.message === 'string' && anyErr.message !== '[object Object]') {
      return anyErr.message;
    }
    if (anyErr.error && typeof anyErr.error === 'object') {
      if (typeof anyErr.error.message === 'string' && anyErr.error.message !== '[object Object]') {
        return anyErr.error.message;
      }
      try {
        const s = JSON.stringify(anyErr.error);
        if (s && s !== '{}') return s;
      } catch {}
    }
    if (typeof anyErr.statusText === 'string' && anyErr.statusText) {
      return `Error HTTP ${anyErr.status || ''}: ${anyErr.statusText}`;
    }
    try {
      const s = JSON.stringify(err);
      if (s && s !== '{}') return s;
    } catch {}
  }

  const str = String(err);
  return str && str !== '[object Object]' ? str : defaultMsg;
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
    // Configurar cabeceras de forma segura sin problemas de serialización
    const reqHeaders: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options?.body) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    if (options?.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((val, key) => {
          reqHeaders[key] = val;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, val]) => {
          reqHeaders[key] = val;
        });
      } else {
        Object.assign(reqHeaders, options.headers);
      }
    }

    const res = await fetch(url, {
      ...options,
      headers: reqHeaders,
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text();

    // Comprobar si el texto devuelto es HTML o vacío
    const trimmedText = rawText.trim();
    const isHtml = trimmedText.startsWith('<') || contentType.includes('text/html');

    if (isHtml) {
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
      let errorMsg: string;
      const parsedObj = parsed as any;

      if (typeof parsedObj?.error === 'string') {
        errorMsg = parsedObj.error;
      } else if (typeof parsedObj?.error?.message === 'string') {
        errorMsg = parsedObj.error.message;
      } else if (typeof parsedObj?.message === 'string') {
        errorMsg = parsedObj.message;
      } else if (parsedObj?.error && typeof parsedObj.error === 'object') {
        errorMsg = JSON.stringify(parsedObj.error);
      } else if (parsedObj && typeof parsedObj === 'object') {
        errorMsg = JSON.stringify(parsedObj);
      } else if (typeof parsed === 'string' && parsed.trim().length > 0) {
        errorMsg = parsed;
      } else {
        errorMsg = `Error HTTP ${res.status}: ${res.statusText || 'Error en la petición'}`;
      }

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
      error: extractErrorMessage(err, 'Error de conexión con el servidor'),
    };
  }
}
