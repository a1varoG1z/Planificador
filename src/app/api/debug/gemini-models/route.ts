import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Falta GEMINI_API_KEY' }, { status: 500 });

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: `Google respondio ${res.status}`, details: data }, { status: 502 });
    }

    const models = (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes('generateContent')
      )
      .map((m: { name: string; displayName?: string }) => ({
        name: m.name.replace('models/', ''),
        displayName: m.displayName,
      }));

    return NextResponse.json({ configuredModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash', availableModels: models });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
