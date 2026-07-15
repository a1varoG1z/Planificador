import type { CareProfile, Plant, ReplantingReminder, TaskType } from './types';

export type CalendarTaskType = TaskType | 'replant';

export interface CalendarTask {
  plantId: string;
  gardenId: string;
  plantName: string;
  taskType: CalendarTaskType;
  dueDate: string; // YYYY-MM-DD
  overdue: boolean;
  replant?: {
    reminderId: string;
    scientificName: string | null;
    commonName: string | null;
  };
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

const TASK_LABELS: Record<CalendarTaskType, string> = {
  watering: 'Regar',
  fertilizing: 'Abonar',
  pruning: 'Podar',
  replant: 'Volver a plantar',
};

export function taskLabel(type: CalendarTaskType): string {
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

/** Convierte recordatorios de replantacion en tareas de calendario. */
export function replantingTasksFromReminders(reminders: ReplantingReminder[]): CalendarTask[] {
  const today = startOfDay(new Date());
  return reminders.map((r) => ({
    plantId: r.source_plant_id ?? r.id,
    gardenId: r.garden_id,
    plantName: r.species_common_name || r.species_scientific_name || 'Planta',
    taskType: 'replant' as const,
    dueDate: r.remind_date,
    overdue: startOfDay(new Date(r.remind_date)) < today,
    replant: {
      reminderId: r.id,
      scientificName: r.species_scientific_name,
      commonName: r.species_common_name,
    },
  }));
}

/** Proxima fecha (dia 1) en la que cae el mes indicado (1-12), este ano o el que viene. */
export function nextMonthOccurrence(month: number, from: Date = new Date()): Date {
  const today = startOfDay(from);
  const thisYear = new Date(today.getFullYear(), month - 1, 1);
  if (thisYear >= today) return thisYear;
  return new Date(today.getFullYear() + 1, month - 1, 1);
}

export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = startOfDay(new Date(year, month, 1));
  const end = startOfDay(new Date(year, month + 1, 0));
  return { start, end };
}
