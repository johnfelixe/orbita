import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'tareas', label: 'Tareas', icon: 'check_circle' },
    { id: 'semana', label: 'Semana', icon: 'view_week' },
    { id: 'calendario', label: 'Calendario', icon: 'calendar_month' },
    { id: 'estadisticas', label: 'Estadísticas', icon: 'bar_chart' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-[#ffffff]/90 dark:bg-[#16181d]/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)] border-t border-[#e5e7eb] dark:border-[#262932] transition-colors">
      <div className="max-w-md mx-auto h-16 px-1 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-all group cursor-pointer ${
                isActive
                  ? 'text-[#173bd0] dark:text-[#5675fd] font-bold'
                  : 'text-[#444655] dark:text-[#9aa0a6] hover:text-[#191c1e] dark:hover:text-[#f3f4f6]'
              }`}
            >
              <div
                className={`px-3 py-1 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#173bd0]/10 dark:bg-[#5675fd]/20 scale-105'
                    : 'group-hover:bg-[#eceef0] dark:group-hover:bg-[#252831]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] transition-transform ${
                    isActive ? 'fill-1' : ''
                  }`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {tab.icon}
                </span>
              </div>
              <span className={`text-[10px] tracking-wider mt-0.5 leading-none ${isActive ? 'font-bold' : 'font-semibold'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
