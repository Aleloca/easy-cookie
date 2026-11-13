# @easy-cookie/next

Next.js App Router integration for [easy-cookie](../../README.md):

- **`<EasyCookieHead>`** renders the inline Google Consent Mode v2 "default" snippet, generated from your config, in `<head>` before GTM.
- **`getServerConsent()` / `isGrantedOnServer()`** read the visitor's consent in Server Components, route handlers, server actions and middleware.
- **React bindings** (`EasyCookieProvider`, `useConsent`, `ConsentGate`, …) are re-exported from `@easy-cookie/react`. That bundle carries the `"use client"` boundary, so you can import them from server files.

| Entry | Contents |
|---|---|
| `@easy-cookie/next` | Everything below |
| `@easy-cookie/next/server` | `getServerConsent`, `isGrantedOnServer`, `isServiceGrantedOnServer` only. No React, so it is Edge-friendly. |
| `@easy-cookie/next/client` | The React bindings only, marked `"use client"` |

Peer dependencies: `next >= 14`, `react >= 18`.

## Install

```sh
pnpm add @easy-cookie/next @easy-cookie/react @easy-cookie/core
```

## Setup (App Router)

```ts
// easy-cookie.config.ts
import { defineConfig } from '@easy-cookie/core/shared';

export default defineConfig({
  revision: '2026-11-13',
  policyUrl: '/cookie-policy',
  googleConsentMode: { enabled: true },
  categories: { necessary: { readOnly: true }, measurement: {}, marketing: {} },
  services: {
    ga4: { category: 'measurement', provider: 'Google Ireland Ltd', privacyUrl: 'https://policies.google.com/privacy',
           cookies: [{ name: '^_ga', pattern: true, duration: { it: '2 anni', en: '2 years' } }] },
  },
});
```

```tsx
// app/layout.tsx
import Script from 'next/script';
import { EasyCookieHead, EasyCookieProvider } from '@easy-cookie/next';
import config from '../easy-cookie.config';
import '@easy-cookie/core/style.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        {/* 1. Consent Mode default: must come before GTM */}
        <EasyCookieHead config={config} />
        {/* 2. GTM */}
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){…})(window,document,'script','dataLayer','GTM-XXXX');`}</Script>
      </head>
      <body>
        <EasyCookieProvider config={config}>{children}</EasyCookieProvider>
      </body>
    </html>
  );
}
```

`<EasyCookieHead>` takes a `nonce` for nonce-based CSP. When the config lives on a consent server, use the remote variant. It renders a blocking `<script src=".../v1/sites/pk_…/head.js">`:

```tsx
<EasyCookieHeadRemote endpoint="https://consent.example.com" siteKey="pk_live_…" />
<EasyCookieProvider remote={{ endpoint: 'https://consent.example.com', siteKey: 'pk_live_…' }}>…
```

In GTM, re-point the GA4 and Meta tags to a Custom Event trigger on **`easy_cookie_update`**. The runtime pushes it on the first choice and on every change, never on page-load replay. Tags blocked on `gtm.init` then fire as soon as the visitor accepts.

## Reading consent on the server

```ts
import { cookies } from 'next/headers';
import { getServerConsent, isGrantedOnServer } from '@easy-cookie/next/server';
import config from '@/easy-cookie.config';

// Server Component: skip rendering a third-party widget without consent
const consent = getServerConsent(await cookies(), config); // ConsentState | null
const marketing = isGrantedOnServer(await cookies(), config, 'marketing');
```

The source can be any of these:

- the awaited `cookies()` store;
- `await headers()`, `request.headers`, or a `Request` / `NextRequest`;
- a raw `Cookie` header string.

The functions return `null` / `false` when there is no valid choice for the current `revision`: no cookie, an old revision, an expired choice or a malformed value. Read-only categories (`necessary`) are always granted. In Next 15+, `cookies()` is async: pass the awaited value. Passing the promise throws an explicit error.

Middleware:

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { isGrantedOnServer } from '@easy-cookie/next/server';
import config from './easy-cookie.config';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('x-consent-measurement', String(isGrantedOnServer(req, config, 'measurement')));
  return res;
}
```

### Gating GA4 Measurement Protocol (server-side events)

FermoUnAttimo sends server-side GA4 events through the Measurement Protocol, and those calls currently ignore consent. Gate every MP call on the visitor's `measurement` consent:

