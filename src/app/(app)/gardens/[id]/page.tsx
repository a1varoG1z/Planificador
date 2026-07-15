import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GardenHeader } from '@/components/GardenHeader';

export default async function GardenDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: garden } = await supabase.from('gardens').select('*').eq('id', params.id).single();
  if (!garden) notFound();

  const { data: plants } = await supabase
    .from('plants')
    .select('*')
    .eq('garden_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <GardenHeader garden={garden} />

      <Link
        href={`/plants/new?gardenId=${garden.id}`}
        className="flex items-center justify-center gap-2 rounded-xl bg-leaf-600 py-3 text-sm font-semibold text-white shadow hover:bg-leaf-700"
      >
        📷 Anadir planta con foto
      </Link>

      {plants?.length === 0 && (
        <p className="text-sm text-leaf-500">Este jardin todavia no tiene plantas.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {plants?.map((plant) => (
          <Link
            key={plant.id}
            href={`/plants/${plant.id}`}
            className="flex flex-col overflow-hidden rounded-xl bg-white shadow hover:shadow-md"
          >
            <div className="aspect-square w-full bg-leaf-100">
              {plant.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={plant.photo_url} alt={plant.nickname ?? ''} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl">🌱</div>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-sm font-semibold text-leaf-800">
                {plant.nickname || plant.species_common_name || plant.species_scientific_name}
              </p>
              {plant.species_scientific_name && (
                <p className="truncate text-xs italic text-leaf-500">{plant.species_scientific_name}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
