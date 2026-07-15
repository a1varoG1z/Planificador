import type { CareProfile, Plant, TaskType } from './types';

export interface CalendarTask {
  plantId: string;
  gardenId: string;
  plantName: string;
  taskType: TaskType;
  dueDate: string; // YYYY-MM-DD
  overdue: boolean;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Proxima fecha en la que toca una tarea, o null si no hay frecuencia definida. */
export function nextDueDate(
  lastDone: string | null,
  frequencyDays: number | null,
  fallbackAnchor: string
): Date | null {
  if (!frequencyDays || frequencyDays <= 0) return null;
  const base = startOfDay(new Date(lastDone ?? fallbackAnchor));
  return addDays(base, frequencyDays);
}

function expandOccurrences(
  lastDone: string | null,
  frequencyDays: number | null,
  fallbackAnchor: string,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  if (!frequencyDays || frequencyDays <= 0) return [];
  const base = startOfDay(new Date(lastDone ?? fallbackAnchor));
  let current = addDays(base, frequencyDays);

  if (current < rangeStart) {
    const diffDays = Math.floor((rangeStart.getTime() - current.getTime()) / 86_400_000);
    const steps = Math.floor(diffDays / frequencyDays);
    current = addDays(current, steps * frequencyDays);
    while (current < rangeStart) current = addDays(current, frequencyDays);
  }

  const occurrences: Date[] = [];
  while (current <= rangeEnd) {
    occurrences.push(current);
    current = addDays(current, frequencyDays);
  }
  return occurrences;
}

const TASK_LABELS: Record<TaskType, string> = {
  watering: 'Regar',
  fertilizing: 'Abonar',
  pruning: 'Podar',
};

export function taskLabel(type: TaskType): string {
  return TASK_LABELS[type];
}

/** Genera todas las tareas de riego/abono/poda para un rango de fechas dado. */
export function buildCalendarTasks(
  plants: Array<Plant & { care_profile: CareProfile | null }>,
  rangeStart: Date,
  rangeEnd: Date
): CalendarTask[] {
  const today = startOfDay(new Date());
  const tasks: CalendarTask[] = [];

  for (const plant of plants) {
    const profile = plant.care_profile;
    if (!profile) continue;

    const plantName = plant.nickname || plant.species_common_name || plant.species_scientific_name || 'Planta';

    const specs: Array<[TaskType, string | null, number | null]> = [
      ['watering', profile.watering_last_done, profile.watering_frequency_days],
      ['fertilizing', profile.fertilizing_last_done, profile.fertilizing_frequency_days],
      ['pruning', profile.pruning_last_done, profile.pruning_frequency_days],
    ];

    for (const [taskType, lastDone, frequency] of specs) {
      const occurrences = expandOccurrences(lastDone, frequency, plant.created_at, rangeStart, rangeEnd);
      for (const date of occurrences) {
        tasks.push({
          plantId: plant.id,
          gardenId: plant.garden_id,
          plantName,
          taskType,
          dueDate: toIsoDate(date),
          overdue: date < today,
        });
      }
    }
  }

  return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = startOfDay(new Date(year, month, 1));
  const end = startOfDay(new Date(year, month + 1, 0));
  return { start, end };
}
