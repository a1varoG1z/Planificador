'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoCapture } from './PhotoCapture';
import type { PlantNetResult, PlantOrgan } from '@/lib/plantnet';

interface Props {
  gardens: { id: string; name: string }[];
  defaultGardenId?: string;
  defaultScientificName?: string;
  defaultCommonName?: string;
}

type Step = 'photo' | 'identifying' | 'choose' | 'creating';
type CapturedPhoto = { url: string; organ: PlantOrgan };

const ORGAN_OPTIONS: { value: PlantOrgan; label: string }[] = [
  { value: 'auto', label: 'Automatico' },
  { value: 'leaf', label: 'Hoja' },
  { value: 'flower', label: 'Flor' },
  { value: 'fruit', label: 'Fruto' },
  { value: 'bark', label: 'Corteza' },
];

const MAX_PHOTOS = 4;

export function NewPlantForm({ gardens, defaultGardenId, defaultScientificName, defaultCommonName }: Props) {
  const router = useRouter();
  const prefilled = Boolean(defaultScientificName);

  const [step, setStep] = useState<Step>(prefilled ? 'choose' : 'photo');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [nextOrgan, setNextOrgan] = useState<PlantOrgan>('auto');
  const [candidates, setCandidates] = useState<PlantNetResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [manual, setManual] = useState(prefilled);
  const [scientificName, setScientificName] = useState(defaultScientificName ?? '');
  const [commonName, setCommonName] = useState(defaultCommonName ?? '');
  const [nickname, setNickname] = useState('');
  const [gardenId, setGardenId] = useState(defaultGardenId ?? gardens[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  function addPhoto(url: string) {
    setPhotos((prev) => [...prev, { url, organ: nextOrgan }]);
  }

  function skipPhoto() {
    setManual(true);
    setStep('choose');
  }

  async function runIdentify() {
    setStep('identifying');
    setError(null);
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: photos.map((p) => ({ url: p.url, organ: p.organ })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al identificar la planta');
      setCandidates(data.results ?? []);
      if (data.results?.length) {
        setSelectedIndex(0);
        setManual(false);
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
          photos: photos.map((p) => ({ url: p.url, organ: p.organ })),
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
      {step === 'photo' && (
        <div className="flex flex-col gap-3">
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} alt="" className="h-16 w-16 rounded-lg object-cover shadow" />
                  <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/50 text-center text-[9px] text-white">
                    {ORGAN_OPTIONS.find((o) => o.value === p.organ)?.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <>
              <select value={nextOrgan} onChange={(e) => setNextOrgan(e.target.value as PlantOrgan)}>
                {ORGAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    Parte de la foto: {o.label}
                  </option>
                ))}
              </select>
              <PhotoCapture
                key={photos.length}
                onUploaded={addPhoto}
                label={photos.length === 0 ? 'Hacer foto a la planta' : 'Anadir otra foto'}
              />
              <p className="text-center text-xs text-leaf-400">
                Puedes anadir varias fotos (hoja, flor, fruto...) para mejorar la identificacion.
              </p>
            </>
          )}

          {photos.length > 0 && (
            <button
              type="button"
              onClick={runIdentify}
              className="rounded-lg bg-leaf-600 py-3 font-semibold text-white hover:bg-leaf-700"
            >
              Identificar con {photos.length} foto{photos.length > 1 ? 's' : ''}
            </button>
          )}

          <button type="button" onClick={skipPhoto} className="text-center text-sm text-leaf-500 underline">
            Anadir sin foto
          </button>
        </div>
      )}

      {step === 'identifying' && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {photos.map((p, i) => (
              <img key={i} src={p.url} alt="" className="h-24 w-24 rounded-xl object-cover shadow" />
            ))}
          </div>
          <p className="text-sm text-leaf-600">Identificando especie con PlantNet...</p>
        </div>
      )}

      {(step === 'choose' || step === 'creating') && (
        <div className="flex flex-col gap-4">
          {photos.length > 0 && (
            <div className="mx-auto flex gap-2">
              {photos.map((p, i) => (
                <img key={i} src={p.url} alt="" className="h-24 w-24 rounded-xl object-cover shadow" />
              ))}
            </div>
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
