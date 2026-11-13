import {
  DEFAULT_COOKIE_NAME,
  DEFAULT_EXPIRY_DAYS,
  DEFAULT_GCM_EVENT,
  DEFAULT_TEXTS,
  DEFAULT_WAIT_FOR_UPDATE,
  EXTRA_CATEGORY_COLORS,
  KNOWN_CATEGORIES,
} from './defaults';
import type { EasyCookieConfig, GcmSignal, Localized, Texts } from './types';

const GCM_SIGNALS: GcmSignal[] = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
];

/** Identity helper that gives editors type checking for a config object. */
export function defineConfig(config: EasyCookieConfig): EasyCookieConfig {
  return config;
}

export interface ConfigIssue {
  path: string;
  message: string;
}

/**
 * Validate a config. Returns every problem found (empty array = valid).
 * Hand-written to keep the browser bundle free of schema libraries; the
 * consent server runs the same function before publishing a revision.
 */
export function validateConfig(input: unknown): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  const isLocalized = (v: unknown) =>
    typeof v === 'string' || (isObj(v) && Object.values(v).every((x) => typeof x === 'string'));

  if (!isObj(input)) return [{ path: '', message: 'Config must be an object' }];
  const c = input as Partial<EasyCookieConfig>;

  if (typeof c.revision !== 'string' || !c.revision.trim()) add('revision', 'Required non-empty string');
  if (c.expiryDays !== undefined && (typeof c.expiryDays !== 'number' || c.expiryDays < 1 || c.expiryDays > 395))
    add('expiryDays', 'Must be a number between 1 and 395 (13 months)');

  if (!isObj(c.categories) || Object.keys(c.categories).length === 0) {
    add('categories', 'At least one category is required');
  } else {
    const readOnly = Object.entries(c.categories).filter(([, v]) => isObj(v) && v.readOnly);
    if (readOnly.length === 0) add('categories', 'Declare a readOnly category for strictly necessary cookies');
    for (const [id, cat] of Object.entries(c.categories)) {
      const p = `categories.${id}`;
      if (!/^[a-z][a-z0-9_-]*$/i.test(id)) add(p, 'Category id must be alphanumeric (a-z, 0-9, _ and -)');
      if (!isObj(cat)) {
        add(p, 'Must be an object');
        continue;
      }
      if (cat.title !== undefined && !isLocalized(cat.title)) add(`${p}.title`, 'Must be a string or a language map');
      if (cat.description !== undefined && !isLocalized(cat.description))
        add(`${p}.description`, 'Must be a string or a language map');
      if (cat.gcm !== undefined) {
        if (!Array.isArray(cat.gcm)) add(`${p}.gcm`, 'Must be an array');
        else cat.gcm.forEach((s, i) => GCM_SIGNALS.includes(s) || add(`${p}.gcm.${i}`, `Unknown Consent Mode signal "${s}"`));
      }
    }
  }

  if (c.services !== undefined) {
    if (!isObj(c.services)) add('services', 'Must be an object');
    else
      for (const [id, svc] of Object.entries(c.services)) {
        const p = `services.${id}`;
        if (!isObj(svc)) {
          add(p, 'Must be an object');
          continue;
        }
        if (typeof svc.category !== 'string' || !isObj(c.categories) || !(svc.category in c.categories))
          add(`${p}.category`, 'Must reference a declared category');
        if (svc.cookies !== undefined) {
          if (!Array.isArray(svc.cookies)) add(`${p}.cookies`, 'Must be an array');
          else
            svc.cookies.forEach((ck, i) => {
              if (!isObj(ck) || typeof ck.name !== 'string' || !ck.name) add(`${p}.cookies.${i}.name`, 'Required');
              else if (ck.pattern) {
                try {
                  new RegExp(ck.name);
                } catch {
                  add(`${p}.cookies.${i}.name`, 'Invalid regular expression');
                }
              }
            });
        }
        if (svc.privacyUrl !== undefined && typeof svc.privacyUrl !== 'string') add(`${p}.privacyUrl`, 'Must be a URL string');
        if (svc.from !== undefined && typeof svc.from !== 'string') add(`${p}.from`, 'Must be a catalog entry id string');
      }
  }

  if (c.log !== undefined) {
    if (!isObj(c.log) || typeof c.log.endpoint !== 'string' || typeof c.log.siteKey !== 'string')
      add('log', 'Requires endpoint and siteKey strings');
  }
  if (c.cookie?.sameSite === 'None' && c.cookie.secure === false) add('cookie.secure', 'SameSite=None requires secure');
  if (c.language && typeof c.language.default !== 'string') add('language.default', 'Required string');
  return issues;
}

/** Pick the string for `lang` from a Localized value, falling back to `fallback`, then to any value. */
export function localize(value: Localized | undefined, lang: string, fallback = 'en'): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value[fallback] ?? Object.values(value)[0] ?? '';
}

