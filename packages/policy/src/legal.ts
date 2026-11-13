import { findCatalogEntry } from '@easy-cookie/core/catalog';
import { localize, resolveConfig, type EasyCookieConfig } from '@easy-cookie/core/shared';
import MarkdownIt from 'markdown-it';
import { buildPolicyModel } from './model';
import { escapeHtml, renderPolicyHtml } from './render';
import type { LegalDocContent } from './legal-client';

export * from './legal-client';

export interface RenderLegalOptions {
  /**
   * Banner config used to expand `{{cookie-table}}` and `{{services-list}}`
   * (the published one for visitors, the draft one for previews). Without it
   * those directives render a short notice.
   */
  config?: EasyCookieConfig | null;
  /** Version id being shown (written as `data-version`). */
  version?: string;
  /** Publication date for `{{last-updated}}`. Defaults to now (previews). */
  publishedAt?: string | Date;
  /** Values for `{{site.name}}` / `{{site.domain}}` left in the text. */
  site?: { name?: string; domain?: string };
  /** Put the title in an `<h1 class="ec-legal__title">` at the top of the HTML. Default true. */
  heading?: boolean;
  /**
   * Where `{{preferences-link}}` points when the banner is not on the page
   * (e.g. the consent server's hosted page links back to the site). By default
   * it is `href="#" data-ec-open-preferences`, bound by the core runtime.
   */
  preferencesHref?: string;
}

export interface RenderedLegalDocument {
  /** Language actually rendered (after fallback). */
  lang: string;
  title: string;
  html: string;
}

export interface LegalLabels {
  updated: string;
  preferences: string;
  privacyPolicy: string;
  category: string;
  transfer: string;
  noServices: string;
  noConfig: string;
}

/** Visitor-facing strings used by the directives. Unknown languages fall back to English. */
export const LEGAL_LABELS: Record<'it' | 'en', LegalLabels> = {
  it: {
    updated: 'Ultimo aggiornamento',
    preferences: 'Modifica le preferenze sui cookie',
    privacyPolicy: 'Informativa privacy',
    category: 'Categoria',
    transfer: 'Trasferimento dei dati',
    noServices: 'Nessun servizio di terze parti dichiarato.',
    noConfig: 'L’elenco dei cookie sarà disponibile dopo la pubblicazione del banner.',
  },
  en: {
    updated: 'Last updated',
    preferences: 'Change your cookie preferences',
    privacyPolicy: 'Privacy policy',
    category: 'Category',
    transfer: 'Data transfer',
    noServices: 'No third-party services declared.',
    noConfig: 'The list of cookies will be available once the banner is published.',
  },
};

const labelsFor = (lang: string): LegalLabels => (LEGAL_LABELS as Record<string, LegalLabels>)[lang] ?? LEGAL_LABELS.en;

/** `[[Something to fill in]]`: a placeholder the owner must replace. */
export const PLACEHOLDER_RE = /\[\[([^[\]\n]+?)\]\]/g;

/** Number of `[[…]]` placeholders left in every title and body. */
export function countPlaceholders(content: LegalDocContent | null | undefined): number {
  let n = 0;
  for (const t of Object.values(content?.translations ?? {})) {
    n += (String(t?.title ?? '').match(PLACEHOLDER_RE) ?? []).length;
    n += (String(t?.body ?? '').match(PLACEHOLDER_RE) ?? []).length;
  }
  return n;
}

/** Replace `{{site.name}}` and `{{site.domain}}` in a template text. */
export function fillSiteVariables(text: string, site: { name?: string; domain?: string }): string {
  return text.replace(/\{\{\s*site\.(name|domain)\s*\}\}/g, (all, key: 'name' | 'domain') => site[key] ?? all);
}

/**
 * Language to show: `lang` when the document has it, then `defaultLang`, then
 * the first translation. Undefined when there are no translations.
 */
