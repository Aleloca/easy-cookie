# easy-cookie — architecture

Status: draft, 2026-11-13. Background: [research/iubenda.md](research/iubenda.md) and [research/existing-implementations.md](research/existing-implementations.md).

## Goal

A self-hosted, open-source replacement for the parts of Iubenda that small projects need:
- a consent banner with prior blocking and Google Consent Mode v2;
- a proof-of-consent service;
- a cookie policy generated from the same config.

It is reusable across projects and replaces the two custom implementations in FermoUnAttimo and MythicVoices.

**Non-goals (v1):** IAB TCF, privacy policy / T&C text generation, records of processing, US/LGPD/FADP regimes, geo-targeting, auto-blocking via a domain list, cookie scanner.

## Decisions

| # | Decision | Notes |
|---|---|---|
| D1 | **Fork orestbida/cookieconsent v3.3.0** into the repo as source (not an npm dependency). | MIT: keep the original LICENSE and copyright in the forked package and record the upstream tag/commit in `UPSTREAM.md`. Upstream fixes are cherry-picked by hand. |
| D2 | **Proof of consent is a standalone service** (`apps/consent-server`), shared by all sites. | Multi-site, with per-site keys. Modelled on the Iubenda Consent DB, with FermoUnAttimo's `ConsentLog` as the schema base. |
| D3 | **v1 targets vanilla JS (script tag + ESM) and React/Next.js.** | Vue/Svelte later, through the same core. |
| D4 | One declarative config is the single source of truth for categories, services, cookies, texts and the policy revision. | It generates the banner tables, the autoClear rules, the Consent Mode mapping and the cookie policy. |
| D5 | Repo docs are in English (open-source audience). UI ships IT + EN. | |
| D6 | **npm scope `@easy-cookie/*`, license MIT.** | The unscoped `easy-cookie` name is taken (zkochan, dormant since 2015), so the main package is `@easy-cookie/core`. The npm org and GitHub org `easy-cookie` must be created to reserve the name. |
| D7 | **Postgres** is the only database for the consent server. | No SQLite in v1. |
| D9 | **The consent server also hosts the config, and the admin console edits it** (Iubenda parity): sites, banner config with live preview, published revisions, consent register. Sites can load it with one `<script src=".../embed.js">` or keep the config in code and push it from CI. | Contract: [api.md](api.md). Console = `apps/console` (React + Vite SPA served by the server at `/admin`). |
| D10 | **Visual identities**: the banner uses "Modulo Olivetti" (category colour modules, restylable through `--ec-*` variables). The platform (console + public site) uses "Libretto" (passbook). | Contracts in `.impeccable/surfaces/` and `apps/console/.impeccable/surfaces/`. |
| D11 | **Upstream engine tests keep running on Jest** (as upstream); our TypeScript tests use Vitest. | Avoids rewriting 196 tests whose timing semantics are Jest-specific. |
| D8 | **One cookie format everywhere: `ec_consent`.** | MythicVoices (`cc_cookie`) and FermoUnAttimo (`fua_consent`) migrate to it. Users are re-prompted once. |

## Repository layout (pnpm workspace, TypeScript)

```
packages/
  core/            (@easy-cookie/core) fork of vanilla-cookieconsent + our additions: unified config,
                   Consent Mode v2, consent-log client, iframe placeholders, reopen button,
                   CSS-variable theme, IT/EN translations. Builds ESM + UMD/IIFE + CSS.
  react/           <EasyCookieProvider>, useConsent(), <ConsentScripts/>, <PreferencesButton/>
  next/            <EasyCookieHead/> (inline Consent Mode default snippet for app/layout),
                   getServerConsent(cookies()) for RSC/route handlers
  policy/          config → cookie table / cookie policy (HTML string, React component, Markdown)
  adapters/posthog cookieless on_reject + opt_in/out, synced with consent
apps/
  consent-server/  standalone proof-of-consent service (see below)
  playground/      static demo + Next demo used for manual/e2e testing
```

## Config (single source of truth)

