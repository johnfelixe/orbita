import React, { useState, useEffect } from 'react';
import { Task, Cadence, Priority, Category, DailyMode, RecurringPreset, WeeklyMode } from '../types';
import { formatDateISO } from '../utils/taskUtils';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (newTask: Omit<Task, 'id'>) => void;
  categories: string[];
  currentWeekNumber?: number;
  defaultDate?: string;
  defaultCadence?: Cadence;
  initialDate?: string;
  initialCadence?: Cadence;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  categories,
  currentWeekNumber = 42,
  defaultDate,
  defaultCadence,
  initialDate = formatDateISO(new Date()),
  initialCadence = 'DIARIA',
}) => {
  const activeInitialDate = defaultDate || initialDate;
  const activeInitialCadence = defaultCadence || initialCadence;

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [cadence, setCadence] = useState<Cadence>(activeInitialCadence);
  const [priority, setPriority] = useState<Priority>('Media');
  const [category, setCategory] = useState<Category>(categories[0] || 'Trabajo');

  // Daily mode states
  const [dailyMode, setDailyMode] = useState<DailyMode>('SPECIFIC_DATE');
  const [dueDate, setDueDate] = useState(activeInitialDate);

  useEffect(() => {
    if (isOpen) {
      if (defaultDate) setDueDate(defaultDate);
      if (defaultCadence) setCadence(defaultCadence);
    }
  }, [isOpen, defaultDate, defaultCadence]);
  const [recurringPreset, setRecurringPreset] = useState<RecurringPreset>('WEEKDAYS');
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Weekly mode states
  const [weeklyMode, setWeeklyMode] = useState<WeeklyMode>('SPECIFIC_WEEK');
  const [targetWeek, setTargetWeek] = useState<number>(currentWeekNumber);

  // Time & Location
  const [dueTime, setDueTime] = useState('11:00 am');
  const [location, setLocation] = useState('');

  if (!isOpen) return null;

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

    onAddTask({
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      cadence,
      priority,
      category,
      completed: false,
      dueDate,
      dailyMode: cadence === 'DIARIA' ? dailyMode : undefined,
      recurringPreset: cadence === 'DIARIA' && dailyMode === 'RECURRING' ? recurringPreset : undefined,
      recurringDays: cadence === 'DIARIA' && dailyMode === 'RECURRING' ? recurringDays : undefined,
      weeklyMode: cadence === 'SEMANAL' ? weeklyMode : undefined,
      weekNumber: cadence === 'SEMANAL' ? targetWeek : currentWeekNumber,
      dueTime: dueTime.trim() || undefined,
      location: location.trim() || undefined,
    });

    // Reset and close
    setTitle('');
    setSubtitle('');
    setLocation('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#16181d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto border border-[#e5e7eb] dark:border-[#262932] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[22px]">
              add_task
            </span>
            <h3 className="text-[18px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
              Nueva Tarea
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
              placeholder="Ej. Revisar métricas de sprint"
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
              placeholder="Ej. Preparar diapositivas de resumen"
              className="w-full px-3.5 py-2.5 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[13px] text-[#191c1e] dark:text-[#f3f4f6] placeholder-[#757686] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#173bd0] dark:focus:border-[#5675fd] focus:bg-white dark:focus:bg-[#252831]"
            />
          </div>

          {/* Cadence Selector (Diaria vs Semanal) */}
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

              {/* Option A: Specific date */}
              {dailyMode === 'SPECIFIC_DATE' ? (
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-[#444655] dark:text-[#9aa0a6]">
                    Seleccionar fecha del día
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1f232b] rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[13px] text-[#191c1e] dark:text-[#f3f4f6] focus:outline-none focus:border-[#173bd0] dark:focus:border-[#5675fd] [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setDueDate(formatDateISO(new Date()))}
                      className="px-2 py-0.5 rounded bg-white dark:bg-[#1f232b] text-[10px] font-medium text-[#173bd0] dark:text-[#5675fd] border border-[#dee0ff] dark:border-[#5675fd]/40 hover:bg-[#f2f4f6] dark:hover:bg-[#252831] cursor-pointer"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setDueDate(formatDateISO(tomorrow));
                      }}
                      className="px-2 py-0.5 rounded bg-white dark:bg-[#1f232b] text-[10px] font-medium text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c] hover:bg-[#f2f4f6] dark:hover:bg-[#252831] cursor-pointer"
                    >
                      Mañana
                    </button>
                  </div>
                </div>
              ) : (
                /* Option B: Recurring daily task */
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
                      O selecciona los días específicos:
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

                  {/* Summary badge */}
                  <div className="p-2 bg-white dark:bg-[#1f232b] rounded-lg border border-[#e5e7eb] dark:border-[#2b303c] text-[11px] text-[#444655] dark:text-[#9aa0a6] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#173bd0] dark:text-[#5675fd]">repeat</span>
                    <span>
                      Se repetirá en:{' '}
                      <strong className="text-[#191c1e] dark:text-[#f3f4f6]">
                        {recurringDays.length === 7
                          ? 'Todos los días'
                          : recurringDays.length === 5 && !recurringDays.includes(6) && !recurringDays.includes(7)
                          ? 'Lunes a Viernes'
                          : recurringDays.length === 2 && recurringDays.includes(6) && recurringDays.includes(7)
                          ? 'Sábado y Domingo'
                          : recurringDays.map((d) => dayOptions.find((x) => x.id === d)?.label).join(', ')}
                      </strong>
                    </span>
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

              {/* Weekly mode: Semana específica vs Todas las semanas */}
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

              {weeklyMode === 'SPECIFIC_WEEK' ? (
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-[#444655] dark:text-[#9aa0a6]">
                    Seleccionar semana activa
                  </label>
                  <div className="flex items-center gap-2">
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

                  {/* Quick week shortcuts */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setTargetWeek(currentWeekNumber)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        targetWeek === currentWeekNumber
                          ? 'bg-[#712ae2] dark:bg-[#a855f7] text-white'
                          : 'bg-white dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c]'
                      }`}
                    >
                      Semana actual ({currentWeekNumber})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetWeek(currentWeekNumber + 1)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        targetWeek === currentWeekNumber + 1
                          ? 'bg-[#712ae2] dark:bg-[#a855f7] text-white'
                          : 'bg-white dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c]'
                      }`}
                    >
                      Próxima semana ({currentWeekNumber + 1})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-white dark:bg-[#1f232b] rounded-lg border border-[#e5e7eb] dark:border-[#2b303c] text-[11px] text-[#5b21b6] dark:text-[#c4b5fd] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">all_inclusive</span>
                  <span>Visible en el panel semanal de todas las semanas del año</span>
                </div>
              )}
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

          {/* Category */}
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
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
              <span className="material-symbols-outlined text-[16px]">check</span>
              Guardar Tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
