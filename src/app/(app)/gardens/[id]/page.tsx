import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GardenHeader } from '@/components/GardenHeader';
import { PlantGrid } from '@/components/PlantGrid';
import { ReplantingReminders } from '@/components/ReplantingReminders';

export default async function GardenDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: garden } = await supabase.from('gardens').select('*').eq('id', params.id).single();
  if (!garden) notFound();

  const [{ data: plants }, { data: reminders }] = await Promise.all([
    supabase.from('plants').select('*').eq('garden_id', params.id).order('created_at', { ascending: false }),
    supabase
      .from('replanting_reminders')
      .select('*')
      .eq('garden_id', params.id)
      .eq('dismissed', false)
      .order('remind_date', { ascending: true }),
  ]);

  const activePlants = (plants ?? []).filter((p) => p.status === 'active');
  const inactivePlants = (plants ?? []).filter((p) => p.status === 'inactive');

  return (
    <div className="flex flex-col gap-4">
      <GardenHeader garden={garden} />

      <Link
        href={`/plants/new?gardenId=${garden.id}`}
        className="flex items-center justify-center gap-2 rounded-xl bg-leaf-600 py-3 text-sm font-semibold text-white shadow hover:bg-leaf-700"
      >
        📷 Anadir planta
      </Link>

      <ReplantingReminders reminders={reminders ?? []} />

      {activePlants.length === 0 && (
        <p className="text-sm text-leaf-500">Este jardin todavia no tiene plantas activas.</p>
      )}

      <PlantGrid plants={activePlants} />

      {inactivePlants.length > 0 && (
        <details className="rounded-xl bg-white p-3 shadow">
          <summary className="cursor-pointer text-sm font-semibold text-leaf-600">
            Plantas inactivas ({inactivePlants.length})
          </summary>
          <div className="mt-3">
            <PlantGrid plants={inactivePlants} dimmed />
          </div>
        </details>
      )}
    </div>
  );
}
