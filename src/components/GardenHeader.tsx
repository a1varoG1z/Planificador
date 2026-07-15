'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Garden } from '@/lib/types';

export function GardenHeader({ garden }: { garden: Garden }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(garden.name);
  const [location, setLocation] = useState(garden.location);

  async function save() {
    const supabase = createClient();
    await supabase.from('gardens').update({ name, location }).eq('id', garden.id);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Borrar el jardín "${garden.name}" y todas sus plantas?`)) return;
    const supabase = createClient();
    await supabase.from('gardens').delete().eq('id', garden.id);
    router.replace('/gardens');
    router.refresh();
  }

  if (editing) {
    return (
      <div className="card flex flex-col gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del jardín" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ubicación" />
        <div className="flex gap-2 pt-1">
          <button onClick={save} className="btn-primary flex-1">
            Guardar
          </button>
          <button onClick={() => setEditing(false)} className="btn-outline">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="page-title">{garden.name}</h1>
        <p className="mt-0.5 text-sm text-leaf-500">📍 {garden.location}</p>
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
  );
}
