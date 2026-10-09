import { diffLines, diffArrays, diffWordsWithSpace, Change } from 'diff';
import { DiffChunk, LineDiffItem, ParagraphDiffItem } from '../types';

export function splitIntoParagraphs(text: string): string[] {
  const norm = text.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n').trim();
  if (!norm) return [];
  return norm
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function computeParagraphDiff(original: string, suggested: string): ParagraphDiffItem[] {
  const origParas = splitIntoParagraphs(original);
  const suggParas = splitIntoParagraphs(suggested);

  const changes = diffArrays(origParas, suggParas);
  const items: ParagraphDiffItem[] = [];
  let origNum = 0;
  let suggNum = 0;
  let idCounter = 0;

  for (let c = 0; c < changes.length; c++) {
    const cur = changes[c];
    if (cur.removed) {
      const next = changes[c + 1];
      if (next && next.added) {
        const removedVals = cur.value;
        const addedVals = next.value;
        const commonLen = Math.min(removedVals.length, addedVals.length);

        for (let i = 0; i < commonLen; i++) {
          origNum++;
          suggNum++;
          items.push({
            id: `para_${idCounter++}`,
            type: 'modified',
            originalParagraphNumber: origNum,
            suggestedParagraphNumber: suggNum,
            originalContent: removedVals[i],
            suggestedContent: addedVals[i],
            status: 'pending',
          });
        }

        for (let i = commonLen; i < removedVals.length; i++) {
          origNum++;
          items.push({
            id: `para_${idCounter++}`,
            type: 'removed',
            originalParagraphNumber: origNum,
            originalContent: removedVals[i],
            suggestedContent: '',
            status: 'pending',
          });
        }

        for (let i = commonLen; i < addedVals.length; i++) {
          suggNum++;
          items.push({
            id: `para_${idCounter++}`,
            type: 'added',
            suggestedParagraphNumber: suggNum,
            originalContent: '',
            suggestedContent: addedVals[i],
            status: 'pending',
          });
        }
        c++; // Skip next since consumed
      } else {
        for (const val of cur.value) {
          origNum++;
          items.push({
            id: `para_${idCounter++}`,
            type: 'removed',
            originalParagraphNumber: origNum,
            originalContent: val,
            suggestedContent: '',
            status: 'pending',
          });
        }
      }
    } else if (cur.added) {
      for (const val of cur.value) {
        suggNum++;
        items.push({
          id: `para_${idCounter++}`,
          type: 'added',
          suggestedParagraphNumber: suggNum,
          originalContent: '',
          suggestedContent: val,
          status: 'pending',
        });
      }
    } else {
      for (const val of cur.value) {
        origNum++;
        suggNum++;
        items.push({
          id: `para_${idCounter++}`,
          type: 'equal',
          originalParagraphNumber: origNum,
          suggestedParagraphNumber: suggNum,
          originalContent: val,
          suggestedContent: val,
          status: 'accepted',
        });
      }
    }
  }

  return items;
}

export function assembleParagraphMergedDocument(items: ParagraphDiffItem[]): string {
  const resultParas: string[] = [];

  for (const item of items) {
    if (item.type === 'equal') {
      resultParas.push(item.originalContent);
    } else if (item.type === 'added') {
      if (item.status === 'accepted') {
        resultParas.push(item.suggestedContent);
      }
    } else if (item.type === 'removed') {
      if (item.status === 'rejected' || item.status === 'pending') {
        resultParas.push(item.originalContent);
      }
    } else if (item.type === 'modified') {
      if (item.status === 'accepted') {
        resultParas.push(item.suggestedContent);
      } else {
        resultParas.push(item.originalContent);
      }
    }
  }

  return resultParas.join('\n\n');
}

export function computeDiffChunks(original: string, suggested: string): DiffChunk[] {
  // Normalize newlines and non-breaking spaces
  const normOriginal = original.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  const normSuggested = suggested.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');

  const lineChanges = diffLines(normOriginal, normSuggested, { ignoreWhitespace: false });
  const chunks: DiffChunk[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < lineChanges.length; i++) {
    const current = lineChanges[i];
    const next = lineChanges[i + 1];

    if (current.removed && next && next.added) {
      // Paired modification (replaced block)
      chunks.push({
        id: `chunk_${chunkIndex++}`,
        type: 'modified',
        originalText: current.value,
        suggestedText: next.value,
        status: 'pending',
      });
      i++; // Skip next since it was consumed
    } else if (current.removed) {
      chunks.push({
        id: `chunk_${chunkIndex++}`,
        type: 'removed',
        originalText: current.value,
        suggestedText: '',
        status: 'pending',
      });
    } else if (current.added) {
      chunks.push({
        id: `chunk_${chunkIndex++}`,
        type: 'added',
        originalText: '',
        suggestedText: current.value,
        status: 'pending',
      });
    } else {
      chunks.push({
        id: `chunk_${chunkIndex++}`,
        type: 'equal',
        originalText: current.value,
        suggestedText: current.value,
        status: 'accepted',
      });
    }
  }

  return chunks;
}

export function computeWordDiff(orig: string, sugg: string): Change[] {
  const normOrig = orig.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  const normSugg = sugg.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  return diffWordsWithSpace(normOrig, normSugg);
}

export function computeSmartWordDiff(baseText: string, targetText: string): Change[] {
  const normBase = baseText.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  const normTarget = targetText.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
  const raw = diffWordsWithSpace(normBase, normTarget);
  const out: Change[] = [];

  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i];
    const next = raw[i + 1];

    if (
      cur &&
      next &&
      ((cur.removed && next.added) || (cur.added && next.removed)) &&
      /^\s+$/.test(cur.value) &&
      /^\s+$/.test(next.value)
    ) {
      let curVal = cur.value;
      let nextVal = next.value;

      // Extract common prefix
      let pfx = 0;
      const minLen = Math.min(curVal.length, nextVal.length);
      while (pfx < minLen && curVal[pfx] === nextVal[pfx]) {
        pfx++;
      }
      const prefixStr = curVal.slice(0, pfx);
      curVal = curVal.slice(pfx);
      nextVal = nextVal.slice(pfx);

      // Extract common suffix
      let sfx = 0;
      const minRem = Math.min(curVal.length, nextVal.length);
      while (
        sfx < minRem &&
        curVal[curVal.length - 1 - sfx] === nextVal[nextVal.length - 1 - sfx]
      ) {
        sfx++;
      }
      const suffixStr = sfx > 0 ? curVal.slice(curVal.length - sfx) : '';
      if (sfx > 0) {
        curVal = curVal.slice(0, curVal.length - sfx);
        nextVal = nextVal.slice(0, nextVal.length - sfx);
      }

      if (prefixStr) out.push({ added: false, removed: false, value: prefixStr });
      if (curVal) out.push({ added: cur.added, removed: cur.removed, value: curVal });
      if (nextVal) out.push({ added: next.added, removed: next.removed, value: nextVal });
      if (suffixStr) out.push({ added: false, removed: false, value: suffixStr });

      i++;
      continue;
    }
    out.push(cur);
  }
  return out;
}

