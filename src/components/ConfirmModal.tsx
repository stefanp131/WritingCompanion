import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-theme-elevated border border-theme-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-theme-surface border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border ${
                confirmVariant === 'danger'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : 'bg-theme-accent-soft border-theme-border text-theme-accent'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-theme-primary">{title}</h2>
          </div>

          <button
            onClick={onCancel}
            className="p-1 text-theme-secondary hover:text-theme-primary hover:bg-theme-surface rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs text-theme-secondary leading-relaxed">
          {message}
        </div>

        {/* Actions */}
        <div className="px-5 py-3 bg-theme-surface border-t border-theme-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated rounded-xl transition border border-theme-border"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-xl shadow-sm transition ${
              confirmVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-theme-accent hover:bg-theme-accent-hover text-theme-accent-text'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
