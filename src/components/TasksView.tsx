import React, { useState, useMemo } from 'react';
import { Task, Cadence, Category, Priority, TaskStatusType } from '../types';
import { getRecurrenceLabel, getIsoDay, isTaskCompletedOnDate, isTaskOmittedOnDate, isRecurringDaily, formatDateISO } from '../utils/taskUtils';
import { ConfirmModal } from './ConfirmModal';

interface TasksViewProps {
  tasks: Task[];
  onToggleTask: () => void;
  onToggleTaskById: (taskId: string, dateStr?: string) => void;
  onToggleOmitTaskById?: (taskId: string, dateStr?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenAddTask: () => void;
  onEditTask?: (task: Task) => void;
  categories?: string[];
  currentDate?: string;
  currentWeekNumber?: number;
}

/**
 * Calculates day distance from reference date (current day: e.g. 2024-10-16).
 * 0 = today, 1 = tomorrow, 2 = 2 days away, etc.
 */
function getTaskDateOffset(task: Task, refDateStr: string = '2024-10-16', refWeekNum: number = 42): number {
  if (task.cadence === 'DIARIA') {
    if (task.dailyMode === 'RECURRING') {
      const refDay = getIsoDay(refDateStr);
      if (task.recurringDays && task.recurringDays.includes(refDay)) {
        return 0; // Active today
      }
      if (task.recurringDays && task.recurringDays.length > 0) {
        for (let offset = 1; offset <= 7; offset++) {
          const nextDay = ((refDay - 1 + offset - 1) % 7) + 1;
          if (task.recurringDays.includes(nextDay)) {
            return offset;
          }
        }
      }
      return 0.1;
    }

    if (task.dueDate) {
      const refTime = new Date(refDateStr + 'T00:00:00').getTime();
      const taskTime = new Date(task.dueDate + 'T00:00:00').getTime();
      return Math.round((taskTime - refTime) / (1000 * 60 * 60 * 24));
    }
    return 999;
  }

  if (task.cadence === 'SEMANAL') {
    if (task.weeklyMode === 'ALL_WEEKS' || task.weekNumber === refWeekNum) {
      return 0.5; // Active this current week
    }
    if (task.weekNumber && task.weekNumber > refWeekNum) {
      return (task.weekNumber - refWeekNum) * 7;
    }
    if (task.weekNumber && task.weekNumber < refWeekNum) {
      return (task.weekNumber - refWeekNum) * 7;
    }
    return 3.5;
  }

  return 999;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTaskById,
  onToggleOmitTaskById,
  onDeleteTask,
  onOpenAddTask,
  onEditTask,
  categories = ['Trabajo', 'Estudio', 'Salud', 'Personal'],
  currentDate = formatDateISO(new Date()),
  currentWeekNumber = 42,
}) => {
  const [filterCadence, setFilterCadence] = useState<'TODAS' | Cadence>('TODAS');
  const [filterStatus, setFilterStatus] = useState<TaskStatusType>('TODAS');
  const [filterCategory, setFilterCategory] = useState<'TODAS' | Category>('TODAS');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand / collapse state for completed and omitted tasks sections
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isOmittedExpanded, setIsOmittedExpanded] = useState(false);

  // Task deletion confirmation modal state
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(null);

  // Helper to determine if a task is overdue (atrasada)
  const isTaskOverdue = (t: Task): boolean => {
    if (isTaskCompletedOnDate(t, currentDate) || isTaskOmittedOnDate(t, currentDate)) return false;
    if (isRecurringDaily(t) || t.weeklyMode === 'ALL_WEEKS') return false;
    if (t.isOverdue) return true;
    if (t.cadence === 'DIARIA' && t.dueDate && t.dueDate < currentDate) return true;
    if (t.cadence === 'SEMANAL' && t.weekNumber && t.weekNumber < currentWeekNumber) return true;
    return false;
  };

  // Filter tasks based on search, cadence, category, and status filter
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesSub = t.subtitle?.toLowerCase().includes(q);
        const matchesLoc = t.location?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSub && !matchesLoc) return false;
      }

      // Cadence
      if (filterCadence !== 'TODAS' && t.cadence !== filterCadence) return false;

      // Category
      if (filterCategory !== 'TODAS' && t.category !== filterCategory) return false;

      // Status
      const isDone = isTaskCompletedOnDate(t, currentDate);
      const isOmitted = isTaskOmittedOnDate(t, currentDate);
      const isOverdue = isTaskOverdue(t);

      if (filterStatus === 'PENDIENTES' && (isDone || isOmitted || isOverdue)) return false;
      if ((filterStatus === 'HECHAS' || filterStatus === 'COMPLETADAS') && !isDone) return false;
      if (filterStatus === 'OMITIDAS' && !isOmitted) return false;
      if ((filterStatus === 'ATRASADAS' || filterStatus === 'VENCIDAS') && !isOverdue) return false;

      return true;
    });
  }, [tasks, searchQuery, filterCadence, filterStatus, filterCategory, currentDate, currentWeekNumber]);

  // Priority weighting
  const priorityWeight: Record<Priority, number> = {
    Alta: 3,
    Media: 2,
    Baja: 1,
  };

  // 1. Tareas Atrasadas (Vencidas)
  const overdueTasks = useMemo(() => {
    return filteredTasks
      .filter((t) => !isTaskCompletedOnDate(t, currentDate) && !isTaskOmittedOnDate(t, currentDate) && isTaskOverdue(t))
      .sort((a, b) => {
        const offsetA = Math.abs(getTaskDateOffset(a, currentDate, currentWeekNumber));
        const offsetB = Math.abs(getTaskDateOffset(b, currentDate, currentWeekNumber));
        if (offsetA !== offsetB) return offsetA - offsetB;
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      });
  }, [filteredTasks, currentDate, currentWeekNumber]);

  // 2. Tareas Pendientes por hacer (ni atrasadas, ni hechas, ni omitidas)
  const pendingTasks = useMemo(() => {
    return filteredTasks
      .filter((t) => !isTaskCompletedOnDate(t, currentDate) && !isTaskOmittedOnDate(t, currentDate) && !isTaskOverdue(t))
      .sort((a, b) => {
        const offsetA = getTaskDateOffset(a, currentDate, currentWeekNumber);
        const offsetB = getTaskDateOffset(b, currentDate, currentWeekNumber);
        // Closest to current date at the top, further away lower down
        if (offsetA !== offsetB) return offsetA - offsetB;
        // Secondary: Higher priority first
        const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        // Tertiary: By time if available
        return (a.dueTime || '').localeCompare(b.dueTime || '');
      });
  }, [filteredTasks, currentDate, currentWeekNumber]);

  // 3. Tareas Hechas (Completadas)
  const completedTasks = useMemo(() => {
    return filteredTasks
      .filter((t) => isTaskCompletedOnDate(t, currentDate))
      .sort((a, b) => {
        const offsetA = Math.abs(getTaskDateOffset(a, currentDate, currentWeekNumber));
        const offsetB = Math.abs(getTaskDateOffset(b, currentDate, currentWeekNumber));
        if (offsetA !== offsetB) return offsetA - offsetB;
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      });
  }, [filteredTasks, currentDate, currentWeekNumber]);

  // 4. Tareas Omitidas
  const omittedTasks = useMemo(() => {
    return filteredTasks
      .filter((t) => isTaskOmittedOnDate(t, currentDate))
      .sort((a, b) => {
        const offsetA = Math.abs(getTaskDateOffset(a, currentDate, currentWeekNumber));
        const offsetB = Math.abs(getTaskDateOffset(b, currentDate, currentWeekNumber));
        if (offsetA !== offsetB) return offsetA - offsetB;
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      });
  }, [filteredTasks, currentDate, currentWeekNumber]);

  // Render a task card
  const renderTaskCard = (task: Task) => {
    const isCompleted = isTaskCompletedOnDate(task, currentDate);
    const isOmitted = isTaskOmittedOnDate(task, currentDate);
    const isOverdue = isTaskOverdue(task);

    return (
      <div
        key={task.id}
        className={`p-3.5 rounded-xl shadow-xs border transition-all flex items-start gap-3 group ${
          isCompleted
            ? 'bg-[#DDF4DF] dark:bg-[#132c1c] border-[#BCE3BF] dark:border-[#1e482a]'
            : isOmitted
            ? 'bg-[#F1F3F5] dark:bg-[#1a1d24] border-[#D8DCE2] dark:border-[#2b303c] opacity-80 hover:opacity-100'
            : isOverdue
            ? 'bg-[#FFF9E6] dark:bg-[#2e230f] border-[#F2DF99] dark:border-[#524018]'
            : 'bg-white dark:bg-[#1f232b] border-[#e5e7eb] dark:border-[#2b303c] hover:border-[#c5c5d8] dark:hover:border-[#3d4453]'
        }`}
      >
        {/* Checkbox (Marcar como Hecha) */}
        <button
          onClick={() => onToggleTaskById(task.id, currentDate)}
          className={`mt-0.5 w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
            isCompleted
              ? 'bg-[#1E6B37] dark:bg-[#22c55e] text-white shadow-xs'
              : isOmitted
              ? 'bg-transparent shadow-[inset_0_0_0_1.5px_#94a3b8] dark:shadow-[inset_0_0_0_1.5px_#64748b] hover:bg-[#cbd5e1]/40'
              : isOverdue
              ? 'bg-transparent shadow-[inset_0_0_0_1.5px_#F2DF99] dark:shadow-[inset_0_0_0_1.5px_#ca8a04] hover:bg-[#F2DF99]/40 dark:hover:bg-[#524018]/40'
              : 'bg-transparent shadow-[inset_0_0_0_1.5px_#D1D5DB] dark:shadow-[inset_0_0_0_1.5px_#4b5563] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b]'
          }`}
          aria-label={isCompleted ? 'Desmarcar' : 'Completar'}
          title={isCompleted ? 'Desmarcar tarea' : 'Marcar como hecha'}
        >
          {isCompleted && (
            <span className="material-symbols-outlined text-[14px] font-bold">check</span>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded text-[10px] tracking-wider font-bold ${
                  task.cadence === 'DIARIA'
                    ? isCompleted
                      ? 'bg-white/70 dark:bg-black/30 text-[#1E6B37] dark:text-[#86efac]'
                      : isOmitted
                      ? 'bg-white/70 dark:bg-black/30 text-[#475569] dark:text-[#94a3b8]'
                      : isOverdue
                      ? 'bg-white/70 dark:bg-black/30 text-[#8A6508] dark:text-[#fde047]'
                      : 'bg-[#E0F2FE] dark:bg-[#0284c7]/20 text-[#0369A1] dark:text-[#38bdf8]'
                    : isCompleted
                    ? 'bg-white/70 dark:bg-black/30 text-[#1E6B37] dark:text-[#86efac]'
                    : isOmitted
                    ? 'bg-white/70 dark:bg-black/30 text-[#475569] dark:text-[#94a3b8]'
                    : 'bg-[#EDE9FE] dark:bg-[#7c3aed]/20 text-[#5B21B6] dark:text-[#c4b5fd]'
                }`}
              >
                {task.cadence}
              </span>

              {task.dailyMode === 'RECURRING' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EDE9FE] dark:bg-[#7c3aed]/20 text-[#5B21B6] dark:text-[#c4b5fd] font-semibold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[11px]">repeat</span>
                  {getRecurrenceLabel(task)}
                </span>
              )}

              {task.cadence === 'SEMANAL' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EDE9FE] dark:bg-[#7c3aed]/20 text-[#5B21B6] dark:text-[#c4b5fd] font-semibold">
                  {task.weeklyMode === 'ALL_WEEKS' ? 'Todas las semanas' : `Sem. ${task.weekNumber}`}
                </span>
              )}

              <span className="text-[10px] text-[#757686] dark:text-[#9aa0a6] font-medium">
                {task.category}
              </span>
            </div>

            {/* Status Badges & Quick Actions */}
            <div className="flex items-center gap-1.5">
              {isCompleted ? (
                <span className="text-[10px] text-[#1E6B37] dark:text-[#86efac] font-semibold flex items-center gap-0.5 bg-white/60 dark:bg-black/30 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[13px]">done_all</span>
                  Hecha
                </span>
              ) : isOmitted ? (
                <span className="text-[10px] font-semibold text-[#475569] dark:text-[#cbd5e1] bg-[#e2e8f0] dark:bg-[#334155] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">block</span>
                  Omitida
                </span>
              ) : isOverdue ? (
                <span className="text-[10px] font-semibold text-[#8A6508] dark:text-[#fde047] bg-[#F2DF99]/60 dark:bg-[#524018]/80 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  Atrasada
                </span>
              ) : (
                <span
                  className={`text-[10px] font-semibold flex items-center gap-1 ${
                    task.priority === 'Alta'
                      ? 'text-[#BA1A1A] dark:text-[#f87171]'
                      : task.priority === 'Media'
                      ? 'text-[#8A6508] dark:text-[#fde047]'
                      : 'text-[#444655] dark:text-[#9aa0a6]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      task.priority === 'Alta'
                        ? 'bg-[#BA1A1A] dark:bg-[#f87171]'
                        : task.priority === 'Media'
                        ? 'bg-[#8A6508] dark:bg-[#fde047]'
                        : 'bg-[#757686] dark:bg-[#9aa0a6]'
                    }`}
                  />
                  {task.priority}
                </span>
              )}

              {/* Action: Omitir / Reactivar */}
              {onToggleOmitTaskById && (
                <button
                  type="button"
                  onClick={() => onToggleOmitTaskById(task.id, currentDate)}
                  className={`p-1 rounded-lg text-[11px] font-semibold flex items-center gap-0.5 transition-all cursor-pointer ${
                    isOmitted
                      ? 'bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff] hover:bg-[#bac3ff]'
                      : 'text-[#757686] dark:text-[#9aa0a6] hover:text-[#475569] dark:hover:text-[#f3f4f6] hover:bg-[#eceef0] dark:hover:bg-[#252831]'
                  }`}
                  title={isOmitted ? 'Reactivar tarea (deshacer omisión)' : 'Omitir tarea'}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isOmitted ? 'undo' : 'block'}
                  </span>
                  <span className="hidden sm:inline text-[10px]">
                    {isOmitted ? 'Reactivar' : 'Omitir'}
                  </span>
                </button>
              )}

              {/* Edit icon */}
              <button
                onClick={() => onEditTask?.(task)}
                className="text-[#757686] dark:text-[#9aa0a6] hover:text-[#173bd0] dark:hover:text-[#5675fd] p-1 rounded-lg hover:bg-[#eceef0] dark:hover:bg-[#252831] transition-colors cursor-pointer"
                title="Modificar tarea"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>

              {/* Delete icon - triggers confirmation dialog */}
              <button
                onClick={() => setTaskPendingDeletion(task)}
                className="text-[#757686] dark:text-[#9aa0a6] hover:text-[#BA1A1A] dark:hover:text-[#f87171] p-1 rounded-lg hover:bg-[#fee2e2] dark:hover:bg-[#3d1a1a] transition-colors cursor-pointer"
                title="Eliminar tarea"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>

          <p
            onClick={() => onEditTask?.(task)}
            className={`text-[14px] leading-snug font-medium cursor-pointer hover:opacity-85 ${
              isCompleted
                ? 'text-[#1E6B37] dark:text-[#86efac] line-through opacity-90'
                : isOmitted
                ? 'text-[#64748b] dark:text-[#94a3b8] line-through opacity-85'
                : isOverdue
                ? 'text-[#8A6508] dark:text-[#fde047] font-semibold'
                : 'text-[#1F2937] dark:text-[#f3f4f6]'
            }`}
            title="Toca para modificar tarea"
          >
            {task.title}
          </p>

          <div className="flex items-center gap-2 text-[12px] text-[#444655] dark:text-[#9aa0a6]">
            {task.dailyMode === 'RECURRING' ? (
              <span className="flex items-center gap-1 text-[#5b21b6] dark:text-[#c4b5fd] font-medium">
                <span className="material-symbols-outlined text-[13px]">repeat</span>
                {getRecurrenceLabel(task)}
              </span>
            ) : task.cadence === 'SEMANAL' ? (
              <span className="flex items-center gap-1 text-[#5b21b6] dark:text-[#c4b5fd] font-medium">
                <span className="material-symbols-outlined text-[13px]">view_week</span>
                {task.weeklyMode === 'ALL_WEEKS' ? 'Todas las semanas' : `Semana ${task.weekNumber}`}
              </span>
            ) : task.dueDate ? (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                {task.dueDate === currentDate ? 'Hoy (' + task.dueDate + ')' : task.dueDate}
              </span>
            ) : null}
            {task.dueTime && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                {task.dueTime}
              </span>
            )}
            {task.location && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">location_on</span>
                {task.location}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalVisibleCount =
    overdueTasks.length + pendingTasks.length + completedTasks.length + omittedTasks.length;

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-8 gap-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#191c1e] dark:text-[#f3f4f6] tracking-tight leading-8">
            Todas las Tareas
          </h1>
          <p className="text-[12px] text-[#444655] dark:text-[#9aa0a6]">
            {totalVisibleCount} {totalVisibleCount === 1 ? 'tarea visible' : 'tareas visibles'} · {completedTasks.length} hechas · {omittedTasks.length} omitidas
          </p>
        </div>
        <button
          onClick={onOpenAddTask}
          className="px-3.5 py-1.5 rounded-xl bg-[#173bd0] dark:bg-[#5675fd] text-white hover:bg-[#3a57e8] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 text-[12px] font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-[#757686] dark:text-[#9aa0a6]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar tareas, notas, salas..."
          className="w-full pl-10 pr-9 py-2 bg-white dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[14px] text-[#191c1e] dark:text-[#f3f4f6] placeholder-[#757686] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#173bd0] dark:focus:border-[#5675fd] shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-2.5 text-[#757686] hover:text-[#191c1e] dark:hover:text-[#f3f4f6] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Cadence & Status Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {(['TODAS', 'DIARIA', 'SEMANAL'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilterCadence(c)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
              filterCadence === c
                ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-xs'
                : 'bg-white dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b]'
            }`}
          >
            {c === 'TODAS' ? 'TODAS' : c === 'DIARIA' ? 'DIARIAS' : 'SEMANALES'}
          </button>
        ))}

        <div className="h-4 w-px bg-[#e5e7eb] dark:bg-[#2b303c] mx-1 shrink-0" />

        {/* 4 Status Pills: Pendientes, Atrasadas, Hechas, Omitidas */}
        {(['TODAS', 'PENDIENTES', 'ATRASADAS', 'HECHAS', 'OMITIDAS'] as const).map((s) => {
          const isSelected =
            filterStatus === s ||
            (s === 'HECHAS' && filterStatus === 'COMPLETADAS') ||
            (s === 'ATRASADAS' && filterStatus === 'VENCIDAS');

          return (
            <button
              key={s}
              onClick={() => {
                setFilterStatus(s);
                if (s === 'HECHAS') {
                  setIsCompletedExpanded(true);
                }
                if (s === 'OMITIDAS') {
                  setIsOmittedExpanded(true);
                }
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-[#191c1e] dark:bg-[#dee0ff] text-white dark:text-[#00105b]'
                  : 'bg-white dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b]'
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setFilterCategory('TODAS')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
            filterCategory === 'TODAS'
              ? 'bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff] font-semibold'
              : 'text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b]'
          }`}
        >
          Todo
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              filterCategory === cat
                ? 'bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff] font-semibold'
                : 'text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="flex flex-col gap-4 mt-1">
        {totalVisibleCount === 0 ? (
          <div className="p-8 bg-white dark:bg-[#1f232b] rounded-xl border border-dashed border-[#e5e7eb] dark:border-[#2b303c] text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[36px] text-[#757686]/50 dark:text-[#9aa0a6]/40">
              inbox
            </span>
            <p className="text-[14px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
              No hay tareas con estos filtros
            </p>
            <p className="text-[12px] text-[#757686] dark:text-[#9aa0a6]">
              Prueba cambiando los filtros o la búsqueda
            </p>
            <button
              onClick={() => {
                setFilterCadence('TODAS');
                setFilterStatus('TODAS');
                setFilterCategory('TODAS');
                setSearchQuery('');
              }}
              className="mt-2 text-[12px] text-[#173bd0] dark:text-[#5675fd] font-semibold hover:underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <>
            {/* 1. SECCIÓN: TAREAS ATRASADAS (VENCIDAS) - Primeras, marcadas de amarillito cálido */}
            {overdueTasks.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse" />
                    <h2 className="text-[13px] font-bold text-[#8A6508] dark:text-[#fde047] uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">warning</span>
                      Tareas Atrasadas
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF2C6] dark:bg-[#524018]/90 text-[#8A6508] dark:text-[#fde047] border border-[#F2DF99] dark:border-[#785412]">
                    {overdueTasks.length} {overdueTasks.length === 1 ? 'atrasada' : 'atrasadas'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {overdueTasks.map(renderTaskCard)}
                </div>
              </div>
            )}

            {/* 2. SECCIÓN: TAREAS PENDIENTES POR HACER (Ordenadas por cercanía cronológica) */}
            {pendingTasks.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#173bd0] dark:bg-[#5675fd]" />
                    <h2 className="text-[13px] font-bold text-[#191c1e] dark:text-[#f3f4f6] uppercase tracking-wider">
                      Pendientes por hacer
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-[#444655] dark:text-[#9aa0a6]">
                    {pendingTasks.length} {pendingTasks.length === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {pendingTasks.map(renderTaskCard)}
                </div>
              </div>
            )}

            {/* 3. SECCIÓN: TAREAS REALIZADAS / HECHAS (Desplegable) */}
            {completedTasks.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCompletedExpanded((prev) => !prev)}
                  className="w-full p-3 rounded-2xl bg-[#f8f9fb] dark:bg-[#1f232b] border border-[#e5e7eb] dark:border-[#2b303c] hover:border-[#1e6b37]/40 dark:hover:border-[#22c55e]/40 flex items-center justify-between transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#DDF4DF] dark:bg-[#132c1c] text-[#1E6B37] dark:text-[#4ade80] flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[17px]">task_alt</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-bold text-[#191c1e] dark:text-[#f3f4f6] group-hover:text-[#1e6b37] dark:group-hover:text-[#4ade80] transition-colors">
                        Tareas Hechas
                      </p>
                      <p className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                        {completedTasks.length} {completedTasks.length === 1 ? 'tarea realizada' : 'tareas realizadas'}
                        {!isCompletedExpanded && ' · Toca para desplegar'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#173bd0] dark:text-[#5675fd]">
                    <span className="hidden sm:inline">
                      {isCompletedExpanded ? 'Ocultar' : 'Ver hechas'}
                    </span>
                    <span
                      className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                        isCompletedExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {isCompletedExpanded && (
                  <div className="flex flex-col gap-2 pl-1 animate-fade-in">
                    {completedTasks.map(renderTaskCard)}
                  </div>
                )}
              </div>
            )}

            {/* 4. SECCIÓN: TAREAS OMITIDAS (Desplegable) */}
            {omittedTasks.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOmittedExpanded((prev) => !prev)}
                  className="w-full p-3 rounded-2xl bg-[#f8f9fb] dark:bg-[#1f232b] border border-[#e5e7eb] dark:border-[#2b303c] hover:border-[#64748b]/40 flex items-center justify-between transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#e2e8f0] dark:bg-[#2c303b] text-[#475569] dark:text-[#cbd5e1] flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[17px]">block</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-bold text-[#191c1e] dark:text-[#f3f4f6] group-hover:text-[#475569] dark:group-hover:text-[#cbd5e1] transition-colors">
                        Tareas Omitidas
                      </p>
                      <p className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                        {omittedTasks.length} {omittedTasks.length === 1 ? 'tarea omitida' : 'tareas omitidas'}
                        {!isOmittedExpanded && ' · Toca para desplegar'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#173bd0] dark:text-[#5675fd]">
                    <span className="hidden sm:inline">
                      {isOmittedExpanded ? 'Ocultar' : 'Ver omitidas'}
                    </span>
                    <span
                      className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                        isOmittedExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {isOmittedExpanded && (
                  <div className="flex flex-col gap-2 pl-1 animate-fade-in">
                    {omittedTasks.map(renderTaskCard)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmación para eliminar tarea */}
      <ConfirmModal
        isOpen={Boolean(taskPendingDeletion)}
        title="¿Deseas eliminar esta tarea?"
        message={`¿Estás seguro de que deseas eliminar la tarea "${taskPendingDeletion?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onCancel={() => setTaskPendingDeletion(null)}
        onConfirm={() => {
          if (taskPendingDeletion) {
            onDeleteTask(taskPendingDeletion.id);
            setTaskPendingDeletion(null);
          }
        }}
      />
    </div>
  );
};
