# @easy-cookie/core

A self-hosted, GDPR/ePrivacy-compliant cookie consent library. It covers:
- the banner and preferences panel;
- blocking scripts and embeds until consent;
- Google Consent Mode v2;
- proof of consent sent to your own server.

Everything is driven by **one config**.

It is built on a source fork of [vanilla-cookieconsent](https://github.com/orestbida/cookieconsent) v3.3.0 (MIT, © Orest Bida); see [UPSTREAM.md](UPSTREAM.md).

## What you get by default (Italian Garante 2021 / EDPB)

- "Accept all" and "Reject all" have **identical weight**: two equal halves of one row.
- The **X closes the banner and counts as a rejection**, recorded as `close`.
- Categories are **off by default**, and scrolling never counts as consent.
- **Re-prompt** when you change `revision`, or after `expiryDays` (default 182 days ≈ 6 months).
- A **floating preferences button** stays available after the first choice. Withdrawing consent clears the category's cookies and reloads the page.
- **Proof of consent**: every choice is POSTed to your consent server (`log`). If the server is unreachable, the record is queued and retried on the next page load.

## Install

### 1. Script tag via your consent server (Iubenda-style)

```html
<head>
  <script src="https://consent.example.com/v1/sites/pk_live_xxx/embed.js"></script>
  <!-- then GTM / gtag -->
</head>
```

`embed.js` contains:
- the Consent Mode default for the visitor's stored state;
- the published config;
- a loader for the runtime and the stylesheet.

The config is edited in the admin console and published as revisions.

### 2. npm

```sh
pnpm add @easy-cookie/core
```

```ts
import EasyCookie, { defineConfig } from '@easy-cookie/core';
import '@easy-cookie/core/style.css';

const config = defineConfig({
  revision: '2026-11-13',
  policyUrl: '/cookie-policy',
  language: { default: 'it', available: ['it', 'en'] },
  googleConsentMode: { enabled: true },
  log: { endpoint: 'https://consent.example.com', siteKey: 'pk_live_xxx' },
  categories: {
    necessary: { readOnly: true },
    measurement: {},
    marketing: {},
  },
  services: {
    ga4: {
      category: 'measurement',
      label: 'Google Analytics 4',
      provider: 'Google Ireland Ltd',
      privacyUrl: 'https://policies.google.com/privacy',
      cookies: [{ name: '^_ga', pattern: true, duration: { it: '2 anni', en: '2 years' } }],
    },
  },
});

EasyCookie.run(config);
```

Put the Consent Mode head snippet **before** GTM. In plain HTML, use the `head.js` served by the consent server. For server-rendered apps, generate it yourself:

```ts
import { renderHeadScript } from '@easy-cookie/core/shared';
const inline = renderHeadScript(config); // <script>{inline}</script> in <head>
```

React and Next.js are covered by `@easy-cookie/react` and `@easy-cookie/next`.

## Blocking scripts and embeds

```html
<script type="text/plain" data-category="measurement" data-service="ga4"
        data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>

<iframe data-category="experience" data-service="youtube"
        data-src="https://www.youtube-nocookie.com/embed/ID" width="560" height="315"
        title="Video"></iframe>
```

- **Scripts** run as soon as their category, or their service, is granted.
- **Iframes** stay empty and show a placeholder with two options: show this content once, or always enable the category.

## Google Consent Mode v2 and GTM

Category → signal defaults:

| Category id | Consent Mode signals |
|---|---|
| `measurement` | `analytics_storage` |
| `marketing` | `ad_storage`, `ad_user_data`, `ad_personalization` |
| `functionality` | `functionality_storage` |
| `experience` | `personalization_storage` |

`security_storage` is always granted. Override the mapping per category with `gcm: [...]`.

When the visitor makes a first choice or changes it, the runtime calls `gtag('consent','update', …)` and pushes this event:

```js
{ event: 'easy_cookie_update', easyCookie: { categories: { measurement: true, … }, method, first, revision } }
```

> **GTM setup:** a tag blocked by consent on `gtm.init` / `All Pages` is **not** fired again by a later consent update. Add a *Custom Event* trigger `easy_cookie_update` to your GA4 / Ads / Meta base tags, next to their page-view trigger.

Page loads with a stored choice do **not** push the event (the head snippet already set the right default), so tags never fire twice.

## API

```ts
EasyCookie.get()                         // ConsentState | null
EasyCookie.isGranted('measurement')
EasyCookie.isServiceGranted('ga4')
EasyCookie.on('consent' | 'change' | 'replay' | 'ready', cb) // returns an unsubscribe function
EasyCookie.onGranted('marketing', () => loadPixel())
EasyCookie.openPreferences()             // e.g. from a footer link
EasyCookie.acceptAll() / rejectAll() / accept(['measurement'])
EasyCookie.identify(userId)              // link the anonymous consent id to a user (after login)
EasyCookie.reset()                       // forget the choice (logged as withdraw) and re-prompt
```

The same events are dispatched on `window` as `easycookie:consent`, `easycookie:change`, `easycookie:replay` and `easycookie:ready`.

No-JS footer links: any element with the `data-ec-open-preferences` attribute opens the preferences when clicked (the default action is prevented). The listener is delegated on `document`, so elements added after `run()` work too, for example the `{{preferences-link}}` of a legal document.

```html
<a href="#" data-ec-open-preferences>Preferenze cookie</a>
```

Server side (middleware, RSC, route handlers):

```ts
import { consentFromCookieHeader } from '@easy-cookie/core/shared';
const consent = consentFromCookieHeader(request.headers.get('cookie'), { revision: config.revision });
if (consent?.categories.includes('measurement')) sendServerSideAnalytics();
```

## Service catalog

`@easy-cookie/core/catalog` ships about 30 ready-made service declarations (GA4, GTM, PostHog, Matomo, Plausible, Hotjar, Clarity, Mixpanel, Amplitude, Google Ads, Meta Pixel, LinkedIn, TikTok, Pinterest, Microsoft UET, X, YouTube, Vimeo, Google Maps, Spotify, Calendly, Intercom, Crisp, HubSpot, Zendesk, Stripe, PayPal, reCAPTCHA, hCaptcha, Cloudflare, Sentry, easy-cookie itself). Each entry has the EU-facing provider, the privacy link, the default consent category, cookies with IT/EN durations and descriptions, data transfers and a note for the owner. It is plain data: the console, the CLI and npm users share it, and nothing reads it at runtime.

```ts
import { CATALOG, findCatalogEntry, catalogToService } from '@easy-cookie/core/catalog';

const config = defineConfig({
  // …
  services: {
    ga4: catalogToService(findCatalogEntry('ga4')!),     // { category: 'measurement', …, from: 'ga4' }
    youtube: catalogToService(findCatalogEntry('youtube')!),
  },
});
```

`catalogToService` returns a deep copy with `from: entry.id`. Edit the result freely: `from` is informational. Default categories follow the Italian Garante 2021 guidelines: third-party analytics → `measurement`, advertising → `marketing`, embeds → `experience`, support chats → `functionality`, payments, security and infrastructure → `necessary`. Read each entry's `note`, and check the data against your own setup and contracts: providers change their cookies over time.

## Theming

Every visual value is a CSS custom property. Set them on `:root`, or on `html.ec--dark` for the dark scheme (or `ui.colorScheme: 'dark' | 'auto'`).

| Variable | Default | Role |
|---|---|---|
| `--ec-font` | system UI stack | Banner font (set it to your site's font) |
| `--ec-bg` / `--ec-ink` / `--ec-ink-2` | `#fff` / `#1c1c1a` / `#4a4a46` | Ground, text, secondary text |
| `--ec-hair` / `--ec-wash` | `#d9d9d3` / `#f4f4f1` | Hairlines, hover wash |
| `--ec-border` | `1px solid var(--ec-ink)` | Banner and button border |
| `--ec-radius` | `0px` | Corner radius everywhere |
| `--ec-width` / `--ec-pad` | `560px` / `28px` | Banner width and padding |
| `--ec-text` / `--ec-title` / `--ec-small` | `15px` / `20px` / `13px` | Type sizes |
| `--ec-module` | `40px` | Size of the category modules |
| `--ec-c-necessary` … `--ec-c-marketing` | Olivetti palette | Category module colours |
| `--ec-shadow` | `none` | Banner shadow |
| `--ec-focus` | 2px ink ring | Focus indicator |

Example, for a brand with rounded corners and an amber accent:

```css
:root {
  --ec-font: "Inter", system-ui, sans-serif;
  --ec-radius: 10px;
  --ec-ink: #1b1530;
  --ec-c-measurement: #f2a516;
}
```

## The consent cookie

- `ec_consent` is first-party, `SameSite=Lax`, `Secure` on HTTPS, and lasts `expiryDays`.
- Its value is JSON (engine format). easy-cookie's revision and method live in `data.ec`.
- Read it with `parseConsent` / `consentFromCookieHeader`; never parse it by hand.

## License

MIT. The bundled engine is MIT © Orest Bida ([LICENSE.upstream](LICENSE.upstream)).
