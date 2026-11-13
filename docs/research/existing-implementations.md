# Existing implementations (FermoUnAttimo, MythicVoices)

Survey done on 2026-11-13 by reading both codebases (no changes made). Goal: extract what works and what hurts, so easy-cookie can replace both.

## MythicVoices

**Stack:** Next.js 16 App Router, React 19, next-intl, Tailwind, posthog-js/node, GTM.

**Base:** `vanilla-cookieconsent` ^3.1.0 (orestbida) wrapped in a React component. The value is in the glue code, not the banner.

- **UI**
  - Box banner in the bottom-right corner, with equal-weight Accept all / Reject all / Manage preferences buttons.
  - Preferences modal with a cookie table per category.
  - Categories: necessary, functional (unused), analytics (PostHog + GA4), marketing (Meta Pixel).
  - `autoClear` regexes clean up cookies when consent is withdrawn.
  - Floating "reopen" button, hidden on `/dashboard` and `/admin`; the footer link still reopens preferences there.
  - `hideFromBots`, `manageScriptTags: false`.
- **Storage:** `cc_cookie` (library format), 365 days. `revision` is **not used**, so a policy change triggers no re-prompt.
- **Consent Mode v2**
  - A `beforeInteractive` inline script parses `cc_cookie` and calls `gtag('consent','default', …)` with the real state (denied when no choice is stored), `wait_for_update: 500`, before GTM loads.
  - On the first choice or a change: `gtag('consent','update')` + `dataLayer.push({event:'cookie_consent_update', analytics, marketing})`.
  - GA4 and Meta base tags need an extra Custom Event trigger on `cookie_consent_update`. A tag blocked on `gtm.init` is not re-fired by a later consent update; this was the main bug (fix 085e613).
  - "First choice vs. replay on page load" is told apart with a global flag set in `onFirstConsent` and consumed in `onConsent`.
- **PostHog:** always loaded with `cookieless_mode: 'on_reject'`. Without consent: no storage, no person profiles, no replay, and autocapture/web vitals are dropped in `before_send`. With consent: `opt_in_capturing()` + `identify()`, no reload. Requires "Cookieless server hash mode" in the PostHog project.
- **Events and API:** `window.CookieConsent`, window event `cookieConsentChange`, dataLayer event `cookie_consent_update`. No React hook.
- **Server consent log:** none.
- **Policies:** hand-written TSX pages; the cookie list is duplicated between the banner and the policy.

**Pain points:**
- The cookie is parsed in 3 places, one of them inline JS inside a string.
- The global-flag hack for "first choice".
- GTM triggers are configured by hand.
- The cookie list is triplicated and its descriptions are outside i18n.
- No re-prompt and no proof of consent.

## FermoUnAttimo

**Stack:** Turborepo + pnpm, Next.js 15 App Router, Postgres + Prisma, separate admin app.

**Base:** fully custom. Files:
- `useConsent` hook;
- `ConsentBanner` with an expandable "Personalizza" panel;
- `CookieFab` (reopen button);
- `/api/consent` (POST), `/api/consent/me` (GET for access, art. 15; DELETE for withdrawal, art. 7.3).

**Details:**
- **UI:** fixed bottom banner with equal-weight Accetta tutti / Rifiuta tutti. Italian only, hard-coded strings, design-system tokens.
- **Storage:**
  - `fua_consent` JSON `{necessary, analytics, marketing, v}` lasting 6 months, **set by the server** in the POST response, so the cookie exists only if the log row was written.
  - `fua_anonymous_id` UUID (2 years, middleware), treated as strictly necessary.
- **Versioning:** the stored `v` is compared with the current policy version, and a mismatch triggers a re-prompt.
- **Consent Mode v2:** inline default (all denied) + an immediate `update` if the cookie exists, then GTM. On a choice it does `dataLayer.push({event:'consent_update', …})` but **no** explicit `gtag('consent','update')`.
- **Consent log:** an append-only `ConsentLog` table:
  - fields `userId?`, `anonymousId`, `ipHash` (sha256 of salt + IP), `userAgent`, booleans per category, `policyVersion`, `action` (accept_all | reject_all | custom | withdraw), `createdAt`;
  - the admin shows a per-user timeline;
  - GDPR export/delete covers these rows.
- **Policy versioning:** `LegalDoc` + immutable `LegalDocVersion` snapshots, with a semver bump on publish. The cookie policy page is static TSX that does not use this versioning.

**Bugs found:**
1. **Version mismatch.** The server writes the DB version into the cookie. The client compares it with `process.env.COOKIE_POLICY_VERSION`, which is undefined in the browser bundle, so it falls back to "1.0.0". As soon as the policy reaches 1.0.1, the banner reappears on every visit.
2. **Analytics checkbox pre-ticked** in "Personalizza". Pre-ticked consent is not valid under GDPR (CJEU Planet49).
3. **Consent update depends on GTM.** There is no explicit consent update after an in-session choice, and server-side GA4 Measurement Protocol ignores consent.
4. **Revoke failure.** A failed DELETE still reloads the page, and the cookie stays.
5. **Cookie flags and polling.** The consent cookie has no `Secure` flag, and the FAB re-reads it on every window focus.
6. **Hand-written cookie policy** that can drift from the cookies actually set.
7. **No anonymous id.** POST returns 400 when the anonymous id is missing, and the banner can't close.

## What both teams asked for in a shared library

- One config (categories + services + cookies) generating the banner tables, the cookie policy section and the autoClear rules.
- A generated inline Consent Mode v2 "default" snippet (configurable category → signal mapping) plus an explicit `update` and a standard dataLayer event fired on the first choice or a change, never on replay.
- A typed API: `getConsent()`, `onChange(cb)`, `openPreferences()`, a React `useConsent()` hook and server-side consent reading in Next.js.
- Policy revision with re-prompt and expiry (6–12 months).
- Optional proof-of-consent endpoint (FermoUnAttimo's `ConsentLog` as the reference schema), with access (art. 15) and withdrawal (art. 7.3) helpers.
- Generic prior blocking (`type="text/plain" data-category`) + iframe placeholders.
- Full i18n (including cookie tables), theming via CSS variables, a reopen button with per-route exclusion.
- PostHog adapter (cookieless `on_reject` + opt-in/out).
- Defaults always off.
