import { Cadence, Category, DailyMode, Priority, RecurringPreset, Task, WeeklyMode } from '../types';
import {
  formatDateISO,
  getIsoDay,
  getIsoWeekNumber,
  getWeekDateStrings,
  isTaskCompletedOnDate,
  isTaskInWeek,
  isTaskOmittedOnDate,
  isTaskOnDate,
} from './taskUtils';

export type ParsedVoiceTask = {
  title: string;
  cadence: Cadence;
  dailyMode?: DailyMode;
  recurringPreset?: RecurringPreset;
  recurringDays?: number[];
  weeklyMode?: WeeklyMode;
  weekNumber?: number;
  priority: Priority;
  category: Category;
  dueTime?: string;
  dueDate: string;
  location?: string;
};

export type VoiceIntent =
  | { type: 'add'; task: ParsedVoiceTask; titleOk: boolean }
  | { type: 'query'; scope: 'date' | 'week'; date: string; weekNumber: number; label: string }
  | { type: 'unknown' };

const WEEKDAYS: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
  domingo: 7,
};

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function parseDateParts(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day };
}

export function addDaysISO(dateStr: string, days: number): string {
  const { year, month, day } = parseDateParts(dateStr);
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
}

function nextWeekdayInclusive(from: string, isoDay: number): string {
  const current = getIsoDay(from);
  let delta = isoDay - current;
  if (delta < 0) delta += 7;
  return addDaysISO(from, delta);
}

function dayInMonth(from: string, day: number, monthIndex?: number): string {
  const { year, month, day: todayDay } = parseDateParts(from);
  let targetMonth = monthIndex ?? month;
  let targetYear = year;
  if (monthIndex === undefined && day < todayDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }
  return formatDateISO(new Date(targetYear, targetMonth, day));
}

export function parseSpokenDate(text: string, referenceDate: string): {
  date: string;
  week: boolean;
  label: string;
  found: boolean;
} {
  const lower = text.toLowerCase();

  if (/\besta semana\b/.test(lower)) {
    return { date: referenceDate, week: true, label: 'esta semana', found: true };
  }
  if (/\bhoy\b/.test(lower)) {
    return { date: referenceDate, week: false, label: 'hoy', found: true };
  }
  if (/\bpasado\s+(mañana|manana)\b/.test(lower)) {
    return { date: addDaysISO(referenceDate, 2), week: false, label: 'pasado mañana', found: true };
  }
  if (/\b(mañana|manana)\b/.test(lower)) {
    return { date: addDaysISO(referenceDate, 1), week: false, label: 'mañana', found: true };
  }

  const monthMatch = lower.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (monthMatch) {
    const day = Number(monthMatch[1]);
    const month = MONTHS[monthMatch[2]];
    const date = dayInMonth(referenceDate, day, month);
    return { date, week: false, label: `el ${day} de ${monthMatch[2]}`, found: true };
  }

  const weekdayMatch = lower.match(/\b(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/);
  if (weekdayMatch) {
    const iso = WEEKDAYS[weekdayMatch[1]];
    const date = nextWeekdayInclusive(referenceDate, iso);
    return { date, week: false, label: `el ${weekdayMatch[1]}`, found: true };
  }

  const dayOnly = lower.match(/\bel\s+(\d{1,2})\b/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    if (day >= 1 && day <= 31) {
      const date = dayInMonth(referenceDate, day);
      return { date, week: false, label: `el día ${day}`, found: true };
    }
  }

  return { date: referenceDate, week: false, label: 'hoy', found: false };
}

function parseSpokenTime(text: string): string | undefined {
  const lower = text.toLowerCase();
  const isPm =
    /de la tarde|de la noche|\bpm\b/.test(lower) ||
    /p\.?\s*m\.?/.test(lower);
  const isAm = /de la mañana|\bam\b/.test(lower) || /a\.?\s*m\.?/.test(lower);

  const clock = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  const spoken = text.match(/\ba las\s+(\d{1,2})(?::(\d{2}))?/i);

  const match = clock || spoken;
  if (!match) return undefined;

  let hour = Number(match[1]);
  const minutes = (match[2] || '00').padStart(2, '0');
  const suffix = (match[3] || '').toLowerCase();

  let ampm: 'am' | 'pm' = 'am';
  if (suffix === 'pm' || isPm) ampm = 'pm';
  else if (suffix === 'am' || isAm) ampm = 'am';
  else if (hour >= 13 && hour <= 23) {
    hour -= 12;
    ampm = 'pm';
  } else if (hour === 12) {
    ampm = isAm ? 'am' : 'pm';
  } else if (hour >= 8 && hour <= 11 && !isPm) {
    ampm = 'am';
  } else if (hour >= 1 && hour <= 7 && isPm) {
    ampm = 'pm';
  }

  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;
  return `${String(hour).padStart(2, '0')}:${minutes} ${ampm}`;
}

function isQueryIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const asks =
    /(qué|que|cuál|cual|cuáles|cuales|dime|dígame|digame|necesito que me digas|necesito que me diga|tienes pendientes|tengo pendientes|hay pendientes|lista(me)?|cuántas|cuantas)/.test(
      lower
    );
  const aboutTasks = /(tarea|pendiente|hoy|mañana|manana|semana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|\bel\s+\d{1,2}\b)/.test(
    lower
  );
  const isAdd = /(agrég|agreg|añad|anad|crea(me|r)? |anota|apúnta|apunta|ponme |programa)/.test(lower);
  return asks && aboutTasks && !isAdd;
}

