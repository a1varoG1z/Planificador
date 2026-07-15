import { createClient } from '@/lib/supabase/server';
import { NewPlantForm } from '@/components/NewPlantForm';

export default async function NewPlantPage({
  searchParams,
}: {
  searchParams: { gardenId?: string; scientificName?: string; commonName?: string };
}) {
  const supabase = createClient();
  const { data: gardens } = await supabase.from('gardens').select('id, name').order('name');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-leaf-800">Anadir planta</h1>
      <NewPlantForm
        gardens={gardens ?? []}
        defaultGardenId={searchParams.gardenId}
        defaultScientificName={searchParams.scientificName}
        defaultCommonName={searchParams.commonName}
      />
    </div>
  );
}
