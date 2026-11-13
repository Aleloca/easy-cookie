/**
 * Legal documents (docs/api.md, "Legal documents"): placeholder counting,
 * the Markdown toolbar edits and the embed snippets. Pure functions, so the
 * editor stays thin and everything here is unit-tested.
 */
import type { LegalDocContent, LegalKind } from '../api/types';

/** `[[Testo da compilare]]`: on one line, no nested brackets. Same pattern as the server, so the counts agree. */
const PLACEHOLDER_SRC = /\[\[([^[\]\n]+?)\]\]/.source;
/** A fresh global regex per use: a shared one would leak `lastIndex` between calls. */
const placeholderRe = () => new RegExp(PLACEHOLDER_SRC, 'g');

export interface Placeholder {
  /** Text between the brackets, trimmed. */
  label: string;
  /** Offsets of the whole `[[…]]` in the source. */
  start: number;
  end: number;
  /** 1-based line number. */
  line: number;
}

export function findPlaceholders(text: string): Placeholder[] {
  const out: Placeholder[] = [];
  let line = 1;
  let scanned = 0;
  for (const m of text.matchAll(placeholderRe())) {
    const start = m.index ?? 0;
    for (let i = scanned; i < start; i++) if (text.charCodeAt(i) === 10) line++;
    scanned = start;
    out.push({ label: m[1].trim(), start, end: start + m[0].length, line });
  }
  return out;
}

export function countPlaceholders(text: string): number {
  return findPlaceholders(text).length;
}

/** Placeholders left in every translation (title and body), as the server counts them. */
export function contentPlaceholders(content: LegalDocContent): number {
  return Object.values(content.translations).reduce((n, tr) => n + countPlaceholders(tr.title) + countPlaceholders(tr.body), 0);
}

/* --------------------------------------------------------- toolbar edits */

export type FormatAction = 'h2' | 'h3' | 'bold' | 'link' | 'list';

export interface Edit {
  value: string;
  /** Selection to restore after the edit. */
  start: number;
  end: number;
}

function lineBounds(value: string, start: number, end: number): [number, number] {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const nl = value.indexOf('\n', Math.max(end - (end > start && value[end - 1] === '\n' ? 1 : 0), start));
  return [from, nl === -1 ? value.length : nl];
}

/**
 * Apply a toolbar action to the textarea value and selection. `fill` is the
 * text used when nothing is selected (e.g. "testo in grassetto"), left selected
 * so typing replaces it.
 */
export function applyFormat(value: string, start: number, end: number, action: FormatAction, fill = ''): Edit {
  if (action === 'bold' || action === 'link') {
    const sel = value.slice(start, end) || fill;
    if (action === 'bold') {
      const next = `${value.slice(0, start)}**${sel}**${value.slice(end)}`;
      return { value: next, start: start + 2, end: start + 2 + sel.length };
    }
    const url = 'https://';
    const next = `${value.slice(0, start)}[${sel}](${url})${value.slice(end)}`;
    const urlAt = start + sel.length + 3;
    return { value: next, start: urlAt, end: urlAt + url.length };
  }

  const [from, to] = lineBounds(value, start, end);
  const lines = value.slice(from, to).split('\n');
  let mapped: string[];
  if (action === 'list') {
    const all = lines.every((l) => /^\s*[-*] /.test(l) || !l.trim());
    mapped = lines.map((l) => (!l.trim() ? l : all ? l.replace(/^(\s*)[-*] /, '$1') : `- ${l}`));
  } else {
    const prefix = action === 'h2' ? '## ' : '### ';
    mapped = lines.map((l) => {
      const bare = l.replace(/^#{1,6}\s+/, '');
      // Pressing the same heading again turns the line back into a paragraph.
      return l.startsWith(prefix) ? bare : `${prefix}${bare}`;
    });
  }
  const block = mapped.join('\n');
  return { value: value.slice(0, from) + block + value.slice(to), start: from, end: from + block.length };
}

export const DIRECTIVES = ['cookie-table', 'services-list', 'preferences-link', 'last-updated'] as const;
export type Directive = (typeof DIRECTIVES)[number];

/** Insert `{{directive}}` on its own line at the caret, with blank lines around it. */
export function insertDirective(value: string, start: number, end: number, directive: Directive): Edit {
  const token = `{{${directive}}}`;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = after === '' ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  const at = before.length + lead.length;
  return { value: before + lead + token + trail + after, start: at, end: at + token.length };
}

/* -------------------------------------------------------------- snippets */

export function legalHostedUrl(origin: string, publicKey: string, kind: LegalKind): string {
  return `${origin}/p/${publicKey}/${kind}`;
}

export function legalHtmlSnippet(origin: string, publicKey: string, kind: LegalKind): string {
  return `<div data-easy-cookie-legal="${kind}"></div>
<script src="${origin}/v1/sites/${publicKey}/legal.js" defer></script>`;
}

const ROUTE: Record<LegalKind, string> = { cookie: 'cookie-policy', privacy: 'privacy', terms: 'termini' };

export function legalNextSnippet(origin: string, publicKey: string, kind: LegalKind, lang: string): string {
  return `// app/${ROUTE[kind]}/page.tsx
import { getLegalDocument } from '@easy-cookie/next/server';
import { LegalDocumentHtml } from '@easy-cookie/policy/react';

export default async function Page() {
  const doc = await getLegalDocument({
    endpoint: '${origin}',
    siteKey: '${publicKey}',
    kind: '${kind}',
    lang: '${lang}',
  });
  return <LegalDocumentHtml doc={doc} />;
}`;
}

/* ------------------------------------------------------------ highlighting */

/**
 * Wrap every `[[…]]` left as plain text in the rendered preview in a <mark>.
 * Works on the DOM, so it never re-parses HTML, and skips marks the server
 * already drew.
 */
export function markPlaceholders(root: HTMLElement): number {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (t.parentElement?.closest('mark')) continue;
    if (placeholderRe().test(t.data)) hits.push(t);
  }
  let count = 0;
  for (const t of hits) {
    const frag = doc.createDocumentFragment();
    let last = 0;
    for (const m of t.data.matchAll(placeholderRe())) {
      const i = m.index ?? 0;
      if (i > last) frag.append(t.data.slice(last, i));
      const mark = doc.createElement('mark');
      mark.className = 'ph';
      mark.textContent = m[0];
      frag.append(mark);
      last = i + m[0].length;
      count++;
    }
    if (last < t.data.length) frag.append(t.data.slice(last));
    t.replaceWith(frag);
  }
  return count + root.querySelectorAll('mark:not(.ph)').length;
}
