import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  CheckCheck,
  RotateCcw,
  GitCompare,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ParagraphDiffItem } from '../types';
import {
  computeParagraphDiff,
  assembleParagraphMergedDocument,
  computeSmartWordDiff,
} from '../utils/diffHelper';

interface ParallelDiffViewProps {
  originalText: string;
  suggestedText: string;
  onApplyMerged: (mergedText: string) => void;
  onCancel: () => void;
}

function renderOriginalWordDiff(original: string, suggested: string) {
  const parts = computeSmartWordDiff(original, suggested);
  return parts.map((part, idx) => {
    if (part.added) return null;
    if (part.removed) {
      return (
        <del
          key={idx}
          className="bg-rose-500/20 text-rose-800 dark:text-rose-200 line-through decoration-rose-500/60 rounded px-1 py-0.5 not-italic font-medium [box-decoration-break:clone]"
        >
          {part.value}
        </del>
      );
    }
    return <span key={idx}>{part.value}</span>;
  });
}

function renderSuggestedWordDiff(original: string, suggested: string) {
  const parts = computeSmartWordDiff(original, suggested);
  return parts.map((part, idx) => {
    if (part.removed) return null;
    if (part.added) {
      return (
        <ins
          key={idx}
          className="bg-emerald-500/25 text-emerald-900 dark:text-emerald-100 no-underline rounded px-1 py-0.5 font-medium not-italic [box-decoration-break:clone]"
        >
          {part.value}
        </ins>
      );
    }
    return <span key={idx}>{part.value}</span>;
  });
}

