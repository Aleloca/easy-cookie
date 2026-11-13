import type { ServiceDeclaration } from '../shared/types';
import { ENTRIES } from './entries';
import type { CatalogEntry, CatalogGroup } from './types';

export type { CatalogEntry, CatalogGroup } from './types';

/** Catalog groups in display order. */
export const CATALOG_GROUPS: CatalogGroup[] = [
  'analytics',
  'advertising',
  'tag-management',
  'embeds',
  'support',
  'payments',
  'security',
  'infrastructure',
];

/** Every ready-made service, sorted by group (CATALOG_GROUPS order) then label. */
export const CATALOG: CatalogEntry[] = [...ENTRIES].sort(
  (a, b) => CATALOG_GROUPS.indexOf(a.group) - CATALOG_GROUPS.indexOf(b.group) || a.label.localeCompare(b.label, 'en'),
);

/** The catalog entry with this id, or undefined. */
export function findCatalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id);
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * A `ServiceDeclaration` built from a catalog entry, ready to add to
 * `config.services[entry.id]`. The result is a deep copy (editing it never
 * changes the catalog) and records its origin in `from`.
 */
export function catalogToService(entry: CatalogEntry): ServiceDeclaration {
  return {
    category: entry.category,
    label: entry.label,
    ...(entry.provider ? { provider: entry.provider } : {}),
    ...(entry.privacyUrl ? { privacyUrl: entry.privacyUrl } : {}),
    purpose: clone(entry.purpose),
    cookies: clone(entry.cookies),
    from: entry.id,
  };
}
