import { localize, resolveConfig, type EasyCookieConfig } from '@easy-cookie/core/shared';

export interface PolicyLabels {
  cookie: string;
  service: string;
  provider: string;
  duration: string;
  purpose: string;
  /** Prefix of the "last updated" line. */
  updated: string;
  revision: string;
  alwaysOn: string;
  privacyPolicy: string;
  /** Shown in a category without services. */
  noCookies: string;
  /** Shown in the cookie column for a service that sets no cookies. */
  noCookie: string;
  /** Table caption: `{category}` is replaced with the category title. */
  caption: string;
}

/** Built-in table headers and labels. Unknown languages fall back to English. */
export const POLICY_LABELS: Record<'it' | 'en', PolicyLabels> = {
  it: {
    cookie: 'Cookie',
    service: 'Servizio',
    provider: 'Fornitore',
    duration: 'Durata',
    purpose: 'Finalità',
    updated: 'Ultimo aggiornamento',
    revision: 'Revisione',
    alwaysOn: 'Sempre attivi',
    privacyPolicy: 'Privacy policy',
    noCookies: 'Nessun cookie dichiarato in questa categoria.',
    noCookie: '—',
    caption: 'Cookie della categoria «{category}»',
  },
  en: {
    cookie: 'Cookie',
    service: 'Service',
    provider: 'Provider',
    duration: 'Duration',
    purpose: 'Purpose',
    updated: 'Last updated',
    revision: 'Revision',
    alwaysOn: 'Always on',
    privacyPolicy: 'Privacy policy',
    noCookies: 'No cookies declared in this category.',
    noCookie: '—',
    caption: 'Cookies in the “{category}” category',
  },
};

export interface PolicyCookie {
  /** Name as declared (a regular expression source when `pattern` is true). */
  name: string;
  /** Human-friendly name: anchors stripped, `.*` shown as `*` for patterns. */
  displayName: string;
  pattern: boolean;
  duration: string;
  description: string;
  domain?: string;
}

export interface PolicyService {
  id: string;
  label: string;
  provider: string;
  privacyUrl?: string;
  purpose: string;
  cookies: PolicyCookie[];
}

export interface PolicyCategory {
  id: string;
  title: string;
  description: string;
  readOnly: boolean;
  color: string;
  services: PolicyService[];
}

export interface PolicyModel {
  lang: string;
  revision: string;
  /** ISO date (YYYY-MM-DD) of the revision, when known. */
  date?: string;
  policyUrl?: string;
  labels: PolicyLabels;
  categories: PolicyCategory[];
}

export interface BuildPolicyOptions {
  /** Date of this revision (ISO). Defaults to the revision itself when it starts with YYYY-MM-DD. */
  date?: string | Date;
  /** Override some labels. */
  labels?: Partial<PolicyLabels>;
}

/** Make a cookie-name regular expression readable: `^_ga_.*$` → `_ga_*`. */
export function prettyCookiePattern(source: string): string {
  return source
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/\(([^()]*)\)\?/g, '[$1]')
    .replace(/\.\*|\.\+|\[\^[^\]]*\]\*|\\d\+|\\w\+/g, '*')
    .replace(/\\(.)/g, '$1');
}

function isoDate(value: string | Date | undefined, revision: string): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  const m = /^\d{4}-\d{2}-\d{2}/.exec(revision);
  return m ? m[0] : undefined;
}

/**
 * Turn the config into a localized, render-agnostic cookie policy model:
 * categories → services → cookies. Pure and DOM-free.
 */
export function buildPolicyModel(config: EasyCookieConfig, lang: string, opts: BuildPolicyOptions = {}): PolicyModel {
  const resolved = resolveConfig(config);
  const fallback = resolved.language.default;
  const l = (v: Parameters<typeof localize>[0]) => localize(v, lang, fallback);
  const labels = { ...((POLICY_LABELS as Record<string, PolicyLabels>)[lang] ?? POLICY_LABELS.en), ...opts.labels };
  const services = config.services ?? {};

  return {
    lang,
    revision: config.revision,
    date: isoDate(opts.date, config.revision),
    policyUrl: config.policyUrl ? l(config.policyUrl) : undefined,
    labels,
    categories: resolved.resolvedCategories.map((cat) => ({
      id: cat.id,
      title: l(cat.title),
      description: l(cat.description),
      readOnly: cat.readOnly,
      color: cat.color,
      services: cat.services.map((id) => {
        const s = services[id];
        return {
          id,
          label: s.label ? l(s.label) : id,
          provider: s.provider ?? '',
          privacyUrl: s.privacyUrl,
          purpose: l(s.purpose),
          cookies: (s.cookies ?? []).map((ck) => ({
            name: ck.name,
            displayName: ck.pattern ? prettyCookiePattern(ck.name) : ck.name,
            pattern: !!ck.pattern,
            duration: l(ck.duration),
            description: l(ck.description),
            domain: ck.domain,
          })),
        };
      }),
    })),
  };
}

/** Format the model date for display, e.g. "13 novembre 2026" / "November 13, 2026". */
export function formatPolicyDate(model: Pick<PolicyModel, 'date' | 'lang'>): string | undefined {
  if (!model.date) return undefined;
  const d = new Date(`${model.date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return model.date;
  try {
    return new Intl.DateTimeFormat(model.lang, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
  } catch {
    return model.date;
  }
}

export interface AutoClearRule {
  /** Cookie name, or a regular expression source when `pattern` is true. */
  name: string;
  pattern: boolean;
  domain?: string;
  service: string;
}

/**
 * Cookies to delete when a category is withdrawn, per category id.
 * Read-only (necessary) categories are omitted: they cannot be withdrawn.
 */
export function autoClearRules(config: EasyCookieConfig): Record<string, AutoClearRule[]> {
  const out: Record<string, AutoClearRule[]> = {};
  for (const [id, cat] of Object.entries(config.categories)) if (!cat.readOnly) out[id] = [];
  for (const [service, s] of Object.entries(config.services ?? {})) {
    const list = out[s.category];
    if (!list) continue;
    for (const ck of s.cookies ?? [])
      list.push({ name: ck.name, pattern: !!ck.pattern, ...(ck.domain ? { domain: ck.domain } : {}), service });
  }
  return out;
}

/** True when `cookieName` matches the rule. */
export function matchesRule(rule: Pick<AutoClearRule, 'name' | 'pattern'>, cookieName: string): boolean {
  if (!rule.pattern) return rule.name === cookieName;
  try {
    return new RegExp(rule.name).test(cookieName);
  } catch {
    return false;
  }
}
