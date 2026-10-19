import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import {
  isTaskOnDate,
  isTaskCompletedOnDate,
  isTaskOmittedOnDate,
  isTaskInWeek,
  getRecurrenceLabel,
  getIsoWeekNumber,
  MONTH_NAMES_ES,
} from '../utils/taskUtils';

interface StatsViewProps {
  tasks: Task[];
  currentWeekNumber: number;
  categories: string[];
  selectedDate?: string;
  onOpenAddTask?: () => void;
  onUpdateProgress?: (taskId: string, newCurrent: number) => void;
}

type StatPeriod = 'semanal' | 'mensual';

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  currentWeekNumber,
  categories,
  selectedDate = '2024-10-16',
  onOpenAddTask,
  onUpdateProgress,
}) => {
  // Period toggle: 'semanal' or 'mensual'
  const [period, setPeriod] = useState<StatPeriod>('semanal');

  // Parse initial month & year from selectedDate (e.g. '2024-10-16' -> month 9 (October), year 2024)
  const initialDateParts = useMemo(() => {
    const parts = selectedDate.split('-').map(Number);
    return {
      year: parts[0] || 2024,
      month: (parts[1] ? parts[1] - 1 : 9), // 0-indexed
    };
  }, [selectedDate]);

  const [selectedMonth, setSelectedMonth] = useState<number>(initialDateParts.month);
  const [selectedYear, setSelectedYear] = useState<number>(initialDateParts.year);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(initialDateParts.month);
    setSelectedYear(initialDateParts.year);
  };

  // ==========================================
  // SEMANAL DATA CALCULATIONS (CURRENT WEEK)
  // ==========================================
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  // Calculate dates of the selected week (base week 42 starts Oct 14, 2024)
  const weekDates = useMemo(() => {
    const baseDate = new Date(2024, 9, 14); // Oct 14, 2024
    const weekOffsetDays = (currentWeekNumber - 42) * 7;
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + weekOffsetDays + idx);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    });
  }, [currentWeekNumber]);

  const dayStats = useMemo(() => {
    return weekDates.map((dateStr, idx) => {
      const dayTasks = tasks.filter((t) => isTaskOnDate(t, dateStr));
      const completed = dayTasks.filter((t) => isTaskCompletedOnDate(t, dateStr)).length;
      const total = dayTasks.length;
      return {
        label: dayLabels[idx],
        dateStr,
        completed,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [tasks, weekDates]);

  const weekTasks = useMemo(() => {
    return tasks.filter(
      (t) => isTaskInWeek(t, currentWeekNumber) || weekDates.some((d) => isTaskOnDate(t, d))
    );
  }, [tasks, currentWeekNumber, weekDates]);

  const totalWeekTasks = weekTasks.length;
  const completedWeekTasks = useMemo(() => {
    return weekTasks.filter((t) => {
      if (t.cadence === 'SEMANAL') return t.completed;
      return weekDates.some((d) => isTaskOnDate(t, d) && isTaskCompletedOnDate(t, d));
    }).length;
  }, [weekTasks, weekDates]);

  const omittedWeekTasks = useMemo(() => {
    return weekTasks.filter((t) => {
      if (t.cadence === 'SEMANAL') return Boolean(t.omitted);
      return weekDates.some((d) => isTaskOnDate(t, d) && isTaskOmittedOnDate(t, d));
    }).length;
  }, [weekTasks, weekDates]);

  const weekCompletionRate = totalWeekTasks > 0 ? Math.round((completedWeekTasks / totalWeekTasks) * 100) : 0;


  // Repetitive tasks & habit routines for weekly view
  const repetitiveTasks = useMemo(() => {
    return tasks.filter((t) => {
      return (
        t.dailyMode === 'RECURRING' ||
        (t.progressTotal !== undefined && t.progressTotal > 0) ||
        t.weeklyMode === 'ALL_WEEKS'
      );
    });
  }, [tasks]);

  // Category stats for weekly view
  const weekCategoryStats = useMemo(() => {
    return categories.map((cat) => {
      const catTasks = weekTasks.filter((t) => t.category === cat);
      const count = catTasks.length;
      const completed = catTasks.filter((t) => {
        if (t.cadence === 'SEMANAL') return t.completed;
        return weekDates.some((d) => isTaskOnDate(t, d) && isTaskCompletedOnDate(t, d));
      }).length;
      return {
        name: cat,
        count,
        completed,
        pct: totalWeekTasks > 0 ? Math.round((count / totalWeekTasks) * 100) : 0,
      };
    });
  }, [categories, weekTasks, weekDates, totalWeekTasks]);

  // ==========================================
  // MENSUAL DATA CALCULATIONS (SELECTED MONTH)
  // ==========================================
  const monthData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sunday
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0 is Monday

    // Array of date strings for the entire month
    const allMonthDates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(selectedMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      allMonthDates.push(`${selectedYear}-${mm}-${dd}`);
    }

    // Group dates by ISO week number
    const weekMap: Record<number, { weekNum: number; dates: string[] }> = {};
    allMonthDates.forEach((dateStr) => {
      const wNum = getIsoWeekNumber(dateStr);
      if (!weekMap[wNum]) {
        weekMap[wNum] = { weekNum: wNum, dates: [] };
      }
      weekMap[wNum].dates.push(dateStr);
    });

    const monthWeeksList = Object.values(weekMap).sort((a, b) => a.weekNum - b.weekNum);

    // Track daily occurrences
    let scheduledDailyOccurrences = 0;
    let completedDailyOccurrences = 0;
    let omittedDailyOccurrences = 0;

    // Daily activity map for calendar view
    const dayActivityMap: Record<string, { total: number; completed: number; omitted: number; dayNum: number }> = {};
    allMonthDates.forEach((dateStr) => {
      const dTasks = tasks.filter((t) => isTaskOnDate(t, dateStr));
      const dCompleted = dTasks.filter((t) => isTaskCompletedOnDate(t, dateStr)).length;
      const dOmitted = dTasks.filter((t) => isTaskOmittedOnDate(t, dateStr)).length;
      scheduledDailyOccurrences += dTasks.length;
      completedDailyOccurrences += dCompleted;
      omittedDailyOccurrences += dOmitted;
      const dayNum = parseInt(dateStr.split('-')[2], 10);
      dayActivityMap[dateStr] = {
        total: dTasks.length,
        completed: dCompleted,
        omitted: dOmitted,
        dayNum,
      };
    });

    // Weekly tasks that belong to this month's weeks
    const monthWeekNumbers = monthWeeksList.map((w) => w.weekNum);
    const weeklyTasksInMonth = tasks.filter((t) => {
      if (t.cadence !== 'SEMANAL') return false;
      if (t.weeklyMode === 'ALL_WEEKS') return true;
      return t.weekNumber !== undefined && monthWeekNumbers.includes(t.weekNumber);
    });

    const completedWeeklyTasksInMonth = weeklyTasksInMonth.filter((t) => t.completed).length;
    const omittedWeeklyTasksInMonth = weeklyTasksInMonth.filter((t) => t.omitted).length;

    // Total monthly count & completion
    const totalScheduledMonth = scheduledDailyOccurrences + weeklyTasksInMonth.length;
    const totalCompletedMonth = completedDailyOccurrences + completedWeeklyTasksInMonth;
    const totalOmittedMonth = omittedDailyOccurrences + omittedWeeklyTasksInMonth;
    const monthCompletionRate = totalScheduledMonth > 0
      ? Math.round((totalCompletedMonth / totalScheduledMonth) * 100)
      : 0;

    // Breakdown per week of the month
    const weeksBreakdown = monthWeeksList.map((w) => {
      // Daily tasks on this week's dates
      let weekDailyTotal = 0;
      let weekDailyCompleted = 0;
      w.dates.forEach((dStr) => {
        const dTasks = tasks.filter((t) => isTaskOnDate(t, dStr));
        weekDailyTotal += dTasks.length;
        weekDailyCompleted += dTasks.filter((t) => isTaskCompletedOnDate(t, dStr)).length;
      });

      // Weekly tasks for this week
      const wTasks = tasks.filter((t) => isTaskInWeek(t, w.weekNum));
      const wTasksCompleted = wTasks.filter((t) => t.completed).length;

      const total = weekDailyTotal + wTasks.length;
      const completed = weekDailyCompleted + wTasksCompleted;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const firstD = parseInt(w.dates[0].split('-')[2], 10);
      const lastD = parseInt(w.dates[w.dates.length - 1].split('-')[2], 10);

      return {
        weekNum: w.weekNum,
        label: `Semana ${w.weekNum}`,
        dateRange: `${firstD} - ${lastD} ${MONTH_NAMES_ES[selectedMonth].slice(0, 3)}`,
        total,
        completed,
        rate,
      };
    });

    // Category breakdown for the month
    const monthCategoryStats = categories.map((cat) => {
      let catTotal = 0;
      let catCompleted = 0;

      // From daily occurrences in month
      allMonthDates.forEach((dStr) => {
        const catDaily = tasks.filter((t) => t.category === cat && isTaskOnDate(t, dStr));
        catTotal += catDaily.length;
        catCompleted += catDaily.filter((t) => isTaskCompletedOnDate(t, dStr)).length;
      });

      // From weekly tasks in month
      const catWeekly = weeklyTasksInMonth.filter((t) => t.category === cat);
      catTotal += catWeekly.length;
      catCompleted += catWeekly.filter((t) => t.completed).length;

      return {
        name: cat,
        total: catTotal,
        completed: catCompleted,
        pctOfTotal: totalScheduledMonth > 0 ? Math.round((catTotal / totalScheduledMonth) * 100) : 0,
      };
    });

    // Priority breakdown for month
    const priorityStats = {
      Alta: { total: 0, completed: 0 },
      Media: { total: 0, completed: 0 },
      Baja: { total: 0, completed: 0 },
    };

    allMonthDates.forEach((dStr) => {
      const dTasks = tasks.filter((t) => isTaskOnDate(t, dStr));
      dTasks.forEach((t) => {
        const p = t.priority || 'Media';
        priorityStats[p].total += 1;
        if (isTaskCompletedOnDate(t, dStr)) {
          priorityStats[p].completed += 1;
        }
      });
    });

    weeklyTasksInMonth.forEach((t) => {
      const p = t.priority || 'Media';
      priorityStats[p].total += 1;
      if (t.completed) {
        priorityStats[p].completed += 1;
      }
    });

    return {
      daysInMonth,
      startOffset,
      allMonthDates,
      dayActivityMap,
      weeksBreakdown,
      scheduledDailyOccurrences,
      weeklyTasksCount: weeklyTasksInMonth.length,
      totalScheduledMonth,
      totalCompletedMonth,
      totalOmittedMonth,
      monthCompletionRate,
      monthCategoryStats,
      priorityStats,
    };
  }, [selectedYear, selectedMonth, tasks, categories]);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-8 gap-4">
      {/* Header with Title and Period Selector */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-[#191c1e] dark:text-[#f3f4f6] tracking-tight leading-8">
              Estadísticas
            </h1>
            <p className="text-[12px] text-[#444655] dark:text-[#9aa0a6]">
              {period === 'semanal'
                ? `Rendimiento y hábitos de la Semana ${currentWeekNumber}`
                : `Resumen mensual de ${MONTH_NAMES_ES[selectedMonth]} ${selectedYear}`}
            </p>
          </div>

          {/* Quick reset button if navigated away in monthly view */}
          {period === 'mensual' &&
            (selectedMonth !== initialDateParts.month || selectedYear !== initialDateParts.year) && (
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="px-2.5 py-1 text-[11px] font-semibold text-[#173bd0] dark:text-[#5675fd] bg-[#dee0ff]/60 dark:bg-[#5675fd]/20 rounded-lg hover:bg-[#dee0ff] transition-colors cursor-pointer"
                title="Volver al mes actual"
              >
                Mes actual
              </button>
            )}
        </div>

        {/* Segmented Control: Semanal vs Mensual */}
        <div className="flex p-1 bg-[#eceef0] dark:bg-[#20242d] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c]">
          <button
            type="button"
            onClick={() => setPeriod('semanal')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
              period === 'semanal'
                ? 'bg-white dark:bg-[#2b303c] text-[#173bd0] dark:text-[#5675fd] shadow-xs'
                : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#191c1e] dark:hover:text-[#f3f4f6]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">calendar_view_week</span>
            <span>Semanal</span>
          </button>

          <button
            type="button"
            onClick={() => setPeriod('mensual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
              period === 'mensual'
                ? 'bg-white dark:bg-[#2b303c] text-[#173bd0] dark:text-[#5675fd] shadow-xs'
                : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#191c1e] dark:hover:text-[#f3f4f6]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">calendar_month</span>
            <span>Mensual</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISTA SEMANAL                                              */}
      {/* ========================================================= */}
      {period === 'semanal' && (
        <>
          {/* Main Weekly KPI Card */}
          <div className="p-5 bg-gradient-to-br from-[#173bd0] to-[#564eec] rounded-2xl text-white shadow-md flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold tracking-wider text-[#dee0ff] uppercase">
                Cumplimiento Semanal
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-[36px] font-bold leading-none">{weekCompletionRate}%</span>
                <span className="text-[13px] text-[#dee0ff]">
                  ({completedWeekTasks} hechas{omittedWeekTasks > 0 ? ` · ${omittedWeekTasks} omitidas` : ''} de {totalWeekTasks})
                </span>
              </div>
              <p className="text-[12px] text-[#bac3ff] mt-1">
                {weekCompletionRate >= 70
                  ? 'Ritmo excelente para alcanzar tus objetivos semanales 🔥'
                  : 'Continúa avanzando para cerrar tus metas semanales 🎯'}
              </p>
            </div>

            {/* Circular Progress Indicator */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#ffffff"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={163.36}
                  strokeDashoffset={163.36 - (163.36 * weekCompletionRate) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="material-symbols-outlined absolute text-[22px] text-white">
                trending_up
              </span>
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="p-4 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col gap-3 transition-colors">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#191c1e] dark:text-[#f3f4f6] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[18px]">
                  bar_chart
                </span>
                Actividad por Día (Semana {currentWeekNumber})
              </h2>
              <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6] font-medium">
                Completadas / Total
              </span>
            </div>

            <div className="flex items-end justify-between gap-2 h-36 pt-4 pb-1 px-1">
              {dayStats.map((d, i) => {
                const maxVal = Math.max(...dayStats.map((s) => s.total), 3);
                const heightPct = d.total > 0 ? Math.max(15, Math.round((d.total / maxVal) * 100)) : 10;
                const completedPct = d.total > 0 ? (d.completed / d.total) * 100 : 0;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-bold text-[#444655] dark:text-[#9aa0a6]">
                      {d.completed}/{d.total}
                    </span>
                    <div
                      className="w-full max-w-[28px] bg-[#eceef0] dark:bg-[#2c303b] rounded-t-lg relative overflow-hidden transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                    >
                      <div
                        className="absolute bottom-0 w-full bg-[#173bd0] dark:bg-[#5675fd] rounded-t-lg transition-all duration-300"
                        style={{ height: `${completedPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[#757686] dark:text-[#9aa0a6]">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HÁBITOS Y RUTINAS (TAREAS REPETITIVAS) */}
          <div className="p-4 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col gap-3 transition-colors">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#191c1e] dark:text-[#f3f4f6] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8a4cfc] text-[18px]">repeat</span>
                Hábitos y Rutinas (Tareas Repetitivas)
              </h2>
              <span className="text-[11px] font-semibold text-[#5B21B6] dark:text-[#c4b5fd] bg-[#EDE9FE] dark:bg-[#7c3aed]/20 px-2 py-0.5 rounded-full">
                {repetitiveTasks.length} {repetitiveTasks.length === 1 ? 'hábito' : 'hábitos'}
              </span>
            </div>

            <p className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
              Monitoreo semanal de tareas recurrentes (Lunes a Viernes, fines de semana, todos los días o hábitos con meta):
            </p>

            {repetitiveTasks.length === 0 ? (
              <div className="p-5 bg-[#f8f9fb] dark:bg-[#181a20] rounded-xl border border-dashed border-[#e5e7eb] dark:border-[#2b303c] text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[28px] text-[#757686]/60 dark:text-[#9aa0a6]/50">
                  event_repeat
                </span>
                <p className="text-[13px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                  No hay tareas repetitivas activas
                </p>
                <p className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                  Al crear una tarea con frecuencia "Lunes a Viernes", "Todos los días" o un hábito, aparecerá aquí automáticamente.
                </p>
                {onOpenAddTask && (
                  <button
                    onClick={onOpenAddTask}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-[#712ae2] dark:bg-[#8a4cfc] text-white text-[11px] font-semibold hover:bg-[#8a4cfc] transition-colors cursor-pointer"
                  >
                    + Crear Tarea Repetitiva
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {repetitiveTasks.map((task) => {
                  // Case 1: Progress target habit (e.g. Rutina de ejercicio 2/3)
                  if (task.progressTotal && task.progressTotal > 0) {
                    const current = task.progressCurrent || 0;
                    const total = task.progressTotal;
                    const pct = Math.min(100, Math.round((current / total) * 100));

                    return (
                      <div
                        key={task.id}
                        className="p-3 bg-[#f8f9fb] dark:bg-[#181a20] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#eaddff] dark:bg-[#8a4cfc]/20 text-[#712ae2] dark:text-[#c4b5fd] flex items-center justify-center font-bold">
                              <span className="material-symbols-outlined text-[18px]">fitness_center</span>
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                                {task.title}
                              </p>
                              <p className="text-[10px] text-[#757686] dark:text-[#9aa0a6]">
                                {task.category} · Meta semanal
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-bold text-[#712ae2] dark:text-[#c4b5fd]">
                              {current}/{total} días
                            </span>
                            {onUpdateProgress && (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  type="button"
                                  onClick={() => onUpdateProgress(task.id, Math.max(0, current - 1))}
                                  className="w-5 h-5 rounded bg-white dark:bg-[#252831] border border-[#e5e7eb] dark:border-[#353945] text-[#444655] dark:text-[#f3f4f6] font-bold text-[11px] flex items-center justify-center hover:bg-[#eceef0] dark:hover:bg-[#2c303b] cursor-pointer"
                                  title="Restar un día"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateProgress(task.id, Math.min(total, current + 1))}
                                  className="w-5 h-5 rounded bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff] font-bold text-[11px] flex items-center justify-center hover:bg-[#bac3ff] cursor-pointer"
                                  title="Sumar un día"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-full h-1.5 bg-[#eceef0] dark:bg-[#2c303b] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#8a4cfc] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Case 2: Recurring daily task (e.g. Lun a Vie, Todos los días)
                  if (task.dailyMode === 'RECURRING') {
                    const scheduledDays = task.recurringDays || [1, 2, 3, 4, 5];
                    const totalScheduled = scheduledDays.length;
                    const completedCount = weekDates.filter(
                      (d) => isTaskOnDate(task, d) && isTaskCompletedOnDate(task, d)
                    ).length;
                    const pct = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0;

                    return (
                      <div
                        key={task.id}
                        className="p-3 bg-[#f8f9fb] dark:bg-[#181a20] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#dee0ff] dark:bg-[#5675fd]/20 text-[#173bd0] dark:text-[#5675fd] flex items-center justify-center font-bold">
                              <span className="material-symbols-outlined text-[18px]">repeat</span>
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                                {task.title}
                              </p>
                              <p className="text-[10px] text-[#757686] dark:text-[#9aa0a6]">
                                {task.category} · {getRecurrenceLabel(task)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-[12px] font-bold ${
                                completedCount >= totalScheduled
                                  ? 'text-[#1e6b37] dark:text-[#86efac]'
                                  : 'text-[#173bd0] dark:text-[#5675fd]'
                              }`}
                            >
                              {completedCount}/{totalScheduled} días
                            </span>
                            <p className="text-[10px] text-[#757686] dark:text-[#9aa0a6]">
                              {pct === 100 ? 'Completado esta semana' : `${pct}% cumplido`}
                            </p>
                          </div>
                        </div>

                        <div className="w-full h-1.5 bg-[#eceef0] dark:bg-[#2c303b] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              pct === 100 ? 'bg-[#1e6b37] dark:bg-[#22c55e]' : 'bg-[#173bd0] dark:bg-[#5675fd]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Case 3: Weekly all-weeks task
                  return (
                    <div
                      key={task.id}
                      className="p-3 bg-[#f8f9fb] dark:bg-[#181a20] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#ede9fe] dark:bg-[#7c3aed]/20 text-[#5b21b6] dark:text-[#c4b5fd] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[18px]">all_inclusive</span>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                            {task.title}
                          </p>
                          <p className="text-[10px] text-[#757686] dark:text-[#9aa0a6]">
                            {task.category} · Todas las semanas
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          task.completed
                            ? 'bg-[#ddf4df] dark:bg-[#132c1c] text-[#1e6b37] dark:text-[#86efac]'
                            : 'bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff]'
                        }`}
                      >
                        {task.completed ? 'Cumplido' : 'En progreso'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Breakdown (Weekly) */}
          <div className="p-4 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col gap-3 transition-colors">
            <h2 className="text-[15px] font-bold text-[#191c1e] dark:text-[#f3f4f6] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[18px]">
                pie_chart
              </span>
              Distribución por Categoría (Semana {currentWeekNumber})
            </h2>

            <div className="flex flex-col gap-2">
              {weekCategoryStats.map((cat, idx) => {
                const colors = ['#173bd0', '#8a4cfc', '#1e6b37', '#f59e0b', '#0284c7', '#ec4899'];
                const color = colors[idx % colors.length];

                return (
                  <div key={cat.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-[#191c1e] dark:text-[#f3f4f6]">{cat.name}</span>
                      <span className="text-[#757686] dark:text-[#9aa0a6]">
                        {cat.count} tareas ({cat.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#eceef0] dark:bg-[#2c303b] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${cat.pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* VISTA MENSUAL (NUEVA FUNCIÓN SOLICITADA)                   */}
      {/* ========================================================= */}
      {period === 'mensual' && (
        <>
          {/* Month Navigator Header Bar */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#444655] dark:text-[#f3f4f6] hover:bg-[#eceef0] dark:hover:bg-[#2b303c] transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[20px]">
                calendar_month
              </span>
              <span className="text-[16px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                {MONTH_NAMES_ES[selectedMonth]} {selectedYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#444655] dark:text-[#f3f4f6] hover:bg-[#eceef0] dark:hover:bg-[#2b303c] transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          {/* Main Monthly KPI Hero Card */}
          <div className="p-5 bg-gradient-to-br from-[#173bd0] via-[#5438dc] to-[#7c3aed] rounded-2xl text-white shadow-md flex items-center justify-between">
            <div className="flex flex-col gap-1 pr-2">
              <span className="text-[11px] font-bold tracking-wider text-[#dee0ff] uppercase">
                Cumplimiento Mensual
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-[36px] font-bold leading-none">{monthData.monthCompletionRate}%</span>
                <span className="text-[13px] text-[#dee0ff]">
                  ({monthData.totalCompletedMonth} hechas{monthData.totalOmittedMonth > 0 ? ` · ${monthData.totalOmittedMonth} omitidas` : ''} de {monthData.totalScheduledMonth})
                </span>
              </div>
              <p className="text-[12px] text-[#bac3ff] mt-1 leading-relaxed">
                {monthData.totalScheduledMonth === 0
                  ? 'Sin tareas registradas para este mes.'
                  : monthData.monthCompletionRate >= 75
                  ? '¡Excelente ritmo mensual! Estás avanzando con gran constancia 🚀'
                  : monthData.monthCompletionRate >= 50
                  ? 'Buen avance general. Mantén el foco en tus rutinas clave 📈'
                  : 'Aún tienes margen para acelerar y completar tus metas del mes 🎯'}
              </p>
            </div>

            {/* Circular Progress Gauge */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#ffffff"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={163.36}
                  strokeDashoffset={163.36 - (163.36 * monthData.monthCompletionRate) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="material-symbols-outlined absolute text-[22px] text-white">
                insights
              </span>
            </div>
          </div>

          {/* 4 Mini Metric Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-white dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col">
              <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#173bd0] dark:text-[#5675fd]">check_circle</span>
                Completadas
              </span>
              <span className="text-[20px] font-bold text-[#191c1e] dark:text-[#f3f4f6] mt-0.5">
                {monthData.totalCompletedMonth}
              </span>
              <span className="text-[10px] text-[#1e6b37] dark:text-[#86efac] font-medium">
                {monthData.monthCompletionRate}% de éxito
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col">
              <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#8a4cfc]">assignment</span>
                Total Planificadas
              </span>
              <span className="text-[20px] font-bold text-[#191c1e] dark:text-[#f3f4f6] mt-0.5">
                {monthData.totalScheduledMonth}
              </span>
              <span className="text-[10px] text-[#757686] dark:text-[#9aa0a6]">
                En {MONTH_NAMES_ES[selectedMonth].toLowerCase()}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col">
              <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#0284c7]">today</span>
                Ocurrencias Diarias
              </span>
              <span className="text-[20px] font-bold text-[#191c1e] dark:text-[#f3f4f6] mt-0.5">
                {monthData.scheduledDailyOccurrences}
              </span>
              <span className="text-[10px] text-[#757686] dark:text-[#9aa0a6]">
                Días del mes
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col">
              <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#f59e0b]">date_range</span>
                Metas Semanales
              </span>
              <span className="text-[20px] font-bold text-[#191c1e] dark:text-[#f3f4f6] mt-0.5">
                {monthData.weeklyTasksCount}
              </span>
              <span className="text-[10px] text-[#757686] dark:text-[#9aa0a6]">
                Objetivos globales
              </span>
            </div>
          </div>

          {/* Progreso por Semanas del Mes */}
          <div className="p-4 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col gap-3 transition-colors">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#191c1e] dark:text-[#f3f4f6] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[18px]">
                  view_week
                </span>
                Rendimiento por Semanas del Mes
              </h2>
              <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6] font-medium">
                {monthData.weeksBreakdown.length} semanas
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {monthData.weeksBreakdown.map((w) => {
                const isCurrent = w.weekNum === currentWeekNumber;

                return (
                  <div
                    key={w.weekNum}
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-[#dee0ff]/20 dark:bg-[#5675fd]/10 border-[#173bd0]/30 dark:border-[#5675fd]/40'
                        : 'bg-[#f8f9fb] dark:bg-[#181a20] border-[#e5e7eb] dark:border-[#2b303c]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                          {w.label}
                        </span>
                        <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                          ({w.dateRange})
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#173bd0] text-white">
                            Actual
                          </span>
                        )}
                      </div>

                      <div className="text-right flex items-center gap-1.5">
                        <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                          {w.completed}/{w.total}
                        </span>
                        <span
                          className={`text-[12px] font-bold ${
                            w.rate >= 70
                              ? 'text-[#1e6b37] dark:text-[#86efac]'
                              : w.rate > 0
                              ? 'text-[#173bd0] dark:text-[#5675fd]'
                              : 'text-[#757686] dark:text-[#9aa0a6]'
                          }`}
                        >
                          {w.rate}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-[#eceef0] dark:bg-[#2c303b] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          w.rate >= 70
                            ? 'bg-[#1e6b37] dark:bg-[#22c55e]'
                            : w.rate > 0
                            ? 'bg-[#173bd0] dark:bg-[#5675fd]'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${w.rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mini Calendario de Hábitos y Cumplimiento Mensual (Matriz de días) */}
          <div className="p-4 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col gap-3 transition-colors">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#191c1e] dark:text-[#f3f4f6] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8a4cfc] text-[18px]">
                  grid_view
                </span>
                Mapa de Cumplimiento Diario
              </h2>
              <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                {MONTH_NAMES_ES[selectedMonth]}
              </span>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold text-[#757686] dark:text-[#9aa0a6] uppercase py-1"
                >
                  {d}
                </span>
              ))}

              {/* Empty leading cells */}
              {Array.from({ length: monthData.startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9 rounded-lg" />
              ))}

              {/* Day cells */}
              {monthData.allMonthDates.map((dateStr) => {
                const act = monthData.dayActivityMap[dateStr];
                const dayNum = act?.dayNum || 1;
                const isToday = dateStr === selectedDate;
                const hasTasks = act && act.total > 0;
                const isAllCompleted = hasTasks && act.completed >= act.total;
                const isPartial = hasTasks && act.completed > 0 && act.completed < act.total;

                return (
                  <div
                    key={dateStr}
                    className={`h-9 rounded-lg flex flex-col items-center justify-center p-0.5 relative transition-all border ${
                      isToday
                        ? 'border-[#173bd0] dark:border-[#5675fd] bg-[#dee0ff]/30 dark:bg-[#5675fd]/20'
                        : isAllCompleted
                        ? 'border-[#86efac]/40 dark:border-[#1e6b37]/40 bg-[#ddf4df]/60 dark:bg-[#132c1c]/60'
                        : isPartial
                        ? 'border-[#bac3ff]/40 dark:border-[#5675fd]/30 bg-[#f0f2ff] dark:bg-[#1c2237]'
                        : 'border-transparent bg-[#f8f9fb] dark:bg-[#181a20]'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-semibold ${
                        isToday
                          ? 'text-[#173bd0] dark:text-[#5675fd] font-bold'
                          : isAllCompleted
                          ? 'text-[#1e6b37] dark:text-[#86efac] font-bold'
                          : 'text-[#191c1e] dark:text-[#f3f4f6]'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Status dot or icon */}
                    <div className="flex items-center gap-0.5 h-2">
                      {isAllCompleted ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1e6b37] dark:bg-[#22c55e]" />
                      ) : isPartial ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#173bd0] dark:bg-[#5675fd]" />
                      ) : hasTasks ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#e5e7eb] dark:bg-[#353945]" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-[#e5e7eb] dark:border-[#2b303c] text-[10px] text-[#757686] dark:text-[#9aa0a6]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#1e6b37] dark:bg-[#22c55e]" />
                <span>100% completado</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#173bd0] dark:bg-[#5675fd]" />
                <span>En progreso</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full border border-[#173bd0] dark:border-[#5675fd]" />
                <span>Día actual</span>
              </div>
            </div>
          </div>

          {/* Distribución por Categoría en el Mes */}
          <div className="p-4 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col gap-3 transition-colors">
            <h2 className="text-[15px] font-bold text-[#191c1e] dark:text-[#f3f4f6] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[18px]">
                pie_chart
              </span>
              Distribución por Categoría ({MONTH_NAMES_ES[selectedMonth]})
            </h2>

            <div className="flex flex-col gap-2.5">
              {monthData.monthCategoryStats.map((cat, idx) => {
                const colors = ['#173bd0', '#8a4cfc', '#1e6b37', '#f59e0b', '#0284c7', '#ec4899'];
                const color = colors[idx % colors.length];
                const catRate = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;

                return (
                  <div key={cat.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-[#191c1e] dark:text-[#f3f4f6]">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                          {cat.completed}/{cat.total} hechas ({cat.pctOfTotal}% del mes)
                        </span>
                        <span className="text-[11px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                          {catRate}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#eceef0] dark:bg-[#2c303b] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${cat.pctOfTotal}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribución por Prioridad en el Mes */}
          <div className="p-4 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col gap-3 transition-colors">
            <h2 className="text-[15px] font-bold text-[#191c1e] dark:text-[#f3f4f6] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#f59e0b] text-[18px]">
                flag
              </span>
              Prioridades del Mes
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {/* Alta */}
              <div className="p-2.5 bg-[#fef2f2] dark:bg-[#361717] rounded-xl border border-[#fecaca] dark:border-[#582222] flex flex-col items-center text-center">
                <span className="text-[11px] font-bold text-[#b91c1c] dark:text-[#fca5a5]">Alta</span>
                <span className="text-[18px] font-bold text-[#191c1e] dark:text-[#f3f4f6] mt-0.5">
                  {monthData.priorityStats.Alta.total}
                </span>
                <span className="text-[9px] text-[#757686] dark:text-[#9aa0a6]">
                  {monthData.priorityStats.Alta.completed} completadas
                </span>
              </div>

              {/* Media */}
              <div className="p-2.5 bg-[#fffbeb] dark:bg-[#33260c] rounded-xl border border-[#fef3c7] dark:border-[#584113] flex flex-col items-center text-center">
                <span className="text-[11px] font-bold text-[#d97706] dark:text-[#fde68a]">Media</span>
                <span className="text-[18px] font-bold text-[#191c1e] dark:text-[#f3f4f6] mt-0.5">
                  {monthData.priorityStats.Media.total}
                </span>
                <span className="text-[9px] text-[#757686] dark:text-[#9aa0a6]">
                  {monthData.priorityStats.Media.completed} completadas
                </span>
              </div>

              {/* Baja */}
              <div className="p-2.5 bg-[#f0fdf4] dark:bg-[#112d1b] rounded-xl border border-[#bbf7d0] dark:border-[#1d4c2d] flex flex-col items-center text-center">
                <span className="text-[11px] font-bold text-[#16a34a] dark:text-[#86efac]">Baja</span>
                <span className="text-[18px] font-bold text-[#191c1e] dark:text-[#f3f4f6] mt-0.5">
                  {monthData.priorityStats.Baja.total}
                </span>
                <span className="text-[9px] text-[#757686] dark:text-[#9aa0a6]">
                  {monthData.priorityStats.Baja.completed} completadas
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
