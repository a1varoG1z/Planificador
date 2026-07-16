import Link from 'next/link';
import type { Planter } from '@/lib/types';

export function PlanterGrid({ planters, plantCounts }: { planters: Planter[]; plantCounts: Map<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {planters.map((planter) => (
        <Link
          key={planter.id}
          href={`/planters/${planter.id}`}
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-floating"
        >
          <div className="aspect-square w-full bg-gradient-to-br from-leaf-50 to-leaf-100">
            {planter.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={planter.photo_url} alt={planter.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl">🪴</div>
            )}
          </div>
          <div className="p-2.5">
            <p className="truncate text-sm font-bold text-leaf-800">{planter.name}</p>
            <p className="text-xs text-leaf-400">{plantCounts.get(planter.id) ?? 0} plantas</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
