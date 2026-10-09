import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Send,
  FileText,
  Highlighter,
  MessageSquare,
} from 'lucide-react';

interface AiAssistantBarProps {
  selectedText: string;
  fullText: string;
  onGenerate: (params: {
    mode: 'custom';
    text: string;
    instruction: string;
  }) => void;
  onAskChat?: (prompt: string) => void;
  isLoading: boolean;
}

export const AiAssistantBar: React.FC<AiAssistantBarProps> = ({
  selectedText,
  fullText,
  onGenerate,
  onAskChat,
  isLoading,
}) => {
  const [instruction, setInstruction] = useState('');
  const [scope, setScope] = useState<'selection' | 'full'>('full');

  const targetText =
    scope === 'selection' && selectedText.trim() ? selectedText : fullText;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    if (!instruction.trim()) {
      alert('Please enter your prompt instructions first.');
      return;
    }

    if (!targetText.trim()) {
      alert('Document is empty. Please write some text first!');
      return;
    }

    onGenerate({
      mode: 'custom',
      text: targetText,
      instruction: instruction.trim(),
    });
  };

  const selectionWordCount = selectedText.trim()
    ? selectedText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5 shadow-md">
      {/* Header: Title & Target Scope Toggle */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-theme-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-theme-accent text-theme-accent-text shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-theme-primary">
              AI Custom Prompt
            </span>
            <p className="text-[11px] text-theme-muted">
              Instruct Gemini with specific edits, style rewrites, or feedback
            </p>
          </div>
        </div>

        {/* Target Scope Toggle */}
        <div className="flex items-center gap-1 bg-theme-input p-0.5 rounded-lg border border-theme-border text-xs">
          <button
            type="button"
            onClick={() => setScope('full')}
            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
              scope === 'full'
                ? 'bg-theme-surface text-theme-primary font-medium shadow-sm'
                : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-theme-muted" />
            <span>Entire Document</span>
          </button>
          <button
            type="button"
            onClick={() => setScope('selection')}
            disabled={!selectedText.trim()}
            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
              scope === 'selection'
                ? 'bg-theme-accent text-theme-accent-text font-medium shadow-sm'
                : 'text-theme-secondary hover:text-theme-primary disabled:opacity-40 disabled:hover:text-theme-secondary'
            }`}
            title={selectedText.trim() ? 'Apply only to highlighted text' : 'Highlight text in editor first'}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>
              Selection {selectionWordCount > 0 ? `(${selectionWordCount} words)` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Spacious Custom Prompt Textarea */}
      <div className="space-y-2.5">
        <div className="relative">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={4}
            placeholder="Type your custom prompt instructions here... (e.g. 'Rewrite this section to make the pacing faster, intensify the emotional atmosphere, and use more concrete sensory details. Keep dialogue authentic.')"
            className="w-full bg-theme-input border border-theme-border hover:border-theme-border focus:border-theme-accent rounded-xl p-3.5 text-xs text-theme-primary placeholder-theme-muted focus:outline-none custom-scrollbar resize-y min-h-[100px] leading-relaxed shadow-inner"
          />
        </div>

        {/* Action bar below textarea */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-theme-muted">
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-theme-elevated border border-theme-border text-theme-secondary font-mono text-[10px]">Ctrl + Enter</kbd> to run
            </span>
            {instruction.trim() && (
              <span className="text-theme-secondary">
                {instruction.length} characters
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onAskChat && (
              <button
                type="button"
                onClick={() => {
                  if (!instruction.trim()) {
                    alert('Introdu instrucțiunea sau întrebarea pentru chat mai întâi.');
                    return;
                  }
                  onAskChat(instruction.trim());
                  setInstruction('');
                }}
                disabled={isLoading || !instruction.trim()}
                className="px-4 py-2 bg-theme-surface hover:bg-theme-elevated text-theme-primary border border-theme-border rounded-xl text-xs font-medium transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
                title="Deschide chat-ul cu asistentul fără a modifica documentul și fără diff"
              >
                <MessageSquare className="w-3.5 h-3.5 text-theme-accent" />
                <span>Întreabă în Chat (fără diff)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isLoading || !instruction.trim()}
              className="px-5 py-2 bg-theme-accent hover:bg-theme-accent-hover text-theme-accent-text rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              title="Generează propunere de rescriere și compară cu diff"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Se generează...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Modifică Textul (Diff)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
