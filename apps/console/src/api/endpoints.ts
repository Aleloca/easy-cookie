import { API_BASE, api, toQuery } from './client';
import type {
  ConsentFilters,
  ConsentRecord,
  ConsentRecordDetail,
  CreatedSite,
  Draft,
  EasyCookieConfig,
  Page,
  Revision,
  RevisionSummary,
  Session,
  Site,
  SiteInput,
  Stats,
} from './types';

const s = (id: string) => `/sites/${encodeURIComponent(id)}`;

export const auth = {
  login: (email: string, password: string) => api.post<Session>('/auth/login', { email, password }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<Session>('/auth/me'),
};

export const sites = {
  list: () => api.get<Site[]>('/sites'),
  create: (input: SiteInput) => api.post<CreatedSite>('/sites', input),
  get: (id: string) => api.get<Site>(s(id)),
  update: (id: string, patch: Partial<SiteInput>) => api.patch<Site>(s(id), patch),
  remove: (id: string) => api.del<void>(s(id)),
  rotateSecret: (id: string) => api.post<{ secretKey: string }>(`${s(id)}/rotate-secret`),
};

export const drafts = {
  get: (id: string) => api.get<Draft>(`${s(id)}/draft`),
  save: (id: string, config: EasyCookieConfig) => api.put<Draft>(`${s(id)}/draft`, { config }),
};

export const revisions = {
  list: (id: string) => api.get<RevisionSummary[]>(`${s(id)}/revisions`),
  publish: (id: string, body: { revision?: string; note?: string }) =>
    api.post<RevisionSummary>(`${s(id)}/revisions`, body),
  get: (id: string, revision: string) => api.get<Revision>(`${s(id)}/revisions/${encodeURIComponent(revision)}`),
};

function consentQuery(filters: ConsentFilters, extra: Record<string, string | number | undefined> = {}) {
  return toQuery({
    from: filters.from,
    to: filters.to,
    method: filters.method,
    revision: filters.revision,
    q: filters.q,
    ...extra,
  });
}

export const consents = {
  list: (id: string, filters: ConsentFilters, cursor?: string | null, limit = 50) =>
    api.get<Page<ConsentRecord>>(`${s(id)}/consents${consentQuery(filters, { limit, cursor: cursor ?? undefined })}`),
  get: (id: string, recordId: string) =>
    api.get<ConsentRecordDetail>(`${s(id)}/consents/${encodeURIComponent(recordId)}`),
  /** Plain link (streamed by the server, authenticated by the session cookie). */
  csvUrl: (id: string, filters: ConsentFilters) => `${API_BASE}${s(id)}/consents.csv${consentQuery(filters)}`,
};

export const stats = {
  get: (id: string, days = 30) => api.get<Stats>(`${s(id)}/stats${toQuery({ days })}`),
};
