import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRecommendations } from '@/lib/gemini';

const LOOKBACK_DAYS = 60;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { plantId } = await request.json();
  if (!plantId) return NextResponse.json({ error: 'Falta plantId' }, { status: 400 });

  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('id, species_scientific_name, species_common_name, care_profiles(*)')
    .eq('id', plantId)
    .single();

  if (plantError || !plant) {
    return NextResponse.json({ error: plantError?.message ?? 'Planta no encontrada' }, { status: 404 });
  }

  const careProfile = Array.isArray(plant.care_profiles) ? plant.care_profiles[0] : plant.care_profiles;
  if (!careProfile) {
    return NextResponse.json({ error: 'La planta no tiene perfil de cuidados todavia' }, { status: 400 });
  }

  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const { data: completions } = await supabase
    .from('task_completions')
    .select('task_type')
    .eq('plant_id', plantId)
    .gte('completed_at', since.toISOString());

  const countByType = (type: string) => completions?.filter((c) => c.task_type === type).length ?? 0;

  const expected = (frequencyDays: number | null) =>
    frequencyDays ? Math.floor(LOOKBACK_DAYS / frequencyDays) : 0;

  const missedWaterings = Math.max(
    0,
    expected(careProfile.watering_frequency_days) - countByType('watering')
  );
  const missedFertilizings = Math.max(
    0,
    expected(careProfile.fertilizing_frequency_days) - countByType('fertilizing')
  );

  try {
    const recommendations = await generateRecommendations({
      scientificName: plant.species_scientific_name ?? 'desconocida',
      commonName: plant.species_common_name,
      careProfile,
      missedWaterings,
      missedFertilizings,
    });

    const rows = recommendations.map((content) => ({ plant_id: plantId, content }));
    const { data: inserted, error: insertError } = await supabase
      .from('recommendations')
      .insert(rows)
      .select();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ recommendations: inserted });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudieron generar recomendaciones: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}
