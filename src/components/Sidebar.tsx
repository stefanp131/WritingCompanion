import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Search,
  Settings,
  Feather,
  AlertCircle,
} from 'lucide-react';
import { DocumentItem } from '../types';

interface SidebarProps {
  documents: DocumentItem[];
  activeDoc: DocumentItem | null;
  onSelectDoc: (doc: DocumentItem) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (doc: DocumentItem) => void;
  onOpenSettings: () => void;
  isApiKeyConfigured: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDoc,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  onOpenSettings,
  isApiKeyConfigured,
}) => {
  const [filter, setFilter] = useState('');

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside className="w-64 bg-theme-surface border-r border-theme-border flex flex-col h-full select-none">
      {/* Brand & New Document Button */}
      <div className="p-4 border-b border-theme-border space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-theme-accent rounded-xl text-theme-accent-text shadow-md">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-theme-primary tracking-tight">
              AI Writing Studio
            </h1>
            <span className="text-[10px] text-theme-accent font-medium">
              Desktop Edition
            </span>
          </div>
        </div>

        <button
          onClick={onCreateDoc}
          className="w-full py-2 px-3 bg-theme-accent hover:bg-theme-accent-hover text-theme-accent-text rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Document
        </button>
      </div>

      {/* Document Search */}
      <div className="px-4 py-2 border-b border-theme-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-theme-muted absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-theme-input border border-theme-border rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-theme-primary placeholder-theme-muted focus:outline-none focus:border-theme-accent"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8 text-theme-muted text-xs">
            {filter ? 'No matching documents' : 'No documents yet'}
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isActive = activeDoc?.path === doc.path;

            return (
              <div
                key={doc.path}
                onClick={() => onSelectDoc(doc)}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-theme-accent-soft text-theme-primary border border-theme-border font-medium'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-1">
                  <FileText
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-theme-accent' : 'text-theme-muted'
                    }`}
                  />
                  <span className="truncate">{doc.name}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDoc(doc);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 rounded transition"
                  title="Delete document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Settings Link */}
      <div className="p-3 border-t border-theme-border bg-theme-surface">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition border border-theme-border"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-theme-secondary" />
            <span>Settings</span>
          </div>

          {!isApiKeyConfigured && (
            <span
              className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
              title="Gemini API Key missing"
            >
              <AlertCircle className="w-3 h-3" />
              Set Key
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
