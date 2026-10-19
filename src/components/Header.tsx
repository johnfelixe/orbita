import React from 'react';
import { TabType } from '../types';

interface HeaderProps {
  currentTab: TabType;
  onOpenFilter: () => void;
  onOpenProfile: () => void;
  activeFilterCount: number;
  userAvatar: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenFilter,
  onOpenProfile,
  activeFilterCount,
  userAvatar,
}) => {
  const tabTitles: Record<TabType, string> = {
    semana: 'Semana',
    tareas: 'Tareas',
    calendario: 'Calendario',
    estadisticas: 'Estadísticas',
  };

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-[#f8f9fb]/85 dark:bg-[#0f1115]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-[#e0e3e5]/50 dark:border-[#23262f] transition-colors">
      <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
        {/* Brand & Logo: Orbita */}
        <div className="flex items-center gap-2">
          <img
            alt="Orbita Logo"
            className="h-9 w-9 rounded-xl object-cover shadow-sm"
            src="/logo.webp"
          />
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold text-[#173bd0] dark:text-[#5675fd] tracking-tight leading-none">
              Orbita
            </span>
            <span className="text-[10px] font-bold text-[#444655] dark:text-[#9aa0a6] tracking-wider leading-none mt-0.5 capitalize">
              {tabTitles[currentTab]}
            </span>
          </div>
        </div>

        {/* Action icons: Filters & Profile Avatar */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenFilter}
            aria-label="Buscar o filtrar"
            className="relative w-11 h-11 flex items-center justify-center rounded-full text-[#444655] dark:text-[#9aa0a6] hover:bg-[#eceef0] dark:hover:bg-[#1a1c22] active:bg-[#e6e8ea] dark:active:bg-[#252831] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">tune</span>
            {activeFilterCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#173bd0] dark:bg-[#5675fd] ring-2 ring-[#f8f9fb] dark:ring-[#0f1115]" />
            )}
          </button>
          <button
            onClick={onOpenProfile}
            aria-label="Perfil de usuario y configuración"
            className="w-11 h-11 flex items-center justify-center rounded-full active:scale-95 transition-transform cursor-pointer"
            title="Ajustes y Perfil"
          >
            <img
              alt="Foto de perfil"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#173bd0]/20 dark:ring-[#5675fd]/40 shadow-xs"
              src={userAvatar}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
