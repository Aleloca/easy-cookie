import { fetchLegalDocument, type LegalKind, type PublishedLegalDocument } from '@easy-cookie/policy/client';
import {
  parseConsent,
  readCookie,
  resolveConfig,
  type ConsentState,
  type EasyCookieConfig,
  type ResolvedConfig,
} from '@easy-cookie/core/shared';

/** `cookies()` from `next/headers`, `request.cookies` in middleware, or any `{ get(name) → { value } }`. */
export interface CookieStoreLike {
  get(name: string): { value: string } | undefined | null;
}

/** `headers()` from `next/headers`, `request.headers`, or any `{ get('cookie') → string }`. */
export interface HeadersLike {
  get(name: string): string | null | undefined;
}

/**
 * Where to read the consent cookie from:
 * - the awaited `cookies()` store (RSC, route handlers, server actions);
 * - `headers()` / `request.headers`;
 * - a `Request` / `NextRequest` (middleware, route handlers);
 * - a raw `Cookie` header string.
 */
export type ConsentSource =
  | CookieStoreLike
  | HeadersLike
  | { cookies: CookieStoreLike }
  | { headers: HeadersLike }
  | string
  | null
  | undefined;

function resolved(config: EasyCookieConfig | ResolvedConfig): ResolvedConfig {
  return 'resolvedCategories' in config ? (config as ResolvedConfig) : resolveConfig(config);
}

function readRaw(source: ConsentSource, name: string, depth = 0): string | null {
  if (source == null) return null;
  if (typeof source === 'string') return readCookie(source, name);
  if (typeof source !== 'object' || depth > 2) return null;
  if (typeof (source as { then?: unknown }).then === 'function') {
    throw new TypeError('[easy-cookie] Pass the awaited value: getServerConsent(await cookies(), config).');
  }
  const s = source as Record<string, any>;
  // NextRequest: prefer its parsed cookie jar.
  if (s.cookies && typeof s.cookies.get === 'function') return readRaw(s.cookies, name, depth + 1);
  if (typeof s.get === 'function') {
    const hit = s.get(name);
    if (hit && typeof hit === 'object' && typeof hit.value === 'string') return hit.value;
    if (typeof hit === 'string') return hit;
    // A Headers object: read the Cookie header.
    const header = s.get('cookie');
    if (typeof header === 'string') return readCookie(header, name);
    return null;
  }
  if (s.headers && typeof s.headers.get === 'function') return readRaw(s.headers, name, depth + 1);
  return null;
}

/**
 * The visitor's valid consent for this config's revision, or null (no choice,
 * other revision, expired or malformed). DOM-free: works in React Server
 * Components, route handlers, server actions and middleware (Edge included).
 *
 * ```ts
 * const consent = getServerConsent(await cookies(), config);
 * ```
 */
export function getServerConsent(source: ConsentSource, config: EasyCookieConfig | ResolvedConfig): ConsentState | null {
  const c = resolved(config);
  return parseConsent(readRaw(source, c.cookie.name), { revision: c.revision, expiryDays: c.expiryDays });
}

/** True when `category` is granted (read-only categories always are). */
export function isGrantedOnServer(
  source: ConsentSource,
  config: EasyCookieConfig | ResolvedConfig,
  category: string,
): boolean {
  if (config.categories[category]?.readOnly) return true;
  return !!getServerConsent(source, config)?.categories.includes(category);
}

/** True when `service` is granted (its category accepted and the service enabled). */
export function isServiceGrantedOnServer(
  source: ConsentSource,
  config: EasyCookieConfig | ResolvedConfig,
  service: string,
): boolean {
  const category = config.services?.[service]?.category;
  if (!category) return false;
  if (config.categories[category]?.readOnly) return true;
  const consent = getServerConsent(source, config);
  if (!consent?.categories.includes(category)) return false;
  const list = consent.services[category];
  // Without per-service detail the category decision applies to all its services.
  return !list || list.includes(service);
}

export interface GetLegalDocumentOptions {
  /** Base URL of the consent server. */
  endpoint: string;
  /** Public site key (`pk_…`). */
  siteKey: string;
  kind: LegalKind;
  lang?: string;
  /** Seconds Next.js caches the response (`fetch(…, { next: { revalidate } })`). Default 300. */
  revalidate?: number | false;
}

/**
 * A published legal document (cookie policy, privacy policy, terms) for a
 * Server Component, or null when nothing is published yet. Rendered on the
 * server, so legal pages are indexable:
 *
 * ```tsx
 * const doc = await getLegalDocument({ endpoint, siteKey, kind: 'privacy', lang: 'it' });
 * return <LegalDocumentHtml doc={doc} />; // from @easy-cookie/policy/react
 * ```
 */
export function getLegalDocument(opts: GetLegalDocumentOptions): Promise<PublishedLegalDocument | null> {
  const { revalidate = 300, ...rest } = opts;
  return fetchLegalDocument({ ...rest, init: { next: { revalidate } } });
}

export type { LegalKind, PublishedLegalDocument };
