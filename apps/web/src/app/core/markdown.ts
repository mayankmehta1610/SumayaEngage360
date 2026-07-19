/**
 * Minimal, dependency-free Markdown renderer for intranet articles.
 *
 * All input is HTML-escaped first, then a small whitelist of Markdown
 * constructs is converted to tags: # headings, **bold**, *italic*, `code`,
 * ``` fenced code blocks, - / 1. lists, > quotes, --- rules and [text](url)
 * links (http/https only). The output therefore never contains any markup
 * that wasn't generated here, and Angular's [innerHTML] sanitizer provides a
 * second line of defence.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(md: string): string {
  let out = md;
  // `code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // **bold** then *italic*
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // [text](url) — http(s) links only, opened in a new tab
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return out;
}

export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return '';
  const lines = escapeHtml(md.replace(/\r\n/g, '\n')).split('\n');
  const html: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let inCode = false;
  let paragraph: string[] = [];

  const closeList = () => {
    if (list) { html.push(`</${list}>`); list = null; }
  };
  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim().startsWith('```')) {
      flushParagraph(); closeList();
      html.push(inCode ? '</code></pre>' : '<pre><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) { html.push(raw); continue; }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flushParagraph(); closeList();
      const level = h[1].length + 1; // # → h2 … #### → h5 (h1 is the page title)
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushParagraph(); closeList();
      html.push('<hr>');
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushParagraph();
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) { closeList(); html.push(`<${kind}>`); list = kind; }
      html.push(`<li>${inline((ul ?? ol)![1])}</li>`);
      continue;
    }
    const quote = /^&gt;\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph(); closeList();
      html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }
    if (!line.trim()) { flushParagraph(); closeList(); continue; }
    paragraph.push(line);
  }
  if (inCode) html.push('</code></pre>');
  flushParagraph(); closeList();
  return html.join('\n');
}

/** Rough plain-text form (for card summaries / mobile fallback). */
export function stripMarkdown(md: string | null | undefined): string {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_-]+/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
