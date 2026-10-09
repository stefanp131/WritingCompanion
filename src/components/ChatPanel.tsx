import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Sparkles,
  FileText,
  Loader2,
} from 'lucide-react';
import { marked } from 'marked';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, includeDocContext: boolean) => void;
  onClearChat: () => void;
  isLoading: boolean;
  documentTitle?: string;
  hasDocument: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onClearChat,
  isLoading,
  documentTitle,
  hasDocument,
}) => {
  const [inputText, setInputText] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    onSendMessage(text, includeContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestionPrompts = [
    'Dă-mi 3 idei captivante pentru a continua acest text',
    'Care sunt punctele forte și posibilele slăbiciuni ale acestei ciorne?',
    'Cum pot îmbunătăți ritmul, tonul și stilul frazelor?',
    'Propune 5 titluri alternative inspirate pentru această scriere',
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] max-w-full bg-theme-elevated border-l border-theme-border shadow-2xl z-40 flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="px-5 py-3.5 bg-theme-surface border-b border-theme-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-theme-accent-soft border border-theme-border rounded-lg text-theme-accent">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-theme-primary flex items-center gap-1.5">
              <span>Chat cu Asistentul AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-theme-accent-soft text-theme-accent font-medium">
                Liber
              </span>
            </h2>
            <p className="text-xs text-theme-secondary">
              Discuție creativă · Fără modificarea textului sau diff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              className="p-1.5 text-theme-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
              title="Șterge istoricul conversației din această sesiune"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated rounded-lg transition"
            title="Închide panoul de chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Document Context Strip */}
      <div className="px-5 py-2 bg-theme-elevated border-b border-theme-border text-xs flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2 text-theme-muted">
          <FileText className="w-3.5 h-3.5 text-theme-accent" />
          <span className="truncate max-w-[240px]">
            {documentTitle ? `Doc: ${documentTitle}` : 'Niciun document selectat'}
          </span>
        </div>

        {hasDocument && (
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-theme-secondary hover:text-theme-primary">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="rounded accent-theme-accent w-3.5 h-3.5"
            />
            <span>Include context document</span>
          </label>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 bg-theme-app">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 space-y-5">
            <div className="p-3.5 rounded-2xl bg-theme-accent-soft border border-theme-border text-theme-accent shadow-sm">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-theme-primary">
                Consultă-te liber cu asistentul tău de scriere
              </h3>
              <p className="text-xs text-theme-secondary max-w-sm leading-relaxed">
                Poți adresa întrebări, cere feedback, dezvolta idei de intrigă sau analiza structura. Răspunsurile sunt pur consultative și nu modifică textul documentului.
              </p>
            </div>

            <div className="w-full space-y-2 pt-2">
              <p className="text-[11px] font-mono text-theme-muted uppercase tracking-wider text-left">
                Sugestii de pornire:
              </p>
              <div className="grid grid-cols-1 gap-2 text-left">
                {suggestionPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-2.5 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-elevated hover:border-theme-accent/50 text-xs text-theme-primary transition flex items-center justify-between group shadow-xs"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <Send className="w-3 h-3 text-theme-muted group-hover:text-theme-accent transition shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                    isUser
                      ? 'bg-theme-accent text-theme-accent-text'
                      : 'bg-theme-surface border border-theme-border text-theme-accent'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm relative group text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-theme-accent text-theme-accent-text rounded-tr-none'
                      : 'bg-theme-surface border border-theme-border text-theme-primary rounded-tl-none font-serif'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans text-xs">{msg.content}</div>
                  ) : (
                    <>
                      <div
                        className="prose prose-sm max-w-none text-theme-primary leading-relaxed break-words"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(msg.content, { async: false }) as string,
                        }}
                      />

                      {/* Copy response button */}
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="absolute bottom-2 right-2 p-1 rounded bg-theme-elevated/80 border border-theme-border text-theme-muted hover:text-theme-primary opacity-0 group-hover:opacity-100 transition shadow-xs"
                        title="Copiază răspunsul în clipboard"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </>
                  )}

                  <div
                    className={`text-[9px] font-mono mt-1.5 opacity-60 text-right select-none ${
                      isUser ? 'text-theme-accent-text' : 'text-theme-muted'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-theme-surface border border-theme-border text-theme-accent shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-theme-surface border border-theme-border rounded-2xl rounded-tl-none p-3.5 shadow-sm flex items-center gap-2 text-xs text-theme-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />
              <span>Asistentul reflectează și scrie...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3.5 bg-theme-surface border-t border-theme-border shrink-0">
        <div className="relative rounded-xl border border-theme-border bg-theme-app focus-within:border-theme-accent transition shadow-inner">
          <textarea
            ref={textareaRef}
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrie o întrebare, cere o idee sau o opinie despre text... (Enter pentru a trimite)"
            className="w-full bg-transparent px-3.5 pt-2.5 pb-9 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:outline-none resize-none font-sans"
            disabled={isLoading}
          />

          <div className="absolute bottom-2 left-3 right-2 flex items-center justify-between select-none">
            <span className="text-[10px] text-theme-muted">
              Shift+Enter pentru rând nou
            </span>

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="p-1.5 rounded-lg bg-theme-accent text-theme-accent-text hover:bg-theme-accent-hover transition disabled:opacity-30 disabled:hover:bg-theme-accent shadow-sm flex items-center gap-1 text-xs font-medium"
              title="Trimite mesajul (Enter)"
            >
              <span>Trimite</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
