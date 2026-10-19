import React from 'react';
import { Cadence, Priority, Category, FilterOptions } from '../types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onUpdateFilters: (newFilters: FilterOptions) => void;
  onResetFilters: () => void;
  categories?: string[];
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  onResetFilters,
  categories = ['Trabajo', 'Estudio', 'Salud', 'Personal'],
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#16181d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-[#e5e7eb] dark:border-[#262932] transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#173bd0] dark:text-[#5675fd]">tune</span>
            <h3 className="text-[18px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">Filtros de Tareas</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-[#757686] hover:bg-[#eceef0] dark:hover:bg-[#252831] flex items-center justify-center cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Cadence */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">Frecuencia</span>
          <div className="flex items-center gap-2">
            {(['TODAS', 'DIARIA', 'SEMANAL'] as const).map((c) => (
              <button
                key={c}
                onClick={() => onUpdateFilters({ ...filters, cadence: c })}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                  filters.cadence === c
                    ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white'
                    : 'bg-[#f8f9fb] dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">Prioridad</span>
          <div className="grid grid-cols-4 gap-1.5">
            {(['TODAS', 'Alta', 'Media', 'Baja'] as const).map((p) => (
              <button
                key={p}
                onClick={() => onUpdateFilters({ ...filters, priority: p })}
                className={`py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  filters.priority === p
                    ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white'
                    : 'bg-[#f8f9fb] dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">Estado</span>
          <div className="grid grid-cols-2 gap-2">
            {(['TODAS', 'PENDIENTES', 'HECHAS', 'OMITIDAS', 'ATRASADAS'] as const).map((s) => {
              const isSelected =
                filters.status === s ||
                (s === 'HECHAS' && filters.status === 'COMPLETADAS') ||
                (s === 'ATRASADAS' && filters.status === 'VENCIDAS');

              return (
                <button
                  key={s}
                  onClick={() => onUpdateFilters({ ...filters, status: s })}
                  className={`py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#191c1e] dark:bg-[#dee0ff] text-white dark:text-[#00105b]'
                      : 'bg-[#f8f9fb] dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c]'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">Categoría</span>
          <div className="flex flex-wrap gap-1.5">
            {['TODAS', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => onUpdateFilters({ ...filters, category: cat })}
                className={`py-1.5 px-3 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  filters.category === cat
                    ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white'
                    : 'bg-[#f8f9fb] dark:bg-[#1f232b] text-[#444655] dark:text-[#9aa0a6] border border-[#e5e7eb] dark:border-[#2b303c]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => {
              onResetFilters();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl border border-[#e5e7eb] dark:border-[#2b303c] text-[#444655] dark:text-[#9aa0a6] font-semibold text-[13px] hover:bg-[#f2f4f6] dark:hover:bg-[#252831] cursor-pointer transition-colors"
          >
            Restablecer
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#173bd0] dark:bg-[#5675fd] text-white font-semibold text-[13px] hover:bg-[#3a57e8] cursor-pointer transition-colors"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};
