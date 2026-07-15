'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notAllowed = searchParams.get('error') === 'not_allowed';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupOk, setSignupOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.replace('/gardens');
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setSignupOk(true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-leaf-100 via-sand-50 to-sand-100 px-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-floating backdrop-blur">
        <div className="mb-6 flex flex-col items-center">
          <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-leaf-400 to-leaf-600 text-3xl shadow-soft">
            🌿
          </span>
          <h1 className="page-title">Plantario</h1>
          <p className="text-sm text-leaf-500">Vuestro jardín, siempre a punto</p>
        </div>

        {notAllowed && (
          <p className="mb-4 rounded-2xl bg-rose-50 p-3 text-center text-sm text-rose-600">
            Esta cuenta no está autorizada para usar esta app.
          </p>
        )}
        {signupOk && (
          <p className="mb-4 rounded-2xl bg-leaf-50 p-3 text-center text-sm text-leaf-700">
            Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Correo"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-1 py-3">
            {loading ? 'Un momento...' : mode === 'signin' ? 'Entrar 🌱' : 'Crear cuenta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="btn-ghost mt-4 w-full text-center"
        >
          {mode === 'signin' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
