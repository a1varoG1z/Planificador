'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { taskLabel } from '@/lib/careSchedule';
import type { CalendarTask, CalendarTaskType } from '@/lib/careSchedule';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const TASK_ICON: Record<CalendarTaskType, string> = {
  watering: '💧',
  fertilizing: '🌱',
  pruning: '✂️',
  replant: '🔁',
};

function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function CalendarGrid({ year, month, tasks }: { year: number; month: number; tasks: CalendarTask[] }) {
  const router = useRouter();
  const supabase = createClient();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday
  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    year === new Date().getFullYear() && month === new Date().getMonth() ? todayIso : null
  );

  const tasksByDay = new Map<string, CalendarTask[]>();
  for (const task of tasks) {
    const list = tasksByDay.get(task.dueDate) ?? [];
    list.push(task);
    tasksByDay.set(task.dueDate, list);
  }

  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  async function markDone(task: CalendarTask) {
    if (task.taskType === 'replant') return;
    const today = new Date().toISOString().slice(0, 10);
    const field = `${task.taskType}_last_done`;
    await supabase.from('care_profiles').update({ [field]: today }).eq('plant_id', task.plantId);
    await supabase.from('task_completions').insert({ plant_id: task.plantId, task_type: task.taskType });
    router.refresh();
  }

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const selectedTasks = selectedDate ? (tasksByDay.get(selectedDate) ?? []) : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="card-tight flex items-center justify-between">
        <Link href={`/calendar?y=${prev.y}&m=${prev.m}`} className="rounded-full px-3 py-1 text-leaf-500 hover:bg-leaf-50">
          ←
        </Link>
        <span className="font-display font-bold text-leaf-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <Link href={`/calendar?y=${next.y}&m=${next.m}`} className="rounded-full px-3 py-1 text-leaf-500 hover:bg-leaf-50">
          →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-leaf-400">
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
          const isSelected = iso === selectedDate;
          const hasOverdue = dayTasks.some((t) => t.overdue);
          return (
            <button
              type="button"
              key={iso}
              onClick={() => setSelectedDate(iso)}
              className={`flex min-h-[4.5rem] flex-col items-stretch gap-0.5 rounded-xl p-1 text-xs transition-colors ${
                isSelected ? 'bg-leaf-600 shadow-soft' : isToday ? 'bg-leaf-100 ring-2 ring-leaf-300' : 'bg-white/80 hover:bg-leaf-50'
              }`}
            >
              <span
                className={`text-[10px] ${
                  isSelected ? 'font-bold text-white' : isToday ? 'font-bold text-leaf-700' : 'text-leaf-400'
                }`}
              >
                {day}
              </span>
              {dayTasks.slice(0, 3).map((t, idx) => (
                <span
                  key={idx}
                  className={`truncate rounded-lg px-1 text-left font-semibold leading-tight ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : t.overdue
                        ? t.taskType === 'replant'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-600'
                        : 'bg-leaf-50 text-leaf-700'
                  }`}
                >
                  {TASK_ICON[t.taskType]} {t.plantName}
                </span>
              ))}
              {dayTasks.length > 3 && (
                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-leaf-400'}`}>
                  +{dayTasks.length - 3} más
                </span>
              )}
              {!isSelected && hasOverdue && <span className="mt-auto h-1 w-1 self-center rounded-full bg-rose-500" />}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <p className="section-title capitalize">{formatLongDate(selectedDate)}</p>
            <button onClick={() => setSelectedDate(null)} className="text-leaf-400 underline">
              Cerrar
            </button>
          </div>

          {selectedTasks.length === 0 && <p className="text-sm text-leaf-500">Sin tareas pendientes este día. 🌿</p>}

          <ul className="flex flex-col gap-2">
            {selectedTasks.map((t, idx) => (
              <li
                key={idx}
                className={`flex items-center justify-between gap-2 rounded-xl p-3 text-sm ${
                  t.overdue ? 'bg-rose-50' : 'bg-leaf-50'
                }`}
              >
                <span className="font-semibold text-leaf-800">
                  {TASK_ICON[t.taskType]} {taskLabel(t.taskType)} · {t.plantName}
                </span>
                {t.taskType === 'replant' ? (
                  <Link
                    href={`/plants/new?gardenId=${t.gardenId}&scientificName=${encodeURIComponent(
                      t.replant?.scientificName ?? ''
                    )}&commonName=${encodeURIComponent(t.replant?.commonName ?? '')}`}
                    className="btn-primary shrink-0 px-3 py-1.5 text-xs"
                  >
                    Plantar ahora
                  </Link>
                ) : (
                  <button onClick={() => markDone(t)} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                    Hecho ✓
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center text-xs text-leaf-400">Toca un día para ver sus tareas</p>
    </div>
  );
}
