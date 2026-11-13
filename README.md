# easy-cookie

**A self-hosted, open-source replacement for Iubenda's cookie solution and consent database.**

One config drives:
- the consent banner;
- blocking scripts and embeds until consent;
- Google Consent Mode v2;
- a proof-of-consent register on your own server;
- the cookie policy table.

It is compliant by construction with the Italian Garante 2021 cookie guidelines and the EDPB banner taskforce findings. No third-party SaaS is in the loop.

> Status: **0.1.0, pre-release.** APIs may change before 1.0.

## Packages

| Package | What it is |
|---|---|
| [`@easy-cookie/core`](packages/core) | Browser runtime: banner, preferences, blocking, Consent Mode, consent log client, embed placeholders. Also the DOM-free `@easy-cookie/core/shared` (config types, validation, cookie parsing, head snippet). |
| [`@easy-cookie/react`](packages/react) | `<EasyCookieProvider>`, `useConsent()`, `<ConsentGate>`, `<ConsentEmbed>`, `<PreferencesLink>` |
| [`@easy-cookie/next`](packages/next) | `<EasyCookieHead>` (Consent Mode default before GTM), `getServerConsent()` for RSC and route handlers |
| [`@easy-cookie/policy`](packages/policy) | Generates the cookie policy tables (HTML / Markdown / React) from the config |
| [`@easy-cookie/posthog`](packages/posthog) | Keeps PostHog cookieless until consent, and opts in without a reload |
| [`apps/server`](apps/server) | Consent server: proof-of-consent register (Postgres), hosted config and revisions, `embed.js` |
| [`apps/console`](apps/console) | Admin console: sites, banner configuration with live preview, revisions, consent register, keys |
| [`apps/site`](apps/site) | Project website and documentation |
| [`apps/playground`](apps/playground) | Static demo page used for visual checks |

## Quick start

1. **Self-host the consent server:**

   ```sh
   cp apps/server/.env.example apps/server/.env   # set ADMIN_EMAIL / ADMIN_PASSWORD
   docker compose up -d
   ```

2. Open `http://localhost:8787/admin`, create a site, configure the banner, and publish a revision.

3. **Add one line to your site's `<head>`, before GTM:**

   ```html
   <script src="https://consent.example.com/v1/sites/pk_live_xxx/embed.js"></script>
   ```

You can also keep the config in code with `@easy-cookie/core` from npm, and push it to the server from CI. See the docs.

## Design

- [Architecture and decisions](docs/ARCHITECTURE.md)
- [Consent server API](docs/api.md)
- [Research: how Iubenda works, and the legal checklist](docs/research/iubenda.md)

## Credits

The banner engine is a source fork of [vanilla-cookieconsent](https://github.com/orestbida/cookieconsent) by Orest Bida (MIT).

## License

[MIT](LICENSE)

easy-cookie helps you implement consent correctly, but it is not legal advice. Your cookie policy and your list of services remain your responsibility.
