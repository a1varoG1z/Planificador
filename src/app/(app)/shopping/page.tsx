import { createClient } from '@/lib/supabase/server';
import { ShoppingListView } from '@/components/ShoppingListView';

export default async function ShoppingPage() {
  const supabase = createClient();
  const { data: items } = await supabase
    .from('shopping_list')
    .select('*')
    .order('done', { ascending: true })
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-leaf-800">Lista de la compra</h1>
      <ShoppingListView items={items ?? []} />
    </div>
  );
}
