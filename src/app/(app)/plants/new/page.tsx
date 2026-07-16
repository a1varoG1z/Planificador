import { createClient } from '@/lib/supabase/server';
import { NewPlantForm } from '@/components/NewPlantForm';

export default async function NewPlantPage({
  searchParams,
}: {
  searchParams: { gardenId?: string; planterId?: string; scientificName?: string; commonName?: string };
}) {
  const supabase = createClient();
  const [{ data: gardens }, { data: planters }] = await Promise.all([
    supabase.from('gardens').select('id, name').order('name'),
    supabase.from('planters').select('id, name, garden_id').order('name'),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Añadir planta 🌱</h1>
      <NewPlantForm
        gardens={gardens ?? []}
        planters={planters ?? []}
        defaultGardenId={searchParams.gardenId}
        defaultPlanterId={searchParams.planterId}
        defaultScientificName={searchParams.scientificName}
        defaultCommonName={searchParams.commonName}
      />
    </div>
  );
}
