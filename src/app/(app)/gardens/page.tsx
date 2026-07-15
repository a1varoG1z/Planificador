import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CreateGardenForm } from '@/components/CreateGardenForm';

export default async function GardensPage() {
  const supabase = createClient();
  const { data: gardens } = await supabase
    .from('gardens')
    .select('id, name, description, plants(count)')
    .order('created_at', { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-leaf-800">Tus jardines</h1>

      {gardens?.length === 0 && (
        <p className="text-sm text-leaf-500">Aun no tienes ningun jardin. Crea el primero para empezar a anadir plantas.</p>
      )}

      <ul className="flex flex-col gap-3">
        {gardens?.map((garden) => (
          <li key={garden.id}>
            <Link
              href={`/gardens/${garden.id}`}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-leaf-800">{garden.name}</p>
                {garden.description && <p className="text-sm text-leaf-500">{garden.description}</p>}
              </div>
              <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-medium text-leaf-700">
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
