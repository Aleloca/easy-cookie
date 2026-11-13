/**
 * SYNTHETIC DATA for mock mode (`VITE_MOCK=1`) and tests.
 *
 * Every site, revision and consent record below is invented and generated from
 * a seeded PRNG so screenshots are reproducible. None of it describes real
 * visitors, real adoption or real traffic; the two site names are the
 * maintainer's own projects, used only as placeholders.
 */
import type { ConsentMethod, EasyCookieConfig } from '@easy-cookie/core/shared';
import type { ConsentRecord, RevisionSummary, Site } from '../api/types';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function base62(rand: () => number, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += B62[Math.floor(rand() * 62)];
  return s;
}
export function hex(rand: () => number, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(rand() * 16).toString(16);
  return s;
}
function uuid(rand: () => number): string {
  const h = hex(rand, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
export function dateId(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ------------------------------------------------------------------ configs */

const necessary = {
  readOnly: true,
  title: { it: 'Necessari', en: 'Necessary' },
  gcm: ['security_storage' as const],
};

/** Synthetic config of the first site at each of its four revisions. */
function fuaConfig(step: 0 | 1 | 2 | 3 | 4, revision: string): EasyCookieConfig {
  const config: EasyCookieConfig = {
    revision,
    expiryDays: 182,
    cookie: { name: 'ec_consent', sameSite: 'Lax', secure: true },
    policyUrl: { it: '/cookie-policy', en: '/en/cookie-policy' },
    language: { default: 'it', available: ['it', 'en'], autoDetect: 'document' },
    googleConsentMode: { enabled: true, waitForUpdate: 500, adsDataRedaction: true, urlPassthrough: false },
    categories: {
      necessary,
      ...(step >= 1
        ? {
            experience: {
              title: { it: 'Esperienza', en: 'Experience' },
              description: { it: 'Video di YouTube incorporati negli articoli.', en: 'YouTube videos embedded in articles.' },
              gcm: ['personalization_storage' as const],
            },
          }
        : {}),
      measurement: {
        title: { it: 'Misurazione', en: 'Measurement' },
        description: {
          it: 'Statistiche anonime sulle visite per capire quali articoli funzionano.',
          en: 'Anonymous visit statistics to understand which articles work.',
        },
        gcm: ['analytics_storage'],
      },
      ...(step >= 3
        ? {
            marketing: {
              title: { it: 'Marketing', en: 'Marketing' },
              description: {
                it: 'Misura le campagne sui social e mostra annunci pertinenti.',
                en: 'Measures social campaigns and shows relevant ads.',
              },
              gcm: ['ad_storage' as const, 'ad_user_data' as const, 'ad_personalization' as const],
            },
          }
        : {}),
    },
    services: {
      session: {
        category: 'necessary',
        label: 'Sessione',
        provider: 'FermoUnAttimo',
        purpose: { it: 'Mantiene l’accesso all’area riservata.', en: 'Keeps you signed in.' },
        cookies: [{ name: 'fua_session', duration: { it: 'sessione', en: 'session' } }],
      },
      ga4: {
        category: 'measurement',
        label: 'Google Analytics 4',
        provider: 'Google Ireland Ltd',
        purpose: { it: 'Statistiche di visita aggregate.', en: 'Aggregated visit statistics.' },
        privacyUrl: 'https://policies.google.com/privacy',
        cookies: [
          { name: '^_ga$', pattern: true, duration: step >= 2 ? { it: '13 mesi', en: '13 months' } : { it: '2 anni', en: '2 years' } },
          { name: '^_ga_.*', pattern: true, duration: step >= 2 ? { it: '13 mesi', en: '13 months' } : { it: '2 anni', en: '2 years' } },
        ],
      },
      ...(step >= 1
        ? {
            youtube: {
              category: 'experience',
              label: 'YouTube',
              provider: 'Google Ireland Ltd',
              purpose: { it: 'Riproduzione dei video incorporati.', en: 'Playback of embedded videos.' },
              privacyUrl: 'https://policies.google.com/privacy',
              cookies: [
                { name: 'VISITOR_INFO1_LIVE', duration: { it: '6 mesi', en: '6 months' }, domain: '.youtube.com' },
                { name: 'YSC', duration: { it: 'sessione', en: 'session' }, domain: '.youtube.com' },
              ],
            },
          }
        : {}),
      ...(step >= 3
        ? {
            meta: {
              category: 'marketing',
              label: 'Meta Pixel',
              provider: 'Meta Platforms Ireland Ltd',
              purpose: { it: 'Misura delle campagne pubblicitarie.', en: 'Ad campaign measurement.' },
              privacyUrl: 'https://www.facebook.com/privacy/policy',
              cookies: [{ name: '^_fb[pc]$', pattern: true, duration: { it: '3 mesi', en: '3 months' } }],
            },
          }
        : {}),
      ...(step >= 4
        ? {
            hotjar: {
              category: 'measurement',
              label: 'Hotjar',
              provider: 'Hotjar Ltd',
              purpose: { it: 'Mappe di calore delle pagine.', en: 'Page heatmaps.' },
              privacyUrl: 'https://www.hotjar.com/legal/policies/privacy/',
              cookies: [{ name: '^_hj.*', pattern: true, duration: { it: '1 anno', en: '1 year' } }],
            },
          }
        : {}),
    },
    ui: { position: 'bottom-left', reopenButton: { position: 'bottom-left', hideOn: ['/area-riservata'] }, colorScheme: 'light' },
    respectGpc: true,
  };
  if (step >= 3) {
    config.texts = {
      it: { banner: { title: 'Due parole sui cookie, poi torni a leggere' } },
    };
  }
  return config;
}

function mvConfig(revision: string, withPosthog: boolean): EasyCookieConfig {
  return {
    revision,
    expiryDays: 180,
    language: { default: 'en', available: ['en', 'it'], autoDetect: 'browser' },
    googleConsentMode: { enabled: true, waitForUpdate: 500 },
    categories: {
      necessary: { readOnly: true },
      measurement: { gcm: ['analytics_storage'] },
      marketing: { gcm: ['ad_storage', 'ad_user_data', 'ad_personalization'] },
    },
    services: {
      ga4: {
        category: 'measurement',
        provider: 'Google Ireland Ltd',
        privacyUrl: 'https://policies.google.com/privacy',
        cookies: [{ name: '^_ga(_.*)?$', pattern: true, duration: { it: '13 mesi', en: '13 months' } }],
      },
      ...(withPosthog
        ? {
            posthog: {
              category: 'measurement',
              provider: 'PostHog Inc.',
              cookies: [{ name: '^ph_.*_posthog$', pattern: true, duration: { it: '1 anno', en: '1 year' } }],
            },
          }
        : {}),
    },
    ui: { position: 'bottom-right', reopenButton: { position: 'bottom-right', hideOn: ['/dashboard', '/studio'] }, colorScheme: 'auto' },
  };
}

/** Starter draft for a new site (what the server creates on POST /sites). */
export function starterConfig(): EasyCookieConfig {
  return {
    revision: 'draft',
    expiryDays: 182,
    language: { default: 'it', available: ['it', 'en'] },
    googleConsentMode: { enabled: true, waitForUpdate: 500 },
    categories: {
      necessary: { readOnly: true },
      measurement: { gcm: ['analytics_storage'] },
    },
    services: {},
    ui: { position: 'bottom-left', reopenButton: true },
  };
}

/* -------------------------------------------------------------- records */

const UAS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0',
  'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
];

interface RecordGenOptions {
  seed: number;
  domain: string;
  days: number;
  perDay: [number, number];
  paths: string[];
  langs: [string, string];
  revisions: { revision: string; at: number; categories: string[] }[];
  now: number;
}

function pickMethod(r: number): ConsentMethod {
  if (r < 0.41) return 'accept_all';
  if (r < 0.78) return 'reject_all';
  if (r < 0.97) return 'custom';
  return 'close';
}

/** Generate a synthetic, newest-first consent register. */
export function generateRecords(o: RecordGenOptions): ConsentRecord[] {
  const rand = mulberry32(o.seed);
  const out: ConsentRecord[] = [];
  const revAt = (t: number) => {
    let cur = o.revisions[0];
    for (const r of o.revisions) if (r.at <= t) cur = r;
    return cur;
  };
  let n = 0;
  const make = (t: number, consentId: string, method: ConsentMethod, prevSubject: string | null, ipHash: string, ua: string, lang: string): ConsentRecord => {
    const rev = revAt(t);
    const cats: Record<string, boolean> = {};
    const services: Record<string, string[]> = {};
    for (const c of rev.categories) {
      const granted =
        c === 'necessary' || method === 'accept_all' ? true : method === 'custom' ? rand() < (c === 'measurement' ? 0.7 : c === 'experience' ? 0.55 : 0.3) : false;
      cats[c] = granted;
    }
    if (method === 'withdraw') for (const c of rev.categories) cats[c] = c === 'necessary';
    for (const [c, g] of Object.entries(cats)) if (g) services[c] = c === 'necessary' ? ['session'] : c === 'measurement' ? ['ga4'] : c === 'experience' ? ['youtube'] : ['meta'];
    n++;
    return {
      id: `rec_${String(n).padStart(6, '0')}${hex(rand, 6)}`,
      consentId,
      subjectId: prevSubject,
      revision: rev.revision,
      method,
      categories: cats,
      services,
      language: lang,
      pageUrl: `https://${o.domain}${o.paths[Math.floor(rand() * o.paths.length)]}`,
      ipHash,
      userAgent: ua,
      clientTimestamp: new Date(t - 40 - Math.floor(rand() * 900)).toISOString(),
      receivedAt: new Date(t).toISOString(),
    };
  };

  const start = o.now - o.days * DAY;
  for (let d = 0; d < o.days; d++) {
    const dayStart = start + d * DAY;
    const weekday = new Date(dayStart).getDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.72 : 1;
    const count = Math.round((o.perDay[0] + rand() * (o.perDay[1] - o.perDay[0])) * weekend);
    for (let i = 0; i < count; i++) {
      const t = dayStart + Math.floor(rand() * DAY);
      if (t > o.now - 60_000) continue;
      const consentId = uuid(rand);
      const method = pickMethod(rand());
      const subject = rand() < 0.08 ? `u_${1000 + Math.floor(rand() * 9000)}` : null;
      const ipHash = hex(rand, 64);
      const ua = UAS[Math.floor(rand() * UAS.length)];
      const lang = rand() < 0.86 ? o.langs[0] : o.langs[1];
      out.push(make(t, consentId, method, subject, ipHash, ua, lang));
      // A share of visitors come back: they change their mind, withdraw, or are re-prompted by a new revision.
      const r = rand();
      if (r < 0.1) {
        const later = t + Math.floor(rand() * 9 * DAY) + 3_600_000;
        if (later < o.now - 60_000) {
          const next: ConsentMethod = method === 'accept_all' || method === 'custom' ? (rand() < 0.55 ? 'withdraw' : 'custom') : rand() < 0.5 ? 'custom' : 'accept_all';
          out.push(make(later, consentId, next, subject, ipHash, ua, lang));
        }
      }
    }
  }
  out.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return out;
}

/* ---------------------------------------------------------------- sites */

export interface MockRevision extends RevisionSummary {
  config: EasyCookieConfig;
}

export interface MockSite {
  site: Site;
  draft: { config: EasyCookieConfig; updatedAt: string };
  revisions: MockRevision[]; // newest first
  records: ConsentRecord[] | null; // generated lazily
  gen: Omit<RecordGenOptions, 'now' | 'revisions'> | null;
}

export function createMockDb(now = Date.now()): MockSite[] {
  const at = (daysAgo: number, hour = 10, minute = 12) => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const rand = mulberry32(42);

  const fuaRevs = [
    { d: at(255, 11, 4), step: 0 as const, note: 'Prima pubblicazione', by: 'alessandro@fermounattimo.it' },
    { d: at(121, 16, 40), step: 1 as const, note: 'Aggiunti i video di YouTube (categoria Esperienza)', by: 'alessandro@fermounattimo.it' },
    { d: at(42, 9, 15), step: 2 as const, note: 'Durata cookie GA4 portata a 13 mesi', by: null },
    { d: at(1, 18, 2), step: 3 as const, note: 'Aggiunto Meta Pixel; titolo del banner riscritto', by: 'alessandro@fermounattimo.it' },
  ];
  const fuaRevisions: MockRevision[] = fuaRevs
    .map((r) => ({
      revision: dateId(r.d),
      note: r.note,
      publishedAt: r.d.toISOString(),
      publishedBy: r.by,
      recordCount: 0,
      config: fuaConfig(r.step, dateId(r.d)),
    }))
    .reverse();

  const mvRevs = [
    { d: at(64, 14, 30), posthog: false, note: 'Migrazione da cc_cookie a ec_consent', by: 'alessandro@mythicvoices.com' },
    { d: at(19, 10, 5), posthog: true, note: 'PostHog dichiarato in Misurazione', by: 'alessandro@mythicvoices.com' },
  ];
  const mvRevisions: MockRevision[] = mvRevs
    .map((r) => ({
      revision: dateId(r.d),
      note: r.note,
      publishedAt: r.d.toISOString(),
      publishedBy: r.by,
      recordCount: 0,
      config: mvConfig(dateId(r.d), r.posthog),
    }))
    .reverse();

  const fuaDraft = fuaConfig(4, fuaRevisions[0].revision);
  fuaDraft.texts = { it: { banner: { title: 'Due parole sui cookie, poi torni a leggere', rejectAll: 'Rifiuta tutti' } } };

  return [
    {
      site: {
        id: 'site_fua',
        name: 'FermoUnAttimo',
        domain: 'fermounattimo.it',
        publicKey: `pk_${base62(rand, 24)}`,
        origins: ['https://fermounattimo.it', 'https://www.fermounattimo.it'],
        publishedRevision: fuaRevisions[0].revision,
        createdAt: at(256, 10, 0).toISOString(),
        stats30d: { total: 0 },
      },
      draft: { config: fuaDraft, updatedAt: new Date(now - 26 * 60_000).toISOString() },
      revisions: fuaRevisions,
      records: null,
      gen: {
        seed: 7,
        domain: 'fermounattimo.it',
        days: 75,
        perDay: [170, 300],
        paths: ['/', '/articoli/respirare-quando-tutto-corre', '/articoli/la-pausa-di-tre-minuti', '/meditazioni', '/chi-siamo', '/newsletter', '/area-riservata'],
        langs: ['it', 'en'],
      },
    },
    {
      site: {
        id: 'site_mv',
        name: 'MythicVoices',
        domain: 'mythicvoices.com',
        publicKey: `pk_${base62(rand, 24)}`,
        origins: ['https://mythicvoices.com', 'https://app.mythicvoices.com'],
        publishedRevision: mvRevisions[0].revision,
        createdAt: at(65, 9, 0).toISOString(),
        stats30d: { total: 0 },
      },
      draft: { config: structuredClone(mvRevisions[0].config), updatedAt: mvRevisions[0].publishedAt },
      revisions: mvRevisions,
      records: null,
      gen: {
        seed: 11,
        domain: 'mythicvoices.com',
        days: 60,
        perDay: [35, 80],
        paths: ['/', '/pricing', '/voices', '/blog/how-we-cast-voices', '/studio'],
        langs: ['en', 'it'],
      },
    },
    {
      site: {
        id: 'site_demo',
        name: 'Sito di prova',
        domain: 'staging.fermounattimo.it',
        publicKey: `pk_${base62(rand, 24)}`,
        origins: ['*'],
        publishedRevision: null,
        createdAt: at(0, 8, 30).toISOString(),
        stats30d: { total: 0 },
      },
      draft: { config: starterConfig(), updatedAt: at(0, 8, 30).toISOString() },
      revisions: [],
      records: [],
      gen: null,
    },
  ];
}

/** Materialise the register of a mock site and back-fill counts. */
export function ensureRecords(entry: MockSite, now = Date.now()): ConsentRecord[] {
  if (!entry.records) {
    const revs = [...entry.revisions].reverse().map((r) => ({
      revision: r.revision,
      at: new Date(r.publishedAt).getTime(),
      categories: Object.keys(r.config.categories),
    }));
    entry.records = entry.gen ? generateRecords({ ...entry.gen, now, revisions: revs }) : [];
    for (const r of entry.revisions) r.recordCount = entry.records.filter((x) => x.revision === r.revision).length;
    const since = now - 30 * DAY;
    entry.site.stats30d.total = entry.records.filter((x) => new Date(x.receivedAt).getTime() >= since).length;
  }
  return entry.records;
}
