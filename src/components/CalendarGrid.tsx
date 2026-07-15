'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { taskLabel } from '@/lib/careSchedule';
import type { CalendarTask } from '@/lib/careSchedule';
import type { TaskType } from '@/lib/types';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const TASK_ICON: Record<TaskType, string> = { watering: '💧', fertilizing: '🌱', pruning: '✂️' };

export function CalendarGrid({ year, month, tasks }: { year: number; month: number; tasks: CalendarTask[] }) {
  const router = useRouter();
  const supabase = createClient();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday
  const todayIso = new Date().toISOString().slice(0, 10);

  const tasksByDay = new Map<string, CalendarTask[]>();
  for (const task of tasks) {
    const list = tasksByDay.get(task.dueDate) ?? [];
    list.push(task);
    tasksByDay.set(task.dueDate, list);
  }

  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  async function markDone(task: CalendarTask) {
    const today = new Date().toISOString().slice(0, 10);
    const field = `${task.taskType}_last_done`;
    await supabase.from('care_profiles').update({ [field]: today }).eq('plant_id', task.plantId);
    await supabase.from('task_completions').insert({ plant_id: task.plantId, task_type: task.taskType });
    router.refresh();
  }

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow">
        <Link href={`/calendar?y=${prev.y}&m=${prev.m}`} className="px-2 text-leaf-500">
          ←
        </Link>
        <span className="font-semibold text-leaf-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <Link href={`/calendar?y=${next.y}&m=${next.m}`} className="px-2 text-leaf-500">
          →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-leaf-400">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDay.get(iso) ?? [];
          const isToday = iso === todayIso;
          return (
            <div
              key={iso}
              className={`flex min-h-[4.5rem] flex-col gap-0.5 rounded-lg p-1 text-xs ${
                isToday ? 'bg-leaf-100' : 'bg-white'
              }`}
            >
              <span className={`text-[10px] ${isToday ? 'font-bold text-leaf-700' : 'text-leaf-400'}`}>{day}</span>
              {dayTasks.slice(0, 3).map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => markDone(t)}
                  title={`${taskLabel(t.taskType)} · ${t.plantName}`}
                  className={`truncate rounded px-1 text-left leading-tight ${
                    t.overdue ? 'bg-red-100 text-red-700' : 'bg-leaf-50 text-leaf-700'
                  }`}
                >
                  {TASK_ICON[t.taskType]} {t.plantName}
                </button>
              ))}
              {dayTasks.length > 3 && <span className="text-[10px] text-leaf-400">+{dayTasks.length - 3} mas</span>}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-leaf-400">Toca una tarea del dia para marcarla como hecha hoy</p>
    </div>
  );
}
