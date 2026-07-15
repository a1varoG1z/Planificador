'use client';

import { useState } from 'react';

type CheckResult = { label: string; ok: boolean; detail: string };

export function LoginDiagnostics() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  async function runChecks() {
    setRunning(true);
    const checks: CheckResult[] = [];

    checks.push({
      label: 'NEXT_PUBLIC_SUPABASE_URL',
      ok: Boolean(supabaseUrl),
      detail: supabaseUrl || 'VACIA — falta configurar esta variable en Vercel',
    });

    checks.push({
      label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      ok: Boolean(anonKey),
      detail: anonKey ? `${anonKey.slice(0, 12)}...${anonKey.slice(-6)} (${anonKey.length} caracteres)` : 'VACIA — falta configurar esta variable en Vercel',
    });

    if (supabaseUrl) {
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          headers: anonKey ? { apikey: anonKey } : undefined,
        });
        const text = await res.text();
        checks.push({
          label: 'Conexion a Supabase Auth',
          ok: res.ok,
          detail: `HTTP ${res.status} — ${text.slice(0, 150)}`,
        });
      } catch (err) {
        checks.push({
          label: 'Conexion a Supabase Auth',
          ok: false,
          detail: `${(err as Error).name}: ${(err as Error).message}`,
        });
      }
    }

    setResults(checks);
    setRunning(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          runChecks();
        }}
        className="mt-3 w-full text-center text-xs text-leaf-300 underline"
      >
        ¿Problemas para entrar? Ver diagnostico
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-leaf-900/5 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-leaf-600">Diagnostico</span>
        <button type="button" onClick={runChecks} disabled={running} className="text-leaf-500 underline">
          {running ? 'Comprobando...' : 'Repetir'}
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {results.map((r) => (
          <li key={r.label}>
            <p className={r.ok ? 'font-semibold text-leaf-700' : 'font-semibold text-rose-600'}>
              {r.ok ? '✅' : '❌'} {r.label}
            </p>
            <p className="break-all font-mono text-[10px] text-leaf-500">{r.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-leaf-400">
        Haz una captura de esto y enviala si necesitas ayuda.
      </p>
    </div>
  );
}
