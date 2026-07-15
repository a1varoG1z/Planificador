import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 });

  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return NextResponse.json({ unsubscribed: true });
}
