import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { nextDueDate, nextPruningDueDate, seasonalFrequencyFor } from '@/lib/careSchedule';
import { sendPushToHousehold } from '@/lib/webpush';
import type { CareProfile, Plant, TaskType } from '@/lib/types';

const TASK_LABEL: Record<TaskType, string> = { watering: 'Regar', fertilizing: 'Abonar', pruning: 'Podar' };

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const [{ data: plants }, { data: reminders }] = await Promise.all([
    supabase.from('plants').select('*, care_profiles(*)').eq('status', 'active'),
    supabase.from('replanting_reminders').select('*').eq('dismissed', false).lte('remind_date', todayIso),
  ]);

  const dueTodayByType: Record<TaskType, string[]> = { watering: [], fertilizing: [], pruning: [] };
  let overdueCount = 0;

  for (const raw of plants ?? []) {
    const plant = raw as Plant;
    const profile = (Array.isArray((raw as any).care_profiles)
      ? (raw as any).care_profiles[0]
      : (raw as any).care_profiles) as CareProfile | null;
    if (!profile) continue;

    const plantName = plant.nickname || plant.species_common_name || plant.species_scientific_name || 'Planta';

    (['watering', 'fertilizing'] as const).forEach((type) => {
      const due = nextDueDate(profile[`${type}_last_done` as const], seasonalFrequencyFor(profile, type), plant.created_at);
      if (!due) return;
      const dueIso = due.toISOString().slice(0, 10);
      if (dueIso === todayIso) dueTodayByType[type].push(plantName);
      else if (due < today) overdueCount += 1;
    });

    const pruningDue = nextPruningDueDate(profile.pruning_last_done, profile.pruning_months, today);
    if (pruningDue) {
      const dueIso = pruningDue.toISOString().slice(0, 10);
      if (dueIso === todayIso) dueTodayByType.pruning.push(plantName);
      else if (pruningDue < today) overdueCount += 1;
    }
  }

  const replantNames = (reminders ?? []).map((r) => r.species_common_name || r.species_scientific_name || 'planta');

  const lines: string[] = [];
  (['watering', 'fertilizing', 'pruning'] as TaskType[]).forEach((type) => {
    if (dueTodayByType[type].length > 0) {
      lines.push(`${TASK_LABEL[type]}: ${dueTodayByType[type].join(', ')}`);
    }
  });
  if (replantNames.length > 0) lines.push(`Volver a plantar: ${replantNames.join(', ')}`);
  if (overdueCount > 0) lines.push(`Tienes ${overdueCount} tarea(s) atrasada(s)`);

  if (lines.length === 0) {
    return NextResponse.json({ sent: 0, skipped: true, reason: 'Sin tareas para hoy' });
  }

  try {
    const result = await sendPushToHousehold({
      title: '🌿 Tareas de hoy en Plantario',
      body: lines.join(' · '),
      url: '/calendar',
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
