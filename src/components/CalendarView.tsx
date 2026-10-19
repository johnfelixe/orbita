import React, { useState } from 'react';
import { Task } from '../types';
import { isTaskOnDate, isTaskCompletedOnDate, isTaskOmittedOnDate } from '../utils/taskUtils';

interface CalendarViewProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenAddTask: (date?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  selectedDate,
  onSelectDate,
  onOpenAddTask,
}) => {
  const [currentMonth, setCurrentMonth] = useState(9); // October (0-indexed: 9)
  const [currentYear, setCurrentYear] = useState(2024);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar days for currentMonth
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  // Convert Sunday (0) to 6, Monday (1) to 0
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const dayCells = [];
  for (let i = 0; i < adjustedFirstDay; i++) {
    dayCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    dayCells.push(d);
  }

  // Tasks for selected date (supports 1 specific day and recurring daily tasks)
  const dayTasks = tasks.filter((t) => isTaskOnDate(t, selectedDate));

  // Time slots for schedule view
  const timeSlots = [
    { time: '09:00 am', slotKey: '09:00 am' },
    { time: '10:00 am', slotKey: '10:15 am' },
    { time: '11:30 am', slotKey: '11:30 am' },
    { time: '02:00 pm', slotKey: '02:00 pm' },
    { time: '03:00 pm', slotKey: '03:00 pm' },
    { time: '06:00 pm', slotKey: '06:00 pm' },
  ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-8 gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#191c1e] dark:text-[#f3f4f6] tracking-tight leading-8">
            Calendario
          </h1>
          <p className="text-[12px] text-[#444655] dark:text-[#9aa0a6]">
            Agenda semanal y vista mensual
          </p>
        </div>
        <button
          onClick={() => onOpenAddTask(selectedDate)}
          className="px-3 py-1.5 rounded-xl bg-[#173bd0] dark:bg-[#5675fd] text-white hover:bg-[#3a57e8] transition-all flex items-center gap-1 shadow-sm active:scale-95 text-[12px] font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Añadir</span>
        </button>
      </div>

      {/* Month Navigation Card */}
      <div className="p-4 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[20px]">calendar_month</span>
            <span className="text-[16px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
              {monthNames[currentMonth]} {currentYear}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#757686] dark:text-[#9aa0a6] tracking-wider">
          <span>LUN</span>
          <span>MAR</span>
          <span>MIÉ</span>
          <span>JUE</span>
          <span>VIE</span>
          <span>SÁB</span>
          <span>DOM</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayCells.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} className="h-9" />;
            }

            const mm = String(currentMonth + 1).padStart(2, '0');
            const dd = String(dayNum).padStart(2, '0');
            const dateStr = `${currentYear}-${mm}-${dd}`;
            const isSelected = selectedDate === dateStr;
            const tasksOnThisDay = tasks.filter((t) => isTaskOnDate(t, dateStr));
            const hasOverdue = tasksOnThisDay.some((t) => t.isOverdue && !isTaskCompletedOnDate(t, dateStr));
            const hasCompleted = tasksOnThisDay.some((t) => isTaskCompletedOnDate(t, dateStr));

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`h-9 flex flex-col items-center justify-center rounded-xl text-[13px] font-semibold transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-sm font-bold scale-105 z-10'
                    : 'hover:bg-[#f2f4f6] dark:hover:bg-[#2c303b] text-[#191c1e] dark:text-[#f3f4f6]'
                }`}
              >
                <span>{dayNum}</span>
                {tasksOnThisDay.length > 0 && (
                  <span
                    className={`w-1 h-1 rounded-full absolute bottom-1 ${
                      isSelected
                        ? 'bg-white'
                        : hasOverdue
                        ? 'bg-[#ba1a1a] dark:bg-[#f87171]'
                        : hasCompleted
                        ? 'bg-[#1e6b37] dark:bg-[#4ade80]'
                        : 'bg-[#173bd0] dark:bg-[#5675fd]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda for selected date */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#173bd0] dark:bg-[#5675fd]"></span>
            <h2 className="text-[15px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
              Agenda: {selectedDate}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-[#757686] dark:text-[#9aa0a6]">
            {dayTasks.length} {dayTasks.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>

        <div className="flex flex-col gap-2 bg-white dark:bg-[#1f232b] rounded-2xl p-4 border border-[#e5e7eb] dark:border-[#2b303c] shadow-xs transition-colors">
          {dayTasks.length === 0 ? (
            <div className="py-6 text-center text-[#757686] dark:text-[#9aa0a6] text-[13px]">
              No hay compromisos agendados para este día
            </div>
          ) : (
            dayTasks.map((t) => {
              const isDone = isTaskCompletedOnDate(t, selectedDate);
              const isOmitted = isTaskOmittedOnDate(t, selectedDate);

              return (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border transition-colors ${
                    isDone
                      ? 'bg-[#ddf4df]/40 dark:bg-[#132c1c]/40 border-[#bce3bf] dark:border-[#1e482a]'
                      : isOmitted
                      ? 'bg-[#f1f3f5] dark:bg-[#1a1d24] border-[#d8dce2] dark:border-[#2b303c] opacity-80'
                      : 'bg-[#f8f9fb] dark:bg-[#181a20] border-[#e5e7eb]/80 dark:border-[#2b303c] hover:bg-[#eceef0]/60 dark:hover:bg-[#252831]'
                  }`}
                >
                  <div className="w-16 shrink-0 text-[11px] font-bold text-[#173bd0] dark:text-[#5675fd] mt-0.5">
                    {t.dueTime || 'Todo el día'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] font-semibold ${
                        isDone
                          ? 'line-through text-[#1e6b37] dark:text-[#86efac]'
                          : isOmitted
                          ? 'line-through text-[#64748b] dark:text-[#94a3b8]'
                          : 'text-[#191c1e] dark:text-[#f3f4f6]'
                      }`}
                    >
                      {t.title}
                    </p>
                    {t.location && (
                      <p className="text-[11px] text-[#444655] dark:text-[#9aa0a6] flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        {t.location}
                      </p>
                    )}
                    {t.subtitle && (
                      <p className="text-[11px] text-[#757686] dark:text-[#9aa0a6] mt-0.5">{t.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isOmitted && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-[#e2e8f0] dark:bg-[#334155] text-[#475569] dark:text-[#cbd5e1]">
                        Omitida
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        t.priority === 'Alta'
                          ? 'bg-[#ffdad6] dark:bg-[#ba1a1a]/25 text-[#ba1a1a] dark:text-[#fca5a5]'
                          : 'bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff]'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
