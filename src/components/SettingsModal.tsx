import React, { useState, useEffect } from 'react';
import {
  Key,
  Folder,
  Cpu,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('gemini-flash-latest');
  const [folder, setFolder] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.getSettings().then((s) => {
        setApiKey(s.geminiApiKey || '');
        let m = s.geminiModel || 'gemini-flash-latest';
        if (m === 'gemini-2.5-flash') m = 'gemini-flash-latest';
        setModel(m);
        setFolder(s.documentsFolder || '');
      });
    }
  }, [isOpen]);

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.selectDocumentsFolder();
      if (res.success && res.folder) {
        setFolder(res.folder);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) return;

    setIsSaving(true);
    const newSettings: AppSettings = {
      geminiApiKey: apiKey.trim(),
      geminiModel: model,
      documentsFolder: folder,
    };

    const res = await window.electronAPI.saveSettings(newSettings);
    setIsSaving(false);
    if (res.success) {
      setSavedSuccess(true);
      onSaved(newSettings);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } else {
      alert(`Error saving settings: ${res.error}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-theme-elevated border border-theme-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-theme-surface border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-theme-accent-soft border border-theme-border rounded-lg text-theme-accent">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-primary">
                Application Settings
              </h2>
              <p className="text-xs text-theme-secondary">
                Configure your Gemini API key and local storage
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

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-theme-primary flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-theme-accent" />
                Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-theme-accent hover:underline flex items-center gap-1 font-medium"
              >
                Get API Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-theme-input border border-theme-border rounded-xl px-3.5 py-2.5 text-xs text-theme-primary placeholder-theme-muted focus:outline-none focus:border-theme-accent pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-theme-muted hover:text-theme-primary"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-theme-muted mt-1">
              Your key is saved only locally on your machine and communicates directly with Google's API.
            </p>
          </div>

          {/* Gemini Model */}
          <div>
            <label className="block text-xs font-semibold text-theme-primary mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-theme-accent" />
              Gemini Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-theme-input border border-theme-border rounded-xl px-3.5 py-2.5 text-xs text-theme-primary focus:outline-none focus:border-theme-accent"
            >
              <option value="gemini-flash-latest">
                Gemini Flash (Recommended: Fast, Auto-balanced, Highly Available)
              </option>
              <option value="gemini-3.7-flash">
                Gemini 3.7 Flash
              </option>
              <option value="gemini-3.5-flash">
                Gemini 3.5 Flash
              </option>
              <option value="gemini-3.8-flash">
                Gemini 3.8 Flash
              </option>
              <option value="gemini-pro-latest">
                Gemini Pro Latest (Deep Literary Editing)
              </option>
              <option value="gemini-flash-lite-latest">
                Gemini Flash Lite (Ultra Fast)
              </option>
            </select>
          </div>

          {/* Local Documents Folder */}
          <div>
            <label className="block text-xs font-semibold text-theme-primary mb-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-theme-accent" />
              Local Documents Storage Folder
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={folder}
                className="flex-1 bg-theme-input border border-theme-border rounded-xl px-3.5 py-2 text-xs text-theme-secondary font-mono truncate"
              />
              <button
                type="button"
                onClick={handleSelectFolder}
                className="px-3 py-2 bg-theme-surface hover:bg-theme-elevated text-theme-primary rounded-xl text-xs font-medium border border-theme-border transition"
              >
                Change Folder
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-theme-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-surface rounded-xl transition border border-theme-border"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-theme-accent-text bg-theme-accent hover:bg-theme-accent-hover rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
