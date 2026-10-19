export type Cadence = 'DIARIA' | 'SEMANAL';
export type Priority = 'Alta' | 'Media' | 'Baja';
export type Category = string;

export const DEFAULT_CATEGORIES: string[] = ['Trabajo', 'Estudio', 'Salud', 'Personal'];

export type DailyMode = 'SPECIFIC_DATE' | 'RECURRING';
export type RecurringPreset = 'WEEKDAYS' | 'WEEKENDS' | 'EVERY_DAY' | 'CUSTOM';
export type WeeklyMode = 'SPECIFIC_WEEK' | 'ALL_WEEKS';

export interface Task {
  id: string;
  title: string;
  subtitle?: string;
  cadence: Cadence;
  priority: Priority;
  completed: boolean;
  completedAt?: string;
  completedDates?: string[]; // For recurring daily tasks: list of YYYY-MM-DD completed
  omitted?: boolean; // Task marked as skipped / omitted
  omittedAt?: string;
  omittedDates?: string[]; // For recurring daily tasks: list of YYYY-MM-DD omitted
  
  // Daily options
  dailyMode?: DailyMode;
  dueDate: string; // YYYY-MM-DD (anchor date or specific date)
  recurringPreset?: RecurringPreset;
  recurringDays?: number[]; // 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb, 7=Dom

  // Weekly options
  weeklyMode?: WeeklyMode;
  weekNumber: number; // e.g. 42
  
  // Common details
  dueTime?: string; // e.g. "11:30 am" or "09:00 am"
  location?: string; // e.g. "Sala Ágora"
  isOverdue?: boolean;
  category: Category;
  progressCurrent?: number; // e.g. 2
  progressTotal?: number; // e.g. 3
  notes?: string;
}

export type TabType = 'tareas' | 'semana' | 'calendario' | 'estadisticas';

export type TaskStatusType = 'TODAS' | 'PENDIENTES' | 'HECHAS' | 'OMITIDAS' | 'ATRASADAS' | 'COMPLETADAS' | 'VENCIDAS';

export interface FilterOptions {
  cadence?: Cadence | 'TODAS';
  priority?: Priority | 'TODAS';
  status?: TaskStatusType;
  category?: Category | 'TODAS';
  searchQuery?: string;
}

