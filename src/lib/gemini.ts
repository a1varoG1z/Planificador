import { GoogleGenerativeAI, SchemaType, type Schema, type Part } from '@google/generative-ai';
import type { CareProfileDraft } from './types';
import type { PerenualHints } from './perenual';

const DEFAULT_MODEL = 'gemini-3.5-flash';

// Candidatos de repuesto conocidos (alias "latest" que Google mantiene apuntando
// siempre a un modelo valido, mas algunas versiones concretas por si acaso). Si
// Google retira o renombra alguno, simplemente falla ese intento y se prueba el
// siguiente: no hace falta mantener esta lista perfecta.
//
// Las variantes "lite" van primero: Google las trata como un modelo distinto
// con su propia cuota diaria (normalmente mas alta que la del "flash" completo),
// asi que si el "flash" principal se queda sin cuota, un "lite" de la misma
// generacion u otra suele seguir teniendo peticiones disponibles.
const STATIC_FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

let modelListCache: { names: string[]; fetchedAt: number } | null = null;
const MODEL_LIST_TTL_MS = 15 * 60 * 1000;

/** Consulta a Google que modelos admite de verdad esta API key ahora mismo (se cachea un rato). */
async function fetchAvailableModels(): Promise<string[]> {
  if (modelListCache && Date.now() - modelListCache.fetchedAt < MODEL_LIST_TTL_MS) {
    return modelListCache.names;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    const names: string[] = (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: { name: string }) => m.name.replace('models/', ''));
    modelListCache = { names, fetchedAt: Date.now() };
    return names;
  } catch {
    return [];
  }
}

/** Orden de modelos a probar: el configurado primero, luego alternativas baratas/rapidas. */
async function candidateModels(): Promise<string[]> {
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const dynamic = await fetchAvailableModels();
  const isUsable = (n: string) => !/pro|ultra|embed|aqa|vision|tts|image|audio|thinking/i.test(n);
  // Los "lite" confirmados por la propia API key van primero: existen de verdad
  // para esta cuenta y es el tipo de modelo con mas probabilidad de tener cuota
  // libre cuando el "flash" completo ya se agoto.
  const dynamicLite = dynamic.filter((n) => /lite/i.test(n) && isUsable(n));
  const dynamicFlash = dynamic.filter((n) => /flash/i.test(n) && !dynamicLite.includes(n) && isUsable(n));
  const ordered = [primary, ...dynamicLite, ...STATIC_FALLBACK_MODELS, ...dynamicFlash, ...dynamic];
  // Limite de seguridad: no tiene sentido encadenar decenas de intentos en una sola peticion.
  return Array.from(new Set(ordered)).slice(0, 14);
}

function isTransientError(message: string): boolean {
  return /503|overloaded|high demand|UNAVAILABLE/i.test(message);
}

/**
 * Genera contenido probando una lista de modelos en orden. Un error transitorio
 * (503, sobrecarga puntual) se reintenta una vez en el mismo modelo; cualquier
 * otro fallo (429 cuota agotada, 404 modelo retirado/no disponible para esta
 * key, etc.) pasa directamente al siguiente modelo de la lista, sin esperar.
 */
function shortReason(message: string): string {
  if (/429|quota/i.test(message)) return 'cuota agotada';
  if (/404|not found|no longer available/i.test(message)) return 'no disponible';
  if (isTransientError(message)) return 'sobrecargado';
  return message.slice(0, 80);
}

async function generateWithFallback(schema: Schema | undefined, input: string | (string | Part)[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en las variables de entorno');
  const genAI = new GoogleGenerativeAI(apiKey);
  const candidates = await candidateModels();

  const attemptLog: string[] = [];
  let lastErr: unknown;
  for (const modelName of candidates) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: schema ? { responseMimeType: 'application/json', responseSchema: schema } : undefined,
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(input);
        if (modelName !== candidates[0]) {
          console.warn(`[gemini] usando modelo de repuesto "${modelName}" (el principal no respondio)`);
        }
        return result;
      } catch (err) {
        lastErr = err;
        const message = err instanceof Error ? err.message : String(err);
        if (isTransientError(message) && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        attemptLog.push(`${modelName} (${shortReason(message)})`);
        break; // cuota agotada, modelo no encontrado, etc: probar el siguiente modelo
      }
    }
  }

  console.error(`[gemini] todos los modelos fallaron: ${attemptLog.join(', ')}`);
  const summary = attemptLog.length
    ? `Ningun modelo de Gemini disponible ahora mismo. Se probaron ${attemptLog.length}: ${attemptLog.join(', ')}.`
    : 'No se pudo generar contenido con ningun modelo de Gemini';
  throw new Error(summary);
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '');
  return JSON.parse(cleaned) as T;
}

