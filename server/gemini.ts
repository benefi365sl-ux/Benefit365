import { GoogleGenAI } from '@google/genai';
import type { DocumentItem } from '../src/types.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export async function summarizeChangesWithGemini(params: {
  url: string;
  title: string;
  addedLinesSample: string;
  removedLinesSample: string;
  addedDocs: DocumentItem[];
  removedDocs: DocumentItem[];
}): Promise<string | undefined> {
  const client = getAiClient();
  if (!client) return undefined;

  try {
    const prompt = `
Eres un asistente que supervisa cambios en sitios web oficiales, portales de noticias y boletines legales.
Analiza la siguiente información de cambios detectados en la página "${params.title}" (${params.url}):

Documentos PDF/archivos AÑADIDOS:
${params.addedDocs.map((d) => `- [${d.extension}] ${d.text} (${d.url})`).join('\n') || 'Ninguno'}

Documentos PDF/archivos ELIMINADOS:
${params.removedDocs.map((d) => `- [${d.extension}] ${d.text}`).join('\n') || 'Ninguno'}

Muestra de texto AÑADIDO (+):
${params.addedLinesSample.slice(0, 1500) || 'Sin adiciones de texto destacables'}

Muestra de texto ELIMINADO (-):
${params.removedLinesSample.slice(0, 1500) || 'Sin eliminaciones destacables'}

Por favor, redacta un resumen ejecutivo en español de 2 o 3 frases claras y profesionales, explicando qué novedades o cambios importantes han ocurrido (por ejemplo, si se publicaron nuevas resoluciones, convocatorias, cambios de precios, noticias o fechas). Sé directo y conciso.
`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim();
  } catch (err) {
    console.warn('Gemini summary could not be generated:', err);
    return undefined;
  }
}
