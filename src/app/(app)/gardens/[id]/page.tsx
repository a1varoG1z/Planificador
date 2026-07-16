import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GardenHeader } from '@/components/GardenHeader';
import { PlantGrid } from '@/components/PlantGrid';
import { PlanterGrid } from '@/components/PlanterGrid';
import { CreatePlanterForm } from '@/components/CreatePlanterForm';
import { ReplantingReminders } from '@/components/ReplantingReminders';

export default async function GardenDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: garden } = await supabase.from('gardens').select('*').eq('id', params.id).single();
  if (!garden) notFound();

  const [{ data: plants }, { data: reminders }, { data: planters }] = await Promise.all([
    supabase.from('plants').select('*').eq('garden_id', params.id).order('created_at', { ascending: false }),
    supabase
      .from('replanting_reminders')
      .select('*')
      .eq('garden_id', params.id)
      .eq('dismissed', false)
      .order('remind_date', { ascending: true }),
    supabase.from('planters').select('*').eq('garden_id', params.id).order('created_at', { ascending: true }),
  ]);

  const ungroupedPlants = (plants ?? []).filter((p) => !p.planter_id);
  const activePlants = ungroupedPlants.filter((p) => p.status === 'active');
  const inactivePlants = ungroupedPlants.filter((p) => p.status === 'inactive');

  const plantCounts = new Map<string, number>();
  for (const p of plants ?? []) {
    if (!p.planter_id) continue;
    plantCounts.set(p.planter_id, (plantCounts.get(p.planter_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <GardenHeader garden={garden} />

      <Link href={`/plants/new?gardenId=${garden.id}`} className="btn-primary py-3 text-center">
        📷 Añadir planta
      </Link>

      <ReplantingReminders reminders={reminders ?? []} />

      {planters && planters.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-leaf-400">🪴 Jardineras</p>
          <PlanterGrid planters={planters} plantCounts={plantCounts} />
        </section>
      )}

      <CreatePlanterForm gardenId={garden.id} />

      {activePlants.length === 0 && (planters?.length ?? 0) === 0 && (
        <p className="text-sm text-leaf-500">Este jardín todavía no tiene plantas activas.</p>
      )}

      {activePlants.length > 0 && (
        <section>
          {(planters?.length ?? 0) > 0 && (
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-leaf-400">🌱 Plantas sueltas</p>
          )}
          <PlantGrid plants={activePlants} />
        </section>
      )}

      {inactivePlants.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-bold text-leaf-600">
            😴 Plantas inactivas ({inactivePlants.length})
          </summary>
          <div className="mt-3">
            <PlantGrid plants={inactivePlants} dimmed />
          </div>
        </details>
      )}
    </div>
  );
}