function cleanTaskTitle(text: string): string {
  let title = text;

  title = title.replace(/^(por favor[, ]*|oye[, ]*|orbi+ta[, ]*|hey[, ]*)+/i, '');
  title = title.replace(
    /^(necesito que (me )?)?(me )?(agrégues|agregues|agregas|agrégame|agregame|agrega|añádeme|añademe|añades|añade|anade|creas|creame|crea|anotas|anotame|anota|apúntame|apuntame|apunta|pongas|ponme|pon|programas|programame|programa)\b[, ]*/i,
    ''
  );
  title = title.replace(/^(una |un |1 |la |las )?tareas?\b/i, '');
  title = title.replace(/^(para |de |del |el )+/i, '');

  title = title.replace(/\bpara\s+(el\s+)?(hoy|mañana|manana|pasado\s+(mañana|manana))\b/gi, '');
  title = title.replace(/\bpara\s+(este\s+)?(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/gi, '');
  title = title.replace(/\bpara\s+el\s+\d{1,2}(\s+de\s+\w+)?\b/gi, '');
  title = title.replace(/\bpara\s+esta semana\b/gi, '');
  title = title.replace(/\besta semana\b/gi, '');
  title = title.replace(/\bpasado\s+(mañana|manana)\b/gi, '');
  title = title.replace(/\b(hoy|mañana|manana)\b/gi, '');
  title = title.replace(/\b(el|este|esta)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/gi, '');
  title = title.replace(/\bel\s+\d{1,2}(\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))?\b/gi, '');
  title = title.replace(/\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi, '');

  title = title.replace(/\bprioridad\s+(alta|media|baja)\b/gi, '');
  title = title.replace(/\b(urgente|importante)\b/gi, '');
  title = title.replace(/\ba las\s+\d{1,2}(:\d{2})?\s*(de la (mañana|tarde|noche)|am|pm)?\b/gi, '');
  title = title.replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, '');
  title = title.replace(/\b(todos los días|diariamente|lunes a viernes|fines de semana|toda la semana|todas las semanas)\b/gi, '');
  title = title.replace(/\ben (parque central|sala ágora|sala agora|oficina)\b/gi, '');

  title = title.replace(/^(que se llama|llamada|que es|que sea|que dice|de nombre)\s+/i, '');
  title = title.replace(/^(para |de |del |el |la |un |una )+/i, '');
  title = title.replace(/\s+/g, ' ').trim();
  title = title.replace(/^[,.:;¡!¿?-]+|[,.:;¡!¿?-]+$/g, '').trim();

  return title;
}

function looksLikeCommandResidue(title: string): boolean {
  if (!title) return true;
  const lower = title.toLowerCase();
  if (lower.length < 2) return true;
  return /^(una |un |1 |la )?tareas?$/.test(lower);
}

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (/(cardio|gimnasio|entrenar|ejercicio|salud|médico|medico|doctor|dentista)/.test(lower)) return 'Salud';
  if (/(estudiar|leer|curso|aprender|clase|tarea de|universidad)/.test(lower)) return 'Estudio';
  if (/(comprar|casa|personal|insumos|familia|super)/.test(lower)) return 'Personal';
  return 'Trabajo';
}

function detectPriority(text: string): Priority {
  const lower = text.toLowerCase();
  if (/(alta|urgente|importante)/.test(lower)) return 'Alta';
  if (/\bbaja\b/.test(lower)) return 'Baja';
  return 'Media';
}

