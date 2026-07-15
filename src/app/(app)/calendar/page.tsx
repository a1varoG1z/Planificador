import { createClient } from '@/lib/supabase/server';
import { buildCalendarTasks, monthRange } from '@/lib/careSchedule';
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
  const { data: plants } = await supabase.from('plants').select('*, care_profiles(*)');

  const plantsWithProfile = (plants ?? []).map((p) => ({
    ...(p as Plant),
    care_profile: (Array.isArray(p.care_profiles) ? p.care_profiles[0] : p.care_profiles) as CareProfile | null,
  }));

  const { start, end } = monthRange(year, month);
  const tasks = buildCalendarTasks(plantsWithProfile, start, end);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-leaf-800">Calendario de cuidados</h1>
      <CalendarGrid year={year} month={month} tasks={tasks} />
    </div>
  );
}
