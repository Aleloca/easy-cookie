/**
 * Admin API shapes, mirrored from docs/api.md ("Admin API"). The config types
 * themselves come from the shared core module so the console, the server and
 * the runtime can never disagree on them.
 */
import type { ConfigIssue, ConsentMethod, EasyCookieConfig } from '@easy-cookie/core/shared';

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
