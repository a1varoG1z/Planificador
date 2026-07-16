'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Harvest } from '@/lib/types';

export function HarvestSection({ plantId, harvests }: { plantId: string; harvests: Harvest[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [showForm, setShowForm] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('unidades');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const totalsByUnit = new Map<string, number>();
  for (const h of harvests) {
    totalsByUnit.set(h.unit, (totalsByUnit.get(h.unit) ?? 0) + Number(h.quantity));
  }

  async function addHarvest(qty: number, u: string, n: string | null) {
    setBusy(true);
    await supabase.from('harvests').insert({ plant_id: plantId, quantity: qty, unit: u, notes: n });
    setBusy(false);
    setShowForm(false);
    setQuantity('1');
    setNotes('');
    router.refresh();
  }

  async function removeHarvest(id: string) {
    await supabase.from('harvests').delete().eq('id', id);
    router.refresh();
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">🍅 Cosechas</h2>
        <button
          onClick={() => addHarvest(1, 'unidades', null)}
          disabled={busy}
          className="btn-secondary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
        >
          +1 recogido
        </button>
      </div>

      {totalsByUnit.size > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {[...totalsByUnit.entries()].map(([u, total]) => (
            <span key={u} className="chip">
              {total} {u} en total
            </span>
          ))}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-ghost">
          Registrar con cantidad/nota
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-24"
              placeholder="Cantidad"
            />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className="flex-1" placeholder="Unidad (kg, unidades...)" />
          </div>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nota (opcional)" />
          <div className="flex gap-2">
            <button
              onClick={() => addHarvest(parseFloat(quantity) || 1, unit || 'unidades', notes || null)}
              disabled={busy}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Registrar
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {harvests.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {harvests.slice(0, 8).map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-2 text-xs text-leaf-600">
              <span>
                {new Date(h.harvested_at).toLocaleDateString('es-ES')} · {h.quantity} {h.unit}
                {h.notes ? ` · ${h.notes}` : ''}
              </span>
              <button onClick={() => removeHarvest(h.id)} className="shrink-0 text-rose-400 underline">
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