export interface ResolvedCategory {
  id: string;
  readOnly: boolean;
  title: Localized;
  description: Localized;
  gcm: GcmSignal[];
  color: string;
  services: string[];
}

export interface ResolvedConfig extends EasyCookieConfig {
  expiryDays: number;
  cookie: Required<Pick<NonNullable<EasyCookieConfig['cookie']>, 'name' | 'path' | 'sameSite' | 'secure'>> & { domain?: string };
  language: { default: string; available: string[]; autoDetect: 'document' | 'browser' | false };
  resolvedCategories: ResolvedCategory[];
  gcm: Required<Omit<NonNullable<EasyCookieConfig['googleConsentMode']>, 'region'>> & { region?: string[] };
}

/** Fill defaults. Pure and DOM-free: safe on the server and in the head snippet builder. */
export function resolveConfig(config: EasyCookieConfig): ResolvedConfig {
  let extra = 0;
  const services = config.services ?? {};
  const allCategories: ResolvedCategory[] = Object.entries(config.categories).map(([id, cat]) => {
    const known = KNOWN_CATEGORIES[id];
    return {
      id,
      readOnly: !!cat.readOnly,
      title: cat.title ?? known?.title ?? id,
      description: cat.description ?? known?.description ?? '',
      gcm: cat.gcm ?? known?.gcm ?? [],
      color: cat.color ?? known?.color ?? EXTRA_CATEGORY_COLORS[extra++ % EXTRA_CATEGORY_COLORS.length],
      services: Object.entries(services)
        .filter(([, s]) => s.category === id)
        .map(([sid]) => sid),
    };
  });
  // Like Iubenda, the banner asks only about what the site uses: once services are
  // declared, an optional category without services is left out of the banner,
  // the preferences, the policy and Consent Mode (its signals stay denied).
  // Configs without any service keep every category (script-tag-only setups).
  const resolvedCategories = Object.keys(services).length
    ? allCategories.filter((c) => c.readOnly || c.services.length > 0)
    : allCategories;
  const lang = config.language?.default ?? 'it';
  const gcm = config.googleConsentMode;
  return {
    ...config,
    expiryDays: config.expiryDays ?? DEFAULT_EXPIRY_DAYS,
    cookie: {
      name: config.cookie?.name ?? DEFAULT_COOKIE_NAME,
      path: config.cookie?.path ?? '/',
      sameSite: config.cookie?.sameSite ?? 'Lax',
      secure: config.cookie?.secure ?? true,
      domain: config.cookie?.domain,
    },
    language: {
      default: lang,
      available: config.language?.available ?? [lang],
      autoDetect: config.language?.autoDetect ?? 'document',
    },
    resolvedCategories,
    gcm: {
      enabled: gcm?.enabled ?? false,
      waitForUpdate: gcm?.waitForUpdate ?? DEFAULT_WAIT_FOR_UPDATE,
      adsDataRedaction: gcm?.adsDataRedaction ?? true,
      urlPassthrough: gcm?.urlPassthrough ?? false,
      region: gcm?.region,
      dataLayerName: gcm?.dataLayerName ?? 'dataLayer',
      eventName: gcm?.eventName ?? DEFAULT_GCM_EVENT,
    },
  };
}

/** Merge default texts for `lang` with the config overrides. */
export function resolveTexts(config: EasyCookieConfig, lang: string): Texts {
  const base = (DEFAULT_TEXTS as Record<string, Texts>)[lang] ?? DEFAULT_TEXTS.en;
  const over = config.texts?.[lang] ?? {};
  const out = JSON.parse(JSON.stringify(base)) as Texts;
  for (const [section, values] of Object.entries(over)) {
    if (values && typeof values === 'object') Object.assign((out as any)[section], values);
  }
  return out;
}

/**
 * Consent Mode state for a set of granted categories.
 * A signal is granted when any accepted category maps to it; `security_storage` is always granted.
 */
export function gcmStateFor(config: ResolvedConfig, granted: string[]): Partial<Record<GcmSignal, 'granted' | 'denied'>> {
  const out: Partial<Record<GcmSignal, 'granted' | 'denied'>> = {};
  for (const cat of config.resolvedCategories) for (const s of cat.gcm) out[s] = out[s] === 'granted' ? 'granted' : 'denied';
  for (const cat of config.resolvedCategories)
    if (cat.readOnly || granted.includes(cat.id)) for (const s of cat.gcm) out[s] = 'granted';
  // The four v2 core signals are always declared, so tags never see "undefined".
  for (const s of ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'] as GcmSignal[])
    if (!out[s]) out[s] = 'denied';
  out.security_storage = 'granted';
  return out;
}
