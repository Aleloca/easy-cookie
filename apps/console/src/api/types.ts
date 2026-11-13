/**
 * Admin API shapes, mirrored from docs/api.md ("Admin API"). The config types
 * themselves come from the shared core module so the console, the server and
 * the runtime can never disagree on them.
 */
import type { ConfigIssue, ConsentMethod, CookieDeclaration, EasyCookieConfig, Localized, ServiceDeclaration } from '@easy-cookie/core/shared';

export type { ConfigIssue, ConsentMethod, EasyCookieConfig };

export interface AdminUser {
  id: string;
  email: string;
}

export interface Session {
  user: AdminUser;
  csrfToken: string;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  publicKey: string;
  origins: string[];
  publishedRevision: string | null;
  createdAt: string;
  stats30d: { total: number };
}

/** `POST /sites` and `POST /sites/:id/rotate-secret` return the secret key once. */
export interface CreatedSite extends Site {
  secretKey: string;
}

export interface SiteInput {
  name: string;
  domain: string;
  origins: string[];
}

export interface Draft {
  config: EasyCookieConfig;
  updatedAt: string;
  issues: ConfigIssue[];
}

export interface RevisionSummary {
  revision: string;
  note: string | null;
  publishedAt: string;
  publishedBy: string | null;
  recordCount: number;
}

export interface Revision {
  revision: string;
  note: string | null;
  publishedAt: string;
  config: EasyCookieConfig;
}

export interface ConsentRecord {
  id: string;
  consentId: string;
  subjectId: string | null;
  revision: string;
  method: ConsentMethod;
  categories: Record<string, boolean>;
  services: Record<string, string[]>;
  language: string | null;
  pageUrl: string | null;
  ipHash: string | null;
  userAgent: string | null;
  clientTimestamp: string;
  receivedAt: string;
}

export interface ConsentRecordDetail extends ConsentRecord {
  /** Every record with the same consentId, newest first (includes this one). */
  history: ConsentRecord[];
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ConsentFilters {
  from?: string;
  to?: string;
  method?: ConsentMethod | '';
  revision?: string;
  q?: string;
}

export type MethodCounts = Record<ConsentMethod, number>;

export interface DayStats extends MethodCounts {
  date: string;
  total: number;
}

export interface Stats {
  total: number;
  byMethod: MethodCounts;
  byDay: DayStats[];
  byCategory: Record<string, number>;
  currentRevision: { revision: string; publishedAt: string; recordsSince: number } | null;
}

export const METHODS: ConsentMethod[] = ['accept_all', 'reject_all', 'custom', 'close', 'withdraw'];

/* ------------------------------------------------------------ catalog */

/**
 * Mirrored from `packages/core/src/catalog/types.ts` (docs/api.md, "Service
 * catalog"). `@easy-cookie/core` does not export `./catalog` yet, so the
 * console keeps its own copy of the shape it receives from the API.
 */
export type CatalogGroup = 'analytics' | 'advertising' | 'tag-management' | 'embeds' | 'support' | 'payments' | 'security' | 'infrastructure';

export const CATALOG_GROUPS: CatalogGroup[] = ['analytics', 'advertising', 'tag-management', 'embeds', 'support', 'payments', 'security', 'infrastructure'];

export type CatalogCategory = 'necessary' | 'functionality' | 'experience' | 'measurement' | 'marketing';

export interface CatalogEntry {
  /** Stable id, used as the default service key in the config (e.g. `ga4`). */
  id: string;
  label: string;
  /** Legal entity that processes the data for EU visitors. */
  provider: string;
  privacyUrl: string;
  group: CatalogGroup;
  /** Consent category the service belongs to by default. */
  category: CatalogCategory;
  purpose: Localized;
  cookies: CookieDeclaration[];
  /** Short note for the site owner (not shown to visitors). */
  note?: Localized;
  /** Where the service sends data, for the transfer section of the privacy policy. */
  transfer?: { countries: string[]; safeguard?: Localized };
  keywords?: string[];
}

/** A service in the draft config; `from` records the catalog entry it was added from. */
export type ConfigService = ServiceDeclaration & { from?: string };

/* ----------------------------------------------------- legal documents */

export type LegalKind = 'cookie' | 'privacy' | 'terms';
export const LEGAL_KINDS: LegalKind[] = ['cookie', 'privacy', 'terms'];

export interface LegalDocContent {
  /** One entry per language the document is written in. */
  translations: Record<string, { title: string; body: string }>;
}

/** Row of `GET /sites/:id/legal`. */
export interface LegalDocSummary {
  kind: LegalKind;
  title: string;
  languages: string[];
  draftUpdatedAt: string;
  publishedVersion: string | null;
  publishedAt: string | null;
  placeholders: number;
}

export interface LegalVersionSummary {
  version: string;
  note: string | null;
  publishedAt: string;
  publishedBy: string | null;
}

/** `GET /sites/:id/legal/:kind` (and the PUT draft response). */
export interface LegalDoc {
  kind: LegalKind;
  draft: LegalDocContent;
  draftUpdatedAt: string;
  publishedVersion: string | null;
  placeholders: number;
  /** Newest first. */
  versions: LegalVersionSummary[];
}

export interface LegalVersion {
  version: string;
  note: string | null;
  publishedAt: string;
  content: LegalDocContent;
}

/**
 * `POST …/render`. `html` is the whole document: it starts with
 * `<h1 class="ec-legal__title">` and marks placeholders with
 * `<mark class="ec-legal__todo">`. `title` has the `[[ ]]` brackets stripped.
 */
export interface RenderedLegal {
  title: string;
  html: string;
  lang: string;
}
