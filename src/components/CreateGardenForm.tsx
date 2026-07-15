'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function CreateGardenForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Vitoria-Gasteiz, España');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('gardens')
      .insert({ name, description: description || null, location: location || 'Vitoria-Gasteiz, España' });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName('');
    setDescription('');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline w-full">
        + Nuevo jardín
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-2">
      <input
        placeholder="Nombre del jardín (ej. Terraza, Salón...)"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-leaf-500">
          📍 Ubicación (para ajustar clima y épocas)
        </label>
        <input placeholder="Ciudad" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Creando...' : 'Crear'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline">
          Cancelar
        </button>
      </div>
    </form>
  );
}
