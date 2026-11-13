/** Landing copy. Facts only: no adoption numbers, testimonials or benchmarks. */

/** Revision of the sample config; its stamp (r26-11-13) signs the first viewport. */
export const configRevision = '2026-11-13';
export const configStamp = `r${configRevision.slice(2)}`;

export const configSnippet = `export default defineConfig({
  revision: '${configRevision}',
  policyUrl: '/cookie-policy',
  googleConsentMode: { enabled: true },
  log: { endpoint: 'https://consent.example.com',
         siteKey: 'pk_live_xxx' },
  categories: {
    necessary: { readOnly: true },
    measurement: {},
    marketing: {},
  },
  services: {
    ga4: catalogToService(findCatalogEntry('ga4')!),
    meta: { category: 'marketing',
            provider: 'Meta Platforms Ireland Ltd',
            cookies: [{ name: '_fbp' }] },
  },
});`;

export const installSnippets = {
  embed: `<head>
  <script src="https://consent.example.com/v1/sites/pk_live_xxx/embed.js"></script>
  <!-- then Google Tag Manager -->
</head>`,
  npm: `pnpm add @easy-cookie/core

import EasyCookie from '@easy-cookie/core';
import '@easy-cookie/core/style.css';
import config from './easy-cookie.config';

EasyCookie.run(config);`,
  next: `pnpm add @easy-cookie/next @easy-cookie/react @easy-cookie/core

// app/layout.tsx
import { EasyCookieHead, EasyCookieProvider } from '@easy-cookie/next';
import config from '../easy-cookie.config';
import '@easy-cookie/core/style.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head><EasyCookieHead config={config} />{/* before GTM */}</head>
      <body><EasyCookieProvider config={config}>{children}</EasyCookieProvider></body>
    </html>
  );
}`,
};

export const legalSnippet = `# Cookie policy

{{last-updated}}

Run by [[Company name]], [[address]].

## Cookies we use

{{cookie-table}}

## Changing your choice

You can change or withdraw your consent at any time:
{{preferences-link}}`;

export const hostingSnippets = {
  docker: `cp apps/server/.env.example .env   # ADMIN_*, PUBLIC_URL, POSTGRES_PASSWORD
docker compose up -d --build
open http://localhost:8787/admin/`,
  pm2: `# Node + pm2 + nginx + Postgres on your own VPS
scripts/deploy-pm2.sh my-vps

# → upload HEAD, build, migrate, smoke-test,
#   switch \`current\` atomically, pm2 reload,
#   keep the last 5 releases`,
};

