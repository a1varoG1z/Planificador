import { createClient } from '@/lib/supabase/server';
import { WildIdentify } from '@/components/WildIdentify';

export default async function WildPage() {
  const supabase = createClient();
  const [{ data: gardens }, { data: wildFinds }] = await Promise.all([
    supabase.from('gardens').select('id, name').order('name'),
    supabase.from('wild_finds').select('*').order('found_at', { ascending: false }).limit(20),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="page-title">Identificar en la naturaleza 🌼</h1>
        <p className="text-sm text-leaf-500">
          Haz una foto a cualquier planta, flor o árbol que veas, aunque no sea tuya.
        </p>
      </div>
      <WildIdentify gardens={gardens ?? []} wildFinds={wildFinds ?? []} />
    </div>
  );
}
