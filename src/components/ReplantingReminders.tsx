'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ReplantingReminder } from '@/lib/types';

export function ReplantingReminders({ reminders }: { reminders: ReplantingReminder[] }) {
  const router = useRouter();
  const supabase = createClient();

  if (reminders.length === 0) return null;

  async function dismiss(id: string) {
    await supabase.from('replanting_reminders').update({ dismissed: true }).eq('id', id);
    router.refresh();
  }

  return (
    <section className="card bg-amber-50/80">
      <h2 className="section-title mb-2">🔁 Recordatorios de replantación</h2>
      <ul className="flex flex-col gap-2">
        {reminders.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 text-sm shadow-sm">
            <div>
              <p className="font-bold text-leaf-800">{r.species_common_name || r.species_scientific_name}</p>
              <p className="text-xs text-leaf-500">
                Plantar sobre el {new Date(r.remind_date).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-xs">
              <Link
                href={`/plants/new?gardenId=${r.garden_id}&scientificName=${encodeURIComponent(
                  r.species_scientific_name ?? ''
                )}&commonName=${encodeURIComponent(r.species_common_name ?? '')}`}
                className="btn-primary px-3 py-1.5"
              >
                Plantar ahora
              </Link>
              <button onClick={() => dismiss(r.id)} className="text-leaf-400 underline">
                Descartar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
