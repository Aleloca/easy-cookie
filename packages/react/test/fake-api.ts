import { vi } from 'vitest';
import type {
  ConsentEventDetail,
  ConsentMethod,
  ConsentState,
  EasyCookieApi,
  EasyCookieConfig,
  EasyCookieEvent,
} from '@easy-cookie/core/shared';

export const testConfig: EasyCookieConfig = {
  revision: '2026-11-13',
  language: { default: 'en', available: ['en', 'it'] },
  categories: {
    necessary: { readOnly: true },
    experience: {},
    measurement: {},
  },
  services: {
    youtube: { category: 'experience', label: 'YouTube', provider: 'Google Ireland Ltd' },
    vimeo: { category: 'experience', label: 'Vimeo' },
    ga4: { category: 'measurement', label: 'Google Analytics 4' },
  },
};

/** In-memory EasyCookieApi used by adapter tests (the real runtime is not needed). */
export function createFakeApi(initial?: { categories: string[]; services?: Record<string, string[]> }) {
  const listeners = new Map<EasyCookieEvent, Set<(d: ConsentEventDetail | null) => void>>();
  let config: EasyCookieConfig | null = null;
  let consent: ConsentState | null = null;
  let lang = 'en';

  const emit = (ev: EasyCookieEvent, detail: ConsentEventDetail | null) =>
    listeners.get(ev)?.forEach((cb) => cb(detail));

  const servicesOf = (cat: string) =>
    Object.entries(config?.services ?? {})
      .filter(([, s]) => s.category === cat)
      .map(([id]) => id);

  const set = (categories: string[], services: Record<string, string[]> | undefined, method: ConsentMethod) => {
    const readOnly = Object.entries(config?.categories ?? {})
      .filter(([, c]) => c.readOnly)
      .map(([id]) => id);
    const cats = Array.from(new Set([...readOnly, ...categories]));
    const svc: Record<string, string[]> = {};
    for (const c of cats) svc[c] = services?.[c] ?? servicesOf(c);
    const prev = consent;
    const now = new Date().toISOString();
    consent = {
      id: prev?.id ?? 'consent-1',
      revision: config?.revision ?? '',
      categories: cats,
      services: svc,
      method,
      firstAt: prev?.firstAt ?? now,
      updatedAt: now,
    };
    const changed = prev
      ? Array.from(new Set([...prev.categories, ...cats])).filter(
          (c) => prev.categories.includes(c) !== cats.includes(c),
        )
      : [];
    emit(prev ? 'change' : 'consent', { consent, changed, first: !prev });
  };

  const api: EasyCookieApi = {
    run: vi.fn(async (arg) => {
      config = 'remote' in arg ? testConfig : (arg as EasyCookieConfig);
      lang = config.language?.default ?? 'en';
      if (initial) {
        consent = null;
        const cats = initial.categories;
        consent = {
          id: 'consent-0',
          revision: config.revision,
          categories: cats,
          services: initial.services ?? Object.fromEntries(cats.map((c) => [c, servicesOf(c)])),
          method: 'custom',
          firstAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        };
        emit('replay', { consent, changed: [], first: false });
      }
      emit('ready', null);
    }),
    get: () => consent,
    isGranted: (cat) =>
      !!config?.categories[cat]?.readOnly || !!consent?.categories.includes(cat),
    isServiceGranted: (svc) => {
      const cat = config?.services?.[svc]?.category;
      return !!cat && !!consent?.services[cat]?.includes(svc);
    },
    on: (ev, cb) => {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev)!.add(cb);
      return () => listeners.get(ev)!.delete(cb);
    },
    onGranted: (cat, cb) => {
      if (api.isGranted(cat)) cb();
      return api.on('change', () => api.isGranted(cat) && cb());
    },
    showBanner: vi.fn(),
    openPreferences: vi.fn(),
    acceptAll: vi.fn(() => set(Object.keys(config?.categories ?? {}), undefined, 'accept_all')),
    rejectAll: vi.fn(() => set([], undefined, 'reject_all')),
    accept: vi.fn((cats: string[], services?: Record<string, string[]>) => set(cats, services, 'custom')),
    identify: vi.fn(async () => undefined),
    reset: vi.fn(() => {
      consent = null;
    }),
    getConfig: () => config,
    getLanguage: () => lang,
    setLanguage: vi.fn(async (l: string) => {
      lang = l;
    }),
  };
  return { api, listenerCount: (ev: EasyCookieEvent) => listeners.get(ev)?.size ?? 0 };
}
