import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findPerenualHints } from '@/lib/perenual';
import { generateCareProfile } from '@/lib/gemini';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const {
    gardenId,
    photoUrl,
    speciesScientificName,
    speciesCommonName,
    family,
    identificationSource,
    identificationScore,
    nickname,
  } = body;

  if (!gardenId || !speciesScientificName) {
    return NextResponse.json({ error: 'Faltan gardenId o speciesScientificName' }, { status: 400 });
  }

  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .insert({
      garden_id: gardenId,
      nickname: nickname || null,
      species_scientific_name: speciesScientificName,
      species_common_name: speciesCommonName || null,
      family: family || null,
      photo_url: photoUrl || null,
      identification_source: identificationSource || 'manual',
      identification_score: identificationScore ?? null,
    })
    .select()
    .single();

  if (plantError || !plant) {
    return NextResponse.json({ error: plantError?.message ?? 'No se pudo crear la planta' }, { status: 500 });
  }

  try {
    const hints = await findPerenualHints(speciesCommonName || speciesScientificName);
    const draft = await generateCareProfile(speciesScientificName, speciesCommonName || null, hints);

    const today = new Date().toISOString().slice(0, 10);
    const { data: profile, error: profileError } = await supabase
      .from('care_profiles')
      .insert({
        plant_id: plant.id,
        ...draft,
        watering_last_done: today,
        fertilizing_last_done: today,
        pruning_last_done: today,
        source: hints ? 'hybrid' : 'gemini',
      })
      .select()
      .single();

    if (profileError) throw new Error(profileError.message);

    return NextResponse.json({ plant, careProfile: profile });
  } catch (err) {
    await supabase.from('plants').delete().eq('id', plant.id);
    return NextResponse.json(
      { error: `No se pudo generar el perfil de cuidados: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}
