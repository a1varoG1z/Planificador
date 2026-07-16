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

/** Frecuencia en dias, distinta segun epoca calida o fria del ano. null = tarea pausada esa epoca. */
export interface SeasonalFrequency {
  warm: number | null;
  cool: number | null;
}

// Asume hemisferio norte (publico objetivo: Espana). Abril-Septiembre = calido, Octubre-Marzo = frio.
const WARM_MONTHS = new Set([4, 5, 6, 7, 8, 9]);

function isWarmMonth(date: Date): boolean {
  return WARM_MONTHS.has(date.getMonth() + 1);
}

/** Extrae la frecuencia estacional de un perfil para riego/abono (no aplica a poda, ver pruning_months). */
export function seasonalFrequencyFor(profile: CareProfile, type: 'watering' | 'fertilizing'): SeasonalFrequency {
  if (type === 'watering') {
    return {
      warm: profile.watering_frequency_days_warm ?? profile.watering_frequency_days,
      cool: profile.watering_frequency_days_cool ?? profile.watering_frequency_days,
    };
  }
  return {
    warm: profile.fertilizing_frequency_days_warm ?? profile.fertilizing_frequency_days,
    cool: profile.fertilizing_frequency_days_cool ?? profile.fertilizing_frequency_days,
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

/** Frecuencia (dias) que corresponde a `freq` segun la temporada de `date`. */
export function frequencyForDate(date: Date, freq: SeasonalFrequency): number | null {
  return isWarmMonth(date) ? freq.warm : freq.cool;
}

/** Siguiente fecha en la que toca la tarea a partir de `from`, saltando epocas en las que esta pausada (frecuencia null). */
function nextOccurrence(from: Date, freq: SeasonalFrequency): Date {
  const currentFreq = frequencyForDate(from, freq);
  if (currentFreq && currentFreq > 0) return addDays(from, currentFreq);

  // Tarea pausada en la temporada de `from`: buscar el primer dia en que se reactive.
  let d = addDays(from, 1);
  for (let guard = 0; guard < 400; guard++) {
    if (frequencyForDate(d, freq)) return d;
    d = addDays(d, 1);
  }
  return d;
}

/** Proxima fecha en la que toca una tarea, o null si no hay frecuencia definida en ninguna epoca. */
export function nextDueDate(lastDone: string | null, freq: SeasonalFrequency, fallbackAnchor: string): Date | null {
  if (!freq.warm && !freq.cool) return null;
  const base = startOfDay(new Date(lastDone ?? fallbackAnchor));
  return nextOccurrence(base, freq);
}

function expandOccurrences(
  lastDone: string | null,
  freq: SeasonalFrequency,
  fallbackAnchor: string,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  if (!freq.warm && !freq.cool) return [];

  let current = nextOccurrence(startOfDay(new Date(lastDone ?? fallbackAnchor)), freq);

  let guard = 0;
  while (current < rangeStart && guard < 2000) {
    current = nextOccurrence(current, freq);
    guard++;
  }

  const occurrences: Date[] = [];
  guard = 0;
  while (current <= rangeEnd && guard < 500) {
    occurrences.push(current);
    current = nextOccurrence(current, freq);
    guard++;
  }
  return occurrences;
}

/** true si `lastDone` cae en un mes de `months` durante el mismo ano que `date` (poda ya hecha este ciclo). */
function alreadyPrunedThisWindow(lastDone: string | null, months: number[], date: Date): boolean {
  if (!lastDone) return false;
  const done = new Date(lastDone);
  return done.getFullYear() === date.getFullYear() && months.includes(done.getMonth() + 1);
}

/** Ocurrencias de poda dentro de un rango: una por cada mes aplicable, salvo que ya se haya podado ese ciclo. */
function pruningOccurrences(lastDone: string | null, months: number[], rangeStart: Date, rangeEnd: Date): Date[] {
  if (!months || months.length === 0) return [];

  const occurrences: Date[] = [];
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  let guard = 0;
  while (cursor <= rangeEnd && guard < 24) {
    const monthNum = cursor.getMonth() + 1;
    if (months.includes(monthNum)) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), 15);
      if (date >= rangeStart && date <= rangeEnd && !alreadyPrunedThisWindow(lastDone, months, date)) {
        occurrences.push(date);
      }
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    guard++;
  }
  return occurrences;
}

/** Proxima fecha de poda pendiente (para estadisticas/notificaciones), o null si no aplica o ya esta hecha. */
export function nextPruningDueDate(lastDone: string | null, months: number[], from: Date = new Date()): Date | null {
  if (!months || months.length === 0) return null;
  const start = startOfDay(from);
  for (let i = 0; i < 24; i++) {
    const cursor = new Date(start.getFullYear(), start.getMonth() + i, 15);
    const monthNum = cursor.getMonth() + 1;
    if (!months.includes(monthNum)) continue;
    if (alreadyPrunedThisWindow(lastDone, months, cursor)) continue;
    return cursor;
  }
  return null;
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

    const specs: Array<['watering' | 'fertilizing', string | null]> = [
      ['watering', profile.watering_last_done],
      ['fertilizing', profile.fertilizing_last_done],
    ];

    for (const [taskType, lastDone] of specs) {
      const freq = seasonalFrequencyFor(profile, taskType);
      const occurrences = expandOccurrences(lastDone, freq, plant.created_at, rangeStart, rangeEnd);
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

    for (const date of pruningOccurrences(profile.pruning_last_done, profile.pruning_months, rangeStart, rangeEnd)) {
      tasks.push({
        plantId: plant.id,
        gardenId: plant.garden_id,
        plantName,
        taskType: 'pruning',
        dueDate: toIsoDate(date),
        overdue: date < today,
      });
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
