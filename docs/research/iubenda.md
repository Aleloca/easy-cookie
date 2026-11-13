# How Iubenda works, and what to replicate

Research done on 2026-11-13. Items marked **[verify]** come from secondary sources.

## Modules

| Module | Relevant? |
|---|---|
| Privacy & Cookie Policy generator | Partly: we generate only the **cookie list/section** from our config. The legal privacy text is out of scope. |
| Privacy Controls and Cookie Solution (banner, preferences, prior blocking, Consent Mode, TCF) | **Core** |
| Consent Database (proof of consent, HTTP API) | **Yes**: standalone consent service |
| Terms & Conditions, Internal Privacy Management (records of processing) | No |

## Cookie Solution mechanics

- **Embed.** Inline `_iub.csConfiguration = {…}` + `iubenda_cs.js` from the CDN. The config lives remotely. The optional `safe.js` activates snippets if the CDN is slow.
- **Key options**
  - `perPurposeConsent`, `purposes`;
  - accept/reject/customize/close buttons, `closeButtonRejects`;
  - `floatingPreferencesButtonDisplay`;
  - `invalidateConsentWithoutLog`, `askConsentAtCookiePolicyUpdate`, `invalidateConsentBefore`;
  - `storage.type` (cookie | local_storage), `preferenceCookie.expireAfter` (365 days);
  - `googleConsentMode`, `googleAdsDataRedaction`, `googleUrlPassthrough`, `emitGtmEvents`, `enableTcf`, `countryDetection`.
- **Purpose IDs:** 1 necessary, 2 functionality, 3 experience, 4 measurement, 5 marketing.
- **Manual prior blocking:**
  ```html
  <script type="text/plain" class="_iub_cs_activate" data-iub-purposes="4"
          data-suppressedsrc="https://www.googletagmanager.com/gtag/js?id=G-X"></script>
  <iframe class="_iub_cs_activate" data-iub-purposes="3"
          data-suppressedsrc="https://www.youtube.com/embed/ID" src="about:blank"></iframe>
  ```
  - `_iub_cs_activate-inline` is for `document.write` scripts.
  - `data-iub-type="module"` is for ES modules.
  - Iubenda has **no standard iframe placeholder**, which is a gap.
- **Auto-blocking** ("experimental"): a script at the top of `<head>` blocks known domains. `data-cmp-ab="1|2"` exempts elements.
- **Storage:** cookie `_iub_cs-<cookiePolicyId>` (1 year), plus `_iub_cs-local`, `_iub_previous_preference_id`, `euconsent-v2` (TCF), `usprivacy`. The payload format is undocumented **[verify]**.
- **Callbacks:**
  - consent: `onConsentGiven`, `onConsentFirstGiven`, `onConsentRejected`;
  - preferences: `onPreferenceExpressed`, `onPreferenceFirstExpressed`, `onPreferenceChange`;
  - UI and lifecycle: `onReady`, `onBannerShown`, `onBannerClosed`, `onActivationDone`, `onError`, etc.
- **API `_iub.cs.api`:**
  - UI: `showBanner()`, `openPreferences()`, `showCP()`;
  - read state: `getPreferences()`, `isConsentGiven()`, `getPurposesState()`;
  - set state: `acceptAll()`, `rejectAll()`, `setPreferences()`, `activateSnippets()`, `resetStorage()`.

Sources:
- https://www.iubenda.com/en/help/1205-how-to-configure-your-cookie-solution-advanced-guide
- https://www.iubenda.com/en/help/1229-manual-tagging-blocking-cookies
- https://www.iubenda.com/en/help/133036

## Google Consent Mode v2

- `gtag('consent','default', {ad_storage, ad_user_data, ad_personalization, analytics_storage: 'denied', wait_for_update})` must run **before** any `config`/`event`.
  - Optional signals: `functionality_storage`, `personalization_storage`, `security_storage`.
  - `region` limits the defaults to some countries (e.g. the EEA).