export function parseVoiceCommand(text: string, referenceDate: string): VoiceIntent {
  const trimmed = text.trim();
  if (!trimmed) return { type: 'unknown' };

  const spokenDate = parseSpokenDate(trimmed, referenceDate);
  const weekNumber = getIsoWeekNumber(spokenDate.date);

  if (isQueryIntent(trimmed)) {
    return {
      type: 'query',
      scope: spokenDate.week ? 'week' : 'date',
      date: spokenDate.date,
      weekNumber,
      label: spokenDate.label,
    };
  }

  let cadence: Cadence = 'DIARIA';
  let dailyMode: DailyMode = 'SPECIFIC_DATE';
  let recurringPreset: RecurringPreset | undefined;
  let recurringDays: number[] | undefined;
  let weeklyMode: WeeklyMode | undefined;
  const lower = trimmed.toLowerCase();

  if (lower.includes('lunes a viernes')) {
    dailyMode = 'RECURRING';
    recurringPreset = 'WEEKDAYS';
    recurringDays = [1, 2, 3, 4, 5];
  } else if (lower.includes('fin de semana') || lower.includes('fines de semana')) {
    dailyMode = 'RECURRING';
    recurringPreset = 'WEEKENDS';
    recurringDays = [6, 7];
  } else if (lower.includes('todos los días') || lower.includes('diariamente')) {
    dailyMode = 'RECURRING';
    recurringPreset = 'EVERY_DAY';
    recurringDays = [1, 2, 3, 4, 5, 6, 7];
  } else if (lower.includes('todas las semanas')) {
    cadence = 'SEMANAL';
    weeklyMode = 'ALL_WEEKS';
  } else if (/\btoda la semana\b/.test(lower) || (/\bsemana\b/.test(lower) && spokenDate.week)) {
    cadence = 'SEMANAL';
    weeklyMode = 'SPECIFIC_WEEK';
  }

  const cleaned = cleanTaskTitle(trimmed);
  const title = looksLikeCommandResidue(cleaned)
    ? ''
    : cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  let location: string | undefined;
  if (lower.includes('parque central')) location = 'Parque Central';
  else if (lower.includes('sala ágora') || lower.includes('sala agora')) location = 'Sala Ágora';
  else if (lower.includes('oficina')) location = 'Oficina';

  return {
    type: 'add',
    titleOk: Boolean(title),
    task: {
      title: title || 'Nueva tarea',
      cadence,
      dailyMode: cadence === 'DIARIA' ? dailyMode : undefined,
      recurringPreset,
      recurringDays,
      weeklyMode,
      weekNumber,
      priority: detectPriority(trimmed),
      category: detectCategory(title || trimmed),
      dueTime: parseSpokenTime(trimmed),
      dueDate: spokenDate.date,
      location,
    },
  };
}

export function findPendingTasksForIntent(
  tasks: Task[],
  intent: Extract<VoiceIntent, { type: 'query' }>
): Task[] {
  if (intent.scope === 'week') {
    const days = getWeekDateStrings(intent.weekNumber);
    const result: Task[] = [];
    const seen = new Set<string>();
    for (const task of tasks) {
      const pendingOnWeek =
        days.some(
          (date) =>
            isTaskOnDate(task, date) &&
            !isTaskCompletedOnDate(task, date) &&
            !isTaskOmittedOnDate(task, date)
        ) ||
        (isTaskInWeek(task, intent.weekNumber) && !task.completed && !task.omitted);
      if (pendingOnWeek && !seen.has(task.id)) {
        seen.add(task.id);
        result.push(task);
      }
    }
    return result;
  }

  const date = intent.date;
  return tasks.filter((task) => {
    if (isTaskCompletedOnDate(task, date) || isTaskOmittedOnDate(task, date)) return false;
    if (isTaskOnDate(task, date)) return true;
    if (isTaskInWeek(task, intent.weekNumber)) return true;
    return false;
  });
}

export function buildPendingSpeech(tasks: Task[], label: string): string {
  if (tasks.length === 0) {
    return `No tienes tareas pendientes para ${label}.`;
  }

  const names = tasks.map((task) => (task.dueTime ? `${task.title}, a las ${task.dueTime}` : task.title));
  if (names.length === 1) {
    return `Tienes 1 tarea pendiente para ${label}: ${names[0]}.`;
  }

  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(', ');
  return `Tienes ${names.length} tareas pendientes para ${label}: ${rest}, y ${last}.`;
}

export function speakSpanish(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const play = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.find((voice) => voice.lang.toLowerCase().startsWith('es'));
    if (spanish) utterance.voice = spanish;
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', play, { once: true });
  }
  play();
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