export function assembleMergedDocument(chunks: DiffChunk[]): string {
  let result = '';

  for (const chunk of chunks) {
    if (chunk.type === 'equal') {
      result += chunk.originalText;
    } else if (chunk.type === 'added') {
      if (chunk.status === 'accepted') {
        result += chunk.suggestedText;
      }
      // If rejected or pending (pending in merge defaults to original, which is empty here)
    } else if (chunk.type === 'removed') {
      if (chunk.status === 'rejected' || chunk.status === 'pending') {
        result += chunk.originalText;
      }
      // If accepted, removed text is discarded
    } else if (chunk.type === 'modified') {
      if (chunk.status === 'accepted') {
        result += chunk.suggestedText;
      } else {
        result += chunk.originalText;
      }
    }
  }

  return result;
}

export interface TextUnit {
  content: string;
  separator: string;
  paragraphStart: boolean;
}

/**
 * Split text into sentence-level "lines". A paragraph (markdown block) is split
 * after sentence-ending punctuation followed by whitespace. Each unit keeps the
 * whitespace that follows it, so the document can be rebuilt exactly.
 */
export function splitIntoUnits(text: string): TextUnit[] {
  const units: TextUnit[] = [];
  const parts = text.split(/(\n+)/);

  for (let p = 0; p < parts.length; p += 2) {
    const para = parts[p];
    const paraSep = parts[p + 1] ?? '';
    if (para === '') {
      // Leading newlines or empty trailing chunk: attach to previous unit
      if (paraSep && units.length) units[units.length - 1].separator += paraSep;
      continue;
    }

    const sentenceRe = /[^]*?(?:[.!?…:;]+["”’»)\]]*(?=\s)|$)/g;
    let pos = 0;
    let first = true;
    while (pos < para.length) {
      sentenceRe.lastIndex = pos;
      const m = sentenceRe.exec(para);
      let end = m && m[0].length > 0 ? pos + m[0].length : para.length;
      let wsEnd = end;
      while (wsEnd < para.length && /[ \t]/.test(para[wsEnd])) wsEnd++;
      const content = para.slice(pos, end);
      const ws = para.slice(end, wsEnd);
      if (content.length === 0 && ws.length > 0) {
        // Leading whitespace in paragraph – merge into previous separator
        if (units.length) units[units.length - 1].separator += ws;
      } else {
        units.push({ content, separator: ws, paragraphStart: first });
        first = false;
      }
      pos = wsEnd;
    }
    if (units.length) units[units.length - 1].separator += paraSep;
  }
  return units;
}

export function normalizeForDiff(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
}

export function computeLineDiff(
  original: string,
  suggested: string,
  splitter: (text: string) => TextUnit[] = splitIntoUnits
): LineDiffItem[] {
  const origUnits = splitter(normalizeForDiff(original));
  const suggUnits = splitter(normalizeForDiff(suggested));

  const changes = diffArrays(
    origUnits.map((u) => u.content),
    suggUnits.map((u) => u.content)
  );

  const items: LineDiffItem[] = [];
  let oi = 0;
  let si = 0;
  let idCounter = 0;

  const makeRemoved = (): LineDiffItem => {
    const u = origUnits[oi];
    return {
      id: `line_${idCounter++}`,
      type: 'removed',
      content: u.content,
      separator: u.separator,
      paragraphStart: u.paragraphStart,
      originalLineNumber: ++oi,
      status: 'pending',
    };
  };
  const makeAdded = (): LineDiffItem => {
    const u = suggUnits[si];
    return {
      id: `line_${idCounter++}`,
      type: 'added',
      content: u.content,
      separator: u.separator,
      paragraphStart: u.paragraphStart,
      suggestedLineNumber: ++si,
      status: 'pending',
    };
  };

  for (let c = 0; c < changes.length; c++) {
    const change = changes[c];
    const count = change.count ?? change.value.length;

    if (change.removed) {
      const next = changes[c + 1];
      const addCount = next && next.added ? next.count ?? next.value.length : 0;
      // Interleave removed/added sentences so each old line sits right above its replacement
      const max = Math.max(count, addCount);
      for (let k = 0; k < max; k++) {
        if (k < count) items.push(makeRemoved());
        if (k < addCount) items.push(makeAdded());
      }
      if (addCount) c++;
    } else if (change.added) {
      for (let k = 0; k < count; k++) items.push(makeAdded());
    } else {
      for (let k = 0; k < count; k++) {
        const u = origUnits[oi];
        items.push({
          id: `line_${idCounter++}`,
          type: 'equal',
          content: u.content,
          separator: u.separator,
          paragraphStart: u.paragraphStart,
          originalLineNumber: ++oi,
          suggestedLineNumber: ++si,
          status: 'accepted',
        });
      }
    }
  }

  return items;
}

export function assembleLineMergedDocument(items: LineDiffItem[]): string {
  let result = '';
  let pendingBreak = '';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const keep =
      item.type === 'equal' ||
      (item.type === 'added' && item.status === 'accepted') ||
      (item.type === 'removed' && item.status !== 'accepted');

    const sep = item.separator ?? '\n';

    if (!keep) {
      // Paired lines (old directly above its replacement) share one slot; the kept
      // partner's own separator applies. Otherwise preserve the paragraph break.
      const paired =
        (item.type === 'removed' && items[i + 1]?.type === 'added') ||
        (item.type === 'added' && items[i - 1]?.type === 'removed');
      if (!paired && sep.includes('\n') && sep.length > pendingBreak.length) pendingBreak = sep;
      continue;
    }

    if (pendingBreak && result && !/\n$/.test(result)) {
      result = result.replace(/[ \t]+$/, '') + pendingBreak;
    }
    pendingBreak = '';
    result += item.content + sep;
  }

  return result.replace(/\s+$/, '');
}

