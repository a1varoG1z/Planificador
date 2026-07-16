import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlanterHeader } from '@/components/PlanterHeader';
import { PlantGrid } from '@/components/PlantGrid';

export default async function PlanterDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: planter } = await supabase.from('planters').select('*').eq('id', params.id).single();
  if (!planter) notFound();

  const [{ data: garden }, { data: plants }] = await Promise.all([
    supabase.from('gardens').select('name').eq('id', planter.garden_id).single(),
    supabase.from('plants').select('*').eq('planter_id', params.id).order('created_at', { ascending: false }),
  ]);

  const activePlants = (plants ?? []).filter((p) => p.status === 'active');
  const inactivePlants = (plants ?? []).filter((p) => p.status === 'inactive');

  return (
    <div className="flex flex-col gap-4">
      <PlanterHeader planter={planter} gardenName={garden?.name ?? 'jardín'} />

      <Link
        href={`/plants/new?gardenId=${planter.garden_id}&planterId=${planter.id}`}
        className="btn-primary py-3 text-center"
      >
        📷 Añadir planta a esta jardinera
      </Link>

      {activePlants.length === 0 && (
        <p className="text-sm text-leaf-500">Esta jardinera todavía no tiene plantas activas.</p>
      )}

      <PlantGrid plants={activePlants} />

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
