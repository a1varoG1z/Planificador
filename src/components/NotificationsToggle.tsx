'use client';

import { useEffect, useState } from 'react';
import { urlBase64ToUint8Array } from '@/lib/pushClient';

export function NotificationsToggle() {
  const [status, setStatus] = useState<'unsupported' | 'checking' | 'off' | 'on' | 'busy'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? 'on' : 'off');
    }
    check();
  }, []);

  async function enable() {
    setStatus('busy');
    setError(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error('Notificaciones no configuradas (falta VAPID key)');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
      if (!res.ok) throw new Error('No se pudo guardar la suscripcion');

      setStatus('on');
    } catch (err) {
      setError((err as Error).message);
      setStatus('off');
    }
  }

  async function disable() {
    setStatus('busy');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus('off');
    } catch (err) {
      setError((err as Error).message);
      setStatus('on');
    }
  }

  if (status === 'unsupported') return null;

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-leaf-800">🔔 Notificaciones</p>
          <p className="text-xs text-leaf-500">Avisos diarios de riego, abono, poda y replantacion</p>
        </div>
        {status === 'checking' && <span className="text-xs text-leaf-400">...</span>}
        {status === 'busy' && <span className="text-xs text-leaf-400">...</span>}
        {status === 'off' && (
          <button onClick={enable} className="rounded-lg bg-leaf-600 px-3 py-1.5 text-xs font-medium text-white">
            Activar
          </button>
        )}
        {status === 'on' && (
          <button onClick={disable} className="rounded-lg border border-leaf-300 px-3 py-1.5 text-xs text-leaf-600">
            Desactivar
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
