import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchImageAsBase64 } from '@/lib/imageFetch';
import { assessPlantHealth } from '@/lib/plantid';
import { generateRemedies } from '@/lib/gemini';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { photoUrl, plantId } = await request.json();
  if (!photoUrl) return NextResponse.json({ error: 'Falta photoUrl' }, { status: 400 });

  try {
    const base64 = await fetchImageAsBase64(photoUrl);
    const assessment = await assessPlantHealth(base64);

    let remediesCommercial: string | null = null;
    let remediesHome: string | null = null;
    let summary = 'La planta parece sana, no se han detectado problemas relevantes.';

    const topDisease = assessment.diseases.sort((a, b) => b.probability - a.probability)[0];

    if (!assessment.isHealthy && topDisease) {
      summary = `Posible problema detectado: ${topDisease.name} (confianza ${Math.round(topDisease.probability * 100)}%).`;
      const remedies = await generateRemedies({
        diseaseName: topDisease.name,
        description: topDisease.description,
        cause: topDisease.cause,
        plantnitTreatment: {
          biological: topDisease.treatmentBiological,
          chemical: topDisease.treatmentChemical,
          prevention: topDisease.treatmentPrevention,
        },
      });
      remediesCommercial = remedies.commercial;
      remediesHome = remedies.home;
    }

    const { data: diagnosis, error: insertError } = await supabase
      .from('diagnoses')
      .insert({
        plant_id: plantId || null,
        photo_url: photoUrl,
        is_healthy: assessment.isHealthy,
        diagnosis_summary: summary,
        diagnosis_details: assessment,
        remedies_commercial: remediesCommercial,
        remedies_home: remediesHome,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ diagnosis });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
