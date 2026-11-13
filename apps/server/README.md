# @easy-cookie/server

`@easy-cookie/server` is a self-hosted consent server for easy-cookie (see [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)). It replaces Iubenda's cookie solution and its consent database:

- **Config hosting.** Each site has a draft config that you edit in the console. Publishing the draft creates an immutable revision. The server delivers the published revision as `config.json`, `head.js` (synchronous Google Consent Mode v2 defaults) or `embed.js` (a single script tag).
- **Proof of consent.** The server keeps an append-only register of every choice. It stores a salted hash of the IP address, never the address itself, and lets you search the register, export it as CSV, link records to your user ids, and answer GDPR access (art. 15) and erasure (art. 17) requests.
- **Legal documents.** Each site has a cookie policy, a privacy policy and terms, written in Markdown in the console from built-in IT/EN drafts. Published versions are immutable. They are served as JSON, as an HTML fragment, through a `legal.js` loader, or as a hosted page (`/p/:publicKey/:kind`) you can use as the banner's policy link.
- **Admin console** at `/admin` (`apps/console`), backed by the admin API.

The stack is Node 20+, [Hono](https://hono.dev), Prisma and Postgres. The full HTTP contract is in [`docs/api.md`](../../docs/api.md).

## Self-hosting with Docker

Run these commands at the repository root:

```sh
cp apps/server/.env.example .env      # set ADMIN_EMAIL, ADMIN_PASSWORD, PUBLIC_URL, POSTGRES_PASSWORD
docker compose up -d --build
open http://localhost:8787/admin/
```

`docker-compose.yml` starts Postgres 17 and the server. The image is built by `apps/server/Dockerfile`. It builds `@easy-cookie/core` and the legal stylesheet of `@easy-cookie/policy` (both served under `/static`), the console (served under `/admin`) and the server, then runs `prisma migrate deploy` on every start.

For production, put the server behind a TLS reverse proxy (Caddy, nginx, Traefik), then:
- set `PUBLIC_URL=https://consent.example.com`; an `https://` URL also makes the admin cookie `Secure`;
- set `TRUST_PROXY=true`, so the client IP comes from `X-Forwarded-For`. Enable it only when the proxy overwrites that header;
- run **one** instance, or accept that each replica rate-limits on its own (the limiter is in memory).

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | (required) | Postgres connection string |
| `PORT` | `8787` | HTTP port |
| `PUBLIC_URL` | derived from each request | Public base URL. It is written into `log.endpoint` of the delivered config and into the asset URLs of `embed.js`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | none | Create the first admin on boot, only when no admin exists yet. The password needs at least 10 characters. |
| `STATIC_DIR` | `../../packages/core/dist` | Built core assets (`easy-cookie.iife.js`, `easy-cookie.css`). Relative paths resolve from `apps/server`. Missing files return 404. |
| `POLICY_DIR` | `../../packages/policy/dist` | Built `@easy-cookie/policy`. `/static/easy-cookie-legal.css` is served from `STATIC_DIR` when present there (the Docker image copies it in), otherwise from this directory. No other file is served from it. |
| `CONSOLE_DIR` | `../console/dist` | Built console SPA. Unknown `/admin/*` paths fall back to `index.html`. |
| `TRUST_PROXY` | `false` | Read the client IP from `X-Forwarded-For` / `X-Real-IP`. |
| `RATE_LIMIT_PER_MINUTE` | `60` | Consent records per minute per IP hash per site. |

The server and the CLI read `.env` from the working directory, but real environment variables take precedence.

## Endpoints overview

| Area | Endpoints | Auth |
|---|---|---|
| Browser (public key `pk_…`) | `POST /v1/consents`, `POST /v1/consents/:consentId/subject` | `X-Site-Key` header or `?key=`, plus the Origin allow-list |
| Delivery | `GET /v1/sites/:pk/config.json`, `head.js`, `embed.js`; `GET /static/*` | none |
| Legal documents | `GET /v1/sites/:pk/legal/:kind.json`, `legal/:kind.html`, `legal.js`; hosted page `GET /p/:pk/:kind` | none (`Access-Control-Allow-Origin: *`) |
| Back end / CI (secret key `sk_…`) | `GET /v1/consents`, `GET /v1/subjects/:id/consents`, `DELETE /v1/subjects/:id`, `PUT /v1/config` | `Authorization: Bearer sk_…` |
| Console | `/admin/api/*`: auth, sites, draft, revisions, consents (+ CSV), stats, catalog, legal documents and templates | `ec_admin` session cookie + `X-CSRF-Token` |
| Ops | `GET /health` → `{ ok, db }` | none |

The secret key is shown once, when the site is created or the key is rotated. Only its sha256 hash is stored.

## Integrating a site

First create a site, either in the console (**Sites → New**) or with the CLI. Then add every origin that serves your pages to the site's **origins** list, for example `https://www.example.com` or `https://*.example.com`.

### Option A: embed.js (like Iubenda)

Edit the banner in the console and publish a revision. Then add a single script tag as the **first** element of `<head>`, before GTM or gtag:

```html
<script src="https://consent.example.com/v1/sites/pk_XXXXXXXXXXXXXXXXXXXXXXXX/embed.js"></script>
```

The script runs synchronously:
1. it sets the Consent Mode defaults from the visitor's stored choice;
2. it inlines the published config;
3. it loads `/static/easy-cookie.css` and `/static/easy-cookie.iife.js`, then calls `EasyCookie.run(config)`.

Choices are recorded on this server automatically. After login, call `EasyCookie.identify(userId)` to link the anonymous consent id to your user.

If you only want the Consent Mode head snippet and load the runtime yourself, use `head.js` instead, or fetch `config.json`, which is also what `EasyCookie.run({ remote: { endpoint, siteKey } })` loads.

### Legal documents (cookie policy, privacy policy, terms)

In the console, open a site's legal documents. The first visit creates the three documents from the built-in drafts, one translation per site language. The drafts are a starting point, **not legal advice**: fill in every highlighted `[[placeholder]]` and have the text reviewed before publishing. Directives such as `{{cookie-table}}` and `{{services-list}}` are filled from the **published** banner config at request time, so publishing a new banner revision updates the tables without republishing the documents.

Once published, show a document in one of these ways:

```html
<!-- Loader: fills the container and injects /static/easy-cookie-legal.css once (opt out with data-no-style) -->
<div data-easy-cookie-legal="privacy" data-lang="it"></div>
<script src="https://consent.example.com/v1/sites/pk_XXXXXXXXXXXXXXXXXXXXXXXX/legal.js" defer></script>

<!-- Hosted page: link to it, or use it as the banner's policyUrl -->
<a href="https://consent.example.com/p/pk_XXXXXXXXXXXXXXXXXXXXXXXX/cookie?lang=it">Cookie policy</a>
```

You can also render it on your own server: `GET /v1/sites/:pk/legal/:kind.json?lang=it` (or `getLegalDocument()` from `@easy-cookie/next/server`), then render the `html` field. It is already sanitised.

Without `data-lang`, the loader asks for the page's `<html lang>`. The server falls back to the banner config's default language, then to the first translation. On the hosted page the banner is not loaded, so `{{preferences-link}}` links back to `https://<site domain>/`, where the visitor can reopen the preferences.

### Option B: config in code, pushed from CI

Keep the `EasyCookieConfig` in your repository, bundle `@easy-cookie/core` yourself, and set `log: { endpoint: 'https://consent.example.com', siteKey: 'pk_…' }`. On deploy, push the config so the server keeps an immutable snapshot of what visitors saw:

```sh
curl -fsS -X PUT https://consent.example.com/v1/config \
  -H "Authorization: Bearer $EASY_COOKIE_SECRET_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"config\": $(cat easy-cookie.config.json), \"publish\": true, \"note\": \"$GIT_SHA\"}"
```

- An invalid config returns `422` with `issues`.
- With `publish: true`, the server publishes the config under its own `config.revision`. Re-running the call with the same content is a no-op.
- Pushing changed content under an already published revision returns `409`. Bump `revision` whenever the policy changes, which also re-prompts visitors.

### Back-end queries

```sh
# proof for one browser / user
curl -H "Authorization: Bearer $SK" "https://consent.example.com/v1/consents?consentId=…"
curl -H "Authorization: Bearer $SK" "https://consent.example.com/v1/subjects/user-42/consents"
# erasure request
curl -X DELETE -H "Authorization: Bearer $SK" "https://consent.example.com/v1/subjects/user-42"
```

## Privacy of the register

- The server stores `sha256(site salt + IP)`, with a random salt per site. It never stores or logs the raw IP.
- The `User-Agent` is truncated to 512 characters. The server sets no cookies on visitors.
- Records are append-only. The only update is linking a `subjectId`. Records are deleted only by subject erasure or by deleting the site.
- Published revisions (`PolicyVersion`) are immutable snapshots, so every record can be matched to the exact config it was given under.

## CLI

```sh
pnpm --filter @easy-cookie/server cli create-admin admin@example.com      # prompts for the password (or --password / $ADMIN_PASSWORD)
pnpm --filter @easy-cookie/server cli create-site --name "Shop" --domain shop.example.com --origin https://shop.example.com
pnpm --filter @easy-cookie/server cli export <siteId> --format csv > consents.csv   # or --format jsonl, --from/--to
```

In the Docker image, run `docker compose exec server node dist/cli.js <command>`.

## Development

```sh
pnpm install                                   # at the repo root
docker run -d --name easy-cookie-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=easycookie -p 5432:5432 postgres:17
cp apps/server/.env.example apps/server/.env    # adjust DATABASE_URL
pnpm --filter @easy-cookie/server prisma:deploy # apply migrations (prisma:migrate to create new ones)
pnpm --filter @easy-cookie/server dev           # tsx watch on :8787
```

Other scripts: `build` (prisma generate + tsup bundle into `dist/`), `start`, `typecheck`, `test`.

The shared modules of `@easy-cookie/core` (`validateConfig`, `renderHeadScript`, the types, the service catalog) and the legal renderer of `@easy-cookie/policy` are imported from source (`@easy-cookie/core/shared`, `@easy-cookie/core/catalog`, `@easy-cookie/policy`), through tsconfig paths and vitest aliases. tsup bundles them into `dist/`, so the server does not need those packages to be built; `markdown-it` stays an external runtime dependency. Only `/static` needs the built assets (`packages/core/dist`, plus `packages/policy/dist/easy-cookie-legal.css`).

### Tests

The integration tests run against a real Postgres:

```sh
docker run -d --name easy-cookie-pg-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=easycookie -p 54329:5432 postgres:17
pnpm --filter @easy-cookie/server test
```

The tests use `postgresql://postgres:test@localhost:54329/easycookie` by default. Set `TEST_DATABASE_URL` to use another database. Migrations are applied automatically and tables are truncated between tests, so **never point the tests at a real database**.
