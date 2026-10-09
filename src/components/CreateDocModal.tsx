import React, { useState, useEffect, useRef } from 'react';
import { FilePlus, X, ArrowRight } from 'lucide-react';

interface CreateDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export const CreateDocModal: React.FC<CreateDocModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || 'Untitled Document';
    onCreate(finalTitle);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-theme-elevated border border-theme-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-theme-surface border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-theme-accent-soft border border-theme-border rounded-lg text-theme-accent">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-theme-primary">
                Create New Document
              </h2>
              <p className="text-xs text-theme-secondary">
                Give your new draft a title
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-surface rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-theme-primary mb-1.5">
              Document Title
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 1, The Art of Focus, Project Pitch"
              className="w-full bg-theme-input border border-theme-border rounded-xl px-3.5 py-2.5 text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:border-theme-accent"
            />
            <p className="text-[11px] text-theme-muted mt-1.5">
              Will be saved locally as a Markdown (.md) file.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-theme-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-surface rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-theme-accent-text bg-theme-accent hover:bg-theme-accent-hover rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              Create Document
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
