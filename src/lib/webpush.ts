import webpush from 'web-push';
import { createAdminClient } from './supabase/admin';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:plantario@example.com';
  if (!publicKey || !privateKey) throw new Error('Faltan las claves VAPID en las variables de entorno');
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendPushToHousehold(payload: { title: string; body: string; url?: string }) {
  ensureConfigured();
  const supabase = createAdminClient();
  const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');

  const results = await Promise.allSettled(
    (subscriptions ?? []).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  const expiredEndpoints = (subscriptions ?? [])
    .filter((sub, i) => {
      const result = results[i];
      return (
        result.status === 'rejected' &&
        typeof result.reason === 'object' &&
        result.reason !== null &&
        'statusCode' in result.reason &&
        [404, 410].includes((result.reason as { statusCode: number }).statusCode)
      );
    })
    .map((sub) => sub.endpoint);

  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
  }

  return { sent: results.filter((r) => r.status === 'fulfilled').length, total: results.length };
}