```ts
import { defineConfig } from '@easy-cookie/core';

export default defineConfig({
  revision: '2026-11-13',           // bump → everyone is re-prompted
  expiryDays: 180,                  // re-prompt after 6 months (Garante)
  cookie: { name: 'ec_consent', secure: true, sameSite: 'Lax' },
  policyUrl: '/cookie',
  log: { endpoint: 'https://consent.example.com', siteKey: 'pk_live_…' }, // optional
  googleConsentMode: { enabled: true, waitForUpdate: 500, adsDataRedaction: true },
  categories: {
    necessary:   { readOnly: true },
    measurement: { gcm: ['analytics_storage'] },
    marketing:   { gcm: ['ad_storage', 'ad_user_data', 'ad_personalization'] },
  },
  services: {
    ga4: {
      category: 'measurement', provider: 'Google Ireland Ltd',
      privacyUrl: 'https://policies.google.com/privacy',
      cookies: [{ name: /^_ga(_.*)?$/, duration: { it: '2 anni', en: '2 years' } }],
    },
    posthog: {
      category: 'measurement', provider: 'PostHog Inc.',
      cookies: [{ name: /^ph_.*_posthog$/, duration: { it: '1 anno', en: '1 year' } }],
    },
    meta: {
      category: 'marketing', provider: 'Meta Platforms Ireland Ltd',
      cookies: [{ name: /^_fb[pc]$/, duration: { it: '3 mesi', en: '3 months' } }],
    },
  },
  translations: { it: () => import('./it.json'), en: () => import('./en.json') },
});
```

Category ids are free strings. Iubenda purpose ids (1–5) are recommended as names (`necessary`, `functionality`, `experience`, `measurement`, `marketing`) to ease migration.

## Client behaviour

- **Banner, first layer:**
  - short text and a cookie policy link;
  - **Accept all / Reject all / Customize with equal weight**;
  - an X that **counts as reject**, logged as `close`.
- **Preferences:** a toggle per category (optionally per service), all **off by default**, cookie tables generated from the config, focus trap and ARIA.
- **Reopen:** a floating button with route exclusion (e.g. `/dashboard*`) + `openPreferences()` for footer links.
- **Stored cookie** `ec_consent`: the engine's (vanilla-cookieconsent) JSON format, with easy-cookie's own fields in `data.ec`:
  ```json
  {"categories":["necessary","measurement"],"revision":0,"consentId":"<uuid>","consentTimestamp":"…","lastConsentTimestamp":"…",
   "services":{"measurement":["ga4"]},"languageCode":"it","expirationTime":…,"data":{"ec":{"rev":"2026-11-13","method":"custom"}}}
  ```
  The engine's numeric `revision` is unused: our string revision lives in `data.ec.rev`, and parsing is shared by the runtime, the head snippet and the server reader (`packages/core/src/shared/cookie.ts`).
  The banner reappears when `rev` changes or `ts` is older than `expiryDays`.
- **Prior blocking:**
  - `<script type="text/plain" data-category="measurement" data-service="ga4" data-src="…">` (upstream mechanism);
  - `<iframe data-category="experience" data-src="…">` with a localized **placeholder** and an "enable" button.
  - Optional compatibility with Iubenda markup (`_iub_cs_activate`, `data-iub-purposes`, `data-suppressedsrc`) via a category-id map, so existing sites migrate without rewriting tags.
- **Withdrawal:** cookies of the revoked category are cleared (autoClear generated from `services.*.cookies`), Consent Mode is updated, and the page reloads only for scripts that can't be unloaded (configurable).

### Google Consent Mode v2

1. The inline **head snippet** is generated by the library (`<EasyCookieHead/>` or `easyCookie.headSnippet(config)`) and placed before GTM/gtag.
   - It reads `ec_consent` synchronously.
   - It calls `gtag('consent','default', …)` with the real stored state: denied when there is no valid choice, or when the stored choice is stale or from an old revision.
   - It sets `ads_data_redaction` when configured.
   - It is the only place that parses the cookie outside the library, and it is generated from the same code, so there are no hand-copies.
2. On the **first choice and on changes** (never on page-load replay):
   - `gtag('consent','update', …)`;
   - `dataLayer.push({event: 'easy_cookie_update', consent: {...}, first: bool})`.

   This fixes the "tag blocked on gtm.init never re-fires" issue. The docs ship a ready-to-import GTM trigger/tag template.
3. Events: `ec:ready`, `ec:consent` (first choice), `ec:change`, `ec:replay` (stored consent applied on load). The API exposes `onConsent(category, cb)`.

### API

```ts
easyCookie.run(config)
easyCookie.get()                     // { id, rev, cats, svc, ts, method } | null
easyCookie.isGranted('measurement')  // boolean
easyCookie.on('change', cb)          // returns an unsubscribe function
easyCookie.openPreferences()
easyCookie.acceptAll() / rejectAll() / reset()
easyCookie.identify(userId)          // links the anonymous consent id to a user on the consent server
```
React: `useConsent()` → `{ consent, isGranted, ready, openPreferences }`.
Next.js: `getServerConsent(await cookies(), config)` so RSC can skip rendering non-consented scripts.

