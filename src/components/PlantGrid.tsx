import Link from 'next/link';
import type { Plant } from '@/lib/types';

export function PlantGrid({ plants, dimmed = false }: { plants: Plant[]; dimmed?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {plants.map((plant) => (
        <Link
          key={plant.id}
          href={`/plants/${plant.id}`}
          className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-floating ${
            dimmed ? 'opacity-60' : ''
          }`}
        >
          <div className="aspect-square w-full bg-gradient-to-br from-leaf-50 to-leaf-100">
            {plant.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={plant.photo_url} alt={plant.nickname ?? ''} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl">🌱</div>
            )}
          </div>
          <div className="p-2.5">
            <p className="truncate text-sm font-bold text-leaf-800">
              {plant.nickname || plant.species_common_name || plant.species_scientific_name}
            </p>
            {plant.species_scientific_name && (
              <p className="truncate text-xs italic text-leaf-400">{plant.species_scientific_name}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
