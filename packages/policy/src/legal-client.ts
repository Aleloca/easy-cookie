/**
 * Legal document types and the fetch client. Kept free of the Markdown
 * renderer so browser bundles (React component, Next.js) stay small.
 */

/** The three legal documents every site has. */
export type LegalKind = 'cookie' | 'privacy' | 'terms';
export const LEGAL_KINDS: readonly LegalKind[] = ['cookie', 'privacy', 'terms'];
export const isLegalKind = (v: unknown): v is LegalKind => typeof v === 'string' && (LEGAL_KINDS as readonly string[]).includes(v);

export interface LegalTranslation {
  title: string;
  /** Markdown, rendered with raw HTML disabled. */
  body: string;
}

/** Content of a legal document: one entry per language it is written in. */
export interface LegalDocContent {
  translations: Record<string, LegalTranslation>;
}

/** A published document as served by `GET /v1/sites/:publicKey/legal/:kind.json`. */
export interface PublishedLegalDocument {
  kind: LegalKind;
  /** Language actually shown (after fallback). */
  lang: string;
  /** Every language the document is written in. */
  languages: string[];
  title: string;
  /** Rendered, safe HTML wrapped in `<div class="ec-legal" lang="…">`. */
  html: string;
  version: string;
  publishedAt: string;
}

export interface FetchLegalDocumentOptions {
  /** Base URL of the consent server. */
  endpoint: string;
  /** Public site key (`pk_…`). */
  siteKey: string;
  kind: LegalKind;
  lang?: string;
  /** Extra fetch options (e.g. Next's `next: { revalidate }`). */
  init?: RequestInit & Record<string, unknown>;
  /** Custom fetch implementation. */
  fetch?: typeof fetch;
}

/** URL of the published document JSON on the consent server. */
export function legalDocumentUrl(opts: Pick<FetchLegalDocumentOptions, 'endpoint' | 'siteKey' | 'kind' | 'lang'>): string {
  const base = opts.endpoint.replace(/\/+$/, '');
  const q = opts.lang ? `?lang=${encodeURIComponent(opts.lang)}` : '';
  return `${base}/v1/sites/${encodeURIComponent(opts.siteKey)}/legal/${encodeURIComponent(opts.kind)}.json${q}`;
}

/**
 * Fetch a published legal document from the consent server.
 * Resolves to null when nothing is published yet (404); throws on other errors.
 */
export async function fetchLegalDocument(opts: FetchLegalDocumentOptions): Promise<PublishedLegalDocument | null> {
  const f = opts.fetch ?? fetch;
  const res = await f(legalDocumentUrl(opts), { credentials: 'omit', ...opts.init });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`[easy-cookie] could not load the ${opts.kind} document (${res.status})`);
  return (await res.json()) as PublishedLegalDocument;
}