## Consent server (`apps/consent-server`)

Standalone, multi-site, self-hosted (Docker image). Proposed stack: **Node + Hono + Postgres + Prisma** (Prisma is already used in FermoUnAttimo).

### Data model (draft)

```prisma
model Site {
  id           String   @id @default(cuid())
  name         String
  origins      String[] // CORS allow-list
  publicKey    String   @unique  // pk_… write-only, embeddable in the browser
  secretKey    String   @unique  // sk_… (stored hashed) read/export/delete
  ipHashSalt   String
  createdAt    DateTime @default(now())
}

model PolicyVersion {               // immutable snapshot of the config the user saw
  id        String   @id @default(cuid())
  siteId    String
  revision  String
  snapshot  Json     // categories, services, texts
  createdAt DateTime @default(now())
  @@unique([siteId, revision])
}

model ConsentRecord {               // append-only
  id          String   @id @default(cuid())
  siteId      String
  consentId   String   // uuid from the client cookie
  subjectId   String?  // set via identify()
  revision    String
  categories  Json     // {"measurement":true,...}
  services    Json?
  method      String   // accept_all | reject_all | custom | close | withdraw
  ipHash      String?
  userAgent   String?
  pageUrl     String?
  createdAt   DateTime @default(now())
  @@index([siteId, consentId, createdAt])
  @@index([siteId, subjectId])
}
```

### API (draft)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v1/consents` | public key + Origin check | Record a choice (from the browser, `keepalive`) |
| POST | `/v1/consents/:consentId/subject` | public key | Link a consent id to a user (`identify`) |
| GET | `/v1/consents?consentId=&subjectId=&from=&to=` | secret key | Proof / audit / export |
| GET | `/v1/subjects/:subjectId/consents` | secret key | Data access request (GDPR art. 15) for a back end |
| DELETE | `/v1/subjects/:subjectId` | secret key | Erasure (art. 17) |
| PUT | `/v1/policy-versions/:revision` | secret key | Publish a config snapshot (CI step on deploy) |

### Client ↔ log consistency

FermoUnAttimo set the cookie only after the log write (same origin). With a cross-origin service that would delay the banner, so:
- the cookie is written immediately and the record is POSTed with `keepalive`;
- on failure the record is queued in localStorage and retried on the next page load (the Iubenda approach);
- an optional `requireLog: true` mode keeps the banner open with an error state until the server confirms.

Privacy of the log itself:
- the IP is stored only as `sha256(salt‖ip)` (or a truncated IP, configurable);
- no raw IP and no cookies are set by the server;
- retention is configurable.

Admin UI (list/search/export CSV per site) is v1.1. v1 offers a CLI (`easy-cookie-server site create`, `export`).

## Migration

- **MythicVoices:**
  - replace `CookieConsent.tsx`, the inline snippet in `layout.tsx` and the 3 cookie parsers with `<EasyCookieHead/>`, `<EasyCookieProvider>` and `useConsent()`;
  - use the PostHog adapter;
  - re-point the GTM triggers to `easy_cookie_update`;
  - the cookie policy section becomes `<CookiePolicy/>`.
- **FermoUnAttimo:**
  - replace `ConsentBanner`, `CookieFab`, `useConsent` and `/api/consent*`;
  - optionally import existing `ConsentLog` rows into the consent server;
  - this fixes the version-mismatch and pre-ticked-checkbox bugs by construction;
  - gate GA4 Measurement Protocol with `getServerConsent()`.

## Milestones

1. **M0 Scaffold:** pnpm workspace, the fork imported as is (upstream tests green), LICENSE/NOTICE/UPSTREAM.md, CI.
2. **M1 Core:** config schema + validation, cookie format/revision/expiry, Consent Mode v2 head snippet + events, IT/EN, theme variables, iframe placeholder, reopen button.
3. **M2 React/Next:** provider, hook, head component, server reader, playground app.
4. **M3 Consent server:** schema, API, keys, CLI, Docker image, client log queue.
5. **M4 Policy generator + PostHog adapter.**
6. **M5 Migrate MythicVoices, then FermoUnAttimo.** Release 1.0 on GitHub + npm.

## Open questions

- Hosting of the consent server (one instance for all sites?).
- Iubenda-markup compatibility: worth it in v1?
