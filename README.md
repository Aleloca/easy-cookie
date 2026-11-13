# easy-cookie

[![npm](https://img.shields.io/npm/v/@easy-cookie/core?label=%40easy-cookie%2Fcore)](https://www.npmjs.com/package/@easy-cookie/core)
[![CI](https://github.com/Aleloca/easy-cookie/actions/workflows/ci.yml/badge.svg)](https://github.com/Aleloca/easy-cookie/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Self-hosted, open-source cookie consent: an alternative to Iubenda's cookie solution, consent database and policy pages, that runs on your own server.**

You write one config per site, and it drives:
- the consent banner and preferences panel;
- blocking scripts and embeds until consent;
- Google Consent Mode v2;
- a proof-of-consent register in your own Postgres;
- the cookie policy, privacy policy and terms pages.

easy-cookie follows the Italian Garante's 2021 cookie guidelines and the EDPB cookie banner taskforce findings. No third-party SaaS is in the loop.

📖 **Documentation:** https://aleloca.github.io/easy-cookie/

> Status: **0.x, pre-release.** It runs in production on real sites, but APIs may still change before 1.0.

## Features

- **The banner the rules ask for**
  - "Accept all" and "Reject all" have equal weight.
  - The X counts as a rejection.
  - Categories are off by default.
  - Visitors are asked again when you publish a new revision, and after 6 months.
  - A floating button reopens the preferences.
- **Categories follow your services.** Once services are declared, a category with no services never reaches the banner, the policy or Consent Mode.
- **Prior blocking**
  - `<script type="text/plain" data-category>` stays inert until consent.
  - Iframes show a placeholder with "show once" or "always allow".
  - Withdrawing consent clears the category's cookies.
- **Google Consent Mode v2**
  - The default comes from the stored choice, before GTM.
  - `consent update` runs on the first choice and on every change.
  - A dataLayer event lets tags blocked on `gtm.init` fire. Its name is configurable, so a migration needs no GTM changes.
- **Proof of consent.** Every choice is stored on your server with:
  - date, policy revision and method;
  - categories and services;
  - a salted hash of the IP, never the raw IP.

  Records are append-only, can be linked to a user after login, exported as CSV, and accessed or erased per subject (GDPR art. 15 / 17).
- **Service library.** About 30 ready-made services (GA4, GTM, Meta Pixel, Google Ads, PostHog, Hotjar, YouTube, Stripe, reCAPTCHA, Intercom…) come with provider, privacy link, purpose and cookies, in English, Italian, Spanish, French, German and Portuguese. Add one and edit what you need.
- **Legal documents.** You write the cookie policy, privacy policy and terms in Markdown in the console, in several languages, and publish them as versioned documents.
  - Cookie tables and the list of services are generated from the banner config.
  - Each document is served as a ready-made hosted page, as an embeddable fragment, or rendered by your Next.js app.
- **Admin console** for sites, banner configuration (with a live desktop and mobile preview), revisions, legal documents, the consent register and API keys.
- **Adapters**
  - React hooks and components.
  - Next.js App Router helpers: Consent Mode in `<head>`, and server-side consent checks, e.g. to gate GA4 Measurement Protocol calls.
  - A PostHog adapter: cookieless until consent, opt-in without a reload, session replay.
- **Import** historical proofs from a home-made consent log.

## Packages

| Package | What it is |
|---|---|
| [`@easy-cookie/core`](packages/core) | Browser runtime: banner, preferences, blocking, Consent Mode, consent log client, embed placeholders. `@easy-cookie/core/shared` is DOM-free (config types, validation, cookie parsing, head snippet). `@easy-cookie/core/catalog` is the service library. |
| [`@easy-cookie/react`](packages/react) | `<EasyCookieProvider>`, `useConsent()`, `<ConsentGate>`, `<ConsentEmbed>`, `<PreferencesLink>` |
| [`@easy-cookie/next`](packages/next) | `<EasyCookieHead>` / `<EasyCookieHeadRemote>`, `getServerConsent()`, `getRemoteConfig()`, `getLegalDocument()` |
| [`@easy-cookie/policy`](packages/policy) | Cookie policy tables and legal documents rendering (HTML / Markdown / React), legal stylesheet |
| [`@easy-cookie/posthog`](packages/posthog) | `posthogInitOptions()` and `connectPostHog()`: cookieless until consent, no reload on opt-in |
| [`apps/server`](apps/server) | Consent server (Hono + Postgres): register, hosted configs and revisions, legal documents, `embed.js`, CLI |
| [`apps/console`](apps/console) | Admin console, served by the server under `/admin` |
| [`apps/site`](apps/site) | Project website and documentation |

## Quick start

### 1. Run the consent server

With Docker:

```sh
cp apps/server/.env.example apps/server/.env   # set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters)
docker compose --env-file apps/server/.env up -d
```

Then open `http://localhost:8787/admin`, create a site, add services from the library, and publish a revision.

To run without Docker on a VPS (Node, pm2, nginx and Postgres), `scripts/deploy-pm2.sh` uploads a release, builds it, smoke-tests it and switches over atomically. See [Self-hosting](https://aleloca.github.io/easy-cookie/docs/self-hosting/).

### 2. Add it to your site

**One script tag**, like Iubenda. The config is managed in the console:

```html
<head>
  <script src="https://consent.example.com/v1/sites/pk_xxx/embed.js"></script>
  <!-- then GTM / gtag -->
</head>
```

**Next.js App Router:**

```sh
pnpm add @easy-cookie/next @easy-cookie/react @easy-cookie/core
```

```tsx
// app/layout.tsx
import { EasyCookieHeadRemote, EasyCookieProvider } from '@easy-cookie/next';
import '@easy-cookie/core/style.css';

const remote = { endpoint: 'https://consent.example.com', siteKey: 'pk_xxx' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <EasyCookieHeadRemote {...remote} /> {/* before GTM */}
      </head>
      <body>
        <EasyCookieProvider remote={remote}>{children}</EasyCookieProvider>
      </body>
    </html>
  );
}
```

**npm, config in code:**

```ts
import EasyCookie, { defineConfig } from '@easy-cookie/core';
import '@easy-cookie/core/style.css';

EasyCookie.run(defineConfig({
  revision: '2026-11-13',
  categories: { necessary: { readOnly: true }, measurement: {} },
  services: { ga4: { category: 'measurement', label: 'Google Analytics 4', cookies: [{ name: '^_ga', pattern: true }] } },
  googleConsentMode: { enabled: true },
  log: { endpoint: 'https://consent.example.com', siteKey: 'pk_xxx' },
}));
```

The [documentation](https://aleloca.github.io/easy-cookie/) covers:
- prior blocking;
- Consent Mode and GTM;
- theming;
- the JavaScript API;
- legal documents;
- the service library;
- migrating from Iubenda.

## Development

```sh
pnpm install
pnpm -r build
pnpm -r test        # the server tests need Postgres: see apps/server/README.md
pnpm dev:server     # consent server on :8787
pnpm dev:console    # console with VITE_MOCK=1 for a mock API
```

Releases are automated:
1. Add a changeset (`pnpm changeset`) to your pull request.
2. On `main`, a "Version Packages" pull request collects the pending changesets.
3. Merging it publishes every `@easy-cookie/*` package to npm with provenance.

See [CONTRIBUTING.md](CONTRIBUTING.md).

Design notes:
- [Architecture and decisions](docs/ARCHITECTURE.md)
- [Consent server API](docs/api.md)
- [Research: how Iubenda works, and the legal checklist](docs/research/iubenda.md)

## Credits

The banner engine is a source fork of [vanilla-cookieconsent](https://github.com/orestbida/cookieconsent) v3 by Orest Bida (MIT), kept in `packages/core/src/engine` (see [UPSTREAM.md](packages/core/UPSTREAM.md)).

## License

[MIT](LICENSE)

easy-cookie helps you implement consent correctly, but it is not legal advice. The built-in legal templates are drafts that a professional should review. Your policies and your list of services remain your responsibility.
