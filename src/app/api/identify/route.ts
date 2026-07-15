import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchImageAsBlob } from '@/lib/imageFetch';
import { identifyWithPlantNet } from '@/lib/plantnet';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { photoUrl, organ } = await request.json();
  if (!photoUrl) return NextResponse.json({ error: 'Falta photoUrl' }, { status: 400 });

  try {
    const blob = await fetchImageAsBlob(photoUrl);
    const results = await identifyWithPlantNet(blob, organ ?? 'auto');
    return NextResponse.json({ results: results.slice(0, 5) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
