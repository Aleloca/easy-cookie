import { DEFAULT_COOKIE_NAME, DEFAULT_EXPIRY_DAYS } from './defaults';
import type { ConsentMethod, ConsentState } from './types';

/**
 * Raw content of the consent cookie as written by the engine
 * (vanilla-cookieconsent format) plus easy-cookie's own fields in `data`.
 */
export interface RawConsentCookie {
  categories: string[];
  revision: number;
  data: { ec?: { rev: string; method: ConsentMethod } } | null;
  consentTimestamp: string;
  lastConsentTimestamp?: string;
  consentId: string;
  services: Record<string, string[]>;
  languageCode?: string;
  expirationTime?: number;
}

/** Read one cookie value from a `Cookie` header or `document.cookie` string. */
export function readCookie(cookieHeader: string | null | undefined, name = DEFAULT_COOKIE_NAME): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1);
  }
  return null;
}

export function decodeRawCookie(value: string | null | undefined): RawConsentCookie | null {
  if (!value) return null;
  try {
    let text = value;
    // The engine URI-encodes the JSON; frameworks sometimes hand us the decoded value.
    if (!text.startsWith('{')) text = decodeURIComponent(text);
    const raw = JSON.parse(text);
    if (!raw || !Array.isArray(raw.categories) || typeof raw.consentId !== 'string') return null;
    return raw as RawConsentCookie;
  } catch {
    return null;
  }
}

export interface ParseOptions {
  /** Current config revision: a stored choice for another revision is not valid. */
  revision?: string;
  expiryDays?: number;
  now?: number;
}

/**
 * Turn the cookie value into a ConsentState, or null when there is no valid choice
 * (missing, malformed, other revision, expired). DOM-free: use it in middleware,
 * route handlers and React Server Components.
 */
export function parseConsent(value: string | null | undefined, opts: ParseOptions = {}): ConsentState | null {
  const raw = decodeRawCookie(value);
  if (!raw) return null;
  const ec = raw.data?.ec;
  if (!ec) return null;
  if (opts.revision !== undefined && ec.rev !== opts.revision) return null;
  const updatedAt = raw.lastConsentTimestamp ?? raw.consentTimestamp;
  const now = opts.now ?? Date.now();
  const maxAge = (opts.expiryDays ?? DEFAULT_EXPIRY_DAYS) * 86_400_000;
  const updatedMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedMs) || now - updatedMs > maxAge) return null;
  if (raw.expirationTime && raw.expirationTime < now) return null;
  return {
    id: raw.consentId,
    revision: ec.rev,
    categories: raw.categories,
    services: raw.services ?? {},
    method: ec.method,
    firstAt: raw.consentTimestamp,
    updatedAt,
    language: raw.languageCode,
  };
}

/** Convenience: parse straight from a Cookie header / document.cookie string. */
export function consentFromCookieHeader(
  cookieHeader: string | null | undefined,
  opts: ParseOptions & { cookieName?: string } = {},
): ConsentState | null {
  return parseConsent(readCookie(cookieHeader, opts.cookieName ?? DEFAULT_COOKIE_NAME), opts);
}
