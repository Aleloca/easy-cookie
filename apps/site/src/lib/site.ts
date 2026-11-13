/** Site-wide constants and helpers. */

/** REPLACE before publishing: the public GitHub repository of the project. */
export const GITHUB_URL = 'https://github.com/OWNER/easy-cookie';

/** Date and version shown on the revision stamps of the docs. */
export const DOCS_UPDATED = '2026-11-13';
export const VERSION = '0.1.0';

/** Prefix a root-relative path with the configured base (GitHub Pages sub-path). */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (/^(https?:|mailto:|#)/.test(path)) return path;
  return base + (path.startsWith('/') ? path : '/' + path);
}

/** 2026-11-13 → 13·11·2026 (stamp format). */
export function stampDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}·${m}·${y}`;
}

export interface NavItem {
  slug: string;
  title: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Docs navigation, in reading order. Prev/next follow this order. */
export const DOCS_NAV: NavGroup[] = [
  {
    label: 'Per iniziare',
    items: [
      { slug: 'introduzione', title: 'Introduzione' },
      { slug: 'avvio-rapido', title: 'Avvio rapido' },
      { slug: 'configurazione', title: 'Configurazione' },
    ],
  },
  {
    label: 'Sul sito',
    items: [
      { slug: 'blocco-preventivo', title: 'Blocco preventivo' },
      { slug: 'consent-mode', title: 'Google Consent Mode v2 e GTM' },
      { slug: 'posthog', title: 'PostHog' },
      { slug: 'tematizzazione', title: 'Tematizzazione' },
      { slug: 'api', title: 'API JavaScript' },
    ],
  },
  {
    label: 'Prova del consenso',
    items: [
      { slug: 'registro-consensi', title: 'Registro dei consensi' },
      { slug: 'console', title: 'Console di amministrazione' },
      { slug: 'cookie-policy', title: 'Cookie policy generata' },
    ],
  },
  {
    label: 'Passare a easy-cookie',
    items: [
      { slug: 'migrazione-iubenda', title: 'Migrazione da Iubenda' },
      { slug: 'conformita', title: 'Conformità' },
    ],
  },
];

export const DOCS_FLAT: NavItem[] = DOCS_NAV.flatMap((g) => g.items);