export const copy = {
  title: 'easy-cookie · open-source, self-hosted cookie consent',
  description:
    'Open-source (MIT), self-hosted alternative to Iubenda: banner, prior blocking, Google Consent Mode v2, a library of ready-made services, proof-of-consent register, cookie policy tables and legal documents, from one config.',
  nav: { docs: 'Documentation', start: 'Quick start', npm: 'npm', github: 'GitHub' },
  h1: 'Cookie consent, from one config.',
  lede:
    'easy-cookie is the open-source, self-hosted alternative to Iubenda. One config generates the banner, blocks scripts until the visitor chooses, drives Google Consent Mode v2, records every choice on your server and fills in the cookie policy.',
  ctaDemo: 'Try the banner',
  ctaStart: 'Quick start',
  terms: (v: string) => `MIT licence · v${v} on npm · you host it`,
  spreadLeft: 'easy-cookie.config.ts',
  spreadRight: 'What comes out',
  outputs: [
    { keys: 'categories · texts', title: 'Banner and preferences', body: 'Accept and Reject carry equal weight, the X counts as a rejection, categories are off by default. Italian and English.' },
    { keys: 'services', title: 'Prior blocking', body: 'Scripts and iframes run only after consent. On withdrawal their cookies are cleared.' },
    { keys: 'categories[].gcm', title: 'Google Consent Mode v2', body: 'The right default in <head> before GTM, then an update and a dataLayer event on every choice.' },
    { keys: 'revision · log', title: 'Consent register', body: 'Every choice becomes an entry with date and revision, on your server. IPs stored only as hashes.' },
    { keys: 'services[].cookies', title: 'Cookie policy', body: 'The cookie tables come from the same source, so the policy cannot drift from the banner.' },
  ],
  demoH2: 'Try the real banner',
  demoLede:
    'Below is an example page running the easy-cookie runtime, untouched. Choose whatever you like: the log beside it shows what happens, in order.',
  demoFrameTitle: 'Demo: example page with the easy-cookie banner',
  demoReset: 'Reopen the demo banner',
  demoLogTitle: 'Demo log',
  demoLogEmpty: 'Waiting for the example page…',
  demoNote:
    'This site sets no profiling or analytics cookies. The demo only stores a technical cookie, ec_demo, scoped to its own page, to remember your test choice. No data leaves your browser: the demo services are never actually loaded and no record is sent.',
  log: {
    default: 'Consent Mode · default',
    update: 'Consent Mode · update',
    event: 'dataLayer · easy_cookie_update',
    blocked: 'Scripts held back',
    ran: 'Script executed',
    record: 'Record for the register',
    replay: 'Stored choice re-applied',
    ready: 'Banner ready',
  },
  libraryH2: 'Start from the service library',
  libraryLede:
    'easy-cookie ships ready-made declarations for common services: provider, privacy link, default category, purpose and cookies with their durations, in Italian and English. In the console, “Add from library” copies an entry into your config, where it stays yours to edit.',
  libraryCols: ['Group', 'Services', 'Default category'],
  libraryNote:
    'Default categories follow the Italian Garante 2021 guidelines. Providers change their cookies over time: check each entry against your own setup.',
  libraryLink: 'Service library',
  registerH2: 'Every choice, an entry in the register',
  registerLede:
    'The consent server keeps proof of every choice, like a passbook: date, revision of the config that was shown, method, categories. Entries are never corrected: a new choice is a new entry, a withdrawal is a stamped entry.',
  registerCaption: 'Excerpt from a site register',
  registerExample: 'Example · synthetic data',
  registerCols: ['Stamp', 'Consent ID', 'Method', 'Categories', 'User', 'IP hash'],
  registerLegend: 'Squares, left to right: necessary, experience, measurement, marketing. Filled = granted.',
  methods: { accept_all: 'accept all', reject_all: 'reject all', custom: 'custom', close: 'closed (X)', withdraw: 'withdrawal' },
  registerPoints: [
    { title: 'GDPR art. 7(1)', body: 'Prove consent with the choice, the moment and the exact config revision that was shown.' },
    { title: 'IPs only as hashes', body: 'sha256 with a per-site salt. No raw IP, no cookies set by the server.' },
    { title: 'Art. 15 and 17', body: 'Access and erasure per user with two authenticated calls. Export the register as CSV from the console.' },
  ],
  registerLink: 'How the register works',
  legalH2: 'Cookie policy, privacy policy, terms',
  legalLede:
    'Write the three legal documents of each site in the console, in Markdown, in Italian and English. Directives pull the cookie tables and the service list from the published banner config, so the text and the banner stay in step.',
  legalFile: 'cookie.md · draft',
  legalPoints: [
    { title: 'Drafts, not legal advice', body: 'Built-in Italian and English templates mark every value you must supply as a [[placeholder]]. The console counts them and warns you before you publish. Have the text reviewed by a professional.' },
    { title: 'Immutable versions', body: 'Publishing stamps a new version. Updating a legal document does not re-prompt your visitors; changing what the banner declares does.' },
    { title: 'Anywhere you need it', body: 'A hosted page at /p/:publicKey/:kind, JSON or an HTML fragment, a legal.js loader, or getLegalDocument() in a Next.js Server Component.' },
  ],
  legalLink: 'Legal documents',
  complianceH2: 'Compliant by construction',
  complianceLede:
    'The rules of the Italian data protection authority (Garante, 2021) and of the EDPB cookie banner taskforce are not options to switch on: they are how the software behaves, and integrators cannot get them wrong.',
  complianceCols: ['Requirement', 'How easy-cookie meets it'],
  compliance: [
    ['Accept and reject equally prominent', 'Two equal halves of one grid, same style, on the first layer.'],
    ['Closing is not accepting', 'The X records a rejection, with method close.'],
    ['Scrolling is not consent', 'Consent comes only from an explicit control.'],
    ['No pre-ticked boxes', 'Every non-necessary category starts off.'],
    ['No trackers before the choice', 'Marked scripts and iframes stay idle; Consent Mode starts all denied.'],
    ['Withdrawing as easy as consenting', 'Always-available button; on withdrawal cookies are cleared and Google is updated.'],
    ['No re-prompt before 6 months', 'Default expiry 182 days; earlier only when you change the revision.'],
    ['Able to prove consent', 'Append-only register with the accepted revision.'],
  ],
  complianceNote:
    'Marking every third-party tag, reviewing the policy texts and choosing data retention remain your job. This is not legal advice.',
  complianceLink: 'The full checklist',
  compareH2: 'easy-cookie and Iubenda',
  compareLede:
    'Iubenda is a complete, established service. easy-cookie covers its cookie and consent part, with a different model: the code is yours and runs on your servers.',
  compareCols: ['', 'Iubenda', 'easy-cookie'],
  compare: [
    ['Model', 'SaaS, closed source', 'Free software, MIT licence'],
    ['Cost', 'Subscription by plan', 'No licence fee: you only pay for hosting'],
    ['Config and register', "On Iubenda's servers", 'On your server, in Postgres'],
    ['Banner, preferences, prior blocking', 'Yes', 'Yes, with declared markup'],
    ['Automatic blocking of known domains', 'Yes', 'No'],
    ['Google Consent Mode v2', 'Yes', 'Yes, with a configurable GTM event'],
    ['Proof of consent', 'Consent Database', 'Self-hosted consent server, with import of past records'],
    ['Placeholders for blocked iframes', 'Not standard', 'Yes'],
    ['Cookie and privacy policy', 'Policy generator', 'Generated cookie tables, plus editable Markdown drafts to review'],
    ['IAB TCF, non-EU regimes, geolocation', 'Yes', 'No'],
    ['Banner languages', 'Many', 'Italian and English, every string overridable'],
  ],
  compareLink: 'Migrating from Iubenda',
  hostingH2: 'Host it yourself',
  hostingLede:
    'The consent server is Node, Hono and Postgres. It serves the published config, the runtime, the legal documents and the admin console at /admin. Run it in two ways.',
  hosting: [
    { key: 'docker', title: 'Docker Compose', body: 'Postgres and the server in one command, listening on port 8787. Put it behind a TLS reverse proxy for production.', lang: 'sh' },
    { key: 'pm2', title: 'Node, pm2 and nginx', body: 'A deploy script for a VPS without Docker: atomic release switch, smoke test before going live, the last five releases kept for rollback.', lang: 'sh' },
  ],
  hostingLink: 'Self-hosting guide',
  installH2: 'Install',
  installLede: 'Three paths, one config. The Consent Mode snippet always goes before Google Tag Manager.',
  install: [
    { key: 'embed', title: 'One tag from the consent server', body: 'Config managed in the console and published as revisions, as with Iubenda.', lang: 'html' },
    { key: 'npm', title: 'npm or script tag', body: 'Config in your repository, versioned with the code.', lang: 'ts' },
    { key: 'next', title: 'Next.js App Router', body: 'With @easy-cookie/next and @easy-cookie/react, consent readable on the server too.', lang: 'tsx' },
  ],
  packagesLabel: 'Packages on npm',
  installLink: 'Full quick start',
  footer: {
    about: 'easy-cookie is free software under the MIT licence. Built on a fork of vanilla-cookieconsent (MIT, © Orest Bida).',
    cookies: 'This site sets no profiling or analytics cookies.',
    repo: 'Source code on GitHub',
    npm: 'Packages on npm',
    docs: 'Documentation',
    legal: 'The documentation is not legal advice.',
  },
} as const;

