import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchImageAsBlob } from '@/lib/imageFetch';
import { identifyWithPlantNet, type PlantOrgan } from '@/lib/plantnet';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const images: { url: string; organ?: PlantOrgan }[] = body.images ?? (body.photoUrl ? [{ url: body.photoUrl, organ: body.organ }] : []);

  if (images.length === 0) return NextResponse.json({ error: 'Falta al menos una foto' }, { status: 400 });

  try {
    const plantNetImages = await Promise.all(
      images.map(async (img) => ({
        blob: await fetchImageAsBlob(img.url),
        organ: img.organ ?? 'auto',
      }))
    );
    const results = await identifyWithPlantNet(plantNetImages);
    return NextResponse.json({ results: results.slice(0, 5) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
