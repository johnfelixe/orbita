import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WeekView } from './components/WeekView';
import { TasksView } from './components/TasksView';
import { CalendarView } from './components/CalendarView';
import { StatsView } from './components/StatsView';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { AddTaskModal } from './components/AddTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { FilterModal } from './components/FilterModal';
import { ProfileModal } from './components/ProfileModal';
import { Task, TabType, FilterOptions, Cadence, DEFAULT_CATEGORIES } from './types';
import { formatDateISO, getIsoWeekNumber, isTaskCompletedOnDate, isTaskOmittedOnDate } from './utils/taskUtils';
import {
  downloadBackup,
  loadAppData,
  parseBackup,
  requestPersistentStorage,
  saveAppData,
  type AppSnapshot,
} from './utils/appStorage';

const todayISO = formatDateISO(new Date());
const todayWeek = getIsoWeekNumber(new Date());

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('orbita_tasks_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading local tasks:', e);
    }
    return [];
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('weekflow_categories_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading local categories:', e);
    }
    return DEFAULT_CATEGORIES;
  });

  const [currentTab, setCurrentTab] = useState<TabType>('semana');
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(todayWeek);

  const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7tbdBzuvE1nW6U96o4Au7oWS5odLTtbf4_uq8MLBs4AESBRNAeW_Ey-h1jSjZzD1O07Wb8T4_K30d6F4sBvdU8RfvfQ';

  const [userAvatar, setUserAvatar] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('orbita_user_avatar');
      if (saved) return saved;
    } catch (e) {
      console.warn('Error reading avatar:', e);
    }
    return DEFAULT_AVATAR;
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('orbita_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
      }
    } catch (e) {
      console.warn('Error reading theme:', e);
    }
    return false;
  });

  // Modals state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskDefaultDate, setAddTaskDefaultDate] = useState<string>(todayISO);
  const [addTaskDefaultCadence, setAddTaskDefaultCadence] = useState<Cadence>('DIARIA');
  
  // Edit Task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    cadence: 'TODAS',
    priority: 'TODAS',
    status: 'TODAS',
    category: 'TODAS',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await requestPersistentStorage();
      const saved = await loadAppData();
      if (cancelled) return;
      setTasks(saved.tasks);
      setCategories(saved.categories);
      if (saved.avatar) setUserAvatar(saved.avatar);
      if (saved.theme === 'dark') setIsDarkMode(true);
      if (saved.theme === 'light') setIsDarkMode(false);
      setStorageReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!storageReady) return;
    void saveAppData({
      tasks,
      categories,
      avatar: userAvatar,
      theme: isDarkMode ? 'dark' : 'light',
    });
  }, [storageReady, tasks, categories, userAvatar, isDarkMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Toggle completion of task (handles both single-date tasks and per-date recurring tasks)
  const handleToggleTask = (taskId: string, dateStr?: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          if (t.dailyMode === 'RECURRING') {
            const dateKey = dateStr || selectedDate;
            const completedDates = t.completedDates || [];
            const isDoneOnDate = completedDates.includes(dateKey);
            const nextDates = isDoneOnDate
              ? completedDates.filter((d) => d !== dateKey)
              : [...completedDates, dateKey];
            const nextOmitted = (t.omittedDates || []).filter((d) => d !== dateKey);

            if (!isDoneOnDate) {
              showToast(`¡Completada: "${t.title}"!`);
            }
            return {
              ...t,
              completedDates: nextDates,
              completed: false,
              omittedDates: nextOmitted,
              omitted: false,
            };
          }

          const nextCompleted = !t.completed;
          if (nextCompleted) {
            showToast(`¡Completada: "${t.title}"!`);
          }
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? 'Ahora' : undefined,
            // If completed, clear omitted
            omitted: nextCompleted ? false : t.omitted,
          };
        }
        return t;
      })
    );
  };

  // Toggle omit (skip) state of task (handles both single-date and per-date recurring tasks)
  const handleToggleOmitTask = (taskId: string, dateStr?: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          if (t.dailyMode === 'RECURRING') {
            const dateKey = dateStr || selectedDate;
            const omittedDates = t.omittedDates || [];
            const isOmittedOnDate = omittedDates.includes(dateKey);
            const nextOmitted = isOmittedOnDate
              ? omittedDates.filter((d) => d !== dateKey)
              : [...omittedDates, dateKey];
            const nextCompleted = (t.completedDates || []).filter((d) => d !== dateKey);

            if (!isOmittedOnDate) {
              showToast(`Tarea omitida: "${t.title}"`);
            } else {
              showToast(`Omisión deshecha: "${t.title}"`);
            }

            return {
              ...t,
              omittedDates: nextOmitted,
              omitted: false,
              completedDates: nextCompleted,
              completed: false,
            };
          }

          const nextOmitted = !t.omitted;
          if (nextOmitted) {
            showToast(`Tarea omitida: "${t.title}"`);
          } else {
            showToast(`Omisión deshecha: "${t.title}"`);
          }
          return {
            ...t,
            omitted: nextOmitted,
            omittedAt: nextOmitted ? 'Ahora' : undefined,
            completed: nextOmitted ? false : t.completed,
          };
        }
        return t;
      })
    );
  };

  // Update progress on numeric tasks (e.g. 2/3 -> 3/3)
  const handleUpdateProgress = (taskId: string, newCurrent: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const total = t.progressTotal || 3;
          const isDone = newCurrent >= total;
          if (isDone && !t.completed) {
            showToast(`¡Meta semanal cumplida: "${t.title}"! 🎯`);
          }
          return {
            ...t,
            progressCurrent: newCurrent,
            completed: isDone,
            omitted: isDone ? false : t.omitted,
          };
        }
        return t;
      })
    );
  };

  // Add new task
  const handleAddTask = (newTaskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast(`Tarea agregada: "${newTask.title}"`);
  };

  // Open Edit Task modal
  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditTaskOpen(true);
  };

  // Save modified task
  const handleSaveEditTask = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setIsEditTaskOpen(false);
    setEditingTask(null);
    showToast(`Tarea modificada: "${updatedTask.title}"`);
  };


  // Delete task
  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (editingTask && editingTask.id === taskId) {
      setIsEditTaskOpen(false);
      setEditingTask(null);
    }
    showToast('Tarea eliminada');
  };

  // Add category
  const handleAddCategory = (newCat: string) => {
    if (!categories.includes(newCat)) {
      setCategories((prev) => [...prev, newCat]);
      showToast(`Categoría agregada: "${newCat}"`);
    }
  };

  // Delete category
  const handleDeleteCategory = (catToDelete: string) => {
    setCategories((prev) => prev.filter((c) => c !== catToDelete));
    showToast(`Categoría eliminada: "${catToDelete}"`);
  };

  // Change active week
  const handleChangeWeek = (delta: number) => {
    const nextWeek = currentWeekNumber + delta;
    setCurrentWeekNumber(nextWeek);
  };

  const handleGoToToday = () => {
    const now = new Date();
    setSelectedDate(formatDateISO(now));
    setCurrentWeekNumber(getIsoWeekNumber(now));
  };

  const handleResetDemoData = () => {
    setTasks([]);
    setCategories(DEFAULT_CATEGORIES);
    handleGoToToday();
    showToast('Todas las tareas se eliminaron');
  };

  const currentSnapshot = (): AppSnapshot => ({
    tasks,
    categories,
    avatar: userAvatar,
    theme: isDarkMode ? 'dark' : 'light',
  });

  const handleExportBackup = () => {
    downloadBackup(currentSnapshot());
    showToast('Respaldo descargado');
  };

  const handleImportBackup = (raw: unknown) => {
    const snapshot = parseBackup(raw);
    setTasks(snapshot.tasks);
    setCategories(snapshot.categories);
    if (snapshot.avatar) setUserAvatar(snapshot.avatar);
    if (snapshot.theme) setIsDarkMode(snapshot.theme === 'dark');
    showToast('Respaldo restaurado');
  };

  // Open add task modal with preset date
  const handleOpenAddTask = (date?: string, cadence?: Cadence) => {
    setAddTaskDefaultDate(date || selectedDate);
    setAddTaskDefaultCadence(cadence || 'DIARIA');
    setIsAddTaskOpen(true);
  };

  // Filter tasks based on tune modal filters
  const activeFilterCount =
    (filters.cadence !== 'TODAS' ? 1 : 0) +
    (filters.priority !== 'TODAS' ? 1 : 0) +
    (filters.status !== 'TODAS' ? 1 : 0) +
    (filters.category !== 'TODAS' ? 1 : 0);

  const displayedTasks = tasks.filter((t) => {
    if (filters.cadence !== 'TODAS' && t.cadence !== filters.cadence) return false;
    if (filters.priority !== 'TODAS' && t.priority !== filters.priority) return false;
    if (filters.category !== 'TODAS' && t.category !== filters.category) return false;
    
    const isCompleted = isTaskCompletedOnDate(t, selectedDate);
    const isOmitted = isTaskOmittedOnDate(t, selectedDate);
    const isOverdue = Boolean(t.isOverdue) && !isCompleted && !isOmitted;

    if (filters.status === 'PENDIENTES' && (isCompleted || isOmitted || isOverdue)) return false;
    if ((filters.status === 'COMPLETADAS' || filters.status === 'HECHAS') && !isCompleted) return false;
    if (filters.status === 'OMITIDAS' && !isOmitted) return false;
    if ((filters.status === 'VENCIDAS' || filters.status === 'ATRASADAS') && !isOverdue) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0f1115] text-[#191c1e] dark:text-[#f3f4f6] antialiased flex flex-col transition-colors">
      {/* App Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col relative shadow-xs">
        
        {/* Header */}
        <Header
          currentTab={currentTab}
          onOpenFilter={() => setIsFilterOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          activeFilterCount={activeFilterCount}
          userAvatar={userAvatar}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full bg-[#f8f9fb] dark:bg-[#0f1115] pt-16 pb-28 transition-colors">
          {currentTab === 'semana' && (
            <WeekView
              tasks={displayedTasks}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onToggleTask={handleToggleTask}
              onToggleOmitTask={handleToggleOmitTask}
              onUpdateProgress={handleUpdateProgress}
              onOpenAddTask={handleOpenAddTask}
              onEditTask={handleOpenEditTask}
              currentWeekNumber={currentWeekNumber}
              onChangeWeek={handleChangeWeek}
              onGoToToday={handleGoToToday}
            />
          )}

          {currentTab === 'tareas' && (
            <TasksView
              tasks={displayedTasks}
              onToggleTask={() => {}}
              onToggleTaskById={handleToggleTask}
              onToggleOmitTaskById={handleToggleOmitTask}
              onDeleteTask={handleDeleteTask}
              onOpenAddTask={() => handleOpenAddTask()}
              onEditTask={handleOpenEditTask}
              categories={categories}
              currentDate={selectedDate}
              currentWeekNumber={currentWeekNumber}
            />
          )}

          {currentTab === 'calendario' && (
            <CalendarView
              tasks={displayedTasks}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onOpenAddTask={(d) => handleOpenAddTask(d)}
            />
          )}

          {currentTab === 'estadisticas' && (
            <StatsView
              tasks={displayedTasks}
              currentWeekNumber={currentWeekNumber}
              categories={categories}
              onOpenAddTask={() => handleOpenAddTask()}
              onUpdateProgress={handleUpdateProgress}
              selectedDate={selectedDate}
            />
          )}
        </main>

        {/* Floating AI Voice Assistant Button (Right-margin, bottom-24) */}
        <div className="fixed bottom-24 right-4 sm:right-6 md:right-8 z-50 pointer-events-auto">
          <button
            onClick={() => setIsVoiceAssistantOpen(true)}
            aria-label="Asistente de voz IA"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(79,70,229,0.4)] active:scale-95 transition-all hover:shadow-[0_10px_28px_rgba(79,70,229,0.5)] ring-4 ring-[#f8f9fb] dark:ring-[#0f1115] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[26px]">mic</span>
          </button>
        </div>

        {/* Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
        />

        {/* Toast feedback */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-[#191c1e] dark:bg-[#252831] text-white dark:text-[#f3f4f6] text-[13px] font-medium rounded-full shadow-lg flex items-center gap-2 animate-bounce border border-transparent dark:border-[#353945]">
            <span className="material-symbols-outlined text-[16px] text-[#dee0ff] dark:text-[#5675fd]">info</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        onAddTask={handleAddTask}
        selectedDate={selectedDate}
        tasks={tasks}
        currentWeekNumber={currentWeekNumber}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onAddTask={handleAddTask}
        defaultDate={addTaskDefaultDate}
        defaultCadence={addTaskDefaultCadence}
        currentWeekNumber={currentWeekNumber}
        categories={categories}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        isOpen={isEditTaskOpen}
        onClose={() => {
          setIsEditTaskOpen(false);
          setEditingTask(null);
        }}
        onSaveTask={handleSaveEditTask}
        onDeleteTask={handleDeleteTask}
        categories={categories}
        currentWeekNumber={currentWeekNumber}
      />

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onUpdateFilters={setFilters}
        categories={categories}
        onResetFilters={() =>
          setFilters({
            cadence: 'TODAS',
            priority: 'TODAS',
            status: 'TODAS',
            category: 'TODAS',
          })
        }
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onResetDemoData={handleResetDemoData}
        userAvatar={userAvatar}
        onUpdateAvatar={(newUrl) => {
          setUserAvatar(newUrl);
          showToast('Foto de perfil actualizada ✨');
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />
    </div>
  );
}
