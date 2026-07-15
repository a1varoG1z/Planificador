'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoCapture } from './PhotoCapture';
import type { WildFind } from '@/lib/types';

interface Props {
  gardens: { id: string; name: string }[];
  wildFinds: WildFind[];
}

export function WildIdentify({ gardens, wildFinds }: Props) {
  const router = useRouter();
  const [identifying, setIdentifying] = useState(false);
  const [result, setResult] = useState<WildFind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gardenId, setGardenId] = useState(gardens[0]?.id ?? '');
  const [addingToGarden, setAddingToGarden] = useState(false);

  async function handlePhotoUploaded(photoUrl: string) {
    setIdentifying(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/wild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo identificar la planta');
      setResult(data.wildFind);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIdentifying(false);
    }
  }

  async function addToGarden(find: WildFind) {
    if (!gardenId) {
      setError('Crea primero un jardin desde la pestana Jardines');
      return;
    }
    setAddingToGarden(true);
    setError(null);
    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gardenId,
          photoUrl: find.photo_url,
          speciesScientificName: find.species_scientific_name,
          speciesCommonName: find.species_common_name,
          family: find.family,
          identificationSource: 'plantnet',
          identificationScore: find.identification_score,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo anadir la planta al jardin');
      router.push(`/plants/${data.plant.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAddingToGarden(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <PhotoCapture onUploaded={handlePhotoUploaded} label="Fotografiar planta" />
        {identifying && <p className="mt-2 text-center text-sm text-leaf-600">Identificando...</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="rounded-xl bg-leaf-50 p-4 shadow">
          <p className="font-semibold text-leaf-800">
            {result.species_common_name || result.species_scientific_name}
          </p>
          {result.species_scientific_name && (
            <p className="text-sm italic text-leaf-500">{result.species_scientific_name}</p>
          )}
          {result.quick_info && <p className="mt-2 text-sm text-leaf-700">{result.quick_info}</p>}

          {gardens.length > 0 && (
            <div className="mt-3 flex gap-2">
              <select value={gardenId} onChange={(e) => setGardenId(e.target.value)} className="flex-1">
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => addToGarden(result)}
                disabled={addingToGarden}
                className="rounded-lg bg-leaf-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {addingToGarden ? '...' : '+ Mi jardin'}
              </button>
            </div>
          )}
        </div>
      )}

      {wildFinds.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-leaf-500">
            Descubrimientos anteriores
          </p>
          <ul className="flex flex-col gap-2">
            {wildFinds.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
                {f.photo_url && (
                  <img src={f.photo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-leaf-800">
                    {f.species_common_name || f.species_scientific_name}
                  </p>
                  <p className="text-xs text-leaf-400">{new Date(f.found_at).toLocaleDateString('es-ES')}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