// Esquemas de salida: fuerzan a Gemini a devolver siempre los mismos campos,
// con los mismos tipos, en vez de confiar solo en las instrucciones del prompt.
const CARE_PROFILE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    watering_frequency_days: { type: SchemaType.INTEGER },
    watering_frequency_days_warm: { type: SchemaType.INTEGER },
    watering_frequency_days_cool: { type: SchemaType.INTEGER },
    watering_notes: { type: SchemaType.STRING },
    fertilizing_frequency_days: { type: SchemaType.INTEGER },
    fertilizing_frequency_days_warm: { type: SchemaType.INTEGER, nullable: true },
    fertilizing_frequency_days_cool: { type: SchemaType.INTEGER, nullable: true },
    fertilizing_notes: { type: SchemaType.STRING },
    pruning_notes: { type: SchemaType.STRING },
    pruning_season: { type: SchemaType.STRING },
    pruning_months: { type: SchemaType.ARRAY, items: { type: SchemaType.INTEGER } },
    light_notes: { type: SchemaType.STRING },
    temperature_min: { type: SchemaType.NUMBER },
    temperature_max: { type: SchemaType.NUMBER },
    temperature_notes: { type: SchemaType.STRING },
    humidity_notes: { type: SchemaType.STRING },
    soil_notes: { type: SchemaType.STRING },
    propagation_notes: { type: SchemaType.STRING },
    flowering_fruit_tips: { type: SchemaType.STRING },
    toxicity_notes: { type: SchemaType.STRING },
    life_cycle: { type: SchemaType.STRING, format: 'enum', enum: ['annual', 'biennial', 'perennial'] },
    replant_month: { type: SchemaType.INTEGER, nullable: true },
    replanting_notes: { type: SchemaType.STRING },
    bloom_month: { type: SchemaType.INTEGER, nullable: true },
    bloom_notes: { type: SchemaType.STRING },
    heat_alert_threshold_c: { type: SchemaType.INTEGER, nullable: true },
  },
  required: [
    'watering_frequency_days', 'watering_frequency_days_warm', 'watering_frequency_days_cool', 'watering_notes',
    'fertilizing_frequency_days', 'fertilizing_notes',
    'pruning_notes', 'pruning_season', 'pruning_months',
    'light_notes', 'temperature_min', 'temperature_max', 'temperature_notes',
    'humidity_notes', 'soil_notes', 'propagation_notes', 'flowering_fruit_tips',
    'toxicity_notes', 'life_cycle', 'replanting_notes', 'bloom_notes',
  ],
};

const RECOMMENDATIONS_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ['recommendations'],
};

const REMEDIES_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    commercial: { type: SchemaType.STRING },
    home: { type: SchemaType.STRING },
  },
  required: ['commercial', 'home'],
};

const AI_DIAGNOSIS_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    isHealthy: { type: SchemaType.BOOLEAN },
    summary: { type: SchemaType.STRING },
    remediesCommercial: { type: SchemaType.STRING, nullable: true },
    remediesHome: { type: SchemaType.STRING, nullable: true },
  },
  required: ['isHealthy', 'summary'],
};

