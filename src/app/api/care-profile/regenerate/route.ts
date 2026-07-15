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

  const { plantId } = await request.json();
  if (!plantId) return NextResponse.json({ error: 'Falta plantId' }, { status: 400 });

  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('id, species_scientific_name, species_common_name, gardens(location)')
    .eq('id', plantId)
    .single();

  if (plantError || !plant) {
    return NextResponse.json({ error: plantError?.message ?? 'Planta no encontrada' }, { status: 404 });
  }
  if (!plant.species_scientific_name) {
    return NextResponse.json({ error: 'La planta no tiene nombre de especie definido' }, { status: 400 });
  }

  const gardenInfo = Array.isArray(plant.gardens) ? plant.gardens[0] : plant.gardens;
  const location = gardenInfo?.location || 'Vitoria-Gasteiz, España';

  try {
    const hints = await findPerenualHints(plant.species_common_name || plant.species_scientific_name);
    const draft = await generateCareProfile(plant.species_scientific_name, plant.species_common_name, hints, location);

    const { data: profile, error: profileError } = await supabase
      .from('care_profiles')
      .upsert(
        {
          plant_id: plant.id,
          ...draft,
          source: hints ? 'hybrid' : 'gemini',
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'plant_id' }
      )
      .select()
      .single();

    if (profileError) throw new Error(profileError.message);

    return NextResponse.json({ careProfile: profile });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo regenerar el perfil: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}
