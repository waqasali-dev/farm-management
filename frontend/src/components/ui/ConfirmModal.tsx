import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isLoading = false,
  icon,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div className="bg-white border-2 border-black max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold shrink-0">
              {icon || <AlertTriangle className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-black">
              {title}
            </h2>
          </div>
          {!isLoading && (
            <button
              type="button"
              onClick={onCancel}
              className="text-zinc-500 hover:text-black p-1 transition-colors"
              title="Close overlay"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="text-xs font-mono text-zinc-700 leading-relaxed whitespace-pre-line py-1">
          {message}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-zinc-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto text-center border border-black bg-white px-4 py-2.5 sm:py-2 text-xs font-mono font-bold uppercase hover:bg-zinc-100 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto text-center justify-center flex items-center gap-2 border-2 border-black bg-black text-white px-5 py-2.5 sm:py-2 text-xs font-mono font-bold uppercase hover:bg-zinc-800 disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors active:translate-x-0.5 active:translate-y-0.5"
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