export function pickLegalLanguage(content: LegalDocContent, lang?: string | null, defaultLang?: string | null): string | undefined {
  const langs = Object.keys(content?.translations ?? {});
  if (lang && langs.includes(lang)) return lang;
  if (lang) {
    const base = lang.toLowerCase().split('-')[0];
    const hit = langs.find((l) => l.toLowerCase() === base);
    if (hit) return hit;
  }
  if (defaultLang && langs.includes(defaultLang)) return defaultLang;
  return langs[0];
}

/** Validate a `LegalDocContent`. Returns an error message or null. */
export function legalContentError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'Must be an object';
  const tr = (value as { translations?: unknown }).translations;
  if (typeof tr !== 'object' || tr === null || Array.isArray(tr)) return 'translations: must be an object';
  for (const [lang, t] of Object.entries(tr)) {
    if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang)) return `translations.${lang}: invalid language code`;
    if (typeof t !== 'object' || t === null) return `translations.${lang}: must be { title, body }`;
    const { title, body } = t as Record<string, unknown>;
    if (typeof title !== 'string' || title.length > 300) return `translations.${lang}.title: string (max 300)`;
    if (typeof body !== 'string' || body.length > 200_000) return `translations.${lang}.body: string (max 200000)`;
  }
  return null;
}

// ---- Markdown ---------------------------------------------------------------

const BLOCK_DIRECTIVES = new Set(['cookie-table', 'services-list', 'preferences-link', 'last-updated']);
const INLINE_DIRECTIVES = new Set(['preferences-link', 'last-updated', 'site.name', 'site.domain']);
const INLINE_RE = /\{\{\s*([a-z.-]+)\s*\}\}|\[\[([^[\]\n]+?)\]\]/g;

/** Only http(s), mailto and relative URLs. */
export function isSafeLegalUrl(url: string): boolean {
  const u = url.trim();
  // Strip characters browsers ignore inside a scheme (e.g. "java\tscript:").
  let probe = u;
  try {
    probe = decodeURIComponent(u);
  } catch {
    /* keep the raw value */
  }
  probe = probe.replace(/[\u0000-\u001f\u007f\s]/g, '').toLowerCase();
  if (/^[a-z][a-z0-9+.-]*:/.test(probe)) return /^(https?|mailto):/.test(probe);
  return !probe.startsWith('\\');
}

interface RenderEnv {
  lang: string;
  labels: LegalLabels;
  render: (name: string, block: boolean) => string;
}