export const ParallelDiffView: React.FC<ParallelDiffViewProps> = ({
  originalText,
  suggestedText,
  onApplyMerged,
  onCancel,
}) => {
  const [paragraphs, setParagraphs] = useState<ParagraphDiffItem[]>([]);
  const [filterChangedOnly, setFilterChangedOnly] = useState(false);

  useEffect(() => {
    const computed = computeParagraphDiff(originalText, suggestedText);
    setParagraphs(computed);
  }, [originalText, suggestedText]);

  const updateParagraphStatus = (
    id: string,
    status: 'pending' | 'accepted' | 'rejected'
  ) => {
    setParagraphs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const acceptAll = () => {
    setParagraphs((prev) =>
      prev.map((p) => (p.type !== 'equal' ? { ...p, status: 'accepted' } : p))
    );
  };

  const rejectAll = () => {
    setParagraphs((prev) =>
      prev.map((p) => (p.type !== 'equal' ? { ...p, status: 'rejected' } : p))
    );
  };

  const resetAll = () => {
    setParagraphs((prev) =>
      prev.map((p) => (p.type !== 'equal' ? { ...p, status: 'pending' } : p))
    );
  };

  const handleApply = () => {
    const merged = assembleParagraphMergedDocument(paragraphs);
    onApplyMerged(merged);
  };

  const changedParagraphs = paragraphs.filter((p) => p.type !== 'equal');
  const addedParagraphs = paragraphs.filter((p) => p.type === 'added');
  const removedParagraphs = paragraphs.filter((p) => p.type === 'removed');
  const modifiedParagraphs = paragraphs.filter((p) => p.type === 'modified');
  const acceptedCount = changedParagraphs.filter((p) => p.status === 'accepted').length;
  const rejectedCount = changedParagraphs.filter((p) => p.status === 'rejected').length;
  const pendingCount = changedParagraphs.filter((p) => p.status === 'pending').length;

  const displayParagraphs = filterChangedOnly
    ? paragraphs.filter((p) => p.type !== 'equal')
    : paragraphs;

  return (
    <div className="flex flex-col h-full bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-2xl animate-fadeIn">
      {/* Diff Header */}
      <div className="px-6 py-3.5 bg-theme-surface border-b border-theme-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-theme-accent-soft border border-theme-border rounded-lg text-theme-accent">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-theme-primary flex items-center gap-2">
              Paragraph-by-Paragraph Comparison
              <span className="text-xs px-2 py-0.5 rounded-full bg-theme-accent-soft text-theme-accent border border-theme-border font-medium">
                {changedParagraphs.length} {changedParagraphs.length === 1 ? 'paragraph changed' : 'paragraphs changed'}
              </span>
            </h2>
            <p className="text-xs text-theme-secondary">
              Review and accept or reject AI modifications paragraph by paragraph.
            </p>
          </div>
        </div>

        {/* Global Diff Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Counters */}
          <div className="flex items-center text-xs text-theme-secondary mr-2 gap-2 font-mono">
            {addedParagraphs.length > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                +{addedParagraphs.length} added
              </span>
            )}
            {removedParagraphs.length > 0 && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                -{removedParagraphs.length} removed
              </span>
            )}
            {modifiedParagraphs.length > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                ~{modifiedParagraphs.length} modified
              </span>
            )}
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                {pendingCount} pending
              </span>
            )}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFilterChangedOnly(!filterChangedOnly)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 border ${
              filterChangedOnly
                ? 'bg-theme-accent text-theme-accent-text border-theme-accent'
                : 'text-theme-secondary hover:text-theme-primary bg-theme-surface hover:bg-theme-elevated border-theme-border'
            }`}
            title="Filter to show only modified paragraphs"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterChangedOnly ? 'Show All Paragraphs' : 'Only Changes'}</span>
          </button>

          <button
            type="button"
            onClick={acceptAll}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/30 rounded-lg transition flex items-center gap-1.5 shadow-sm"
            title="Accept all paragraph suggestions"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Accept All
          </button>

          <button
            type="button"
            onClick={rejectAll}
            className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 rounded-lg transition flex items-center gap-1.5 shadow-sm"
            title="Reject all paragraph suggestions"
          >
            <X className="w-3.5 h-3.5" />
            Reject All
          </button>

          <button
            type="button"
            onClick={resetAll}
            className="p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated border border-theme-border rounded-lg transition"
            title="Reset all paragraphs to pending"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-6 bg-theme-border mx-1" />

          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated rounded-lg transition border border-theme-border"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 text-xs font-semibold text-theme-accent-text bg-theme-accent hover:bg-theme-accent-hover rounded-lg shadow-md transition flex items-center gap-1.5"
            title="Apply decisions to document"
          >
            <span>Apply to Document</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subheader info strip */}
      <div className="px-6 py-2 bg-theme-elevated border-b border-theme-border text-xs font-mono text-theme-muted flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-4">
          <span>PARAGRAPH UNITS · NATURAL BREATHING ROOM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {acceptedCount} accepted</span>
          <span className="text-rose-600 dark:text-rose-400 font-medium">✕ {rejectedCount} rejected</span>
        </div>
      </div>

      {/* Main Paragraph List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-theme-app">
        {displayParagraphs.map((item) => {
          const isEqual = item.type === 'equal';
          const isAdded = item.type === 'added';
          const isRemoved = item.type === 'removed';
          const isModified = item.type === 'modified';
          const isAccepted = item.status === 'accepted';
          const isRejected = item.status === 'rejected';

          return (
            <div
              key={item.id}
              className={`p-5 rounded-xl border transition-all shadow-sm ${
                isEqual
                  ? 'bg-theme-surface/60 border-theme-border/70 hover:border-theme-border'
                  : isAccepted
                  ? 'bg-emerald-500/[0.03] border-emerald-500/50 ring-1 ring-emerald-500/20'
                  : isRejected
                  ? 'bg-rose-500/[0.03] border-rose-500/40 ring-1 ring-rose-500/10 opacity-75'
                  : 'bg-theme-surface border-theme-border hover:border-theme-accent/50'
              }`}
            >
              {/* Card Header Bar */}
              <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-theme-border/60">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-theme-elevated text-theme-primary border border-theme-border">
                    {isModified
                      ? `Paragraph #${item.originalParagraphNumber} → #${item.suggestedParagraphNumber}`
                      : item.originalParagraphNumber
                      ? `Paragraph #${item.originalParagraphNumber}`
                      : `Paragraph #${item.suggestedParagraphNumber}`}
                  </span>

                  {isModified && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Modified
                    </span>
                  )}
                  {isAdded && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      + Added by AI
                    </span>
                  )}
                  {isRemoved && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                      - Removed by AI
                    </span>
                  )}
                  {isEqual && (
                    <span className="text-xs text-theme-muted font-medium">
                      Unchanged
                    </span>
                  )}
                </div>

                {/* Per-Paragraph Actions */}
                {!isEqual && (
                  <div className="flex items-center gap-2 select-none">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-medium ${
                        isAccepted
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isAccepted ? 'Accepted' : isRejected ? 'Rejected' : 'Pending'}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateParagraphStatus(item.id, 'accepted')}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 text-xs font-medium ${
                        isAccepted
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-theme-elevated hover:bg-emerald-600 hover:text-white text-theme-secondary border border-theme-border'
                      }`}
                      title={
                        isAdded
                          ? 'Accept this suggested paragraph'
                          : isRemoved
                          ? 'Confirm removal of this paragraph'
                          : 'Accept AI revision for this paragraph'
                      }
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateParagraphStatus(item.id, 'rejected')}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 text-xs font-medium ${
                        isRejected
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-theme-elevated hover:bg-rose-600 hover:text-white text-theme-secondary border border-theme-border'
                      }`}
                      title={
                        isAdded
                          ? 'Reject this suggested paragraph'
                          : isRemoved
                          ? 'Keep original paragraph'
                          : 'Reject AI revision (keep original paragraph)'
                      }
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Card Body */}
              {isModified ? (
                /* Parallel side-by-side or stacked view for modified paragraph */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Original Paragraph */}
                  <div className="p-4 rounded-lg bg-theme-surface/90 border border-rose-500/20 shadow-inner">
                    <div className="text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400 mb-2.5 flex items-center justify-between border-b border-rose-500/15 pb-1.5">
                      <span>ORIGINAL DRAFT (PARAGRAPH #{item.originalParagraphNumber})</span>
                      <span className="text-[10px] opacity-75 font-sans">Red highlights = removed/replaced words</span>
                    </div>
                    <div className="font-serif text-base leading-relaxed text-theme-primary whitespace-pre-wrap">
                      {renderOriginalWordDiff(item.originalContent, item.suggestedContent)}
                    </div>
                  </div>

                  {/* Right: AI Revision */}
                  <div className="p-4 rounded-lg bg-theme-surface/90 border border-emerald-500/20 shadow-inner">
                    <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 mb-2.5 flex items-center justify-between border-b border-emerald-500/15 pb-1.5">
                      <span>AI REVISION (PARAGRAPH #{item.suggestedParagraphNumber})</span>
                      <span className="text-[10px] opacity-75 font-sans">Green highlights = suggested words</span>
                    </div>
                    <div className="font-serif text-base leading-relaxed text-theme-primary whitespace-pre-wrap">
                      {renderSuggestedWordDiff(item.originalContent, item.suggestedContent)}
                    </div>
                  </div>
                </div>
              ) : isAdded ? (
                /* Added paragraph */
                <div className="p-4 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
                  <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 mb-2.5">
                    PROPOSED NEW PARAGRAPH
                  </div>
                  <div className="font-serif text-base leading-relaxed text-emerald-950 dark:text-emerald-100 whitespace-pre-wrap">
                    {item.suggestedContent}
                  </div>
                </div>
              ) : isRemoved ? (
                /* Removed paragraph */
                <div className="p-4 rounded-lg bg-rose-500/[0.06] border border-rose-500/20">
                  <div className="text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400 mb-2.5">
                    PARAGRAPH MARKED FOR REMOVAL
                  </div>
                  <div className="font-serif text-base leading-relaxed text-rose-950 dark:text-rose-100 line-through decoration-rose-500/50 whitespace-pre-wrap">
                    {item.originalContent}
                  </div>
                </div>
              ) : (
                /* Equal / unchanged paragraph */
                <div className="font-serif text-base leading-relaxed text-theme-secondary whitespace-pre-wrap px-2">
                  {item.originalContent}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
