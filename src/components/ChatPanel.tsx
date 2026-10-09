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
  Plus,
  MessageSquare,
  ChevronLeft,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { marked } from 'marked';
import { ChatSession } from '../types';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  hasDocument: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
  onSendMessage: (sessionId: string | null, text: string, includeContext: boolean) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  isLoading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  documentTitle,
  hasDocument,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateNewSession,
  onSendMessage,
  onDeleteSession,
  onClearAllSessions,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'list'>('chat');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];

  // When opening or switching to chat view, auto-scroll to bottom
  useEffect(() => {
    if (isOpen && viewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, viewMode, activeSessionId]);

  // Focus textarea when in chat view
  useEffect(() => {
    if (isOpen && viewMode === 'chat') {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, viewMode, activeSessionId]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    onSendMessage(activeSessionId, text, includeContext);
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

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const suggestionPrompts = [
    'Dă-mi 3 idei captivante pentru a continua acest text',
    'Care sunt punctele forte și posibilele slăbiciuni ale acestei ciorne?',
    'Cum pot îmbunătăți ritmul, tonul și stilul frazelor?',
    'Propune 5 titluri alternative inspirate pentru această scriere',
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-[540px] max-w-full bg-theme-elevated border-l border-theme-border shadow-2xl z-40 flex flex-col animate-slideLeft">
      {/* Main Drawer Header */}
      <div className="px-5 py-3.5 bg-theme-surface border-b border-theme-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 truncate">
          <div className="p-2 bg-theme-accent-soft border border-theme-border rounded-lg text-theme-accent shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h2 className="text-sm font-semibold text-theme-primary flex items-center gap-2 truncate">
              <span>Chat AI · {documentTitle || 'Document'}</span>
            </h2>
            <p className="text-xs text-theme-secondary truncate">
              Discuții salvate per document · Fără modificări automate sau diff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Toggle between List and Active Chat */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'chat' ? 'list' : 'chat')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition flex items-center gap-1.5 border ${
              viewMode === 'list'
                ? 'bg-theme-accent text-white border-theme-accent shadow-sm'
                : 'text-theme-secondary hover:text-theme-primary bg-theme-elevated hover:bg-theme-surface border-theme-border'
            }`}
            title="Vezi toate discuțiile salvate pentru acest document"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Discuții ({sessions.length})</span>
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => {
              onCreateNewSession();
              setViewMode('chat');
            }}
            className="p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated rounded-lg transition border border-theme-border"
            title="Începe o discuție nouă pentru acest document"
          >
            <Plus className="w-4 h-4" />
          </button>

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

      {/* Subheader: Active Discussion context & controls */}
      <div className="px-5 py-2 bg-theme-elevated border-b border-theme-border text-xs flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2 text-theme-muted truncate max-w-[280px]">
          {viewMode === 'chat' && activeSession ? (
            <>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="text-theme-accent hover:underline flex items-center gap-1 font-medium shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Toate</span>
              </button>
              <span className="text-theme-border">|</span>
              <span className="truncate text-theme-primary font-medium">
                {activeSession.title}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-theme-secondary">
              <FileText className="w-3.5 h-3.5 text-theme-accent shrink-0" />
              <span className="truncate">
                {sessions.length} {sessions.length === 1 ? 'discuție salvată' : 'discuții salvate'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {viewMode === 'chat' && hasDocument && (
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-theme-secondary hover:text-theme-primary">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="rounded accent-theme-accent w-3.5 h-3.5"
              />
              <span>Context document</span>
            </label>
          )}

          {viewMode === 'chat' && activeSession && (
            <button
              type="button"
              onClick={() => setSessionToDelete(activeSession.id)}
              className="p-1 text-theme-muted hover:text-rose-500 rounded transition"
              title="Șterge această discuție"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* BODY: Sessions List View OR Active Chat View */}
      {viewMode === 'list' ? (
        /* LIST OF SAVED SESSIONS FOR THIS DOCUMENT */
        <div className="flex-1 flex flex-col overflow-hidden bg-theme-app">
          <div className="p-4 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-surface">
            <div>
              <h3 className="text-xs font-semibold text-theme-primary">
                Discuțiile salvate pentru acest document
              </h3>
              <p className="text-[11px] text-theme-muted">
                Fiecare discuție este păstrată pe disc și poate fi reluată oricând.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onCreateNewSession();
                setViewMode('chat');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-theme-accent-text bg-theme-accent hover:bg-theme-accent-hover rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Discuție nouă</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2.5">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 space-y-3">
                <div className="p-3 rounded-2xl bg-theme-surface border border-theme-border text-theme-muted">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs text-theme-secondary">
                  Nu există încă discuții salvate pentru acest document.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onCreateNewSession();
                    setViewMode('chat');
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-theme-accent-text bg-theme-accent hover:bg-theme-accent-hover rounded-lg transition"
                >
                  Începe prima discuție
                </button>
              </div>
            ) : (
              sessions.map((session) => {
                const isCurrent = session.id === activeSessionId;
                const lastMsg = session.messages[session.messages.length - 1];

                return (
                  <div
                    key={session.id}
                    className={`p-3.5 rounded-xl border transition flex flex-col gap-2 ${
                      isCurrent
                        ? 'border-theme-accent bg-theme-surface shadow-sm ring-1 ring-theme-accent/30'
                        : 'border-theme-border bg-theme-surface hover:bg-theme-elevated'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate flex-1">
                        <h4 className="text-xs font-semibold text-theme-primary truncate">
                          {session.title || 'Discuție fără titlu'}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-theme-muted mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(session.updatedAt || session.createdAt)}
                          </span>
                          <span>•</span>
                          <span>{session.messages.length} {session.messages.length === 1 ? 'mesaj' : 'mesaje'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSession(session.id);
                            setViewMode('chat');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-theme-accent-soft hover:bg-theme-accent text-theme-accent hover:text-white transition flex items-center gap-1"
                          title="Reia această discuție"
                        >
                          <span>Reia discuția</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSessionToDelete(session.id)}
                          className="p-1.5 text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                          title="Șterge această discuție"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {lastMsg && (
                      <div className="text-[11px] text-theme-secondary line-clamp-2 bg-theme-elevated/60 p-2 rounded-lg border border-theme-border/50 font-serif">
                        <span className="font-sans font-semibold text-theme-muted mr-1">
                          {lastMsg.role === 'user' ? 'Tu:' : 'AI:'}
                        </span>
                        {lastMsg.content.slice(0, 160)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {sessions.length > 0 && (
            <div className="p-3 border-t border-theme-border bg-theme-surface shrink-0 flex items-center justify-between">
              <span className="text-[11px] text-theme-muted">
                {sessions.length} discuții înregistrate pentru acest document
              </span>
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(true)}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3 h-3" />
                <span>Șterge toate discuțiile</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE CHAT VIEW */
        <div className="flex-1 flex flex-col overflow-hidden bg-theme-app">
          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 space-y-5">
                <div className="p-3.5 rounded-2xl bg-theme-accent-soft border border-theme-border text-theme-accent shadow-sm">
                  <Sparkles className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-theme-primary">
                    Discuție liberă pentru „{documentTitle || 'Document'}”
                  </h3>
                  <p className="text-xs text-theme-secondary max-w-sm leading-relaxed">
                    Întreabă orice despre idei, personaje, ton sau stil. Această discuție este salvată automat pentru acest document și o poți relua oricând.
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
                placeholder="Scrie o întrebare sau continuă discuția... (Enter pentru a trimite)"
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
      )}

      {/* Confirmation Dialog for Deleting One Session */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-theme-primary">
                Șterge această discuție
              </h3>
            </div>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Sigur dorești să ștergi această discuție salvată? Mesajele din ea vor fi eliminate definitiv.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition border border-theme-border"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = sessionToDelete;
                  setSessionToDelete(null);
                  onDeleteSession(id);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition"
              >
                Șterge Discuția
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Clearing All Sessions */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-theme-primary">
                Șterge toate discuțiile
              </h3>
            </div>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Sigur dorești să ștergi toate cele <strong>{sessions.length}</strong> discuții salvate pentru acest document?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition border border-theme-border"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearAllConfirm(false);
                  onClearAllSessions();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition"
              >
                Șterge Toate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