function createMarkdown(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  md.validateLink = isSafeLegalUrl;

  // `{{directive}}` alone on a line → a block token.
  md.block.ruler.before(
    'paragraph',
    'ec_directive',
    (state, startLine, _endLine, silent) => {
      if (state.sCount[startLine] - state.blkIndent >= 4) return false;
      const line = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]).trim();
      const m = /^\{\{\s*([a-z.-]+)\s*\}\}$/.exec(line);
      if (!m || !BLOCK_DIRECTIVES.has(m[1])) return false;
      if (silent) return true;
      const token = state.push('ec_directive', '', 0);
      token.meta = { name: m[1] };
      token.block = true;
      token.map = [startLine, startLine + 1];
      state.line = startLine + 1;
      return true;
    },
    { alt: ['paragraph'] },
  );

  // Inline `{{directive}}` and `[[placeholder]]` inside text tokens. Runs
  // before linkify, so `{{site.name}}` is never turned into a link.
  md.core.ruler.before('linkify', 'ec_inline', (state) => {
    for (const block of state.tokens) {
      if (block.type !== 'inline' || !block.children) continue;
      // Join adjacent text tokens first: `[` starts a new token while parsing.
      const joined: typeof block.children = [];
      for (const tok of block.children) {
        const prev = joined[joined.length - 1];
        if (tok.type === 'text' && prev?.type === 'text') prev.content += tok.content;
        else joined.push(tok);
      }
      const out: typeof block.children = [];
      let inLink = 0;
      for (const tok of joined) {
        if (tok.type === 'link_open') inLink++;
        if (tok.type === 'link_close') inLink--;
        if (tok.type !== 'text' || !/\{\{|\[\[/.test(tok.content)) {
          out.push(tok);
          continue;
        }
        let last = 0;
        const text = tok.content;
        for (const m of text.matchAll(INLINE_RE)) {
          const isDirective = m[1] !== undefined;
          if (isDirective && (!INLINE_DIRECTIVES.has(m[1]) || (inLink && m[1] === 'preferences-link'))) continue;
          if (m.index! > last) {
            const t = new state.Token('text', '', 0);
            t.content = text.slice(last, m.index);
            out.push(t);
          }
          const t = new state.Token(isDirective ? 'ec_inline_directive' : 'ec_todo', '', 0);
          t.meta = { name: m[1] };
          t.content = isDirective ? m[0] : m[2];
          out.push(t);
          last = m.index! + m[0].length;
        }
        if (last === 0) {
          out.push(tok);
          continue;
        }
        if (last < text.length) {
          const t = new state.Token('text', '', 0);
          t.content = text.slice(last);
          out.push(t);
        }
      }
      block.children = out;
    }
  });

  md.renderer.rules.ec_directive = (tokens, idx, _o, env: RenderEnv) => env.render(tokens[idx].meta.name, true) + '\n';
  md.renderer.rules.ec_inline_directive = (tokens, idx, _o, env: RenderEnv) => env.render(tokens[idx].meta.name, false);
  md.renderer.rules.ec_todo = (tokens, idx) => `<mark class="ec-legal__todo">${escapeHtml(tokens[idx].content)}</mark>`;

  // External links open safely.
  const linkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') ?? '';
    if (/^https?:\/\//i.test(href)) tokens[idx].attrSet('rel', 'noopener noreferrer');
    return linkOpen(tokens, idx, options, env, self);
  };

  // Stable anchors on headings ("## 4.2 Purchasing Credits" → id="4-2-purchasing-credits"),
  // so pages and checkboxes can link to a section. Duplicates get -2, -3…
  md.core.ruler.push('ec_heading_ids', (state) => {
    const seen = new Map<string, number>();
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'heading_open') continue;
      const text = tokens[i + 1]?.children?.map((t) => (t.type === 'text' || t.type === 'code_inline' ? t.content : '')).join('') ?? '';
      const base = slugify(text) || 'section';
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      tokens[i].attrSet('id', n === 1 ? base : `${base}-${n}`);
    }
    return true;
  });
  return md;
}

/** URL-safe heading slug: accents folded, lowercase, non-alphanumerics → "-". */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

let markdown: MarkdownIt | undefined;
const getMarkdown = () => (markdown ??= createMarkdown());

// ---- directives -------------------------------------------------------------

function isoDay(value: string | Date | undefined): string {
  const d = value === undefined ? new Date() : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

function formatDay(day: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
  } catch {
    return day;
  }
}

function regionName(code: string, lang: string): string {
  try {
    return new Intl.DisplayNames([lang, 'en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function servicesList(config: EasyCookieConfig, lang: string, L: LegalLabels): string {
  const resolved = resolveConfig(config);
  const fallback = resolved.language.default;
  const l = (v: Parameters<typeof localize>[0]) => localize(v, lang, fallback);
  const categoryTitle = new Map(resolved.resolvedCategories.map((c) => [c.id, l(c.title)]));
  const e = escapeHtml;
  const items = Object.entries(config.services ?? {})
    .filter(([, s]) => s && typeof s === 'object' && s.provider)
    .map(([id, s]) => {
      const transfer = s.from ? findCatalogEntry(s.from)?.transfer : undefined;
      const meta: string[] = [];
      const cat = categoryTitle.get(s.category);
      if (cat) meta.push(`${e(L.category)}: ${e(cat)}`);
      if (transfer?.countries.length) {
        const where = transfer.countries.map((c) => regionName(c, lang)).join(', ');
        const how = transfer.safeguard ? ` (${l(transfer.safeguard)})` : '';
        meta.push(`${e(L.transfer)}: ${e(where + how)}`);
      }
      if (s.privacyUrl && isSafeLegalUrl(s.privacyUrl) && /^(https?:|mailto:|\/)/i.test(s.privacyUrl.trim()))
        meta.push(`<a href="${e(s.privacyUrl)}" rel="noopener noreferrer">${e(L.privacyPolicy)}</a>`);
      const purpose = l(s.purpose);
      return (
        `<li class="ec-legal__service" data-service="${e(id)}">` +
        `<p class="ec-legal__service-name"><strong>${e(s.label ? l(s.label) : id)}</strong> · ${e(s.provider!)}</p>` +
        (purpose ? `<p class="ec-legal__service-purpose">${e(purpose)}</p>` : '') +
        (meta.length ? `<p class="ec-legal__service-meta">${meta.join(' · ')}</p>` : '') +
        '</li>'
      );
    });
  if (!items.length) return `<p class="ec-legal__empty">${e(L.noServices)}</p>`;
  return `<ul class="ec-legal__services">\n${items.join('\n')}\n</ul>`;
}

/**
 * Render a legal document to safe HTML: Markdown (raw HTML disabled, only
 * http/https/mailto/relative links), directives expanded against `config`,
 * `[[placeholders]]` highlighted. Picks the translation for `lang`, falling
 * back to the config's default language, then to the first translation.
 */
export function renderLegalDocument(content: LegalDocContent, lang: string, opts: RenderLegalOptions = {}): RenderedLegalDocument {
  const config = opts.config ?? null;
  const shown = pickLegalLanguage(content, lang, config?.language?.default) ?? lang;
  const tr = content?.translations?.[shown] ?? { title: '', body: '' };
  const L = labelsFor(shown);
  const e = escapeHtml;
  const day = isoDay(opts.publishedAt);
  const site = opts.site ?? {};

  const render = (name: string, block: boolean): string => {
    switch (name) {
      case 'cookie-table':
        if (!config) return `<p class="ec-legal__notice">${e(L.noConfig)}</p>`;
        return renderPolicyHtml(buildPolicyModel(config, shown), { headingLevel: 3, meta: false });
      case 'services-list':
        if (!config) return `<p class="ec-legal__notice">${e(L.noConfig)}</p>`;
        return servicesList(config, shown, L);
      case 'preferences-link': {
        const href = opts.preferencesHref && isSafeLegalUrl(opts.preferencesHref) ? opts.preferencesHref : undefined;
        const a = href
          ? `<a href="${e(href)}" class="ec-legal__preferences">${e(L.preferences)}</a>`
          : `<a href="#" class="ec-legal__preferences" data-ec-open-preferences>${e(L.preferences)}</a>`;
        return block ? `<p>${a}</p>` : a;
      }
      case 'last-updated': {
        const time = `<time datetime="${day}">${e(formatDay(day, shown))}</time>`;
        return block ? `<p class="ec-legal__updated">${e(L.updated)}: ${time}</p>` : time;
      }
      case 'site.name':
      case 'site.domain': {
        const v = site[name === 'site.name' ? 'name' : 'domain'];
        return e(v ?? `{{${name}}}`);
      }
      default:
        return e(`{{${name}}}`);
    }
  };

  const env: RenderEnv = { lang: shown, labels: L, render };
  const body = getMarkdown().render(tr.body ?? '', env);
  const titleText = fillSiteVariables(tr.title ?? '', site);
  const titleHtml = titleText.replace(/[^[]+|\[\[([^[\]\n]+?)\]\]|\[/g, (m, todo?: string) =>
    todo !== undefined ? `<mark class="ec-legal__todo">${e(todo)}</mark>` : e(m),
  );
  const heading = opts.heading === false || !titleText ? '' : `<h1 class="ec-legal__title">${titleHtml}</h1>\n`;
  const version = opts.version ? ` data-version="${e(opts.version)}"` : '';
  return {
    lang: shown,
    title: titleText.replace(PLACEHOLDER_RE, '$1'),
    html: `<div class="ec-legal" lang="${e(shown)}"${version}>\n${heading}${body}</div>`,
  };
}

