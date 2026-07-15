import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CreateGardenForm } from '@/components/CreateGardenForm';
import { NotificationsToggle } from '@/components/NotificationsToggle';

export default async function GardensPage() {
  const supabase = createClient();
  const { data: gardens } = await supabase
    .from('gardens')
    .select('id, name, description, location, plants(count)')
    .order('created_at', { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Tus jardines 🪴</h1>

      <NotificationsToggle />

      {gardens?.length === 0 && (
        <p className="text-sm text-leaf-500">Aún no tienes ningún jardín. Crea el primero para empezar a añadir plantas.</p>
      )}

      <ul className="flex flex-col gap-3">
        {gardens?.map((garden) => (
          <li key={garden.id}>
            <Link
              href={`/gardens/${garden.id}`}
              className="card flex items-center justify-between transition-transform hover:-translate-y-0.5 hover:shadow-floating"
            >
              <div>
                <p className="font-display font-bold text-leaf-800">{garden.name}</p>
                <p className="text-xs text-leaf-400">📍 {garden.location}</p>
                {garden.description && <p className="mt-0.5 text-sm text-leaf-500">{garden.description}</p>}
              </div>
              <span className="chip shrink-0">
                {(garden.plants as unknown as { count: number }[])?.[0]?.count ?? 0} plantas
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <CreateGardenForm />
    </div>
  );
}
