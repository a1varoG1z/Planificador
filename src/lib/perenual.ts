export interface PerenualHints {
  commonName: string | null;
  watering: string | null;
  wateringBenchmark: string | null;
  sunlight: string[];
  cycle: string | null;
  careLevel: string | null;
  growthRate: string | null;
  droughtTolerant: boolean | null;
  pruningMonth: string[];
  floweringSeason: string | null;
  harvestSeason: string | null;
  poisonousToHumans: boolean | null;
  poisonousToPets: boolean | null;
  soil: string[];
  hardinessZone: string | null;
}

async function perenualFetch(path: string) {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) throw new Error('Falta PERENUAL_API_KEY en las variables de entorno');
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`https://perenual.com/api${path}${sep}key=${apiKey}`);
  if (!res.ok) return null;
  return res.json();
}

export async function findPerenualHints(query: string): Promise<PerenualHints | null> {
  try {
    const list = await perenualFetch(`/species-list?q=${encodeURIComponent(query)}`);
    const firstId = list?.data?.[0]?.id;
    if (!firstId) return null;

    const details = await perenualFetch(`/species/details/${firstId}`);
    if (!details) return null;

    return {
      commonName: details.common_name ?? null,
      watering: details.watering ?? null,
      wateringBenchmark: details.watering_general_benchmark
        ? `${details.watering_general_benchmark.value} ${details.watering_general_benchmark.unit}`
        : null,
      sunlight: Array.isArray(details.sunlight) ? details.sunlight : [],
      cycle: details.cycle ?? null,
      careLevel: details.care_level ?? null,
      growthRate: details.growth_rate ?? null,
      droughtTolerant: details.drought_tolerant ?? null,
      pruningMonth: Array.isArray(details.pruning_month) ? details.pruning_month : [],
      floweringSeason: details.flowering_season ?? null,
      harvestSeason: details.harvest_season ?? null,
      poisonousToHumans:
        typeof details.poisonous_to_humans === 'number' ? details.poisonous_to_humans > 0 : null,
      poisonousToPets:
        typeof details.poisonous_to_pets === 'number' ? details.poisonous_to_pets > 0 : null,
      soil: Array.isArray(details.soil) ? details.soil : [],
      hardinessZone: details.hardiness ? `${details.hardiness.min}-${details.hardiness.max}` : null,
    };
  } catch {
    // Perenual es solo una fuente de apoyo: si falla, seguimos solo con Gemini.
    return null;
  }
}
