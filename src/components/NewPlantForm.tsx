'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoCapture } from './PhotoCapture';
import type { PlantNetResult, PlantOrgan } from '@/lib/plantnet';

interface Props {
  gardens: { id: string; name: string }[];
  planters: { id: string; name: string; garden_id: string }[];
  defaultGardenId?: string;
  defaultPlanterId?: string;
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

export function NewPlantForm({
  gardens,
  planters,
  defaultGardenId,
  defaultPlanterId,
  defaultScientificName,
  defaultCommonName,
}: Props) {
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
  const [planterId, setPlanterId] = useState(defaultPlanterId ?? '');
  const [error, setError] = useState<string | null>(null);

  const plantersForGarden = planters.filter((p) => p.garden_id === gardenId);

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
          planterId: planterId || null,
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
                  <img src={p.url} alt="" className="h-16 w-16 rounded-xl object-cover shadow-soft" />
                  <span className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/50 text-center text-[9px] text-white">
                    {ORGAN_OPTIONS.find((o) => o.value === p.organ)?.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <div className="card flex flex-col gap-3">
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
                label={photos.length === 0 ? 'Hacer foto a la planta' : 'Añadir otra foto'}
              />
              <p className="text-center text-xs text-leaf-400">
                Puedes añadir varias fotos (hoja, flor, fruto...) para mejorar la identificación.
              </p>
            </div>
          )}

          {photos.length > 0 && (
            <button type="button" onClick={runIdentify} className="btn-primary py-3">
              🔍 Identificar con {photos.length} foto{photos.length > 1 ? 's' : ''}
            </button>
          )}

          <button type="button" onClick={skipPhoto} className="btn-ghost text-center">
            Añadir sin foto
          </button>
        </div>
      )}

      {step === 'identifying' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex gap-2">
            {photos.map((p, i) => (
              <img key={i} src={p.url} alt="" className="h-24 w-24 animate-pulse rounded-2xl object-cover shadow-soft" />
            ))}
          </div>
          <p className="text-sm font-semibold text-leaf-600">🔍 Identificando especie con PlantNet...</p>
        </div>
      )}

      {(step === 'choose' || step === 'creating') && (
        <div className="flex flex-col gap-4">
          {photos.length > 0 && (
            <div className="mx-auto flex gap-2">
              {photos.map((p, i) => (
                <img key={i} src={p.url} alt="" className="h-24 w-24 rounded-2xl object-cover shadow-soft" />
              ))}
            </div>
          )}

          {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

          {candidates.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-leaf-700">Especies identificadas:</p>
              {candidates.map((c, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border-2 p-3 text-sm transition-colors ${
                    !manual && selectedIndex === i ? 'border-leaf-500 bg-leaf-50' : 'border-leaf-100 bg-white'
                  }`}
                >
                  <span>
                    <span className="italic">{c.scientificName}</span>
                    {c.commonNames[0] && <span className="block text-xs text-leaf-500">{c.commonNames[0]}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="chip">{Math.round(c.score * 100)}%</span>
                    <input
                      type="radio"
                      name="candidate"
                      checked={!manual && selectedIndex === i}
                      onChange={() => pickCandidate(i)}
                    />
                  </span>
                </label>
              ))}
              <button type="button" onClick={() => setManual(true)} className="btn-ghost text-left text-xs">
                Ninguna es correcta, especificar manualmente
              </button>
            </div>
          )}

          {manual && (
            <div className="flex flex-col gap-2">
              <input
                placeholder="Nombre científico (ej. Monstera deliciosa)"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
              />
              <input
                placeholder="Nombre común (opcional)"
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
              />
            </div>
          )}

          <input
            placeholder="Ponle un nombre cariñoso (opcional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <select
            value={gardenId}
            onChange={(e) => {
              setGardenId(e.target.value);
              setPlanterId('');
            }}
          >
            {gardens.length === 0 && <option value="">No hay jardines, crea uno primero</option>}
            {gardens.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {plantersForGarden.length > 0 && (
            <select value={planterId} onChange={(e) => setPlanterId(e.target.value)}>
              <option value="">Sin jardinera (planta suelta)</option>
              {plantersForGarden.map((p) => (
                <option key={p.id} value={p.id}>
                  🪴 {p.name}
                </option>
              ))}
            </select>
          )}

          <button type="button" onClick={handleCreate} disabled={step === 'creating'} className="btn-primary py-3">
            {step === 'creating' ? '✨ Generando perfil de cuidados con IA...' : '🌱 Crear ficha de la planta'}
          </button>
        </div>
      )}
    </div>
  );
}
