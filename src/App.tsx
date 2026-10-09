import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  History,
  GitCompare,
  Check,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { ParallelDiffView } from './components/ParallelDiffView';
import { VersionHistory } from './components/VersionHistory';
import { ChatPanel } from './components/ChatPanel';
import { AiAssistantBar } from './components/AiAssistantBar';
import { SettingsModal } from './components/SettingsModal';
import { CreateDocModal } from './components/CreateDocModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ThemeSelector, AppTheme } from './components/ThemeSelector';
import { DocumentItem, VersionItem, AppSettings, ChatMessage } from './types';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('ai_writer_theme') as AppTheme) || 'parchment';
  });
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [selectedText, setSelectedText] = useState<string>('');

  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // In-app modals state
  const [isCreateDocOpen, setIsCreateDocOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<VersionItem | null>(null);

  // Parallel Diff state
  const [isParallelDiffOpen, setIsParallelDiffOpen] = useState(false);
  const [aiProposalText, setAiProposalText] = useState<string>('');
  const [aiTargetOriginal, setAiTargetOriginal] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Save state (manual save only - no auto save)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const latestContentRef = useRef<string>('');
  const activeDocRef = useRef<DocumentItem | null>(null);
  activeDocRef.current = activeDoc;

  // Initial load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    if (window.electronAPI) {
      // Load Settings
      window.electronAPI.getSettings().then((s) => setSettings(s));

      // Load Documents
      loadDocumentList();
    }
  }, []);

  // Keyboard shortcut: Ctrl+S to save manually
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentDocument('Manual Checkpoint');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem('ai_writer_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const loadDocumentList = async (preferredDocPath?: string) => {
    if (!window.electronAPI) return;
    const docs = await window.electronAPI.listDocuments();
    setDocuments(docs);

    if (docs.length > 0) {
      const target = preferredDocPath
        ? docs.find((d) => d.path === preferredDocPath) || docs[0]
        : docs[0];
      handleSelectDocument(target);
    }
  };

  const handleSelectDocument = async (doc: DocumentItem) => {
    if (!window.electronAPI) return;
    setActiveDoc(doc);
    setIsParallelDiffOpen(false);

    const res = await window.electronAPI.readDocument(doc.path);
    if (res.success && res.content !== undefined) {
      setDocContent(res.content);
      latestContentRef.current = res.content;
      setSaveStatus('saved');
      loadVersionsForDoc(doc.path);
    }
  };

  const loadVersionsForDoc = async (filePath: string) => {
    if (!window.electronAPI) return;
    const vers = await window.electronAPI.getVersions(filePath);
    setVersions(vers);
  };

  // Content change handler from Editor - NO auto-save!
  const handleContentChange = (newMarkdown: string) => {
    setDocContent(newMarkdown);
    latestContentRef.current = newMarkdown;
    setSaveStatus('unsaved');
  };

  const saveCurrentDocument = async (checkpointLabel?: string) => {
    const currentDoc = activeDocRef.current;
    if (!window.electronAPI || !currentDoc) return;
    setSaveStatus('saving');
    const contentToSave = latestContentRef.current;

    const res = await window.electronAPI.saveDocument(currentDoc.path, contentToSave);
    if (res.success) {
      setSaveStatus('saved');
      if (checkpointLabel) {
        await window.electronAPI.saveVersion(currentDoc.path, checkpointLabel, contentToSave);
        loadVersionsForDoc(currentDoc.path);
      }
    } else {
      setSaveStatus('unsaved');
      alert(`Error saving document: ${res.error || 'Failed to write file'}`);
    }
  };

  const handleManualSave = () => {
    saveCurrentDocument('Manual Checkpoint');
  };

  const handleCreateDocument = () => {
    setIsCreateDocOpen(true);
  };

  const handleConfirmCreateDocument = async (title: string) => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.createDocument(title);
    if (res.success && res.doc) {
      await loadDocumentList(res.doc.path);
    }
  };

  const handleDeleteDocument = (doc: DocumentItem) => {
    setDocToDelete(doc);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete || !window.electronAPI) return;
    await window.electronAPI.deleteDocument(docToDelete.path);
    setDocToDelete(null);
    await loadDocumentList();
  };

  // AI Generation trigger
  const handleGenerateAI = async (params: {
    mode: 'polish' | 'expand' | 'concise' | 'tone' | 'critique' | 'custom';
    text: string;
    tone?: string;
    instruction?: string;
  }) => {
    if (!settings?.geminiApiKey) {
      alert('Please configure your Gemini API Key in Settings first.');
      setIsSettingsOpen(true);
      return;
    }

    setIsGeneratingAI(true);
    setAiTargetOriginal(params.text);

    try {
      const activeModel =
        settings.geminiModel === 'gemini-2.5-flash' || !settings.geminiModel
          ? 'gemini-flash-latest'
          : settings.geminiModel;

      const res = await window.electronAPI!.generateAI({
        mode: params.mode,
        text: params.text,
        tone: params.tone,
        instruction: params.instruction,
        apiKey: settings.geminiApiKey,
        model: activeModel,
      });

      if (res.success && res.text) {
        setAiProposalText(res.text);
        setIsParallelDiffOpen(true);
      } else {
        alert(`Gemini Generation Error: ${res.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Error invoking AI: ${e.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Apply merged diff to active document
  const handleApplyMergedDiff = async (mergedText: string) => {
    // If the diff was applied to the entire document or a selection
    let fullUpdated = mergedText;
    if (aiTargetOriginal !== docContent && docContent.includes(aiTargetOriginal)) {
      fullUpdated = docContent.replace(aiTargetOriginal, mergedText);
    }

    setDocContent(fullUpdated);
    latestContentRef.current = fullUpdated;
    setIsParallelDiffOpen(false);

    if (window.electronAPI && activeDoc) {
      await window.electronAPI.saveDocument(activeDoc.path, fullUpdated);
      await window.electronAPI.saveVersion(activeDoc.path, 'Accepted AI Merged Changes', fullUpdated);
      loadVersionsForDoc(activeDoc.path);
      setSaveStatus('saved');
    }
  };

  // Restore a previous version
  const handleRestoreVersion = (version: VersionItem) => {
    setVersionToRestore(version);
  };

  const handleConfirmRestore = async () => {
    if (!versionToRestore || !activeDoc || !window.electronAPI) return;
    const version = versionToRestore;
    setDocContent(version.content);
    latestContentRef.current = version.content;

    await window.electronAPI.saveDocument(activeDoc.path, version.content);
    await window.electronAPI.saveVersion(
      activeDoc.path,
      `Restored from ${new Date(version.timestamp).toLocaleTimeString()}`,
      version.content
    );
    loadVersionsForDoc(activeDoc.path);
    setSaveStatus('saved');
    setIsHistoryOpen(false);
    setVersionToRestore(null);
  };

  const handleResetHistory = async () => {
    if (!activeDoc || !window.electronAPI) return;
    try {
      const res = await window.electronAPI.resetVersions(activeDoc.path);
      if (res.success) {
        await window.electronAPI.saveVersion(activeDoc.path, 'Baseline resetare', docContent);
        await loadVersionsForDoc(activeDoc.path);
      } else {
        alert(`Eroare la resetarea istoricului: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Eroare la resetarea istoricului: ${e.message}`);
    }
  };

  // Chat AI handlers
  const handleSendChatMessage = async (text: string, includeDocContext: boolean) => {
    if (!settings?.geminiApiKey && !window.electronAPI) {
      alert('Te rugăm să configurezi cheia Gemini API din setări.');
      setIsSettingsOpen(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const activeModel =
        settings?.geminiModel === 'gemini-2.5-flash' || !settings?.geminiModel
          ? 'gemini-flash-latest'
          : settings.geminiModel;

      const res = await window.electronAPI!.chatAI({
        messages: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        documentContext: includeDocContext && activeDoc ? docContent : undefined,
        apiKey: settings?.geminiApiKey,
        model: activeModel,
      });

      if (res.success && res.text) {
        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: res.text,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `msg_${Date.now()}_err`,
          role: 'assistant',
          content: `⚠️ **Eroare:** ${res.error || 'Nu s-a putut obține răspunsul de la Gemini.'}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errorMsg]);
      }
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `⚠️ **Eroare la apelarea asistentului:** ${e.message}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
  };

  const handleAskChatFromBar = (prompt: string) => {
    setIsChatOpen(true);
    handleSendChatMessage(prompt, true);
  };

  const wordCount = docContent.trim() ? docContent.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="flex h-screen bg-theme-app text-theme-primary font-sans overflow-hidden select-none">
      {/* Left Sidebar */}
      <Sidebar
        documents={documents}
        activeDoc={activeDoc}
        onSelectDoc={handleSelectDocument}
        onCreateDoc={handleCreateDocument}
        onDeleteDoc={handleDeleteDocument}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isApiKeyConfigured={!!settings?.geminiApiKey}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-theme-app/60">
        {/* Top Navigation & Status Bar */}
        <header className="relative z-30 h-14 border-b border-theme-border bg-theme-surface/90 px-6 flex items-center justify-between gap-4 backdrop-blur-md">
          {/* Document Title & Status */}
          <div className="flex items-center gap-3 truncate">
            <FileText className="w-4 h-4 text-theme-accent shrink-0" />
            <span className="text-sm font-semibold text-theme-primary truncate">
              {activeDoc ? activeDoc.name : 'No Document Selected'}
            </span>
            <span className="text-xs text-theme-muted font-mono">.md</span>

            <div className="w-[1px] h-4 bg-theme-border mx-1" />

            {/* Save indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === 'saved' ? (
                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </span>
              ) : saveStatus === 'saving' ? (
                <span className="text-theme-accent animate-pulse font-medium">Saving...</span>
              ) : (
                <span className="text-amber-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons & Theme Switcher */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-theme-muted mr-1">
              <strong className="text-theme-secondary">{wordCount}</strong> words
            </span>

            {/* Checkpoint / Manual Save */}
            <button
              onClick={handleManualSave}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                saveStatus === 'unsaved'
                  ? 'bg-theme-accent text-theme-accent-text hover:bg-theme-accent-hover font-semibold ring-2 ring-theme-accent/25'
                  : 'text-theme-secondary hover:text-theme-primary bg-theme-surface hover:bg-theme-elevated border border-theme-border'
              }`}
              title="Save document and create checkpoint (Ctrl+S)"
            >
              <Save className={`w-3.5 h-3.5 ${saveStatus === 'unsaved' ? 'text-theme-accent-text' : 'text-theme-muted'}`} />
              Save (Ctrl+S)
            </button>

            {/* Version History Toggle */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                isHistoryOpen
                  ? 'bg-theme-accent text-white shadow-md'
                  : 'text-theme-secondary hover:text-theme-primary bg-theme-surface hover:bg-theme-elevated border border-theme-border'
              }`}
              title="View version snapshots & restore"
            >
              <History className={`w-3.5 h-3.5 ${isHistoryOpen ? 'text-white' : 'text-theme-accent'}`} />
              History ({versions.length})
            </button>

            {/* AI Chat Drawer Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                isChatOpen
                  ? 'bg-theme-accent text-white shadow-md'
                  : 'text-theme-secondary hover:text-theme-primary bg-theme-surface hover:bg-theme-elevated border border-theme-border'
              }`}
              title="Discută liber cu asistentul AI (fără modificări de text sau diff)"
            >
              <MessageSquare className={`w-3.5 h-3.5 ${isChatOpen ? 'text-white' : 'text-theme-accent'}`} />
              <span>Chat AI</span>
              {chatMessages.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-accent-soft text-theme-accent font-semibold ml-0.5">
                  {chatMessages.length}
                </span>
              )}
            </button>

            {/* Parallel Diff Toggle (if proposal exists) */}
            {aiProposalText && (
              <button
                onClick={() => setIsParallelDiffOpen(!isParallelDiffOpen)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                  isParallelDiffOpen
                    ? 'bg-theme-accent text-white shadow-md'
                    : 'text-theme-accent hover:text-white bg-theme-elevated hover:bg-theme-accent border border-theme-border'
                }`}
                title="Toggle parallel diff view"
              >
                <GitCompare className="w-3.5 h-3.5" />
                Diff View
              </button>
            )}

            <div className="w-[1px] h-4 bg-theme-border mx-1" />

            {/* Theme Selector Dropdown */}
            <ThemeSelector currentTheme={theme} onThemeChange={handleThemeChange} />
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">
          {activeDoc ? (
            <>
              {/* If parallel diff is open, show split parallel comparison; otherwise show TipTap editor */}
              <div className="flex-1 overflow-hidden">
                {isParallelDiffOpen ? (
                  <ParallelDiffView
                    originalText={aiTargetOriginal || docContent}
                    suggestedText={aiProposalText}
                    onApplyMerged={handleApplyMergedDiff}
                    onCancel={() => setIsParallelDiffOpen(false)}
                  />
                ) : (
                  <Editor
                    initialMarkdown={docContent}
                    onChange={handleContentChange}
                    onSelectText={setSelectedText}
                  />
                )}
              </div>

              {/* Bottom AI Writing Companion Command Bar */}
              <div className="shrink-0">
                <AiAssistantBar
                  selectedText={selectedText}
                  fullText={docContent}
                  onGenerate={handleGenerateAI}
                  onAskChat={handleAskChatFromBar}
                  isLoading={isGeneratingAI || isChatLoading}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-theme-muted text-sm">
              Select or create a document to start writing.
            </div>
          )}
        </div>
      </main>

      {/* Version History Drawer */}
      {isHistoryOpen && (
        <VersionHistory
          versions={versions}
          currentContent={docContent}
          onRestore={handleRestoreVersion}
          onResetHistory={handleResetHistory}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}

      {/* AI Chat Drawer (conversational dialogue without document edit or diff) */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        onClearChat={handleClearChat}
        isLoading={isChatLoading}
        documentTitle={activeDoc?.name}
        hasDocument={!!activeDoc}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={(newSettings) => setSettings(newSettings)}
      />

      {/* Create Document Modal */}
      <CreateDocModal
        isOpen={isCreateDocOpen}
        onClose={() => setIsCreateDocOpen(false)}
        onCreate={handleConfirmCreateDocument}
      />

      {/* Delete Document Confirmation Modal */}
      <ConfirmModal
        isOpen={!!docToDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${docToDelete?.name}"? This will permanently remove the file from your local storage.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDocToDelete(null)}
      />

      {/* Restore Version Confirmation Modal */}
      <ConfirmModal
        isOpen={!!versionToRestore}
        title="Restore Document Version"
        message={
          versionToRestore
            ? `Restore version from ${new Date(versionToRestore.timestamp).toLocaleString()} ("${versionToRestore.label}")? Your current text will be archived in history.`
            : ''
        }
        confirmLabel="Restore Version"
        confirmVariant="primary"
        onConfirm={handleConfirmRestore}
        onCancel={() => setVersionToRestore(null)}
      />
    </div>
  );
};