export async function generateCareProfile(
  scientificName: string,
  commonName: string | null,
  hints: PerenualHints | null,
  location: string
): Promise<CareProfileDraft> {
  const hintsBlock = hints
    ? `Datos de referencia de Perenual (usalos como apoyo, pero prioriza tu conocimiento botanico si detectas algo incorrecto):
${JSON.stringify(hints, null, 2)}`
    : 'No hay datos de referencia adicionales disponibles.';

  const prompt = `Eres un experto en botanica y jardineria domestica. Genera una ficha de cuidados completa, practica y en espanol para la siguiente planta, adaptada a la ubicacion indicada:

Nombre cientifico: ${scientificName}
Nombre comun: ${commonName ?? 'desconocido'}
Ubicacion del jardin: ${location}

${hintsBlock}

Instrucciones para cada campo:
- Ajusta frecuencias, epocas y temperaturas al clima real de "${location}" (heladas, epoca de lluvias, veranos secos o humedos, etc.), no des valores genericos de manual. Asume hemisferio norte: temporada calida = abril-septiembre, temporada fria = octubre-marzo.
- watering_frequency_days: numero entero de dias, valor MEDIO/tipico de riego para mostrar como resumen rapido.
- watering_frequency_days_warm: numero entero de dias entre riegos en la epoca calida/de mas calor en "${location}" (normalmente mas frecuente, por mayor evaporacion).
- watering_frequency_days_cool: numero entero de dias entre riegos en la epoca fria en "${location}" (normalmente menos frecuente). Debe ser mayor que watering_frequency_days_warm salvo que la planta sea de riego constante todo el ano.
- fertilizing_frequency_days: numero entero de dias, valor medio/tipico de abonado para mostrar como resumen rapido.
- fertilizing_frequency_days_warm: numero entero de dias entre abonados en la epoca de crecimiento activo (normalmente primavera-verano).
- fertilizing_frequency_days_cool: numero entero de dias entre abonados en la epoca fria/de reposo vegetativo. Si esta planta NO debe abonarse en esa epoca (lo habitual para la mayoria), pon null.
- pruning_season: epoca del ano recomendada para podar en esa ubicacion (ej. "final de invierno, antes de brotes nuevos").
- pruning_months: array con los 1-3 numeros de mes (1-12) en los que REALMENTE corresponde podar esta planta en "${location}" (ej. [2, 3] para final de invierno). La poda NO se repite cada X dias como el riego: es estacional, asi que este array debe reflejar solo los meses concretos en los que tiene sentido, no un rango amplio "por si acaso". Si esta planta no necesita poda (ej. la mayoria de plantas de interior sin lenosidad), deja el array vacio [].
- propagation_notes: como reproducir la planta (esquejes, division, semilla, acodo...) paso a paso resumido.
- flowering_fruit_tips: consejos concretos para mejorar la floracion o la fructificacion (abonado especifico, poda de formacion, luz, polinizacion manual si aplica).
- toxicity_notes: si es toxica para personas o mascotas, y que sintomas provoca; si no lo es, indicalo brevemente.
- life_cycle: "annual" si la planta completa su ciclo y muere en una temporada (ej. tomatera, albahaca), "biennial" si tarda dos temporadas, "perennial" si vive varios anos (arbustos, arboles, plantas de interior, bulbos como el ciclamen). Basate en el dato "cycle" de los datos de referencia si esta disponible.
- replant_month: SOLO si life_cycle es "annual" o "biennial", numero de mes (1-12) recomendado para volver a plantarla en esa ubicacion tras el final de su ciclo (ej. semillero de tomate en marzo). Si life_cycle es "perennial", omitelo (null).
- replanting_notes: si life_cycle es "annual" o "biennial", 1-2 frases sobre como/cuando replantarla la siguiente temporada. Si es "perennial", explica brevemente que no hace falta replantarla salvo trasplante a maceta mayor.
- bloom_month: SOLO si esta planta da flor o fruto vistoso (ej. ciclamen, tomatera, limonero), numero de mes (1-12) en el que tipicamente alcanza su proxima floracion/fructificacion en esa ubicacion. Si la planta no florece de forma relevante (ej. planta de follaje), omitelo (null).
- bloom_notes: si bloom_month tiene valor, 1-2 frases describiendo que esperar (color, duracion, como favorecerla). Si no aplica, explica brevemente por que (ej. "planta de follaje, sin floracion ornamental relevante").
- heat_alert_threshold_c: numero entero de grados Celsius a partir del cual esta planta necesita riego extra si hace mucho calor y el sustrato lleva tiempo sin regarse (tipico 28-32 para plantas de necesidad de agua media/alta, como la mayoria de hortalizas o plantas de hoja). Si esta planta es resistente al calor y la sequia (cactus, suculentas, plantas mediterraneas de bajo riego como lavanda o romero), pon null: no necesita este aviso.
- Todos los textos en espanol, tono cercano y practico, 1-3 frases por campo de notas.`;

  const result = await generateWithFallback(CARE_PROFILE_SCHEMA, prompt);
  return parseJson<CareProfileDraft>(result.response.text());
}

