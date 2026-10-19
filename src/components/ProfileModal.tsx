import React, { useState, useRef } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { usePwaInstall } from '../hooks/usePwaInstall';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetDemoData: () => void;
  userAvatar: string;
  onUpdateAvatar: (newAvatarUrl: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  categories: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onResetDemoData,
  userAvatar,
  onUpdateAvatar,
  isDarkMode,
  onToggleDarkMode,
  categories,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [newCatInput, setNewCatInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canInstall, isInstalled, isIos, install } = usePwaInstall();

  // Category deletion confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Demo reset confirmation state
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  if (!isOpen) return null;

  // Handle image upload from file input
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setErrorMessage('Por favor selecciona una imagen menor a 3MB.');
        setTimeout(() => setErrorMessage(null), 3500);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          onUpdateAvatar(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onUpdateAvatar(customUrl.trim());
      setShowUrlInput(false);
      setCustomUrl('');
    }
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`La categoría "${trimmed}" ya existe.`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    onAddCategory(trimmed);
    setNewCatInput('');
    setErrorMessage(null);
  };

  const handleRequestDeleteCategory = (cat: string) => {
    if (categories.length <= 1) {
      setErrorMessage('Debes conservar al menos una categoría en el sistema.');
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }
    setCategoryToDelete(cat);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-white dark:bg-[#16181d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-[#e5e7eb] dark:border-[#262932] max-h-[90vh] overflow-y-auto transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#173bd0] dark:text-[#5675fd] text-[20px]">
                settings
              </span>
              <h3 className="text-[18px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                Ajustes y Perfil
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-[#757686] dark:text-[#9aa0a6] hover:bg-[#eceef0] dark:hover:bg-[#252831] flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Inline notification/error banner if any */}
          {errorMessage && (
            <div className="p-3 bg-[#ffdad6] dark:bg-[#ba1a1a]/20 border border-[#ba1a1a]/30 text-[#ba1a1a] dark:text-[#fca5a5] rounded-xl text-[12px] font-medium flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-[#ba1a1a] dark:text-[#fca5a5] p-0.5 hover:opacity-70 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          )}

          {/* User Card with Avatar Customizer */}
          <div className="p-4 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col gap-3">
            <div className="flex items-center gap-3.5">
              {/* Avatar with click to change */}
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Haz clic para subir tu foto"
              >
                <img
                  alt="Profile Avatar"
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-[#173bd0]/15 dark:ring-[#5675fd]/30 shadow-sm"
                  src={userAvatar}
                />
                <div
                  className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-white text-[20px]">photo_camera</span>
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                <h4 className="text-[16px] font-bold text-[#191c1e] dark:text-[#f3f4f6] leading-snug">
                  John Felix
                </h4>
                <span className="text-[12px] text-[#444655] dark:text-[#9aa0a6] truncate">
                  johnfelixe@gmail.com
                </span>
                <span className="text-[11px] font-semibold text-[#173bd0] dark:text-[#5675fd] mt-0.5">
                  Orbita Pro Workspace
                </span>
              </div>
            </div>

            {/* Quick Avatar Presets */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-[#e5e7eb] dark:border-[#2b303c]/80">
              <span className="text-[11px] font-semibold text-[#757686] dark:text-[#9aa0a6]">
                Elige un avatar o sube el tuyo:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                {[
                  { name: 'Original', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7tbdBzuvE1nW6U96o4Au7oWS5odLTtbf4_uq8MLBs4AESBRNAeW_Ey-h1jSjZzD1O07Wb8T4_K30d6F4sBvdU8RfvfQ' },
                  { name: 'Casual', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80' },
                  { name: 'Ejecutivo', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80' },
                  { name: 'Creativa', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80' },
                  { name: 'Moderno', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80' },
                ].map((preset) => {
                  const isSelected = userAvatar === preset.url;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => onUpdateAvatar(preset.url)}
                      className={`relative rounded-full shrink-0 transition-transform hover:scale-105 cursor-pointer ${
                        isSelected ? 'ring-2 ring-[#173bd0] dark:ring-[#5675fd] scale-105' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={`Avatar ${preset.name}`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo Actions: Upload local photo or enter URL */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#e5e7eb] dark:border-[#2b303c]/80">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-1.5 px-2 bg-white dark:bg-[#252831] hover:bg-[#eceef0] dark:hover:bg-[#2c303b] border border-[#e5e7eb] dark:border-[#353945] rounded-xl text-[11px] font-semibold text-[#191c1e] dark:text-[#f3f4f6] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px] text-[#173bd0] dark:text-[#5675fd]">
                  upload
                </span>
                Subir mi foto
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="py-1.5 px-3 bg-white dark:bg-[#252831] hover:bg-[#eceef0] dark:hover:bg-[#2c303b] border border-[#e5e7eb] dark:border-[#353945] rounded-xl text-[11px] font-semibold text-[#444655] dark:text-[#9aa0a6] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">link</span>
                URL
              </button>
            </div>

            {showUrlInput && (
              <form onSubmit={handleCustomUrlSubmit} className="flex items-center gap-1.5 pt-1 animate-fade-in">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mifoto.jpg"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-[#252831] rounded-xl border border-[#e5e7eb] dark:border-[#353945] text-[12px] text-[#191c1e] dark:text-[#f3f4f6] focus:outline-none focus:border-[#173bd0]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#173bd0] text-white text-[12px] font-semibold rounded-xl hover:bg-[#3a57e8] transition-colors cursor-pointer"
                >
                  Aplicar
                </button>
              </form>
            )}
          </div>

          {/* PREFERENCIAS DE INTERFAZ: MODO OSCURO */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-bold text-[#757686] dark:text-[#9aa0a6] uppercase tracking-wider">
              Preferencias de Interfaz
            </span>

            <div className="p-3.5 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] flex items-center justify-between shadow-xs transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#dee0ff] dark:bg-[#5675fd]/20 text-[#173bd0] dark:text-[#5675fd] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">
                    {isDarkMode ? 'dark_mode' : 'light_mode'}
                  </span>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                    Modo Oscuro
                  </p>
                  <p className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                    {isDarkMode ? 'Interfaz oscura activada' : 'Interfaz clara activada'}
                  </p>
                </div>
              </div>

              {/* Dark mode switch */}
              <button
                onClick={onToggleDarkMode}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                  isDarkMode ? 'bg-[#173bd0] dark:bg-[#5675fd]' : 'bg-[#e0e3e5]'
                }`}
                title="Alternar modo oscuro"
              >
                <div
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform flex items-center justify-center ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px] text-[#191c1e]">
                    {isDarkMode ? 'dark_mode' : 'light_mode'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* INSTALACIÓN EN EL CELULAR */}
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-bold text-[#757686] dark:text-[#9aa0a6] uppercase tracking-wider">
              Instalación
            </span>
            <div className="p-3.5 bg-white dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#dee0ff] dark:bg-[#5675fd]/20 text-[#173bd0] dark:text-[#5675fd] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">install_mobile</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                    {isInstalled ? 'Orbita está instalada' : 'Instalar en el celular'}
                  </p>
                  <p className="text-[11px] text-[#757686] dark:text-[#9aa0a6]">
                    {isInstalled
                      ? 'Ya se abre como una app independiente.'
                      : isIos
                        ? 'En Safari: Compartir → Añadir a pantalla de inicio.'
                        : 'Agrégala a la pantalla de inicio y úsala como una app.'}
                  </p>
                </div>
              </div>
              {canInstall && (
                <button
                  type="button"
                  onClick={() => {
                    void install();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#173bd0] dark:bg-[#5675fd] text-white text-[12px] font-semibold hover:bg-[#3a57e8] transition-colors cursor-pointer"
                >
                  Instalar Orbita
                </button>
              )}
            </div>
          </div>

          {/* GESTIÓN DE CATEGORÍAS */}
          <div className="p-4 bg-[#f8f9fb] dark:bg-[#1f232b] rounded-2xl border border-[#e5e7eb] dark:border-[#2b303c] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#173bd0] dark:text-[#5675fd]">
                  label
                </span>
                <h4 className="text-[13px] font-bold text-[#191c1e] dark:text-[#f3f4f6]">
                  Gestión de Categorías
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-[#757686] dark:text-[#9aa0a6]">
                {categories.length} activas
              </span>
            </div>

            <p className="text-[11px] text-[#444655] dark:text-[#9aa0a6] leading-relaxed">
              Administra las etiquetas para clasificar tareas. Si eliminas una categoría, las tareas ya creadas con ella conservarán su etiqueta sin verse afectadas.
            </p>

            {/* List of categories with delete */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="px-2.5 py-1 bg-white dark:bg-[#252831] rounded-lg border border-[#e5e7eb] dark:border-[#353945] flex items-center gap-1.5 shadow-xs"
                >
                  <span className="text-[12px] font-semibold text-[#191c1e] dark:text-[#f3f4f6]">
                    {cat}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRequestDeleteCategory(cat)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[#757686] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 dark:hover:bg-[#ba1a1a]/30 transition-colors cursor-pointer"
                    title={`Eliminar categoría "${cat}"`}
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Add category form */}
            <form onSubmit={handleAddCategorySubmit} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="Nueva categoría (ej. Finanzas)"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-[#252831] rounded-xl border border-[#e5e7eb] dark:border-[#353945] text-[12px] text-[#191c1e] dark:text-[#f3f4f6] placeholder-[#757686] dark:placeholder-[#9aa0a6] focus:outline-none focus:border-[#173bd0]"
              />
              <button
                type="submit"
                disabled={!newCatInput.trim()}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1 transition-all ${
                  newCatInput.trim()
                    ? 'bg-[#173bd0] dark:bg-[#5675fd] text-white hover:bg-[#3a57e8] shadow-xs cursor-pointer'
                    : 'bg-[#eceef0] dark:bg-[#252831] text-[#757686] cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Agregar
              </button>
            </form>
          </div>

          {/* Demo reset button */}
          <div className="pt-1">
            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-[#ba1a1a]/30 dark:border-[#ba1a1a]/40 bg-[#ffdad6]/20 dark:bg-[#ffdad6]/10 text-[#ba1a1a] dark:text-[#fca5a5] text-[13px] font-semibold hover:bg-[#ffdad6]/40 dark:hover:bg-[#ba1a1a]/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              Restaurar datos de muestra
            </button>
          </div>

          {/* App Footer */}
          <div className="text-center pt-2 text-[11px] text-[#757686] dark:text-[#9aa0a6]">
            Orbita Productivity v2.4.0 · Material 3 Design
          </div>
        </div>
      </div>

      {/* Confirmation modal for Category Deletion */}
      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        title="¿Eliminar categoría?"
        message={`¿Estás seguro de que deseas eliminar la categoría "${categoryToDelete}"? Las tareas existentes que tengan esta categoría la conservarán intacta.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (categoryToDelete) {
            onDeleteCategory(categoryToDelete);
            setCategoryToDelete(null);
          }
        }}
      />

      {/* Confirmation modal for Demo Reset */}
      <ConfirmModal
        isOpen={isConfirmResetOpen}
        title="¿Restaurar datos de muestra?"
        message="¿Deseas restaurar todas las tareas originales del demo y restablecer la foto predeterminada? Tus cambios actuales se reiniciarán."
        confirmText="Restaurar todo"
        cancelText="Cancelar"
        isDestructive={false}
        onCancel={() => setIsConfirmResetOpen(false)}
        onConfirm={() => {
          setIsConfirmResetOpen(false);
          onResetDemoData();
          onClose();
        }}
      />
    </>
  );
};
