export interface PlantNetResult {
  scientificName: string;
  commonNames: string[];
  family: string | null;
  genus: string | null;
  score: number;
}

export async function identifyWithPlantNet(
  imageBlob: Blob,
  organ: 'leaf' | 'flower' | 'fruit' | 'bark' | 'auto' = 'auto'
): Promise<PlantNetResult[]> {
  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) throw new Error('Falta PLANTNET_API_KEY en las variables de entorno');

  const form = new FormData();
  form.append('images', imageBlob, 'photo.jpg');
  form.append('organs', organ);

  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=es&no-reject=false`;

  const res = await fetch(url, { method: 'POST', body: form });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`PlantNet respondio ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    results: Array<{
      score: number;
      species: {
        scientificNameWithoutAuthor: string;
        commonNames: string[];
        family: { scientificNameWithoutAuthor: string } | null;
        genus: { scientificNameWithoutAuthor: string } | null;
      };
    }>;
  };

  return (data.results ?? []).map((r) => ({
    scientificName: r.species.scientificNameWithoutAuthor,
    commonNames: r.species.commonNames ?? [],
    family: r.species.family?.scientificNameWithoutAuthor ?? null,
    genus: r.species.genus?.scientificNameWithoutAuthor ?? null,
    score: r.score,
  }));
}
