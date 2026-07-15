'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ShoppingItem } from '@/lib/types';

export function ShoppingListView({ items }: { items: ShoppingItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [adding, setAdding] = useState(false);

  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!item.trim()) return;
    setAdding(true);
    await supabase.from('shopping_list').insert({ item: item.trim(), quantity: quantity || null });
    setItem('');
    setQuantity('');
    setAdding(false);
    router.refresh();
  }

  async function toggleDone(id: string, current: boolean) {
    await supabase.from('shopping_list').update({ done: !current }).eq('id', id);
    router.refresh();
  }

  async function removeItem(id: string) {
    await supabase.from('shopping_list').delete().eq('id', id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={addItem} className="flex gap-2 rounded-xl bg-white p-4 shadow">
        <input
          placeholder="Que hace falta comprar..."
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="flex-1"
        />
        <input
          placeholder="Cant."
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20"
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-leaf-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          +
        </button>
      </form>

      {pending.length === 0 && done.length === 0 && (
        <p className="text-sm text-leaf-500">La lista esta vacia.</p>
      )}

      {pending.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pending.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
              <input type="checkbox" checked={false} onChange={() => toggleDone(i.id, i.done)} className="h-5 w-5" />
              <div className="flex-1">
                <span className="text-sm text-leaf-800">{i.item}</span>
                {i.quantity && <span className="ml-2 text-xs text-leaf-500">({i.quantity})</span>}
              </div>
              <button onClick={() => removeItem(i.id)} className="text-xs text-red-400 underline">
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="rounded-xl bg-white p-3 shadow">
          <summary className="cursor-pointer text-sm font-semibold text-leaf-500">
            Comprado ({done.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {done.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-lg bg-leaf-50 p-2">
                <input type="checkbox" checked={true} onChange={() => toggleDone(i.id, i.done)} className="h-5 w-5" />
                <span className="flex-1 text-sm text-leaf-400 line-through">{i.item}</span>
                <button onClick={() => removeItem(i.id)} className="text-xs text-red-400 underline">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
