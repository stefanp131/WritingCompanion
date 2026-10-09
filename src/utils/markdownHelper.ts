import { marked } from 'marked';
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// Avoid escaping markdown characters unnecessarily
turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
});

export function markdownToHtml(markdown: string): string {
  try {
    return marked.parse(markdown, { async: false }) as string;
  } catch (e) {
    console.error('Markdown parse error:', e);
    return `<p>${markdown}</p>`;
  }
}

export function htmlToMarkdown(html: string): string {
  try {
    // Preserve multiple spaces by converting 2+ spaces into &nbsp; before Turndown collapses them
    const preparedHtml = html.replace(/ {2,}/g, (match) => '&nbsp;'.repeat(match.length));
    const md = turndownService.turndown(preparedHtml);
    // Normalize any non-breaking spaces to standard spaces in markdown
    return md.replace(/\u00a0/g, ' ');
  } catch (e) {
    console.error('Turndown error:', e);
    return html;
  }
}
