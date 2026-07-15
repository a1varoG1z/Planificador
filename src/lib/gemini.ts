import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CareProfileDraft } from './types';
import type { PerenualHints } from './perenual';

const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function getModel(jsonMode: boolean) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en las variables de entorno');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: jsonMode ? { responseMimeType: 'application/json' } : undefined,
  });
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '');
  return JSON.parse(cleaned) as T;
}

export async function generateCareProfile(
  scientificName: string,
  commonName: string | null,
  hints: PerenualHints | null
): Promise<CareProfileDraft> {
  const model = getModel(true);

  const hintsBlock = hints
    ? `Datos de referencia de Perenual (usalos como apoyo, pero prioriza tu conocimiento botanico si detectas algo incorrecto):
${JSON.stringify(hints, null, 2)}`
    : 'No hay datos de referencia adicionales disponibles.';

  const prompt = `Eres un experto en botanica y jardineria domestica. Genera una ficha de cuidados completa, practica y en espanol para la siguiente planta:

Nombre cientifico: ${scientificName}
Nombre comun: ${commonName ?? 'desconocido'}

${hintsBlock}

Devuelve EXCLUSIVAMENTE un JSON con esta forma exacta (sin texto adicional, sin markdown):
{
  "watering_frequency_days": number,
  "watering_notes": string,
  "fertilizing_frequency_days": number,
  "fertilizing_notes": string,
  "pruning_frequency_days": number,
  "pruning_notes": string,
  "pruning_season": string,
  "light_notes": string,
  "temperature_min": number,
  "temperature_max": number,
  "temperature_notes": string,
  "humidity_notes": string,
  "soil_notes": string,
  "propagation_notes": string,
  "flowering_fruit_tips": string,
  "toxicity_notes": string,
  "life_cycle": "annual" | "biennial" | "perennial",
  "replant_month": number | null,
  "replanting_notes": string
}

Instrucciones para cada campo:
- watering_frequency_days / fertilizing_frequency_days / pruning_frequency_days: numero entero de dias entre cada tarea, estimado de forma realista para un hogar en clima templado.
- pruning_season: epoca del ano recomendada para podar (ej. "final de invierno, antes de brotes nuevos").
- propagation_notes: como reproducir la planta (esquejes, division, semilla, acodo...) paso a paso resumido.
- flowering_fruit_tips: consejos concretos para mejorar la floracion o la fructificacion (abonado especifico, poda de formacion, luz, polinizacion manual si aplica).
- toxicity_notes: si es toxica para personas o mascotas, y que sintomas provoca; si no lo es, indicalo brevemente.
- life_cycle: "annual" si la planta completa su ciclo y muere en una temporada (ej. tomatera, albahaca), "biennial" si tarda dos temporadas, "perennial" si vive varios anos (arbustos, arboles, plantas de interior, bulbos como el ciclamen). Basate en el dato "cycle" de los datos de referencia si esta disponible.
- replant_month: SOLO si life_cycle es "annual" o "biennial", indica el numero de mes (1-12) recomendado para volver a plantarla tras el final de su ciclo (ej. semillero de tomate en marzo). Si life_cycle es "perennial", pon null.
- replanting_notes: si life_cycle es "annual" o "biennial", 1-2 frases sobre como/cuando replantarla la siguiente temporada. Si es "perennial", explica brevemente que no hace falta replantarla salvo trasplante a maceta mayor.
- Todos los textos en espanol, tono cercano y practico, 1-3 frases por campo de notas.`;

  const result = await model.generateContent(prompt);
  return parseJson<CareProfileDraft>(result.response.text());
}

export async function generateRecommendations(input: {
  scientificName: string;
  commonName: string | null;
  careProfile: Partial<CareProfileDraft>;
  missedWaterings: number;
  missedFertilizings: number;
}): Promise<string[]> {
  const model = getModel(true);

  const prompt = `Eres un jardinero experto. Basandote en esta planta y su historial reciente, propon entre 3 y 5 recomendaciones de mejora CONCRETAS y accionables, en espanol, para que crezca mas sana y bonita.

Especie: ${input.scientificName} (${input.commonName ?? 'sin nombre comun'})
Perfil de cuidados actual: ${JSON.stringify(input.careProfile)}
Riegos recientes que se han retrasado respecto a lo recomendado: ${input.missedWaterings}
Abonados recientes que se han retrasado respecto a lo recomendado: ${input.missedFertilizings}

Devuelve EXCLUSIVAMENTE un JSON: { "recommendations": string[] }. Cada string debe ser una recomendacion breve (1-2 frases), especifica para esta planta, no generica.`;

  const result = await model.generateContent(prompt);
  const parsed = parseJson<{ recommendations: string[] }>(result.response.text());
  return parsed.recommendations ?? [];
}

export async function generateQuickInfo(scientificName: string, commonName: string | null): Promise<string> {
  const model = getModel(false);

  const prompt = `Eres un experto en botanica. En espanol, escribe un texto breve (3-4 frases) sobre esta planta encontrada en la naturaleza, pensado para alguien que la acaba de fotografiar en un paseo: donde suele crecer, epoca de floracion si tiene, y algun dato curioso. No repitas el nombre cientifico en el texto mas de una vez.

Nombre cientifico: ${scientificName}
Nombre comun: ${commonName ?? 'desconocido'}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function generateRemedies(input: {
  diseaseName: string;
  description: string | null;
  cause: string | null;
  plantnitTreatment: { biological: string[]; chemical: string[]; prevention: string[] };
}): Promise<{ commercial: string; home: string }> {
  const model = getModel(true);

  const prompt = `Eres un experto en fitopatologia domestica. Un usuario ha detectado este problema en una planta:

Problema: ${input.diseaseName}
Descripcion: ${input.description ?? 'no disponible'}
Causa: ${input.cause ?? 'no disponible'}
Tratamientos de referencia (en ingles, de una base de datos): ${JSON.stringify(input.plantnitTreatment)}

Redacta en espanol dos listas breves de remedios:
1. "commercial": productos comerciales tipicos (fungicidas, insecticidas, jabon potasico, etc.) que se pueden comprar en un vivero o tienda de jardineria, con como aplicarlos.
2. "home": remedios caseros (agua con jabon, aceite de neem, bicarbonato, alcohol, etc.) con proporciones aproximadas.

Devuelve EXCLUSIVAMENTE un JSON: { "commercial": string, "home": string }. Cada campo es un texto corrido de 2-4 frases, practico y en espanol.`;

  const result = await model.generateContent(prompt);
  return parseJson<{ commercial: string; home: string }>(result.response.text());
}
