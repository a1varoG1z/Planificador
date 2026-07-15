'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PhotoCapture } from './PhotoCapture';
import type { PlantPhoto } from '@/lib/types';

export function PlantPhotoGallery({ plantId, photos }: { plantId: string; photos: PlantPhoto[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function handleUploaded(url: string) {
    setAdding(true);
    const supabase = createClient();
    await supabase.from('plant_photos').insert({ plant_id: plantId, photo_url: url });
    await supabase.from('plants').update({ photo_url: url }).eq('id', plantId);
    setAdding(false);
    router.refresh();
  }

  return (
    <section className="card">
      <h2 className="section-title mb-3">📸 Historial de fotos</h2>

      {photos.length === 0 && <p className="mb-3 text-sm text-leaf-500">Todavía no hay fotos guardadas.</p>}

      {photos.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p) => (
            <div key={p.id} className="shrink-0">
              <img src={p.photo_url} alt="" className="h-24 w-24 rounded-2xl object-cover shadow-soft" />
              <p className="mt-1 text-center text-[10px] text-leaf-400">
                {new Date(p.taken_at).toLocaleDateString('es-ES')}
              </p>
            </div>
          ))}
        </div>
      )}

      {!adding && <PhotoCapture onUploaded={handleUploaded} label="Añadir foto" />}
      {adding && <p className="text-center text-sm text-leaf-600">Guardando foto...</p>}
    </section>
  );
}
