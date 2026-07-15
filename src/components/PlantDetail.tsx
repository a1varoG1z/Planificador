'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PhotoCapture } from './PhotoCapture';
import { PlantPhotoGallery } from './PlantPhotoGallery';
import type { CareProfile, Diagnosis, Plant, PlantPhoto, Recommendation, TaskType } from '@/lib/types';

interface Props {
  plant: Plant;
  careProfile: CareProfile | null;
  gardens: { id: string; name: string }[];
  diagnoses: Diagnosis[];
  recommendations: Recommendation[];
  photos: PlantPhoto[];
}

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const TASKS: { type: TaskType; label: string; icon: string }[] = [
  { type: 'watering', label: 'Regado hoy', icon: '💧' },
  { type: 'fertilizing', label: 'Abonado hoy', icon: '🌱' },
  { type: 'pruning', label: 'Podado hoy', icon: '✂️' },
];

const FIELD_LABEL = 'text-xs font-semibold uppercase tracking-wide text-leaf-500';

export function PlantDetail({ plant, careProfile, gardens, diagnoses, recommendations, photos }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(plant.nickname ?? '');
  const [scientificName, setScientificName] = useState(plant.species_scientific_name ?? '');
  const [commonName, setCommonName] = useState(plant.species_common_name ?? '');
  const [gardenId, setGardenId] = useState(plant.garden_id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<Diagnosis | null>(null);

  async function saveEdits() {
    setBusy('saving');
    setError(null);
    const speciesChanged = scientificName.trim() !== (plant.species_scientific_name ?? '').trim();

    const { error: updateError } = await supabase
      .from('plants')
      .update({
        nickname: nickname || null,
        species_scientific_name: scientificName || null,
        species_common_name: commonName || null,
        garden_id: gardenId,
      })
      .eq('id', plant.id);

    if (updateError) {
      setError(updateError.message);
      setBusy(null);
      return;
    }

    setEditing(false);

    if (speciesChanged && scientificName.trim()) {
      const regenerate = confirm(
        'Has cambiado la especie de la planta. Quieres regenerar el perfil de cuidados para la nueva especie?'
      );
      if (regenerate) {
        await regenerateProfile();
        setBusy(null);
        return;
      }
    }

    setBusy(null);
    router.refresh();
  }

  async function regenerateProfile() {
    setBusy('regenerating');
    setError(null);
    try {
      const res = await fetch('/api/care-profile/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: plant.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo regenerar el perfil');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deletePlant() {
    if (!confirm(`Borrar "${plant.nickname || plant.species_scientific_name}"? Esta accion no se puede deshacer.`))
      return;
    await supabase.from('plants').delete().eq('id', plant.id);
    router.push(`/gardens/${plant.garden_id}`);
    router.refresh();
  }

  async function completeTask(type: TaskType) {
    setBusy(type);
    const today = new Date().toISOString().slice(0, 10);
    const field = `${type}_last_done`;
    await supabase.from('care_profiles').update({ [field]: today }).eq('plant_id', plant.id);
    await supabase.from('task_completions').insert({ plant_id: plant.id, task_type: type });
    setBusy(null);
    router.refresh();
  }

  async function generateRecommendations() {
    setBusy('recommendations');
    setError(null);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: plant.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron generar recomendaciones');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function dismissRecommendation(id: string) {
    await supabase.from('recommendations').update({ dismissed: true }).eq('id', id);
    router.refresh();
  }

  async function addRecommendationToShoppingList(content: string) {
    await supabase.from('shopping_list').insert({ item: content, plant_id: plant.id });
    alert('Anadido a la lista de la compra');
  }

  async function archivePlant() {
    if (!confirm(`Marcar "${title}" como inactiva? Se dejaran de generar tareas de riego/abono/poda para ella.`))
      return;
    setBusy('archiving');
    setError(null);
    try {
      const res = await fetch('/api/plants/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: plant.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo archivar la planta');
      if (data.reminderCreated) {
        alert(
          `Como es una planta de ciclo ${data.lifeCycle === 'annual' ? 'anual' : 'bienal'}, se ha anadido un recordatorio en el calendario para volver a plantarla en ${MONTH_NAMES[data.remindMonth - 1]}.`
        );
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reactivatePlant() {
    setBusy('reactivating');
    await supabase.from('plants').update({ status: 'active' }).eq('id', plant.id);
    setBusy(null);
    router.refresh();
  }

  async function handleDiagnosePhoto(photoUrl: string) {
    setDiagnosing(true);
    setError(null);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, plantId: plant.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo analizar la foto');
      setDiagnosisResult(data.diagnosis);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDiagnosing(false);
    }
  }

  const title = plant.nickname || plant.species_common_name || plant.species_scientific_name || 'Planta';

  return (
    <div className="flex flex-col gap-5">
      {plant.photo_url && (
        <img src={plant.photo_url} alt={title} className="h-56 w-full rounded-xl object-cover shadow" />
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!editing ? (
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-leaf-800">{title}</h1>
              {plant.status === 'inactive' && (
                <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-medium text-leaf-500">
                  Inactiva
                </span>
              )}
            </div>
            {plant.species_scientific_name && (
              <p className="text-sm italic text-leaf-500">{plant.species_scientific_name}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            <button onClick={() => setEditing(true)} className="text-leaf-600 underline">
              Editar
            </button>
            {plant.status === 'active' ? (
              <button onClick={archivePlant} disabled={busy === 'archiving'} className="text-leaf-500 underline disabled:opacity-50">
                Marcar inactiva
              </button>
            ) : (
              <button onClick={reactivatePlant} disabled={busy === 'reactivating'} className="text-leaf-600 underline disabled:opacity-50">
                Reactivar
              </button>
            )}
            <button onClick={deletePlant} className="text-red-500 underline">
              Quitar del jardin
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow">
          <label className={FIELD_LABEL}>Apodo</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <label className={FIELD_LABEL}>Nombre cientifico</label>
          <input value={scientificName} onChange={(e) => setScientificName(e.target.value)} />
          <label className={FIELD_LABEL}>Nombre comun</label>
          <input value={commonName} onChange={(e) => setCommonName(e.target.value)} />
          <label className={FIELD_LABEL}>Jardin</label>
          <select value={gardenId} onChange={(e) => setGardenId(e.target.value)}>
            {gardens.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <button
              onClick={saveEdits}
              disabled={busy === 'saving'}
              className="flex-1 rounded-lg bg-leaf-600 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === 'saving' ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setEditing(false)} className="rounded-lg border border-leaf-300 px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tareas rapidas */}
      <div className="grid grid-cols-3 gap-2">
        {TASKS.map((t) => (
          <button
            key={t.type}
            onClick={() => completeTask(t.type)}
            disabled={busy === t.type || !careProfile}
            className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 text-xs font-medium text-leaf-700 shadow disabled:opacity-50"
          >
            <span className="text-xl">{t.icon}</span>
            {busy === t.type ? '...' : t.label}
          </button>
        ))}
      </div>

      {/* Perfil de cuidados */}
      <section className="rounded-xl bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-leaf-800">Perfil de cuidados</h2>
          <button
            onClick={regenerateProfile}
            disabled={busy === 'regenerating'}
            className="text-xs text-leaf-500 underline disabled:opacity-50"
          >
            {busy === 'regenerating' ? 'Regenerando...' : careProfile ? 'Regenerar' : 'Generar'}
          </button>
        </div>

        {!careProfile && <p className="text-sm text-leaf-500">Todavia no hay perfil de cuidados generado.</p>}

        {careProfile && (
          <div className="flex flex-col gap-3 text-sm">
            <CareField label="💧 Riego" freq={careProfile.watering_frequency_days} notes={careProfile.watering_notes} />
            <CareField
              label="🌱 Abono"
              freq={careProfile.fertilizing_frequency_days}
              notes={careProfile.fertilizing_notes}
            />
            <CareField
              label="✂️ Poda"
              freq={careProfile.pruning_frequency_days}
              notes={careProfile.pruning_notes}
              extra={careProfile.pruning_season ? `Epoca: ${careProfile.pruning_season}` : undefined}
            />
            <CareField label="☀️ Luz" notes={careProfile.light_notes} />
            <CareField
              label="🌡️ Temperatura"
              notes={careProfile.temperature_notes}
              extra={
                careProfile.temperature_min != null
                  ? `Rango ideal: ${careProfile.temperature_min}-${careProfile.temperature_max} C`
                  : undefined
              }
            />
            <CareField label="💦 Humedad" notes={careProfile.humidity_notes} />
            <CareField label="🪴 Sustrato" notes={careProfile.soil_notes} />
            <CareField label="🌿 Reproduccion" notes={careProfile.propagation_notes} />
            <CareField label="🌸 Mejorar floracion/fruto" notes={careProfile.flowering_fruit_tips} />
            <CareField label="⚠️ Toxicidad" notes={careProfile.toxicity_notes} />
            <CareField
              label="🔁 Ciclo de vida"
              notes={careProfile.replanting_notes}
              extra={
                careProfile.life_cycle
                  ? `${{ annual: 'Anual', biennial: 'Bienal', perennial: 'Perenne' }[careProfile.life_cycle]}${
                      careProfile.replant_month ? ` · replantar en ${MONTH_NAMES[careProfile.replant_month - 1]}` : ''
                    }`
                  : undefined
              }
            />
          </div>
        )}
      </section>

      <PlantPhotoGallery plantId={plant.id} photos={photos} />

      {/* Recomendaciones IA */}
      <section className="rounded-xl bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-leaf-800">Propuestas de mejora</h2>
          <button
            onClick={generateRecommendations}
            disabled={busy === 'recommendations' || !careProfile}
            className="text-xs text-leaf-500 underline disabled:opacity-50"
          >
            {busy === 'recommendations' ? 'Generando...' : 'Generar con IA'}
          </button>
        </div>
        {recommendations.length === 0 && (
          <p className="text-sm text-leaf-500">Sin recomendaciones activas.</p>
        )}
        <ul className="flex flex-col gap-2">
          {recommendations.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg bg-leaf-50 p-3 text-sm">
              <span>{r.content}</span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <button onClick={() => addRecommendationToShoppingList(r.content)} className="text-leaf-500 underline">
                  + Compra
                </button>
                <button onClick={() => dismissRecommendation(r.id)} className="text-leaf-400 underline">
                  Descartar
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Diagnostico de enfermedades */}
      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 font-bold text-leaf-800">Diagnostico de plagas y enfermedades</h2>
        <PhotoCapture onUploaded={handleDiagnosePhoto} label="Foto para diagnosticar" />
        {diagnosing && <p className="mt-2 text-center text-sm text-leaf-600">Analizando con IA...</p>}

        {diagnosisResult && (
          <div className="mt-3 rounded-lg bg-leaf-50 p-3 text-sm">
            <p className="font-medium">{diagnosisResult.diagnosis_summary}</p>
            {diagnosisResult.remedies_commercial && (
              <p className="mt-2">
                <span className="font-semibold">Remedios comerciales: </span>
                {diagnosisResult.remedies_commercial}
              </p>
            )}
            {diagnosisResult.remedies_home && (
              <p className="mt-2">
                <span className="font-semibold">Remedios caseros: </span>
                {diagnosisResult.remedies_home}
              </p>
            )}
          </div>
        )}

        {diagnoses.length > 0 && (
          <div className="mt-4">
            <p className={FIELD_LABEL}>Historial</p>
            <ul className="mt-1 flex flex-col gap-2">
              {diagnoses.map((d) => (
                <li key={d.id} className="text-xs text-leaf-600">
                  {new Date(d.created_at).toLocaleDateString('es-ES')} - {d.diagnosis_summary}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function CareField({
  label,
  freq,
  notes,
  extra,
}: {
  label: string;
  freq?: number | null;
  notes?: string | null;
  extra?: string;
}) {
  if (!notes && !freq && !extra) return null;
  return (
    <div>
      <p className="font-semibold text-leaf-700">
        {label}
        {freq ? ` · cada ${freq} dias` : ''}
      </p>
      {extra && <p className="text-xs text-leaf-500">{extra}</p>}
      {notes && <p className="text-leaf-600">{notes}</p>}
    </div>
  );
}