```ts
// app/api/checkout/complete/route.ts
import { cookies } from 'next/headers';
import { getServerConsent } from '@easy-cookie/next/server';
import config from '@/easy-cookie.config';

export async function POST(req: Request) {
  const order = await completeOrder(req);
  const consent = getServerConsent(await cookies(), config);

  // Store the decision with the order: later webhooks (e.g. a payment provider) have no browser cookies.
  await db.order.update({ where: { id: order.id }, data: { consentId: consent?.id, analyticsConsent: !!consent?.categories.includes('measurement') } });

  if (consent?.categories.includes('measurement')) {
    await sendGa4MeasurementProtocol({ clientId: readGaClientId(await cookies()), events: [{ name: 'purchase', params: { … } }] });
  }
  // Without consent: send nothing. Do not "anonymise" and send anyway: an MP hit carries a client id.
  return Response.json({ ok: true });
}
```

Rules of thumb:

- Read consent **at request time**, in the handler that has the visitor's cookies.
- For events fired later from webhooks or queues, persist the boolean (and `consent.id`) with the domain object at the moment of the request. Check that stored value instead.
- The GA client id comes from the `_ga` cookie, which only exists after consent. If it is missing, skip the event.

## Migration notes

### FermoUnAttimo (Next 15, custom banner, `fua_consent`)

1. **Remove** `ConsentBanner`, `CookieFab`, the `useConsent` hook and the inline GTM consent snippet.
2. **Add** `<EasyCookieHead config={config} />` before GTM and wrap the body in `<EasyCookieProvider>`.
3. **Replace the hook:**
   - `useConsent()` from `@easy-cookie/next` returns `{ consent, isGranted, openPreferences, … }`.
   - The footer link becomes `<PreferencesLink />`.
   - The FAB is the runtime's reopen button (`ui.reopenButton`).
4. **Logging:**
   - `/api/consent` (POST) is replaced by the consent server. Set `log: { endpoint, siteKey }` in the config.
   - `/api/consent/me` maps to the server's `GET /v1/subjects/:id/consents` (art. 15) and `DELETE /v1/subjects/:id` (art. 17).
   - Withdrawal (art. 7.3) is just a new choice from the preferences modal.
   - Call `api.identify(userId)` after login (via `useEasyCookie().api`) to link the anonymous consent to the user.
   - Existing `ConsentLog` rows can be imported into the consent server.
5. **Versioning:**
   - Set `revision` from the published cookie policy version, in code, so the browser and the server always agree.
   - This fixes the `COOKIE_POLICY_VERSION`-undefined re-prompt loop by construction.
6. **Defaults:** every non-necessary category is off by default, which fixes the pre-ticked analytics checkbox.
7. **Server side:** gate GA4 Measurement Protocol with `getServerConsent()`, as shown above.
8. **Cookie:**
   - `fua_consent` is replaced by `ec_consent`. Users are asked again, once.
   - `fua_anonymous_id` is no longer needed: the consent id lives in `ec_consent`.
9. **Policy page:** render `<CookiePolicy config={config} lang="it" />` from `@easy-cookie/policy/react`. It replaces the static cookie table.

### MythicVoices (Next 16, vanilla-cookieconsent wrapper, `cc_cookie`)

1. **Remove:**
   - `CookieConsent.tsx`;
   - the `beforeInteractive` inline Consent Mode script in `layout.tsx`;
   - the three `cc_cookie` parsers.
2. **Add** `<EasyCookieHead config={config} />` in `<head>` before GTM and `<EasyCookieProvider config={config}>` around the body.
3. **Map categories:**
   - `analytics` becomes `measurement` (or keep the id `analytics` and set `gcm: ['analytics_storage']`);
   - `marketing` stays;
   - drop `functional` if it is still unused.
4. **Cookie lists:**
   - Move the cookie lists and the `autoClear` regexes into `services.*.cookies` (`pattern: true`).
   - The banner tables, the autoClear rules and the policy page are then generated from them.
   - Put the descriptions in `{ it, en }` maps.
5. **Reopen button:** set `ui.reopenButton: { hideOn: ['/dashboard', '/admin'] }`. The footer uses `<PreferencesLink />`.
6. **"First choice" detection:** remove the global-flag hack. The runtime emits `consent` (first choice), `change` and `replay` (page load) separately.
7. **GTM:** re-point the custom triggers from `cookie_consent_update` to `easy_cookie_update`.
8. **PostHog:**
   - Replace the hand-written opt-in/out and `before_send` with `@easy-cookie/posthog`: `posthog.init(key, { ...posthogInitOptions(), … })` + `connectPostHog(posthog, api, { identify })`.
   - Keep "Cookieless server hash mode" enabled.
9. **Cookie:** `cc_cookie` is replaced by `ec_consent`. Users are asked again, once.
10. **Re-prompt:** set `revision`. Bumping it re-prompts every visitor, which `cc_cookie` never did.

## License

MIT
