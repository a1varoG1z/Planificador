export interface PlantIdDisease {
  name: string;
  probability: number;
  description: string | null;
  cause: string | null;
  treatmentBiological: string[];
  treatmentChemical: string[];
  treatmentPrevention: string[];
}

export interface PlantIdAssessment {
  isHealthy: boolean;
  healthProbability: number;
  diseases: PlantIdDisease[];
}

export async function assessPlantHealth(base64Image: string): Promise<PlantIdAssessment> {
  const apiKey = process.env.PLANTID_API_KEY;
  if (!apiKey) throw new Error('Falta PLANTID_API_KEY en las variables de entorno');

  const res = await fetch('https://api.plant.id/v2/health_assessment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
    },
    body: JSON.stringify({
      images: [base64Image],
      modifiers: ['similar_images'],
      disease_details: ['cause', 'common_names', 'classification', 'description', 'treatment'],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Plant.id respondio ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();

  const diseases: PlantIdDisease[] = (data.health_assessment?.diseases ?? []).map((d: any) => ({
    name: d.name,
    probability: d.probability,
    description: d.disease_details?.description ?? null,
    cause: d.disease_details?.cause ?? null,
    treatmentBiological: d.disease_details?.treatment?.biological ?? [],
    treatmentChemical: d.disease_details?.treatment?.chemical ?? [],
    treatmentPrevention: d.disease_details?.treatment?.prevention ?? [],
  }));

  return {
    isHealthy: Boolean(data.health_assessment?.is_healthy?.binary),
    healthProbability: data.health_assessment?.is_healthy?.probability ?? 0,
    diseases,
  };
}
