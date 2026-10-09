import { markdownToHtml } from './markdownHelper';
import { splitIntoUnits, TextUnit } from './diffHelper';

/**
 * Splits markdown into the same visual lines the editor shows (and numbers in its gutter).
 *
 * The editor's gutter numbers every wrapped line of every block. To reproduce that,
 * we render the markdown off-screen with the editor's exact CSS classes and width,
 * detect where the browser wraps each block, and map those wrap points back onto
 * the markdown source so that every unit is a slice of the original text.
 */

// Last known width of the editor's prose column, recorded by the Editor component.
let editorContentWidth = 0;

export function setEditorContentWidth(width: number) {
  if (width > 0) editorContentWidth = width;
}

export function getEditorContentWidth() {
  return editorContentWidth;
}

const EDITOR_CLASSES =
  'ProseMirror prose max-w-none focus:outline-none leading-relaxed font-serif text-lg tracking-normal';

/** Returns, for each rendered block item, the text offsets where a new visual line starts. */
function measureBlocks(markdown: string, width: number): { text: string; breaks: number[] }[] {
  const host = document.createElement('div');
  host.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;width:${width}px;`;
  const pm = document.createElement('div');
  pm.className = EDITOR_CLASSES;
  pm.style.whiteSpace = 'pre-wrap';
  pm.style.wordWrap = 'break-word';
  pm.innerHTML = markdownToHtml(markdown).replace(/>\s*\n\s*</g, '><').trim();
  host.appendChild(pm);
  document.body.appendChild(host);

  const result: { text: string; breaks: number[] }[] = [];
  try {
    for (const block of Array.from(pm.children) as HTMLElement[]) {
      const items =
        block.tagName === 'UL' || block.tagName === 'OL'
          ? (Array.from(block.children) as HTMLElement[])
          : [block];

      for (const item of items) {
        const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
        const breaks: number[] = [];
        let text = '';
        let lastTop: number | null = null;
        const range = document.createRange();
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const t = node.textContent ?? '';
          for (let i = 0; i < t.length; i++) {
            if (/\s/.test(t[i])) continue;
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rect = range.getClientRects()[0];
            if (!rect || rect.height === 0) continue;
            if (lastTop !== null && rect.top - lastTop > 4) {
              breaks.push(text.length + i);
            }
            lastTop = rect.top;
          }
          text += t;
        }
        result.push({ text, breaks });
      }
    }
  } finally {
    document.body.removeChild(host);
  }
  return result;
}

const MARKUP = /[*_~`]/;

/** Map "n visible (non-space) characters" of rendered text to an offset in the markdown body. */
function mdOffsetAfterVisible(body: string, n: number): number {
  let count = 0;
  let j = 0;
  while (j < body.length && count < n) {
    const ch = body[j];
    if (ch === '\\' && j + 1 < body.length) {
      count++;
      j += 2;
    } else if (/\s/.test(ch) || MARKUP.test(ch)) {
      j++;
    } else {
      count++;
      j++;
    }
  }
  // Keep closing markup (e.g. "**") attached to the line it closes
  while (j < body.length && MARKUP.test(body[j])) j++;
  return j;
}

function countVisible(s: string): number {
  let n = 0;
  for (const ch of s) if (!/\s/.test(ch)) n++;
  return n;
}

/**
 * Split markdown into editor visual lines. Falls back to sentence splitting if the
 * rendered structure can't be matched reliably to the markdown source.
 */
export function splitIntoEditorLines(markdown: string, width = editorContentWidth): TextUnit[] {
  if (!width || typeof document === 'undefined') return splitIntoUnits(markdown);

  const parts = markdown.split(/(\n+)/);
  const mdLines: { text: string; sep: string }[] = [];
  let leading = '';
  for (let p = 0; p < parts.length; p += 2) {
    const line = parts[p];
    const sep = parts[p + 1] ?? '';
    if (line.trim() === '') {
      if (mdLines.length) mdLines[mdLines.length - 1].sep += line + sep;
      else leading += line + sep;
      continue;
    }
    mdLines.push({ text: line, sep });
  }

  const blocks = measureBlocks(markdown, width);
  if (blocks.length !== mdLines.length) return splitIntoUnits(markdown);

  const units: TextUnit[] = [];
  for (let b = 0; b < mdLines.length; b++) {
    const { text: mdLine, sep } = mdLines[b];
    const { text: rendered, breaks } = blocks[b];

    const prefixMatch = mdLine.match(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)?/);
    const prefix = prefixMatch ? prefixMatch[0] : '';
    const body = mdLine.slice(prefix.length);

    const cuts: number[] = [];
    for (const br of breaks) {
      const n = countVisible(rendered.slice(0, br));
      cuts.push(mdOffsetAfterVisible(body, n));
    }

    let start = 0;
    const segs: { content: string; ws: string }[] = [];
    for (const cut of cuts) {
      if (cut <= start || cut >= body.length) continue;
      let end = cut;
      let wsEnd = end;
      while (wsEnd < body.length && /[ \t]/.test(body[wsEnd])) wsEnd++;
      // Trailing spaces before the break belong to the separator
      while (end > start && /[ \t]/.test(body[end - 1])) end--;
      segs.push({ content: body.slice(start, end), ws: body.slice(end, wsEnd) });
      start = wsEnd;
    }
    segs.push({ content: body.slice(start), ws: '' });

    segs.forEach((s, i) => {
      units.push({
        content: (i === 0 ? prefix : '') + s.content,
        separator: i === segs.length - 1 ? sep : s.ws,
        paragraphStart: i === 0,
      });
    });
  }

  if (leading && units.length) units[0].content = leading + units[0].content;
  return units;
}
