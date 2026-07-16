'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PhotoCapture } from './PhotoCapture';
import type { Planter } from '@/lib/types';

export function PlanterHeader({ planter, gardenName }: { planter: Planter; gardenName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [name, setName] = useState(planter.name);
  const [description, setDescription] = useState(planter.description ?? '');

  async function save() {
    const supabase = createClient();
    await supabase.from('planters').update({ name, description: description || null }).eq('id', planter.id);
    setEditing(false);
    router.refresh();
  }

  async function updatePhoto(url: string) {
    const supabase = createClient();
    await supabase.from('planters').update({ photo_url: url }).eq('id', planter.id);
    setChangingPhoto(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Borrar la jardinera "${planter.name}"? Las plantas que contiene no se borran, solo dejan de estar agrupadas.`))
      return;
    const supabase = createClient();
    await supabase.from('planters').delete().eq('id', planter.id);
    router.replace(`/gardens/${planter.garden_id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href={`/gardens/${planter.garden_id}`} className="btn-ghost self-start">
        ← Volver a {gardenName}
      </Link>

      {changingPhoto ? (
        <div className="card">
          <PhotoCapture onUploaded={updatePhoto} label="Foto de la jardinera" />
          <button onClick={() => setChangingPhoto(false)} className="btn-ghost mt-2 w-full text-center">
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setChangingPhoto(true)} className="block">
          {planter.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={planter.photo_url} alt={planter.name} className="h-48 w-full rounded-2xl object-cover shadow-soft" />
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-leaf-200 bg-leaf-50 text-4xl">
              🪴
            </div>
          )}
        </button>
      )}

      {editing ? (
        <div className="card flex flex-col gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la jardinera" />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
          />
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="btn-primary flex-1">
              Guardar
            </button>
            <button onClick={() => setEditing(false)} className="btn-outline">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">{planter.name}</h1>
            {planter.description && <p className="mt-0.5 text-sm text-leaf-500">{planter.description}</p>}
          </div>
          <div className="flex gap-3 pl-2 text-sm">
            <button onClick={() => setEditing(true)} className="btn-ghost">
              Editar
            </button>
            <button onClick={remove} className="btn-danger-ghost">
              Borrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
