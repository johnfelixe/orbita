import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-sm bg-white dark:bg-[#1a1d24] rounded-2xl p-5 shadow-2xl border border-[#e5e7eb] dark:border-[#2e323e] flex flex-col gap-3 transition-colors animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDestructive
                ? 'bg-[#ffdad6] dark:bg-[#ba1a1a]/25 text-[#ba1a1a] dark:text-[#fca5a5]'
                : 'bg-[#dee0ff] dark:bg-[#5675fd]/25 text-[#173bd0] dark:text-[#8ba4ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {isDestructive ? 'delete_forever' : 'help_outline'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-[#191c1e] dark:text-[#f3f4f6] leading-tight">
              {title}
            </h3>
            <p className="text-[12px] text-[#444655] dark:text-[#9aa0a6] mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl border border-[#e5e7eb] dark:border-[#2e323e] text-[#444655] dark:text-[#9aa0a6] hover:bg-[#f2f4f6] dark:hover:bg-[#252831] font-semibold text-[13px] transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl font-semibold text-[13px] shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-[#ba1a1a] dark:bg-[#dc2626] text-white hover:bg-[#93000a] active:scale-95'
                : 'bg-[#173bd0] dark:bg-[#5675fd] text-white hover:bg-[#3a57e8] active:scale-95'
            }`}
          >
            {isDestructive && (
              <span className="material-symbols-outlined text-[16px]">delete</span>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
