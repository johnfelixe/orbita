import { DEFAULT_CATEGORIES, Task } from '../types';
import { INITIAL_TASKS } from '../data/initialTasks';

const DB_NAME = 'orbita-db';
const DB_VERSION = 1;
const STORE = 'kv';

const LS_TASKS = 'orbita_tasks_v1';
const LS_TASKS_LEGACY = 'weekflow_tasks_v1';
const LS_CATEGORIES = 'weekflow_categories_v1';
const LS_AVATAR = 'orbita_user_avatar';
const LS_THEME = 'orbita_theme';

export type AppTheme = 'dark' | 'light';

export type AppSnapshot = {
  tasks: Task[];
  categories: string[];
  avatar: string | null;
  theme: AppTheme | null;
};

export type OrbitaBackup = AppSnapshot & {
  app: 'orbita';
  version: 1;
  exportedAt: string;
};

const DEMO_IDS = new Set(INITIAL_TASKS.map((task) => task.id));

function withoutDemoTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !DEMO_IDS.has(task.id));
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readLocal<T>(key: string): T | null {
  try {
    return parseJson<T>(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (error) {
    console.warn('No se pudo guardar en localStorage:', error);
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('No se pudo leer IndexedDB:', error);
    return undefined;
  }
}

async function idbPutAll(entries: Array<[string, unknown]>): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const [key, value] of entries) {
        store.put(value, key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('No se pudo guardar en IndexedDB:', error);
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    const already = await navigator.storage.persisted();
    if (already) return true;
    return await navigator.storage.persist();
  } catch (error) {
    console.warn('No se pudo pedir almacenamiento persistente:', error);
    return false;
  }
}

export async function loadAppData(): Promise<AppSnapshot> {
  const idbTasks = await idbGet<Task[]>('tasks');
  const idbCategories = await idbGet<string[]>('categories');
  const idbAvatar = await idbGet<string>('avatar');
  const idbTheme = await idbGet<AppTheme>('theme');

  const localTasks = readLocal<Task[]>(LS_TASKS);
  const legacyTasks = readLocal<Task[]>(LS_TASKS_LEGACY);
  const localCategories = readLocal<string[]>(LS_CATEGORIES);
  const localAvatar = (() => {
    try {
      return localStorage.getItem(LS_AVATAR);
    } catch {
      return null;
    }
  })();
  const localTheme = (() => {
    try {
      const value = localStorage.getItem(LS_THEME);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  })();

  const rawTasks = Array.isArray(idbTasks)
    ? idbTasks
    : Array.isArray(localTasks)
      ? localTasks
      : Array.isArray(legacyTasks)
        ? legacyTasks
        : [];

  return {
    tasks: withoutDemoTasks(rawTasks),
    categories:
      Array.isArray(idbCategories) && idbCategories.length > 0
        ? idbCategories
        : Array.isArray(localCategories) && localCategories.length > 0
          ? localCategories
          : DEFAULT_CATEGORIES,
    avatar: idbAvatar || localAvatar,
    theme: idbTheme || localTheme,
  };
}

export async function saveAppData(snapshot: AppSnapshot): Promise<void> {
  await idbPutAll([
    ['tasks', snapshot.tasks],
    ['categories', snapshot.categories],
    ['avatar', snapshot.avatar],
    ['theme', snapshot.theme],
  ]);
  writeLocal(LS_TASKS, snapshot.tasks);
  writeLocal(LS_CATEGORIES, snapshot.categories);
  writeLocal(LS_AVATAR, snapshot.avatar);
  writeLocal(LS_THEME, snapshot.theme);
}

export function createBackup(snapshot: AppSnapshot): OrbitaBackup {
  return {
    app: 'orbita',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...snapshot,
  };
}

export function parseBackup(raw: unknown): AppSnapshot {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El archivo de respaldo no es válido.');
  }
  const data = raw as Partial<OrbitaBackup>;
  if (!Array.isArray(data.tasks)) {
    throw new Error('El archivo no contiene tareas de Orbita.');
  }
  return {
    tasks: withoutDemoTasks(data.tasks as Task[]),
    categories:
      Array.isArray(data.categories) && data.categories.length > 0
        ? (data.categories as string[])
        : DEFAULT_CATEGORIES,
    avatar: typeof data.avatar === 'string' ? data.avatar : null,
    theme: data.theme === 'dark' || data.theme === 'light' ? data.theme : null,
  };
}

export function downloadBackup(snapshot: AppSnapshot) {
  const backup = createBackup(snapshot);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = backup.exportedAt.slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orbita-respaldo-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
