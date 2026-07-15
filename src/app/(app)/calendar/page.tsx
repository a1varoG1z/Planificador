import { createClient } from '@/lib/supabase/server';
import { buildCalendarTasks, monthRange, replantingTasksFromReminders } from '@/lib/careSchedule';
import { CalendarGrid } from '@/components/CalendarGrid';
import type { CareProfile, Plant } from '@/lib/types';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { y?: string; m?: string };
}) {
  const now = new Date();
  const year = searchParams.y ? parseInt(searchParams.y, 10) : now.getFullYear();
  const month = searchParams.m ? parseInt(searchParams.m, 10) : now.getMonth();

  const supabase = createClient();
  const { start, end } = monthRange(year, month);

  const [{ data: plants }, { data: reminders }] = await Promise.all([
    supabase.from('plants').select('*, care_profiles(*)').eq('status', 'active'),
    supabase
      .from('replanting_reminders')
      .select('*')
      .eq('dismissed', false)
      .gte('remind_date', start.toISOString().slice(0, 10))
      .lte('remind_date', end.toISOString().slice(0, 10)),
  ]);

  const plantsWithProfile = (plants ?? []).map((p) => ({
    ...(p as Plant),
    care_profile: (Array.isArray(p.care_profiles) ? p.care_profiles[0] : p.care_profiles) as CareProfile | null,
  }));

  const tasks = [
    ...buildCalendarTasks(plantsWithProfile, start, end),
    ...replantingTasksFromReminders(reminders ?? []),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Calendario 📅</h1>
      <CalendarGrid year={year} month={month} tasks={tasks} />
    </div>
  );
}
