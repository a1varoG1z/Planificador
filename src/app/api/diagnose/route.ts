import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchImageAsBase64 } from '@/lib/imageFetch';
import { assessPlantHealth } from '@/lib/plantid';
import { diagnoseWithGemini, generateRemedies } from '@/lib/gemini';

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

    let isHealthy: boolean;
    let summary: string;
    let remediesCommercial: string | null = null;
    let remediesHome: string | null = null;
    let diagnosisDetails: unknown;
    let plantIdError: string | null = null;

    try {
      // Plant.id da un diagnostico mas fiable, pero su free tier solo trae 100 creditos.
      const assessment = await assessPlantHealth(base64);
      const topDisease = assessment.diseases.sort((a, b) => b.probability - a.probability)[0];

      isHealthy = assessment.isHealthy;
      summary = 'La planta parece sana, no se han detectado problemas relevantes.';
      diagnosisDetails = { source: 'plantid', ...assessment };

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
    } catch (err) {
      // Plant.id sin creditos, sin key configurada, o caido: seguimos solo con Gemini vision.
      plantIdError = (err as Error).message;
      const aiDiagnosis = await diagnoseWithGemini(base64);
      isHealthy = aiDiagnosis.isHealthy;
      summary = `${aiDiagnosis.summary} (diagnostico generado por IA, Plant.id no disponible)`;
      remediesCommercial = aiDiagnosis.remediesCommercial;
      remediesHome = aiDiagnosis.remediesHome;
      diagnosisDetails = { source: 'gemini', plantIdError, ...aiDiagnosis };
    }

    const { data: diagnosis, error: insertError } = await supabase
      .from('diagnoses')
      .insert({
        plant_id: plantId || null,
        photo_url: photoUrl,
        is_healthy: isHealthy,
        diagnosis_summary: summary,
        diagnosis_details: diagnosisDetails,
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
