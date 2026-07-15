export interface PlantNetResult {
  scientificName: string;
  commonNames: string[];
  family: string | null;
  genus: string | null;
  score: number;
}

export type PlantOrgan = 'leaf' | 'flower' | 'fruit' | 'bark' | 'auto';

export interface PlantNetImage {
  blob: Blob;
  organ: PlantOrgan;
}

export async function identifyWithPlantNet(images: PlantNetImage[]): Promise<PlantNetResult[]> {
  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) throw new Error('Falta PLANTNET_API_KEY en las variables de entorno');
  if (images.length === 0) throw new Error('No se ha proporcionado ninguna imagen');

  const form = new FormData();
  images.forEach((image, i) => {
    form.append('images', image.blob, `photo-${i}.jpg`);
    form.append('organs', image.organ);
  });

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