export async function generateRecommendations(input: {
  scientificName: string;
  commonName: string | null;
  careProfile: Partial<CareProfileDraft>;
  missedWaterings: number;
  missedFertilizings: number;
  location: string;
}): Promise<string[]> {
  const prompt = `Eres un jardinero experto. Basandote en esta planta y su historial reciente, propon entre 3 y 5 recomendaciones de mejora CONCRETAS y accionables, en espanol, para que crezca mas sana y bonita.

Especie: ${input.scientificName} (${input.commonName ?? 'sin nombre comun'})
Ubicacion del jardin: ${input.location}
Perfil de cuidados actual: ${JSON.stringify(input.careProfile)}
Riegos recientes que se han retrasado respecto a lo recomendado: ${input.missedWaterings}
Abonados recientes que se han retrasado respecto a lo recomendado: ${input.missedFertilizings}

Ten en cuenta el clima de "${input.location}" (heladas, epoca del ano) si es relevante. Cada recomendacion debe ser breve (1-2 frases), especifica para esta planta, no generica.`;

  const result = await generateWithFallback(RECOMMENDATIONS_SCHEMA, prompt);
  const parsed = parseJson<{ recommendations: string[] }>(result.response.text());
  return parsed.recommendations ?? [];
}

export async function generateQuickInfo(scientificName: string, commonName: string | null): Promise<string> {
  const prompt = `Eres un experto en botanica. En espanol, escribe un texto breve (3-4 frases) sobre esta planta encontrada en la naturaleza, pensado para alguien que la acaba de fotografiar en un paseo: donde suele crecer, epoca de floracion si tiene, y algun dato curioso. No repitas el nombre cientifico en el texto mas de una vez.

Nombre cientifico: ${scientificName}
Nombre comun: ${commonName ?? 'desconocido'}`;

  const result = await generateWithFallback(undefined, prompt);
  return result.response.text().trim();
}

export async function generateRemedies(input: {
  diseaseName: string;
  description: string | null;
  cause: string | null;
  plantnitTreatment: { biological: string[]; chemical: string[]; prevention: string[] };
}): Promise<{ commercial: string; home: string }> {
  const prompt = `Eres un experto en fitopatologia domestica. Un usuario ha detectado este problema en una planta:

Problema: ${input.diseaseName}
Descripcion: ${input.description ?? 'no disponible'}
Causa: ${input.cause ?? 'no disponible'}
Tratamientos de referencia (en ingles, de una base de datos): ${JSON.stringify(input.plantnitTreatment)}

Redacta en espanol dos listas breves de remedios:
1. "commercial": productos comerciales tipicos (fungicidas, insecticidas, jabon potasico, etc.) que se pueden comprar en un vivero o tienda de jardineria, con como aplicarlos.
2. "home": remedios caseros (agua con jabon, aceite de neem, bicarbonato, alcohol, etc.) con proporciones aproximadas.

Cada campo es un texto corrido de 2-4 frases, practico y en espanol.`;

  const result = await generateWithFallback(REMEDIES_SCHEMA, prompt);
  return parseJson<{ commercial: string; home: string }>(result.response.text());
}

export interface AiDiagnosis {
  isHealthy: boolean;
  summary: string;
  remediesCommercial: string | null;
  remediesHome: string | null;
}

/**
 * Diagnostico de plagas/enfermedades usando solo vision de Gemini, sin Plant.id.
 * Se usa como respaldo cuando Plant.id no esta disponible o se han agotado sus creditos.
 */
export async function diagnoseWithGemini(base64Image: string, mimeType = 'image/jpeg'): Promise<AiDiagnosis> {
  const prompt = `Eres un experto en fitopatologia. Observa la foto de esta planta y evalua su estado de salud.

- isHealthy: true si no ves signos claros de plaga, enfermedad o carencia; false si detectas algo (manchas, hojas amarillas/marchitas, insectos, moho, etc.).
- summary: 1-2 frases en espanol describiendo lo que ves. Si detectas un problema, nombralo (ej. "posible oidio", "araña roja", "clorosis ferrica") dejando claro que es una estimacion visual, no un diagnostico certero.
- remediesCommercial: SOLO si isHealthy es false, productos comerciales tipicos para tratarlo (fungicida, insecticida, jabon potasico...) con como aplicarlos, en espanol, 2-4 frases. Si isHealthy es true, deja null.
- remediesHome: SOLO si isHealthy es false, remedios caseros (agua con jabon, aceite de neem, bicarbonato...) con proporciones aproximadas, en espanol, 2-4 frases. Si isHealthy es true, deja null.`;

  const result = await generateWithFallback(AI_DIAGNOSIS_SCHEMA, [
    { inlineData: { data: base64Image, mimeType } },
    { text: prompt },
  ]);

  return parseJson<AiDiagnosis>(result.response.text());
}
