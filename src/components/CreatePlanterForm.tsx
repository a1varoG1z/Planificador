'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PhotoCapture } from './PhotoCapture';

export function CreatePlanterForm({ gardenId }: { gardenId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('planters')
      .insert({ garden_id: gardenId, name, description: description || null, photo_url: photoUrl });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName('');
    setDescription('');
    setPhotoUrl(null);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline w-full">
        + Nueva jardinera
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <PhotoCapture onUploaded={setPhotoUrl} label="Foto de la jardinera" />
      <input
        placeholder="Nombre (ej. Jardinera 1, Maceta grande...)"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
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
