import React from 'react';
import { Task, Priority } from '../types';
import {
  isTaskOnDate,
  isTaskCompletedOnDate,
  isTaskOmittedOnDate,
  isTaskInWeek,
  getRecurrenceLabel,
  formatDateISO,
  getWeekDateStrings,
} from '../utils/taskUtils';

interface WeekViewProps {
  tasks: Task[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onToggleTask: (taskId: string, dateStr?: string) => void;
  onToggleOmitTask?: (taskId: string, dateStr?: string) => void;
  onUpdateProgress: (taskId: string, newCurrent: number) => void;
  onOpenAddTask: (defaultDate?: string, defaultCadence?: 'DIARIA' | 'SEMANAL') => void;
  onEditTask?: (task: Task) => void;
  currentWeekNumber: number;
  onChangeWeek: (delta: number) => void;
  onGoToToday: () => void;
}


interface DayItem {
  dayName: string;
  shortName: string;
  dayNum: number;
  dateStr: string;
  isToday?: boolean;
  isSunday?: boolean;
}

export const WeekView: React.FC<WeekViewProps> = ({
  tasks,
  selectedDate,
  onSelectDate,
  onToggleTask,
  onToggleOmitTask,
  onUpdateProgress,
  onOpenAddTask,
  onEditTask,
  currentWeekNumber,
  onChangeWeek,
  onGoToToday,
}) => {
  const todayStr = formatDateISO(new Date());
  const weekDates = getWeekDateStrings(currentWeekNumber);
  const dayMeta = [
    { dayName: 'Lunes', shortName: 'LUN' },
    { dayName: 'Martes', shortName: 'MAR' },
    { dayName: 'Miércoles', shortName: 'MIÉ' },
    { dayName: 'Jueves', shortName: 'JUE' },
    { dayName: 'Viernes', shortName: 'VIE' },
    { dayName: 'Sábado', shortName: 'SÁB' },
    { dayName: 'Domingo', shortName: 'DOM' },
  ];

  const days: DayItem[] = weekDates.map((dateStr, idx) => ({
    ...dayMeta[idx],
    dayNum: Number(dateStr.split('-')[2]),
    dateStr,
    isToday: dateStr === todayStr,
    isSunday: idx === 6,
  }));

  const selectedDayItem = days.find((d) => d.dateStr === selectedDate) || days[2];

  // Daily tasks for the selected date (supports 1 specific day and recurring daily tasks)
  const dailyTasks = tasks.filter((t) => isTaskOnDate(t, selectedDate));

  // Weekly tasks for the active week (supports specific week number and all-weeks tasks)
  const weeklyTasks = tasks.filter((t) => isTaskInWeek(t, currentWeekNumber));

  // Format week range text: e.g. "Semana 42 · 14 – 20 oct"
  const firstDay = days[0];
  const lastDay = days[6];
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthIdx = parseInt(firstDay.dateStr.split('-')[1], 10) - 1;
  const weekLabel = `Semana ${currentWeekNumber} · ${firstDay.dayNum} – ${lastDay.dayNum} ${monthNames[monthIdx]}`;

  return (
    <div className="flex flex-col w-full max-w-md mx-auto">
      <div className="px-4 pt-3 pb-5 flex flex-col gap-5">
        {/* Title & Hoy Button */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-[26px] font-bold text-[#191c1e] dark:text-[#f3f4f6] tracking-tight leading-8">
              Mi semana
            </h1>
            <button
              onClick={onGoToToday}
              id="today-btn"
              className="px-3 py-1.5 rounded-full bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff] hover:bg-[#bac3ff] dark:hover:bg-[#5675fd]/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">today</span>
              <span className="text-[12px] font-semibold tracking-wider">Hoy</span>
            </button>
          </div>

          {/* Week Selector Bar */}
          <div className="flex items-center justify-between bg-[#f2f4f6] dark:bg-[#1f232b] px-2 py-1.5 rounded-xl border border-[#e5e7eb]/70 dark:border-[#2b303c] shadow-xs transition-colors">
            <button
              onClick={() => onChangeWeek(-1)}
              aria-label="Semana anterior"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[#444655] dark:text-[#9aa0a6] hover:bg-[#eceef0] dark:hover:bg-[#2c303b] active:bg-[#e6e8ea] dark:active:bg-[#353945] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[18px]">
                date_range
              </span>
              <span className="text-[15px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                {weekLabel}
              </span>
            </div>
            <button
              onClick={() => onChangeWeek(1)}
              aria-label="Semana siguiente"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[#444655] dark:text-[#9aa0a6] hover:bg-[#eceef0] dark:hover:bg-[#2c303b] active:bg-[#e6e8ea] dark:active:bg-[#353945] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* 7-Day Chips Strip */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 no-scrollbar">
          {days.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            const dayTasks = tasks.filter((t) => isTaskOnDate(t, day.dateStr));
            const hasCompleted = dayTasks.some((t) => isTaskCompletedOnDate(t, day.dateStr));
            const hasOverdue = dayTasks.some((t) => t.isOverdue && !isTaskCompletedOnDate(t, day.dateStr));
            const hasPending = dayTasks.some((t) => !isTaskCompletedOnDate(t, day.dateStr) && !t.isOverdue);

            return (
              <button
                key={day.dateStr}
                onClick={() => onSelectDate(day.dateStr)}
                className={`day-chip flex-1 min-w-[46px] py-2.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-md scale-105 z-10'
                    : day.isSunday
                    ? 'bg-[#f2f4f6]/70 dark:bg-[#1a1c22] shadow-sm hover:bg-[#f2f4f6] dark:hover:bg-[#252831] border border-transparent dark:border-[#2b303c] opacity-90'
                    : 'bg-white dark:bg-[#1f232b] shadow-sm hover:bg-[#f2f4f6] dark:hover:bg-[#252831] border border-transparent dark:border-[#2b303c]'
                }`}
              >
                <span
                  className={`text-[10px] tracking-wider font-bold ${
                    isSelected
                      ? 'text-[#dee0ff]'
                      : day.isSunday
                      ? 'text-[#757686] dark:text-[#80868b]'
                      : 'text-[#444655] dark:text-[#9aa0a6]'
                  }`}
                >
                  {day.shortName}
                </span>
                <span
                  className={`text-[16px] my-0.5 ${
                    isSelected
                      ? 'font-bold text-white'
                      : day.isSunday
                      ? 'font-medium text-[#444655] dark:text-[#9aa0a6]'
                      : 'font-semibold text-[#191c1e] dark:text-[#f3f4f6]'
                  }`}
                >
                  {day.dayNum}
                </span>

                {/* Day status indicator dot */}
                {day.isSunday ? (
                  <span className={`material-symbols-outlined text-[10px] mt-1 leading-none ${isSelected ? 'text-white' : 'text-[#757686] dark:text-[#80868b]'}`}>
                    wb_sunny
                  </span>
                ) : (
                  <div className="flex items-center gap-0.5 mt-1 min-h-[6px]">
                    {isSelected ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F2DF99]"></span>
                      </>
                    ) : hasCompleted && !hasPending && !hasOverdue ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1E6B37] dark:bg-[#4ade80]"></span>
                    ) : hasOverdue ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BA1A1A] dark:bg-[#f87171]"></span>
                    ) : hasPending ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c5c5d8] dark:bg-[#4b5563]"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent"></span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Section: Tareas del día */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#173bd0] dark:bg-[#5675fd]"></span>
              <h2 className="text-[16px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                Tareas del día ({selectedDayItem.dayName} {selectedDayItem.dayNum})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#444655] dark:text-[#9aa0a6] tracking-wider uppercase">
                {dailyTasks.length} {dailyTasks.length === 1 ? 'tarea' : 'tareas'}
              </span>
              <button
                onClick={() => onOpenAddTask(selectedDate, 'DIARIA')}
                className="text-[12px] text-[#173bd0] dark:text-[#5675fd] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                title="Añadir tarea para este día"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {dailyTasks.length === 0 ? (
              <div className="p-5 bg-white dark:bg-[#1f232b] rounded-xl shadow-xs border border-dashed border-[#e5e7eb] dark:border-[#2b303c] flex flex-col items-center justify-center text-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-[#757686]/60 dark:text-[#9aa0a6]/50">event_available</span>
                <p className="text-[13px] text-[#444655] dark:text-[#9aa0a6]">
                  No hay tareas programadas para este día
                </p>
                <button
                  onClick={() => onOpenAddTask(selectedDate, 'DIARIA')}
                  className="mt-1 px-3 py-1 bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff] rounded-lg text-[12px] font-semibold hover:bg-[#bac3ff] dark:hover:bg-[#5675fd]/40 transition-colors cursor-pointer"
                >
                  + Agregar tarea
                </button>
              </div>
            ) : (
              dailyTasks.map((task) => {
                const isCompleted = isTaskCompletedOnDate(task, selectedDate);
                const isOmitted = isTaskOmittedOnDate(task, selectedDate);
                const isOverdue = task.isOverdue && !isCompleted && !isOmitted;

                // 1. OMITTED CARD
                if (isOmitted) {
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 bg-[#F1F3F5] dark:bg-[#1a1d24] rounded-xl shadow-xs border border-[#D8DCE2] dark:border-[#2b303c] flex items-start gap-3 transition-transform active:scale-[0.99] opacity-80 hover:opacity-100"
                    >
                      <button
                        onClick={() => onToggleOmitTask?.(task.id, selectedDate)}
                        aria-label="Reactivar tarea"
                        className="mt-0.5 w-5 h-5 rounded-[6px] bg-[#64748b] dark:bg-[#475569] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                        title="Reactivar tarea (deshacer omisión)"
                      >
                        <span className="material-symbols-outlined text-[13px] font-bold">undo</span>
                      </button>
                      <div
                        onClick={() => onEditTask?.(task)}
                        className="flex-1 min-w-0 flex flex-col gap-1 cursor-pointer hover:opacity-90"
                        title="Toca para modificar tarea"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold bg-white/70 dark:bg-black/30 text-[#475569] dark:text-[#94a3b8]">
                              DIARIA
                            </span>
                            {task.dailyMode === 'RECURRING' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/60 dark:bg-black/25 text-[#475569] dark:text-[#94a3b8] font-semibold flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[11px]">repeat</span>
                                {getRecurrenceLabel(task)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#475569] dark:text-[#cbd5e1] font-semibold flex items-center gap-0.5 bg-[#e2e8f0] dark:bg-[#334155] px-2 py-0.5 rounded-full">
                              <span className="material-symbols-outlined text-[12px]">block</span>
                              Omitida
                            </span>
                            {onToggleOmitTask && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleOmitTask(task.id, selectedDate);
                                }}
                                className="text-[10px] font-bold text-[#173bd0] dark:text-[#5675fd] hover:underline cursor-pointer"
                              >
                                Reactivar
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[14px] text-[#64748b] dark:text-[#94a3b8] line-through leading-snug font-medium">
                          {task.title}
                        </p>
                        {task.subtitle && (
                          <span className="text-[12px] text-[#64748b]/80 dark:text-[#94a3b8]/80 leading-tight">
                            {task.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                // 2. COMPLETED CARD
                if (isCompleted) {
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 bg-[#DDF4DF] dark:bg-[#132c1c] rounded-xl shadow-xs border border-[#BCE3BF] dark:border-[#1e482a] flex items-start gap-3 transition-transform active:scale-[0.99]"
                    >
                      <button
                        onClick={() => onToggleTask(task.id, selectedDate)}
                        aria-label="Marcar incompleta"
                        className="mt-0.5 w-5 h-5 rounded-[6px] bg-[#1E6B37] dark:bg-[#22c55e] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                      </button>
                      <div
                        onClick={() => onEditTask?.(task)}
                        className="flex-1 min-w-0 flex flex-col gap-1 cursor-pointer hover:opacity-90"
                        title="Toca para modificar tarea"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold bg-white/70 dark:bg-black/30 text-[#1E6B37] dark:text-[#86efac]">
                              DIARIA
                            </span>
                            {task.dailyMode === 'RECURRING' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/60 dark:bg-black/25 text-[#1E6B37] dark:text-[#86efac] font-semibold flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[11px]">repeat</span>
                                {getRecurrenceLabel(task)}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#1E6B37] dark:text-[#86efac] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">done_all</span>
                            {task.completedAt || task.dueTime || 'Hecha'}
                          </span>
                        </div>
                        <p className="text-[14px] text-[#1E6B37] dark:text-[#86efac] line-through leading-snug opacity-90 font-medium">
                          {task.title}
                        </p>
                        {task.subtitle && (
                          <span className="text-[12px] text-[#1E6B37]/80 dark:text-[#86efac]/80 leading-tight">
                            {task.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                // 3. OVERDUE (ATRASADA) CARD
                if (isOverdue) {
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 bg-[#FFF2C6] dark:bg-[#2e230f] rounded-xl shadow-xs border border-[#F2DF99] dark:border-[#524018] flex items-start gap-3 transition-transform active:scale-[0.99]"
                    >
                      <button
                        onClick={() => onToggleTask(task.id, selectedDate)}
                        aria-label="Marcar completada"
                        className="mt-0.5 w-5 h-5 rounded-[6px] bg-transparent flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1.5px_#F2DF99] dark:shadow-[inset_0_0_0_1.5px_#ca8a04] hover:bg-[#F2DF99]/40 dark:hover:bg-[#524018]/40 transition-colors cursor-pointer"
                      ></button>
                      <div
                        onClick={() => onEditTask?.(task)}
                        className="flex-1 min-w-0 flex flex-col gap-1 cursor-pointer hover:opacity-90"
                        title="Toca para modificar tarea"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold bg-white/70 dark:bg-black/30 text-[#8A6508] dark:text-[#fde047]">
                              DIARIA
                            </span>
                            {task.dailyMode === 'RECURRING' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F2DF99]/50 dark:bg-[#524018]/60 text-[#8A6508] dark:text-[#fde047] font-semibold flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[11px]">repeat</span>
                                {getRecurrenceLabel(task)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-[#8A6508] dark:text-[#fde047] flex items-center gap-1 bg-[#F2DF99]/60 dark:bg-[#524018]/80 px-2 py-0.5 rounded-full">
                              <span className="material-symbols-outlined text-[13px]">warning</span>
                              Atrasada {task.dueTime}
                            </span>
                            {onToggleOmitTask && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleOmitTask(task.id, selectedDate);
                                }}
                                className="text-[10px] text-[#8A6508] dark:text-[#fde047] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                title="Omitir tarea"
                              >
                                <span className="material-symbols-outlined text-[12px]">block</span>
                                <span>Omitir</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[14px] text-[#8A6508] dark:text-[#fde047] font-semibold leading-snug">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1 text-[#8A6508]/80 dark:text-[#fde047]/80">
                          <span className="material-symbols-outlined text-[14px]">flag</span>
                          <span className="text-[12px] font-medium">
                            {task.subtitle || `Prioridad ${task.priority} · Atrasada`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 4. NORMAL PENDING CARD
                return (
                  <div
                    key={task.id}
                    className="p-3.5 bg-white dark:bg-[#1f232b] rounded-xl shadow-xs border border-[#e5e7eb] dark:border-[#2b303c] flex items-start gap-3 transition-transform active:scale-[0.99] hover:border-[#c5c5d8] dark:hover:border-[#3d4453]"
                  >
                    <button
                      onClick={() => onToggleTask(task.id, selectedDate)}
                      aria-label="Marcar completada"
                      className="mt-0.5 w-5 h-5 rounded-[6px] bg-transparent flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1.5px_#D1D5DB] dark:shadow-[inset_0_0_0_1.5px_#4b5563] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b] transition-colors cursor-pointer"
                    ></button>
                    <div
                      onClick={() => onEditTask?.(task)}
                      className="flex-1 min-w-0 flex flex-col gap-1 cursor-pointer hover:opacity-90"
                      title="Toca para modificar tarea"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold bg-[#E0F2FE] dark:bg-[#0284c7]/20 text-[#0369A1] dark:text-[#38bdf8]">
                            DIARIA
                          </span>
                          {task.dailyMode === 'RECURRING' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EDE9FE] dark:bg-[#7c3aed]/20 text-[#5B21B6] dark:text-[#c4b5fd] font-semibold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[11px]">repeat</span>
                              {getRecurrenceLabel(task)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
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
                            ></span>
                            {task.priority}
                          </span>
                          {onToggleOmitTask && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleOmitTask(task.id, selectedDate);
                              }}
                              className="text-[10px] text-[#757686] dark:text-[#9aa0a6] hover:text-[#475569] dark:hover:text-[#f3f4f6] hover:bg-[#eceef0] dark:hover:bg-[#2c303b] px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                              title="Omitir tarea para hoy"
                            >
                              <span className="material-symbols-outlined text-[12px]">block</span>
                              <span>Omitir</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[14px] text-[#1F2937] dark:text-[#f3f4f6] font-medium leading-snug">
                        {task.title}
                      </p>
                      {(task.dueTime || task.location) && (
                        <div className="flex items-center gap-1 text-[#444655] dark:text-[#9aa0a6]">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span className="text-[12px]">
                            {task.dueTime}
                            {task.location ? ` · ${task.location}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section: Tareas semanales activas */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#712ae2] dark:bg-[#8a4cfc]"></span>
              <h2 className="text-[16px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                Tareas semanales activas (Semana {currentWeekNumber})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#444655] dark:text-[#9aa0a6] tracking-wider uppercase">
                {weeklyTasks.length} globales
              </span>
              <button
                onClick={() => onOpenAddTask(selectedDate, 'SEMANAL')}
                className="text-[12px] text-[#712ae2] dark:text-[#8a4cfc] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                title="Añadir tarea semanal"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {weeklyTasks.map((task) => {
              if (task.omitted) {
                return (
                  <div
                    key={task.id}
                    className="p-3.5 bg-[#F1F3F5] dark:bg-[#1a1d24] rounded-xl shadow-xs border border-[#D8DCE2] dark:border-[#2b303c] flex items-start gap-3 transition-transform active:scale-[0.99] opacity-80 hover:opacity-100"
                  >
                    <button
                      onClick={() => onToggleOmitTask?.(task.id)}
                      aria-label="Reactivar tarea"
                      className="mt-0.5 w-5 h-5 rounded-[6px] bg-[#64748b] dark:bg-[#475569] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                      title="Reactivar tarea (deshacer omisión)"
                    >
                      <span className="material-symbols-outlined text-[13px] font-bold">undo</span>
                    </button>
                    <div
                      onClick={() => onEditTask?.(task)}
                      className="flex-1 min-w-0 flex flex-col gap-1 cursor-pointer hover:opacity-90"
                      title="Toca para modificar tarea"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold bg-white/70 dark:bg-black/30 text-[#475569] dark:text-[#94a3b8]">
                          SEMANAL
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-[#475569] dark:text-[#cbd5e1] bg-[#e2e8f0] dark:bg-[#334155] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">block</span>
                            Omitida
                          </span>
                          {onToggleOmitTask && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleOmitTask(task.id);
                              }}
                              className="text-[10px] font-bold text-[#173bd0] dark:text-[#5675fd] hover:underline cursor-pointer"
                            >
                              Reactivar
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[14px] text-[#64748b] dark:text-[#94a3b8] line-through leading-snug opacity-90 font-medium">
                        {task.title}
                      </p>
                      {task.subtitle && (
                        <span className="text-[12px] text-[#64748b]/80 dark:text-[#94a3b8]/80 leading-tight">
                          {task.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              if (task.completed) {
                return (
                  <div
                    key={task.id}
                    className="p-3.5 bg-[#DDF4DF] dark:bg-[#132c1c] rounded-xl shadow-xs border border-[#BCE3BF] dark:border-[#1e482a] flex items-start gap-3 transition-transform active:scale-[0.99]"
                  >
                    <button
                      onClick={() => onToggleTask(task.id)}
                      aria-label="Marcar incompleta"
                      className="mt-0.5 w-5 h-5 rounded-[6px] bg-[#1E6B37] dark:bg-[#22c55e] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                    </button>
                    <div
                      onClick={() => onEditTask?.(task)}
                      className="flex-1 min-w-0 flex flex-col gap-1 cursor-pointer hover:opacity-90"
                      title="Toca para modificar tarea"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold bg-white/70 dark:bg-black/30 text-[#1E6B37] dark:text-[#86efac]">
                          SEMANAL
                        </span>
                        <span className="text-[10px] text-[#1E6B37] dark:text-[#86efac] font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          Objetivo cumplido
                        </span>
                      </div>
                      <p className="text-[14px] text-[#1E6B37] dark:text-[#86efac] line-through leading-snug opacity-90 font-medium">
                        {task.title}
                      </p>
                      {task.subtitle && (
                        <span className="text-[12px] text-[#1E6B37]/80 dark:text-[#86efac]/80">
                          {task.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // Weekly task with progress bar (e.g. Rutina de ejercicio)
              if (task.progressTotal && task.progressTotal > 0) {
                const current = task.progressCurrent || 0;
                const total = task.progressTotal;
                const percent = Math.min(100, Math.round((current / total) * 100));

                return (
                  <div
                    key={task.id}
                    className="p-3.5 bg-white dark:bg-[#1f232b] rounded-xl shadow-xs border border-[#e5e7eb] dark:border-[#2b303c] flex items-start gap-3 transition-transform active:scale-[0.99] hover:border-[#c5c5d8] dark:hover:border-[#3d4453]"
                  >
                    <button
                      onClick={() => onToggleTask(task.id)}
                      aria-label="Marcar completada"
                      className="mt-0.5 w-5 h-5 rounded-[6px] bg-transparent flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1.5px_#D1D5DB] dark:shadow-[inset_0_0_0_1.5px_#4b5563] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b] transition-colors cursor-pointer"
                    ></button>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold bg-[#EDE9FE] dark:bg-[#7c3aed]/20 text-[#5B21B6] dark:text-[#c4b5fd]">
                          SEMANAL
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#5B21B6] dark:text-[#c4b5fd]">
                            <span>{current}/{total} días</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateProgress(task.id, Math.max(0, current - 1));
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded bg-[#f2f4f6] dark:bg-[#2c303b] text-[#444655] dark:text-[#f3f4f6] hover:bg-[#e0e3e5] dark:hover:bg-[#353945] text-xs font-bold cursor-pointer"
                              title="Restar un día"
                            >
                              -
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateProgress(task.id, Math.min(total, current + 1));
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff] hover:bg-[#bac3ff] text-xs font-bold cursor-pointer"
                              title="Sumar un día"
                            >
                              +
                            </button>
                          </div>
                          {onToggleOmitTask && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleOmitTask(task.id);
                              }}
                              className="text-[10px] text-[#757686] dark:text-[#9aa0a6] hover:text-[#475569] dark:hover:text-[#f3f4f6] hover:bg-[#eceef0] dark:hover:bg-[#2c303b] px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                              title="Omitir meta semanal"
                            >
                              <span className="material-symbols-outlined text-[12px]">block</span>
                              <span>Omitir</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[14px] text-[#1F2937] dark:text-[#f3f4f6] font-medium leading-snug">
                        {task.title}
                      </p>
                      <div className="w-full h-1.5 bg-[#eceef0] dark:bg-[#2c303b] rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-[#8a4cfc] transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Standard weekly task
              return (
                <div
                  key={task.id}
                  className="p-3.5 bg-white dark:bg-[#1f232b] rounded-xl shadow-xs border border-[#e5e7eb] dark:border-[#2b303c] flex items-start gap-3 transition-transform active:scale-[0.99] hover:border-[#c5c5d8] dark:hover:border-[#3d4453]"
                >
                  <button
                    onClick={() => onToggleTask(task.id)}
                    aria-label="Marcar completada"
                    className="mt-0.5 w-5 h-5 rounded-[6px] bg-transparent flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1.5px_#D1D5DB] dark:shadow-[inset_0_0_0_1.5px_#4b5563] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b] transition-colors cursor-pointer"
                  ></button>
                  <div
                    onClick={() => onEditTask?.(task)}
                    className="flex-1 min-w-0 flex flex-col gap-1 cursor-pointer hover:opacity-90"
                    title="Toca para modificar tarea"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] tracking-wider font-bold bg-[#EDE9FE] dark:bg-[#7c3aed]/20 text-[#5B21B6] dark:text-[#c4b5fd]">
                          SEMANAL
                        </span>
                        {task.weeklyMode === 'ALL_WEEKS' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EDE9FE] dark:bg-[#7c3aed]/20 text-[#5B21B6] dark:text-[#c4b5fd] font-semibold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">all_inclusive</span>
                            Todas las semanas
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#444655] dark:text-[#9aa0a6] font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">sync</span>
                          {task.weeklyMode === 'ALL_WEEKS' ? 'Toda la semana' : `Semana ${task.weekNumber}`}
                        </span>
                        {onToggleOmitTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleOmitTask(task.id);
                            }}
                            className="text-[10px] text-[#757686] dark:text-[#9aa0a6] hover:text-[#475569] dark:hover:text-[#f3f4f6] hover:bg-[#eceef0] dark:hover:bg-[#2c303b] px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                            title="Omitir tarea semanal"
                          >
                            <span className="material-symbols-outlined text-[12px]">block</span>
                            <span>Omitir</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[14px] text-[#1F2937] dark:text-[#f3f4f6] font-medium leading-snug">
                      {task.title}
                    </p>
                    {task.subtitle && (
                      <div className="flex items-center gap-1 text-[#444655]/90 dark:text-[#9aa0a6]">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        <span className="text-[12px]">{task.subtitle}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
