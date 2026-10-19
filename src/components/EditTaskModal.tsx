import React, { useState, useEffect } from 'react';
import { Task, Cadence, Priority, Category, DailyMode, RecurringPreset, WeeklyMode } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  categories: string[];
  currentWeekNumber?: number;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSaveTask,
  onDeleteTask,
  categories,
  currentWeekNumber = 42,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [cadence, setCadence] = useState<Cadence>('DIARIA');
  const [priority, setPriority] = useState<Priority>('Media');
  const [category, setCategory] = useState<Category>('Trabajo');
  const [taskStatus, setTaskStatus] = useState<'PENDIENTE' | 'HECHA' | 'OMITIDA' | 'ATRASADA'>('PENDIENTE');

  // Daily mode states
  const [dailyMode, setDailyMode] = useState<DailyMode>('SPECIFIC_DATE');
  const [dueDate, setDueDate] = useState('2024-10-16');
  const [recurringPreset, setRecurringPreset] = useState<RecurringPreset>('WEEKDAYS');
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Weekly mode states
  const [weeklyMode, setWeeklyMode] = useState<WeeklyMode>('SPECIFIC_WEEK');
  const [targetWeek, setTargetWeek] = useState<number>(currentWeekNumber);

  // Time & Location
  const [dueTime, setDueTime] = useState('11:00 am');
  const [location, setLocation] = useState('');

  // Progress (if habit)
  const [progressCurrent, setProgressCurrent] = useState<number | undefined>(undefined);
  const [progressTotal, setProgressTotal] = useState<number | undefined>(undefined);

  // Delete confirmation state
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setSubtitle(task.subtitle || '');
      setCadence(task.cadence || 'DIARIA');
      setPriority(task.priority || 'Media');
      setCategory(task.category || (categories[0] || 'Trabajo'));
      if (task.completed) {
        setTaskStatus('HECHA');
      } else if (task.omitted) {
        setTaskStatus('OMITIDA');
      } else if (task.isOverdue) {
        setTaskStatus('ATRASADA');
      } else {
        setTaskStatus('PENDIENTE');
      }
      setDailyMode(task.dailyMode || (task.recurringDays && task.recurringDays.length > 0 ? 'RECURRING' : 'SPECIFIC_DATE'));
      setDueDate(task.dueDate || '2024-10-16');
      setRecurringPreset(task.recurringPreset || 'WEEKDAYS');
      setRecurringDays(task.recurringDays || [1, 2, 3, 4, 5]);
      setWeeklyMode(task.weeklyMode || 'SPECIFIC_WEEK');
      setTargetWeek(task.weekNumber || currentWeekNumber);
      setDueTime(task.dueTime || '');
      setLocation(task.location || '');
      setProgressCurrent(task.progressCurrent);
      setProgressTotal(task.progressTotal);
    }
  }, [task, categories, currentWeekNumber]);

  if (!isOpen || !task) return null;

  const dayOptions = [
    { id: 1, label: 'L', full: 'Lunes' },
    { id: 2, label: 'M', full: 'Martes' },
    { id: 3, label: 'X', full: 'Miércoles' },
    { id: 4, label: 'J', full: 'Jueves' },
    { id: 5, label: 'V', full: 'Viernes' },
    { id: 6, label: 'S', full: 'Sábado' },
    { id: 7, label: 'D', full: 'Domingo' },
  ];

  const handlePresetChange = (preset: RecurringPreset) => {
    setRecurringPreset(preset);
    if (preset === 'WEEKDAYS') {
      setRecurringDays([1, 2, 3, 4, 5]);
    } else if (preset === 'WEEKENDS') {
      setRecurringDays([6, 7]);
    } else if (preset === 'EVERY_DAY') {
      setRecurringDays([1, 2, 3, 4, 5, 6, 7]);
    }
  };

  const handleToggleDay = (dayId: number) => {
    setRecurringPreset('CUSTOM');
    if (recurringDays.includes(dayId)) {
      if (recurringDays.length > 1) {
        setRecurringDays(recurringDays.filter((d) => d !== dayId));
      }
    } else {
      setRecurringDays([...recurringDays, dayId].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveTask({
      ...task,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      cadence,
      priority,
      category,
      completed: taskStatus === 'HECHA',
      completedAt: taskStatus === 'HECHA' ? (task.completedAt || 'Ahora') : undefined,
      omitted: taskStatus === 'OMITIDA',
      omittedAt: taskStatus === 'OMITIDA' ? (task.omittedAt || 'Ahora') : undefined,
      isOverdue: taskStatus === 'ATRASADA',
      dueDate,
      dailyMode: cadence === 'DIARIA' ? dailyMode : undefined,
      recurringPreset: cadence === 'DIARIA' && dailyMode === 'RECURRING' ? recurringPreset : undefined,
      recurringDays: cadence === 'DIARIA' && dailyMode === 'RECURRING' ? recurringDays : undefined,
      weeklyMode: cadence === 'SEMANAL' ? weeklyMode : undefined,
      weekNumber: cadence === 'SEMANAL' ? targetWeek : task.weekNumber,
      dueTime: dueTime.trim() || undefined,
      location: location.trim() || undefined,
      progressCurrent,
      progressTotal,
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-white dark:bg-[#16181d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto border border-[#e5e7eb] dark:border-[#262932] transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[22px]">
                edit_note
              </span>
              <h3 className="text-[18px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                Modificar Tarea
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-[#757686] dark:text-[#9aa0a6] hover:bg-[#eceef0] dark:hover:bg-[#252831] flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Status Selector: Pendiente, Hecha, Omitida, Atrasada */}
            <div className="p-3 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col gap-2 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#191c1e] dark:text-[#f3f4f6] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#173bd0] dark:text-[#5675fd]">
                    published_with_changes
                  </span>
                  Estado de la tarea
                </span>
                <span className="text-[11px] font-medium text-[#757686] dark:text-[#9aa0a6]">
                  {taskStatus === 'PENDIENTE' && '⏳ Pendiente'}
                  {taskStatus === 'HECHA' && '✅ Hecha'}
                  {taskStatus === 'OMITIDA' && '🚫 Omitida'}
                  {taskStatus === 'ATRASADA' && '⚠️ Atrasada'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {/* Pendiente */}
                <button
                  type="button"
                  onClick={() => setTaskStatus('PENDIENTE')}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    taskStatus === 'PENDIENTE'
                      ? 'bg-[#dee0ff] dark:bg-[#5675fd]/30 text-[#00105b] dark:text-[#dee0ff] border-2 border-[#173bd0] dark:border-[#5675fd] shadow-xs'
                      : 'bg-white dark:bg-[#252831] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#353945]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                  <span>Pendiente</span>
                </button>

                {/* Hecha */}
                <button
                  type="button"
                  onClick={() => setTaskStatus('HECHA')}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    taskStatus === 'HECHA'
                      ? 'bg-[#ddf4df] dark:bg-[#132c1c] text-[#1e6b37] dark:text-[#86efac] border-2 border-[#1e6b37] dark:border-[#22c55e] shadow-xs'
                      : 'bg-white dark:bg-[#252831] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#353945]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Hecha</span>
                </button>

                {/* Omitida */}
                <button
                  type="button"
                  onClick={() => setTaskStatus('OMITIDA')}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    taskStatus === 'OMITIDA'
                      ? 'bg-[#f1f3f5] dark:bg-[#2c303b] text-[#334155] dark:text-[#cbd5e1] border-2 border-[#64748b] dark:border-[#94a3b8] shadow-xs'
                      : 'bg-white dark:bg-[#252831] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#353945]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">block</span>
                  <span>Omitida</span>
                </button>

                {/* Atrasada */}
                <button
                  type="button"
                  onClick={() => setTaskStatus('ATRASADA')}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    taskStatus === 'ATRASADA'
                      ? 'bg-[#fff2c6] dark:bg-[#524018] text-[#8a6508] dark:text-[#fde047] border-2 border-[#eab308] dark:border-[#ca8a04] shadow-xs'
                      : 'bg-white dark:bg-[#252831] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#353945]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span>Atrasada</span>
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6] block mb-1">
                Título de la tarea *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Revisar contrato de servicios"
                className="w-full px-3.5 py-2.5 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[14px] text-[#191c1e] dark:text-[#f3f4f6] placeholder-[#757686] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#173bd0] dark:focus:border-[#5675fd] focus:bg-white dark:focus:bg-[#252831]"
              />
            </div>

            {/* Subtitle / Notes */}
            <div>
              <label className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6] block mb-1">
                Detalle o notas
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ej. Llevar apuntes de métricas"
                className="w-full px-3.5 py-2.5 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[13px] text-[#191c1e] dark:text-[#f3f4f6] placeholder-[#757686] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#173bd0] dark:focus:border-[#5675fd] focus:bg-white dark:focus:bg-[#252831]"
              />
            </div>

            {/* Cadence Selector */}
            <div>
              <label className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6] block mb-1">
                Frecuencia / Cadencia
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCadence('DIARIA')}
                  className={`py-2 rounded-xl text-[12px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cadence === 'DIARIA'
                      ? 'bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#00105b] dark:text-[#dee0ff] border-2 border-[#173bd0] dark:border-[#5675fd]'
                      : 'bg-[#f8f9fb] dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  DIARIA
                </button>
                <button
                  type="button"
                  onClick={() => setCadence('SEMANAL')}
                  className={`py-2 rounded-xl text-[12px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cadence === 'SEMANAL'
                      ? 'bg-[#eaddff] dark:bg-[#712ae2]/30 text-[#25005a] dark:text-[#eaddff] border-2 border-[#712ae2] dark:border-[#a855f7]'
                      : 'bg-[#f8f9fb] dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">view_week</span>
                  SEMANAL
                </button>
              </div>
            </div>

            {/* DIARIA CONFIGURATION */}
            {cadence === 'DIARIA' && (
              <div className="p-3 bg-[#f2f4f6]/80 dark:bg-[#1a1d24] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col gap-2.5">
                <span className="text-[11px] font-bold text-[#173bd0] dark:text-[#5675fd] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                  Programación Diaria
                </span>

                {/* Mode: 1 día específico vs Diaria repetitiva */}
                <div className="grid grid-cols-2 gap-2 bg-white dark:bg-[#1f232b] p-1 rounded-xl border border-[#e5e7eb] dark:border-[#2b303c]">
                  <button
                    type="button"
                    onClick={() => setDailyMode('SPECIFIC_DATE')}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      dailyMode === 'SPECIFIC_DATE'
                        ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-xs'
                        : 'text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#252831]'
                    }`}
                  >
                    1 día específico
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyMode('RECURRING')}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      dailyMode === 'RECURRING'
                        ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-xs'
                        : 'text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#252831]'
                    }`}
                  >
                    Diaria repetitiva
                  </button>
                </div>

                {dailyMode === 'SPECIFIC_DATE' ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label className="text-[11px] font-semibold text-[#444655] dark:text-[#9aa0a6]">
                      Fecha del día
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[13px] text-[#191c1e] dark:text-[#f3f4f6] focus:outline-none focus:border-[#173bd0] dark:focus:border-[#5675fd] [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <label className="text-[11px] font-semibold text-[#444655] dark:text-[#9aa0a6]">
                      Frecuencia de repetición
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePresetChange('WEEKDAYS')}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer ${
                          recurringPreset === 'WEEKDAYS'
                            ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-xs'
                            : 'bg-white dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f8f9fb] dark:hover:bg-[#252831]'
                        }`}
                      >
                        Lunes a Viernes
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetChange('WEEKENDS')}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer ${
                          recurringPreset === 'WEEKENDS'
                            ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-xs'
                            : 'bg-white dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f8f9fb] dark:hover:bg-[#252831]'
                        }`}
                      >
                        Fines de semana
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetChange('EVERY_DAY')}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer ${
                          recurringPreset === 'EVERY_DAY'
                            ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-xs'
                            : 'bg-white dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f8f9fb] dark:hover:bg-[#252831]'
                        }`}
                      >
                        Todos los días
                      </button>
                    </div>

                    {/* Individual Day selector chips */}
                    <div>
                      <span className="text-[10px] font-semibold text-[#757686] dark:text-[#9aa0a6] block mb-1">
                        Días seleccionados:
                      </span>
                      <div className="grid grid-cols-7 gap-1">
                        {dayOptions.map((day) => {
                          const isSelected = recurringDays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => handleToggleDay(day.id)}
                              className={`h-8 rounded-lg flex flex-col items-center justify-center text-[11px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-xs scale-102'
                                  : 'bg-white dark:bg-[#1f232b] text-[#757686] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f8f9fb] dark:hover:bg-[#252831]'
                              }`}
                              title={day.full}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEMANAL CONFIGURATION */}
            {cadence === 'SEMANAL' && (
              <div className="p-3 bg-[#eaddff]/30 dark:bg-[#712ae2]/15 rounded-2xl border border-[#d2bbff] dark:border-[#712ae2]/40 flex flex-col gap-2.5">
                <span className="text-[11px] font-bold text-[#712ae2] dark:text-[#c4b5fd] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">view_week</span>
                  Programación Semanal
                </span>

                <div className="grid grid-cols-2 gap-2 bg-white dark:bg-[#1f232b] p-1 rounded-xl border border-[#e5e7eb] dark:border-[#2b303c]">
                  <button
                    type="button"
                    onClick={() => setWeeklyMode('SPECIFIC_WEEK')}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      weeklyMode === 'SPECIFIC_WEEK'
                        ? 'bg-[#712ae2] dark:bg-[#a855f7] text-white shadow-xs'
                        : 'text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#252831]'
                    }`}
                  >
                    Semana específica
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeeklyMode('ALL_WEEKS')}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      weeklyMode === 'ALL_WEEKS'
                        ? 'bg-[#712ae2] dark:bg-[#a855f7] text-white shadow-xs'
                        : 'text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#252831]'
                    }`}
                  >
                    Todas las semanas
                  </button>
                </div>

                {weeklyMode === 'SPECIFIC_WEEK' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTargetWeek((w) => Math.max(1, w - 1))}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-[#1f232b] border border-[#e5e7eb] dark:border-[#2b303c] flex items-center justify-center font-bold text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#252831] cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 py-2 bg-white dark:bg-[#1f232b] rounded-xl border border-[#712ae2] dark:border-[#a855f7] text-center font-bold text-[#712ae2] dark:text-[#c4b5fd] text-[14px]">
                      Semana {targetWeek}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTargetWeek((w) => w + 1)}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-[#1f232b] border border-[#e5e7eb] dark:border-[#2b303c] flex items-center justify-center font-bold text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#252831] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Optional progress target (e.g. for habits like 2/3 días) */}
            {progressTotal !== undefined && (
              <div className="p-3 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                    Progreso de la meta
                  </p>
                  <p className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                    Días completados respecto al objetivo
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setProgressCurrent(Math.max(0, (progressCurrent || 0) - 1))}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-[#252831] border border-[#e5e7eb] dark:border-[#353945] font-bold text-[13px] text-[#191c1e] dark:text-[#f3f4f6] flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-[13px] font-bold text-[#173bd0] dark:text-[#5675fd] px-1">
                    {progressCurrent || 0} / {progressTotal}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProgressCurrent(Math.min(progressTotal, (progressCurrent || 0) + 1))}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-[#252831] border border-[#e5e7eb] dark:border-[#353945] font-bold text-[13px] text-[#191c1e] dark:text-[#f3f4f6] flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6] block mb-1">
                Prioridad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Baja', 'Media', 'Alta'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                      priority === p
                        ? p === 'Alta'
                          ? 'bg-[#ffdad6] dark:bg-[#ba1a1a]/30 text-[#ba1a1a] dark:text-[#fca5a5] border-2 border-[#ba1a1a] dark:border-[#f87171]'
                          : p === 'Media'
                          ? 'bg-[#fff2c6] dark:bg-[#ca8a04]/25 text-[#8a6508] dark:text-[#fde047] border-2 border-[#8a6508] dark:border-[#eab308]'
                          : 'bg-[#eceef0] dark:bg-[#252831] text-[#191c1e] dark:text-[#f3f4f6] border-2 border-[#757686] dark:border-[#9aa0a6]'
                        : 'bg-[#f8f9fb] dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f2f4f6] dark:hover:bg-[#252831]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Categories */}
            <div>
              <label className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6] block mb-1">
                Categoría
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      category === cat
                        ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white shadow-xs'
                        : 'bg-[#f8f9fb] dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f2f4f6] dark:hover:bg-[#252831]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Time & Location */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6] block mb-1">
                  Hora estimada
                </label>
                <input
                  type="text"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  placeholder="11:30 am"
                  className="w-full px-3 py-2 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[13px] text-[#191c1e] dark:text-[#f3f4f6] placeholder-[#757686] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#173bd0] dark:focus:border-[#5675fd] focus:bg-white dark:focus:bg-[#252831]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6] block mb-1">
                  Ubicación / Sala
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej. Sala Ágora o Meet"
                  className="w-full px-3 py-2 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[13px] text-[#191c1e] dark:text-[#f3f4f6] placeholder-[#757686] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#173bd0] dark:focus:border-[#5675fd] focus:bg-white dark:focus:bg-[#252831]"
                />
              </div>
            </div>

            {/* Action Buttons: Delete and Save */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="py-2.5 px-3 rounded-xl border border-[#ffdad6] dark:border-[#ba1a1a]/40 bg-[#ffdad6]/30 dark:bg-[#ba1a1a]/20 text-[#ba1a1a] dark:text-[#fca5a5] font-semibold text-[13px] hover:bg-[#ffdad6]/60 dark:hover:bg-[#ba1a1a]/30 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                title="Eliminar tarea definitivamente"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Eliminar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[#444655] dark:text-[#9aa0a6] font-semibold text-[13px] hover:bg-[#f2f4f6] dark:hover:bg-[#252831] cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#173bd0] dark:bg-[#5675fd] hover:bg-[#3a57e8] text-white font-semibold text-[13px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation dialog for deleting task */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="¿Eliminar esta tarea?"
        message={`¿Estás seguro de que deseas eliminar permanentemente la tarea "${task.title}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onCancel={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          setIsConfirmDeleteOpen(false);
          onDeleteTask(task.id);
          onClose();
        }}
      />
    </>
  );
};
