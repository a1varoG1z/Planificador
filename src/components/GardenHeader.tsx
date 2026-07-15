'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Garden } from '@/lib/types';

export function GardenHeader({ garden }: { garden: Garden }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(garden.name);

  async function rename() {
    const supabase = createClient();
    await supabase.from('gardens').update({ name }).eq('id', garden.id);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Borrar el jardin "${garden.name}" y todas sus plantas?`)) return;
    const supabase = createClient();
    await supabase.from('gardens').delete().eq('id', garden.id);
    router.replace('/gardens');
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between">
      {editing ? (
        <div className="flex flex-1 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <button onClick={rename} className="rounded-lg bg-leaf-600 px-3 py-1 text-sm text-white">
            Guardar
          </button>
        </div>
      ) : (
        <h1 className="text-xl font-bold text-leaf-800">{garden.name}</h1>
      )}
      <div className="flex gap-3 pl-2 text-sm text-leaf-500">
        {!editing && (
          <button onClick={() => setEditing(true)} className="underline">
            Renombrar
          </button>
        )}
        <button onClick={remove} className="text-red-500 underline">
          Borrar
        </button>
      </div>
    </div>
  );
}