export const PACKAGES = ['core', 'react', 'next', 'policy', 'posthog'] as const;

/** Synthetic register rows, newest first. Categories: necessary, experience, measurement, marketing. */
export const registerRows = [
  { date: '2026-11-13', time: '09:41', rev: '2026-11-13', id: '8f14e45f…3b91', method: 'withdraw', cats: [1, 0, 0, 0], user: 'user_4821', ip: 'a3f1…9c0e' },
  { date: '2026-11-13', time: '09:38', rev: '2026-11-13', id: '2c9d71b0…77aa', method: 'close', cats: [1, 0, 0, 0], user: '—', ip: '51be…02d4' },
  { date: '2026-11-12', time: '21:07', rev: '2026-11-13', id: '6e0a33c2…e815', method: 'custom', cats: [1, 1, 1, 0], user: '—', ip: 'c7d2…4a1b' },
  { date: '2026-11-12', time: '18:52', rev: '2026-11-13', id: 'b41f08d9…0c3e', method: 'reject_all', cats: [1, 0, 0, 0], user: '—', ip: '0e9a…f7c2' },
  { date: '2026-11-12', time: '18:30', rev: '2026-11-13', id: '8f14e45f…3b91', method: 'accept_all', cats: [1, 1, 1, 1], user: 'user_4821', ip: 'a3f1…9c0e' },
  { date: '2026-10-02', time: '11:15', rev: '2026-09-30', id: 'd19e5a47…6b02', method: 'custom', cats: [1, 0, 1, 0], user: '—', ip: '7b3c…e1d9' },
] as const;
