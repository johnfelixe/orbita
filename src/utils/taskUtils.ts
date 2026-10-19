import { Task } from '../types';

/**
 * Returns ISO day of week from YYYY-MM-DD string:
 * 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado, 7 = Domingo
 */
export function getIsoDay(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

export const DAY_NAMES_SHORT: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

/**
 * Checks if a daily task is active on a specific date string (YYYY-MM-DD)
 */
export function isTaskOnDate(task: Task, dateStr: string): boolean {
  if (task.cadence !== 'DIARIA') return false;

  if (task.dailyMode === 'RECURRING') {
    const isoDay = getIsoDay(dateStr);
    return Boolean(task.recurringDays && task.recurringDays.includes(isoDay));
  }

  return task.dueDate === dateStr;
}

/**
 * Checks if a task is marked complete for a specific date
 */
export function isTaskCompletedOnDate(task: Task, dateStr: string): boolean {
  if (task.dailyMode === 'RECURRING') {
    return Boolean(task.completedDates?.includes(dateStr));
  }
  return task.completed;
}

/**
 * Checks if a task is marked omitted for a specific date
 */
export function isTaskOmittedOnDate(task: Task, dateStr: string): boolean {
  if (task.dailyMode === 'RECURRING') {
    return Boolean(task.omittedDates?.includes(dateStr));
  }
  return Boolean(task.omitted);
}


/**
 * Checks if a weekly task applies to a specific week number
 */
export function isTaskInWeek(task: Task, weekNumber: number): boolean {
  if (task.cadence !== 'SEMANAL') return false;
  if (task.weeklyMode === 'ALL_WEEKS') return true;
  return task.weekNumber === weekNumber;
}

/**
 * Generates human readable recurrence summary badge
 */
export function getRecurrenceLabel(task: Task): string {
  if (task.cadence === 'DIARIA') {
    if (task.dailyMode === 'RECURRING') {
      if (task.recurringPreset === 'WEEKDAYS') return 'Lun a Vie';
      if (task.recurringPreset === 'WEEKENDS') return 'Fines de semana';
      if (task.recurringPreset === 'EVERY_DAY') return 'Todos los días';
      if (task.recurringDays && task.recurringDays.length > 0) {
        return task.recurringDays.map((d) => DAY_NAMES_SHORT[d]).join(', ');
      }
      return 'Repetitiva';
    }
    return task.dueDate ? task.dueDate : '1 día específico';
  }

  if (task.cadence === 'SEMANAL') {
    if (task.weeklyMode === 'ALL_WEEKS') {
      return 'Todas las semanas';
    }
    return `Semana ${task.weekNumber}`;
  }

  return '';
}

/**
 * Returns ISO week number (1-53) for a given Date or YYYY-MM-DD string
 */
export function formatDateISO(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getMondayOfDate(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekDateStrings(currentWeekNumber: number, reference: Date = new Date()): string[] {
  const todayWeek = getIsoWeekNumber(reference);
  const monday = getMondayOfDate(reference);
  monday.setDate(monday.getDate() + (currentWeekNumber - todayWeek) * 7);
  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return formatDateISO(d);
  });
}

export function getIsoWeekNumber(dateInput: Date | string): number {
  let d: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(Number);
    d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  } else {
    d = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  }

  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

