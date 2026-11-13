/**
 * Service catalog helpers (docs/api.md, "Service catalog"). The catalog is plain
 * data; adding an entry copies it into the draft, after which it is an ordinary,
 * fully editable service. Nothing in the config depends on the catalog later.
 */
import type { EasyCookieConfig, Localized } from '@easy-cookie/core/shared';
import type { CatalogEntry, CatalogGroup, ConfigService } from '../api/types';
import { freeId } from './configEdit';

/**
 * Same semantics as `catalogToService` in `@easy-cookie/core/catalog`: copy
 * label, provider, privacyUrl, category, purpose and cookies, set `from`.
 * Everything is deep-copied so editing the service never touches the catalog.
 */
export function catalogToService(entry: CatalogEntry): ConfigService {
  return structuredClone({
    category: entry.category,
    label: entry.label,
    provider: entry.provider,
    purpose: entry.purpose,
    privacyUrl: entry.privacyUrl,
    cookies: entry.cookies,
    from: entry.id,
  });
}

/** Service ids already in the config that came from (or are named after) this entry. */
export function addedAs(config: EasyCookieConfig, entryId: string): string | null {
  const services = (config.services ?? {}) as Record<string, ConfigService>;
  for (const [id, s] of Object.entries(services)) if (s.from === entryId) return id;
  return entryId in services ? entryId : null;
}

export interface CatalogAddResult {
  config: EasyCookieConfig;
  /** Service ids written, in order. */
  serviceIds: string[];
  /** Categories that did not exist and were created with their defaults. */
  addedCategories: string[];
}

/** Categories the given entries need that the config does not declare yet (in first-use order). */
export function missingCategories(config: EasyCookieConfig, entries: CatalogEntry[]): string[] {
  const have = new Set(Object.keys(config.categories ?? {}));
  const out: string[] = [];
  for (const e of entries) if (!have.has(e.category) && !out.includes(e.category)) out.push(e.category);
  return out;
}

/**
 * Add catalog entries to a draft. A missing category is created empty, so the
 * runtime applies the known defaults for its id (title, description, Consent
 * Mode signals, colour); `necessary` is created read-only. Entries already in
 * the config are skipped. The service key is the entry id, or a free variant.
 */
export function addFromCatalog(config: EasyCookieConfig, entries: CatalogEntry[]): CatalogAddResult {
  const addedCategories = missingCategories(config, entries);
  const categories = { ...config.categories };
  for (const c of addedCategories) categories[c] = c === 'necessary' ? { readOnly: true } : {};
  const services: Record<string, ConfigService> = { ...(config.services ?? {}) };
  const serviceIds: string[] = [];
  for (const e of entries) {
    if (addedAs({ ...config, services }, e.id)) continue;
    const id = freeId(Object.keys(services), e.id);
    services[id] = catalogToService(e);
    serviceIds.push(id);
  }
  return { config: { ...config, categories, services }, serviceIds, addedCategories };
}

/** Text of a Localized value in `lang`, falling back to Italian, English, then any language. */
export function loc(value: Localized | undefined, lang: string): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.it ?? value.en ?? Object.values(value)[0] ?? '';
}

/** Case- and accent-insensitive search over label, provider, id and keywords, plus a group filter. */
export function filterCatalog(entries: CatalogEntry[], query: string, group: CatalogGroup | 'all' = 'all'): CatalogEntry[] {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const terms = norm(query).split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    if (group !== 'all' && e.group !== group) return false;
    if (!terms.length) return true;
    const hay = norm([e.label, e.provider, e.id, ...(e.keywords ?? [])].join(' '));
    return terms.every((t) => hay.includes(t));
  });
}

/**
 * Category colours as hex, mirrored from the banner theme (`--ec-c-*` in
 * packages/core/src/ui/theme.scss): the console paints the same squares the
 * visitor sees in the consent mosaic.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  necessary: '#1c1c1a',
  functionality: '#b8800f',
  experience: '#2f8f5b',
  measurement: '#2457c5',
  marketing: '#d63a26',
};
export const EXTRA_COLOR = '#7a4fa0';
