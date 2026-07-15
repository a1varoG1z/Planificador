'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoCapture } from './PhotoCapture';
import type { PlantNetResult } from '@/lib/plantnet';

interface Props {
  gardens: { id: string; name: string }[];
  defaultGardenId?: string;
}

type Step = 'photo' | 'identifying' | 'choose' | 'creating';

export function NewPlantForm({ gardens, defaultGardenId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('photo');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlantNetResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  const [scientificName, setScientificName] = useState('');
  const [commonName, setCommonName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gardenId, setGardenId] = useState(defaultGardenId ?? gardens[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoUploaded(url: string) {
    setPhotoUrl(url);
    setStep('identifying');
    setError(null);
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al identificar la planta');
      setCandidates(data.results ?? []);
      if (data.results?.length) {
        setSelectedIndex(0);
        setScientificName(data.results[0].scientificName);
        setCommonName(data.results[0].commonNames[0] ?? '');
      } else {
        setManual(true);
      }
      setStep('choose');
    } catch (err) {
      setError((err as Error).message);
      setManual(true);
      setStep('choose');
    }
  }

  function pickCandidate(i: number) {
    setSelectedIndex(i);
    setManual(false);
    setScientificName(candidates[i].scientificName);
    setCommonName(candidates[i].commonNames[0] ?? '');
  }

  async function handleCreate() {
    if (!gardenId) {
      setError('Selecciona un jardin');
      return;
    }
    if (!scientificName.trim()) {
      setError('Indica al menos el nombre cientifico o comun de la planta');
      return;
    }
    setStep('creating');
    setError(null);
    try {
      const chosen = !manual && selectedIndex !== null ? candidates[selectedIndex] : null;
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gardenId,
          photoUrl,
          nickname,
          speciesScientificName: scientificName,
          speciesCommonName: commonName || null,
          family: chosen?.family ?? null,
          identificationSource: chosen ? 'plantnet' : 'manual',
          identificationScore: chosen?.score ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la planta');
      router.push(`/plants/${data.plant.id}`);
    } catch (err) {
      setError((err as Error).message);
      setStep('choose');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {step === 'photo' && <PhotoCapture onUploaded={handlePhotoUploaded} label="Hacer foto a la planta" />}

      {step === 'identifying' && (
        <div className="flex flex-col items-center gap-3">
          {photoUrl && <img src={photoUrl} alt="" className="h-48 w-48 rounded-xl object-cover shadow" />}
          <p className="text-sm text-leaf-600">Identificando especie con PlantNet...</p>
        </div>
      )}

      {(step === 'choose' || step === 'creating') && (
        <div className="flex flex-col gap-4">
          {photoUrl && (
            <img src={photoUrl} alt="" className="mx-auto h-40 w-40 rounded-xl object-cover shadow" />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {candidates.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-leaf-700">Especies identificadas:</p>
              {candidates.map((c, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm ${
                    !manual && selectedIndex === i ? 'border-leaf-600 bg-leaf-50' : 'border-leaf-200'
                  }`}
                >
                  <span>
                    <span className="italic">{c.scientificName}</span>
                    {c.commonNames[0] && <span className="block text-xs text-leaf-500">{c.commonNames[0]}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-leaf-500">{Math.round(c.score * 100)}%</span>
                    <input
                      type="radio"
                      name="candidate"
                      checked={!manual && selectedIndex === i}
                      onChange={() => pickCandidate(i)}
                    />
                  </span>
                </label>
              ))}
              <button type="button" onClick={() => setManual(true)} className="text-left text-xs text-leaf-500 underline">
                Ninguna es correcta, especificar manualmente
              </button>
            </div>
          )}

          {manual && (
            <div className="flex flex-col gap-2">
              <input
                placeholder="Nombre cientifico (ej. Monstera deliciosa)"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
              />
              <input
                placeholder="Nombre comun (opcional)"
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
              />
            </div>
          )}

          <input
            placeholder="Ponle un nombre carinoso (opcional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <select value={gardenId} onChange={(e) => setGardenId(e.target.value)}>
            {gardens.length === 0 && <option value="">No hay jardines, crea uno primero</option>}
            {gardens.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleCreate}
            disabled={step === 'creating'}
            className="rounded-lg bg-leaf-600 py-3 font-semibold text-white hover:bg-leaf-700 disabled:opacity-50"
          >
            {step === 'creating' ? 'Generando perfil de cuidados con IA...' : 'Crear ficha de la planta'}
          </button>
        </div>
      )}
    </div>
  );
}
