import React, { useState, useMemo } from 'react';
import {
  History,
  RotateCcw,
  Clock,
  X,
  ChevronRight,
  GitCompare,
  FileText,
  Columns,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { diffLines, Change } from 'diff';
import { VersionItem } from '../types';
import { computeSmartWordDiff } from '../utils/diffHelper';

interface VersionHistoryProps {
  versions: VersionItem[];
  currentContent?: string;
  onRestore: (version: VersionItem) => void;
  onResetHistory?: () => void;
  onClose: () => void;
}

type DiffDisplayMode = 'inline' | 'split' | 'raw';

function renderDiffChunk(
  value: string,
  type: 'added' | 'removed' | 'equal'
) {
  if (type === 'equal') {
    return value;
  }

  const isAdded = type === 'added';

  // Do not transform spaces into dots or mark pure whitespace
  if (/^[ \t]+$/.test(value)) {
    return value;
  }

  // Tokenize by newlines vs text
  const tokens = value.split(/(\r?\n+)/);

  return tokens.map((token, i) => {
    if (!token) return null;

    if (token.startsWith('\n') || token.startsWith('\r')) {
      return <React.Fragment key={i}>{token}</React.Fragment>;
    }

    if (isAdded) {
      return (
        <mark
          key={i}
          className="bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-500/50 rounded-xs px-0.5 not-italic font-medium"
        >
          {token}
        </mark>
      );
    }

    return (
      <del
        key={i}
        className="bg-rose-500/20 text-rose-800 dark:text-rose-300 line-through rounded-xs px-0.5 opacity-80 font-medium"
      >
        {token}
      </del>
    );
  });
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  currentContent = '',
  onRestore,
  onResetHistory,
  onClose,
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    versions[0]?.id || ''
  );
  const [displayMode, setDisplayMode] = useState<DiffDisplayMode>('inline');
  const [granularity, setGranularity] = useState<'words' | 'lines'>('words');
  const [compareTo, setCompareTo] = useState<'current' | 'previous'>('current');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // If selectedVersionId is no longer in versions (e.g. after reset or delete)
  const selectedIndex = versions.findIndex((v) => v.id === selectedVersionId);
  const selectedVersion =
    selectedIndex >= 0 ? versions[selectedIndex] : versions[0] || null;

  const hasPreviousVersion = selectedIndex >= 0 && selectedIndex < versions.length - 1;
  const prevVersion = hasPreviousVersion ? versions[selectedIndex + 1] : null;

  // Compute what we are comparing
  const comparison = useMemo(() => {
    if (!selectedVersion) {
      return { baseText: '', targetText: '', oldLabel: '', newLabel: '' };
    }

    if (compareTo === 'previous' && prevVersion) {
      return {
        baseText: prevVersion.content,
        targetText: selectedVersion.content,
        oldLabel: `Versiunea precedentă (${prevVersion.label || 'Checkpoint'})`,
        newLabel: `Această versiune (${selectedVersion.label || 'Checkpoint'})`,
      };
    }

    // Default: compare this snapshot with current editor draft
    return {
      baseText: selectedVersion.content,
      targetText: currentContent,
      oldLabel: `Snapshot (${selectedVersion.label || 'Checkpoint'})`,
      newLabel: 'Textul actual din editor',
    };
  }, [selectedVersion, compareTo, prevVersion, currentContent]);

  // Compute word/line diff
  const diffChanges = useMemo<Change[]>(() => {
    if (!comparison.baseText && !comparison.targetText) return [];

    if (granularity === 'lines') {
      const normBase = comparison.baseText.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
      const normTarget = comparison.targetText.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
      return diffLines(normBase, normTarget, { ignoreWhitespace: false });
    }
    return computeSmartWordDiff(comparison.baseText, comparison.targetText);
  }, [comparison, granularity]);

  // Summary statistics
  const stats = useMemo(() => {
    let addedCount = 0;
    let removedCount = 0;
    let equalCount = 0;

    for (const c of diffChanges) {
      const words =
        c.value.trim().split(/\s+/).filter(Boolean).length ||
        (c.value.length > 0 ? 1 : 0);
      if (c.added) addedCount += words;
      else if (c.removed) removedCount += words;
      else equalCount += words;
    }

    const hasDifferences = addedCount > 0 || removedCount > 0;
    return { addedCount, removedCount, equalCount, hasDifferences };
  }, [diffChanges]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[720px] bg-theme-elevated border-l border-theme-border shadow-2xl z-40 flex flex-col animate-slideLeft">
      {/* Drawer Header */}
      <div className="px-6 py-4 bg-theme-surface border-b border-theme-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-theme-accent-soft border border-theme-border rounded-lg text-theme-accent">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-theme-primary">
              Istoric Versiuni Document
            </h2>
            <p className="text-xs text-theme-secondary">
              {versions.length} {versions.length === 1 ? 'checkpoint înregistrat' : 'checkpoint-uri înregistrate'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated rounded-lg transition"
          title="Închide panoul de istoric (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main split: Version list on left, Preview on right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Version List + Reset Option */}
        <div className="w-64 border-r border-theme-border flex flex-col bg-theme-surface shrink-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {versions.length === 0 ? (
              <div className="text-xs text-theme-muted text-center py-8">
                Nu există versiuni salvate încă.
              </div>
            ) : (
              versions.map((ver, idx) => {
                const isSelected = selectedVersion?.id === ver.id;
                const isLatest = idx === 0;

                return (
                  <button
                    key={ver.id}
                    onClick={() => setSelectedVersionId(ver.id)}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-theme-accent bg-theme-accent-soft shadow-sm ring-1 ring-theme-accent/40'
                        : 'border-theme-border bg-theme-elevated hover:bg-theme-surface text-theme-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-theme-primary truncate">
                        {ver.label || 'Checkpoint'}
                      </span>
                      {isLatest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium">
                          Latest
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-[11px] text-theme-secondary gap-1.5">
                      <Clock className="w-3 h-3 text-theme-muted" />
                      <span>{formatDate(ver.timestamp)}</span>
                    </div>

                    <div className="text-[10px] text-theme-muted flex items-center justify-between mt-0.5">
                      <span>{ver.wordCount} cuvinte</span>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-theme-accent' : 'text-theme-muted'}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Reset History Action at bottom of list */}
          {onResetHistory && (
            <div className="p-3 border-t border-theme-border bg-theme-surface shrink-0">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                disabled={versions.length === 0}
                className="w-full py-2 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-500/30 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed shadow-xs"
                title="Șterge toate versiunile salvate din istoricul acestui document"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Resetează istoricul</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Version Preview with Comparison */}
        <div className="flex-1 flex flex-col bg-theme-app overflow-hidden">
          {selectedVersion ? (
            <>
              {/* Checkpoint Details & Restore action */}
              <div className="px-5 py-3 border-b border-theme-border bg-theme-surface flex items-center justify-between gap-2 shrink-0">
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-theme-primary truncate">
                      {selectedVersion.label}
                    </h3>
                  </div>
                  <span className="text-[11px] text-theme-muted">
                    {formatDate(selectedVersion.timestamp)} • {selectedVersion.wordCount} cuvinte
                  </span>
                </div>

                <button
                  onClick={() => onRestore(selectedVersion)}
                  className="px-3.5 py-1.5 text-xs font-medium text-theme-accent-text bg-theme-accent hover:bg-theme-accent-hover rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0"
                  title="Restaurează documentul la această versiune exactă"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurează versiunea</span>
                </button>
              </div>

              {/* Diff Controls & Compare Target Selector */}
              <div className="px-5 py-2.5 bg-theme-elevated border-b border-theme-border flex flex-wrap items-center justify-between gap-2 shrink-0">
                {/* View Mode Toggle: Inline vs Side-by-Side vs Plain Text */}
                <div className="flex items-center gap-1 bg-theme-input p-0.5 rounded-lg border border-theme-border text-xs">
                  <button
                    type="button"
                    onClick={() => setDisplayMode('inline')}
                    className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                      displayMode === 'inline'
                        ? 'bg-theme-surface text-theme-primary font-medium shadow-sm'
                        : 'text-theme-secondary hover:text-theme-primary'
                    }`}
                    title="Diferențe evidențiate în text"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-theme-accent" />
                    <span>Inline Diff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayMode('split')}
                    className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                      displayMode === 'split'
                        ? 'bg-theme-surface text-theme-primary font-medium shadow-sm'
                        : 'text-theme-secondary hover:text-theme-primary'
                    }`}
                    title="Comparație paralelă pe două coloane"
                  >
                    <Columns className="w-3.5 h-3.5 text-theme-accent" />
                    <span>Side-by-Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayMode('raw')}
                    className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                      displayMode === 'raw'
                        ? 'bg-theme-surface text-theme-primary font-medium shadow-sm'
                        : 'text-theme-secondary hover:text-theme-primary'
                    }`}
                    title="Afișează textul simplu al acestei versiuni"
                  >
                    <FileText className="w-3.5 h-3.5 text-theme-muted" />
                    <span>Text Simplu</span>
                  </button>
                </div>

                {/* Compare Target Selector: vs Textul actual vs Versiunea precedenta */}
                {displayMode !== 'raw' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-theme-muted text-[11px] mr-1">Compară:</span>
                    <div className="flex items-center gap-1 bg-theme-input p-0.5 rounded-lg border border-theme-border">
                      <button
                        type="button"
                        onClick={() => setCompareTo('current')}
                        className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                          compareTo === 'current'
                            ? 'bg-theme-surface text-theme-primary shadow-sm font-semibold'
                            : 'text-theme-secondary hover:text-theme-primary'
                        }`}
                        title="Compară această versiune cu textul actual din editor"
                      >
                        vs. Textul actual
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompareTo('previous')}
                        disabled={!hasPreviousVersion}
                        className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                          compareTo === 'previous'
                            ? 'bg-theme-surface text-theme-primary shadow-sm font-semibold'
                            : hasPreviousVersion
                            ? 'text-theme-secondary hover:text-theme-primary'
                            : 'opacity-40 cursor-not-allowed text-theme-muted'
                        }`}
                        title={
                          hasPreviousVersion
                            ? 'Compară această versiune cu cea imediat anterioară din istoric'
                            : 'Aceasta este cea mai veche versiune înregistrată'
                        }
                      >
                        vs. Versiunea precedentă
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGranularity(granularity === 'words' ? 'lines' : 'words')}
                      className="px-2 py-1 text-[11px] rounded bg-theme-input hover:bg-theme-surface border border-theme-border text-theme-secondary hover:text-theme-primary transition ml-1"
                      title="Comută nivelul de granularitate (cuvinte sau rânduri)"
                    >
                      {granularity === 'words' ? 'Cuvinte' : 'Linii'}
                    </button>
                  </div>
                )}
              </div>

              {/* Diff Statistics & Target Description Strip */}
              {displayMode !== 'raw' && (
                <div className="px-5 py-2 bg-theme-surface/70 border-b border-theme-border flex items-center justify-between text-[11px] text-theme-secondary shrink-0">
                  <div className="flex items-center gap-3">
                    {stats.hasDifferences ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          +{stats.addedCount} {compareTo === 'current' ? 'în textul actual' : 'adăugate în această versiune'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          -{stats.removedCount} {compareTo === 'current' ? 'din snapshot' : 'față de precedenta'}
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Identic cu {compareTo === 'current' ? 'textul actual din editor' : 'versiunea precedentă'} (0 diferențe)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-theme-muted font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" />
                      Verde = Adăugat
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/40" />
                      Roșu = Șters
                    </span>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-theme-app">
                {displayMode === 'inline' ? (
                  /* Highlighted Inline Diff */
                  <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap select-text text-theme-primary">
                    {diffChanges.map((part, index) => {
                      if (part.added) {
                        return (
                          <React.Fragment key={index}>
                            {renderDiffChunk(part.value, 'added')}
                          </React.Fragment>
                        );
                      }
                      if (part.removed) {
                        return (
                          <React.Fragment key={index}>
                            {renderDiffChunk(part.value, 'removed')}
                          </React.Fragment>
                        );
                      }
                      return (
                        <span key={index}>
                          {renderDiffChunk(part.value, 'equal')}
                        </span>
                      );
                    })}
                  </div>
                ) : displayMode === 'split' ? (
                  /* Side-by-Side Split Diff */
                  <div className="grid grid-cols-2 gap-4 h-full">
                    {/* Left Column: Old / Base Text */}
                    <div className="flex flex-col border border-theme-border rounded-xl bg-theme-surface overflow-hidden">
                      <div className="px-3 py-2 bg-theme-elevated border-b border-theme-border text-xs font-semibold text-theme-primary flex items-center justify-between">
                        <span className="truncate">{comparison.oldLabel}</span>
                        <span className="text-[10px] text-theme-muted font-normal shrink-0 ml-2">
                          {comparison.baseText.trim().split(/\s+/).filter(Boolean).length} cuvinte
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-serif text-xs leading-relaxed whitespace-pre-wrap select-text text-theme-primary">
                        {diffChanges.map((part, index) => {
                          if (part.removed) {
                            return (
                              <React.Fragment key={index}>
                                {renderDiffChunk(part.value, 'removed')}
                              </React.Fragment>
                            );
                          }
                          if (part.added) {
                            return null;
                          }
                          return (
                            <span key={index}>
                              {renderDiffChunk(part.value, 'equal')}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: New / Target Text */}
                    <div className="flex flex-col border border-theme-border rounded-xl bg-theme-surface overflow-hidden">
                      <div className="px-3 py-2 bg-theme-elevated border-b border-theme-border text-xs font-semibold text-theme-primary flex items-center justify-between">
                        <span className="truncate">{comparison.newLabel}</span>
                        <span className="text-[10px] text-theme-muted font-normal shrink-0 ml-2">
                          {comparison.targetText.trim().split(/\s+/).filter(Boolean).length} cuvinte
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-serif text-xs leading-relaxed whitespace-pre-wrap select-text text-theme-primary">
                        {diffChanges.map((part, index) => {
                          if (part.added) {
                            return (
                              <React.Fragment key={index}>
                                {renderDiffChunk(part.value, 'added')}
                              </React.Fragment>
                            );
                          }
                          if (part.removed) {
                            return null;
                          }
                          return (
                            <span key={index}>
                              {renderDiffChunk(part.value, 'equal')}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Plain Text Mode */
                  <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap select-text text-theme-primary">
                    {selectedVersion.content}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-theme-muted">
              Selectează o versiune din stânga pentru previzualizare.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Resetting History */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-theme-primary">
                Resetare Istoric Versiuni
              </h3>
            </div>
            <p className="text-xs text-theme-secondary leading-relaxed">
              Sigur dorești să resetezi istoricul pentru acest document? Toate cele{' '}
              <strong>{versions.length}</strong> versiuni salvate vor fi șterse definitiv.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition border border-theme-border"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  if (onResetHistory) onResetHistory();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition"
              >
                Resetează Istoricul
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