- Call `gtag('consent','update', …)` after every choice, including a withdrawal. Consent Mode **does not persist** anything: the CMP must re-apply the stored state on every page.
- **Basic mode** blocks Google tags until consent. **Advanced mode** loads them and sends cookieless pings, which enables modelling.
- Typical mapping:
  - measurement → `analytics_storage`;
  - marketing → `ad_storage`, `ad_user_data`, `ad_personalization`;
  - functionality → `functionality_storage`;
  - experience → `personalization_storage`;
  - `security_storage` is always granted.
- **IAB TCF v2.2** is needed only for programmatic ads (AdSense, Ad Manager). It requires IAB CMP registration with fees. **Out of scope.**

Sources:
- https://developers.google.com/tag-platform/security/guides/consent
- https://www.iubenda.com/en/help/27137-google-consent-mode

## Consent Database

- **Records:**
  - `timestamp`;
  - `subject` {id, email, names, verified};
  - `preferences` (key/value);
  - `legal_notices[]` {identifier, version}, with the notices themselves versioned and stored;
  - `proofs[]` {content, form};
  - IP (autodetect with the public key).
- **HTTP API:**
  - base URL `https://consent.iubenda.com`, `ApiKey` header;
  - `POST/GET /consent`, `GET /consent/:id`, `/subjects`, `/legal_notices`;
  - the **public key** may only do write-only `POST /public/consent` from the browser.
- The JS library queues submissions in localStorage when offline.
- With `invalidateConsentWithoutLog: true`, an unlogged consent is treated as void.
- Legal basis: GDPR art. 7.1 (the controller must be able to demonstrate consent) and art. 5.2 (accountability).

Sources:
- https://www.iubenda.com/en/help/6469-consent-database-developers-documentation
- https://www.iubenda.com/en/help/6484-consent-database-http-api-documentation
- https://www.iubenda.com/en/help/21982-how-to-save-proof-of-consent-to-cookies/

## Legal checklist (Italy / EU)

1. **Prior blocking.** No non-technical cookies or trackers (third-party scripts, iframes, pixels, fonts) before consent (ePrivacy art. 5.3, Codice Privacy art. 122).
2. **First layer of the banner:** short notice, cookie policy link, preferences link, Accept all, **Reject** or an **X that equals reject**.
3. **Equal prominence** of accept and reject, with no dark patterns (EDPB Cookie Banner Taskforce 2023).
4. **Scrolling or continued browsing is not consent.**
5. **No cookie wall** without an equivalent alternative.
6. **Granular categories**, all **off by default** (no pre-ticked boxes, CJEU Planet49).
7. **Withdrawal as easy as giving consent** (art. 7.3): an always-available reopen control. Cookies are cleared, Consent Mode is updated and the page reloads if needed.
8. **Re-prompt** no earlier than **6 months** after the last choice, including a rejection. Earlier only if the purposes or third parties change, or the stored choice is lost.
9. **Cookie policy:** name, provider, purpose, duration and recipients for each cookie, linked from the banner and every page.
10. **Demonstrable record of consent**, with the policy version accepted.
11. **Analytics.** Third-party analytics cookies count as technical only when IPs are masked and data is not shared or cross-referenced. Standard GA4 does **not** qualify; self-hosted cookieless analytics can.
12. **Accessibility:** keyboard use, focus trap, ARIA, contrast. Italian and multilingual text.

Sources:
- Garante, Linee guida cookie 2021 (doc. web 9677876), summary at https://www.iubenda.com/it/help/31246-italy-new-cookie-rules
- https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf

## Open-source alternatives

| Project | License | Notes |
|---|---|---|
| **orestbida/cookieconsent v3** | MIT | Small, accessible, `type="text/plain" data-category`, `revision`, `autoClear`, services. No server log, no Consent Mode preset, no policy generator, no iframe placeholder. **Chosen base (forked).** |
| Klaro | BSD-3 | ~57 kB gz. Maintenance uncertain. Contextual consent for embeds. |
| tarteaucitron.js | MIT | Native Consent Mode and a large service catalogue. Per-service UX is dated. |
| Osano cookieconsent | MIT | No blocking. Outdated for EU. |
| c15t | Apache-2.0 | Self-hostable backend (Drizzle/Prisma), React-first. Fast-moving API. |
