'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  plantId: string;
  planters: { id: string; name: string }[];
}

export function MoveToPlanterControl({ plantId, planters }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function move(planterId: string) {
    setBusy(true);
    await supabase.from('plants').update({ planter_id: planterId }).eq('id', plantId);
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      value=""
      disabled={busy}
      onChange={(e) => {
        const value = e.target.value;
        if (value) move(value);
      }}
      className="mt-1 w-full rounded-lg border border-leaf-200 bg-leaf-50 px-1.5 py-1 text-[11px] font-semibold text-leaf-600"
    >
      <option value="">🪴 Añadir a jardinera…</option>
      {planters.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
