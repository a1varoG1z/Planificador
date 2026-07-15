import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchImageAsBlob } from '@/lib/imageFetch';
import { identifyWithPlantNet } from '@/lib/plantnet';
import { generateQuickInfo } from '@/lib/gemini';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { photoUrl, locationNote, organ } = await request.json();
  if (!photoUrl) return NextResponse.json({ error: 'Falta photoUrl' }, { status: 400 });

  try {
    const blob = await fetchImageAsBlob(photoUrl);
    const results = await identifyWithPlantNet(blob, organ ?? 'auto');
    const top = results[0];

    if (!top) {
      return NextResponse.json({ error: 'No se ha podido identificar la planta en la foto' }, { status: 422 });
    }

    const commonName = top.commonNames[0] ?? null;
    const quickInfo = await generateQuickInfo(top.scientificName, commonName);

    const { data: wildFind, error: insertError } = await supabase
      .from('wild_finds')
      .insert({
        photo_url: photoUrl,
        species_scientific_name: top.scientificName,
        species_common_name: commonName,
        family: top.family,
        identification_score: top.score,
        quick_info: quickInfo,
        location_note: locationNote || null,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ wildFind, alternatives: results.slice(1, 4) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
