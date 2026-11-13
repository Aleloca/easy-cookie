/** Site-wide constants and helpers. */
import corePkg from '../../../../packages/core/package.json';

/** The public GitHub repository of the project. */
export const GITHUB_URL = 'https://github.com/Aleloca/easy-cookie';
/** npm: the main package and the scope every package is published under. */
export const NPM_URL = 'https://www.npmjs.com/package/@easy-cookie/core';
export const NPM_ORG_URL = 'https://www.npmjs.com/org/easy-cookie';

/** Date shown on the revision stamps of the docs. */
export const DOCS_UPDATED = '2026-11-13';
/** Published version of the packages (they share one), read from @easy-cookie/core at build time. */
export const VERSION: string = corePkg.version;

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
    label: 'Getting started',
    items: [
      { slug: 'introduction', title: 'Introduction' },
      { slug: 'quick-start', title: 'Quick start' },
      { slug: 'configuration', title: 'Configuration' },
      { slug: 'service-library', title: 'Service library' },
    ],
  },
  {
    label: 'On your site',
    items: [
      { slug: 'prior-blocking', title: 'Prior blocking' },
      { slug: 'consent-mode', title: 'Google Consent Mode v2 and GTM' },
      { slug: 'posthog', title: 'PostHog' },
      { slug: 'theming', title: 'Theming' },
      { slug: 'api', title: 'JavaScript API' },
    ],
  },
  {
    label: 'Policies',
    items: [
      { slug: 'cookie-policy', title: 'Cookie policy tables' },
      { slug: 'legal-documents', title: 'Legal documents' },
    ],
  },
  {
    label: 'Consent server',
    items: [
      { slug: 'self-hosting', title: 'Self-hosting' },
      { slug: 'console', title: 'Admin console' },
      { slug: 'consent-register', title: 'Consent register' },
      { slug: 'importing-records', title: 'Importing records' },
    ],
  },
  {
    label: 'Switching to easy-cookie',
    items: [
      { slug: 'migrating-from-iubenda', title: 'Migrating from Iubenda' },
      { slug: 'compliance', title: 'Compliance' },
    ],
  },
];

export const DOCS_FLAT: NavItem[] = DOCS_NAV.flatMap((g) => g.items);
