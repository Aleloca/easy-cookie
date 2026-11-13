# Consent server API (contract)

This is the contract between `@easy-cookie/core` (browser), `apps/server` and `apps/console`. The shared types live in `packages/core/src/shared/types.ts` (`EasyCookieConfig`, `ConsentRecordInput`, `ConsentState`), exported from `@easy-cookie/core/shared`.

Conventions:
- JSON everywhere, with `camelCase` fields and ISO 8601 UTC timestamps.
- Errors use the shape `{ "error": { "code": "string", "message": "string", "issues"?: ConfigIssue[] } }`.
- Lists are cursor-paginated: `?limit=50&cursor=<opaque>` returns `{ items, nextCursor | null }`, **newest first**.

## Keys

- **Public key** `pk_<24 base62>`. One per site, embeddable in HTML, write-only. It may only:
  - record consents;
  - link a subject;
  - read the published config, head script and embed script.

  Each request is checked against the site's `origins` allow-list (the `Origin` header, falling back to the origin of `Referer`). `*` is allowed, but the console warns about it. Entries are origins such as `https://example.com`; `https://*.example.com` matches any subdomain (not the apex). A request with no `Origin`/`Referer` is accepted only when the list contains `*`.

  The key is sent as the `X-Site-Key` header **or** as the `key` query parameter (`?key=pk_…`). The header wins when both are present. The query form exists for CORS "simple requests" (see below).
- **Secret key** `sk_<32 base62>`. Server-to-server only, sent as `Authorization: Bearer sk_…`.
  - It is shown once, on creation or rotation.
  - Only a sha256 hash is stored.

## Public endpoints (`/v1`, CORS enabled for the site origins)

| Method | Path | Auth | Body / response |
|---|---|---|---|
| POST | `/v1/consents` | `X-Site-Key: pk_…` or `?key=pk_…` | Body: `ConsentRecordInput`. Response `201 { id, receivedAt }`. Must accept `keepalive` fetches and `text/plain` bodies (sendBeacon). |
| POST | `/v1/consents/:consentId/subject` | `X-Site-Key` or `?key=` | Body: `{ subjectId }`. Response `204`. Links every record with that consentId to a user id (after login). |
| GET | `/v1/sites/:publicKey/config.json` | none | The **published** `EasyCookieConfig`, with the `log` block filled with this server's endpoint and key. `Cache-Control: public, max-age=60`. Returns 404 when nothing is published yet. |
| GET | `/v1/sites/:publicKey/head.js` | none | The output of `renderHeadScript(config)`, served as `application/javascript`, `max-age=60`. |
| GET | `/v1/sites/:publicKey/embed.js` | none | Head script + inline config + loader. The loader injects `/static/easy-cookie.css` and `/static/easy-cookie.iife.js`, then calls `EasyCookie.run(config)`. A single synchronous `<script>` tag in `<head>`, like Iubenda. |
| GET | `/static/*` | none | Built assets of `@easy-cookie/core` (`easy-cookie.iife.js`, `easy-cookie.css`). |
| GET | `/health` | none | `{ ok: true, db: true }` |

What the server stores per record:
- `ipHash = sha256(site.ipHashSalt + ip)`, never the raw IP;
- the `User-Agent` header, truncated to 512 characters;
- `receivedAt` (its own clock) next to the client-provided `clientTimestamp`.

How the browser runtime sends writes: as CORS **simple requests** (no preflight), so they survive page unloads. It calls `POST /v1/consents?key=pk_…` and `POST /v1/consents/:consentId/subject?key=pk_…` with `Content-Type: text/plain;charset=UTF-8` and a JSON body, through `fetch(…, { keepalive: true, mode: 'cors' })` or `navigator.sendBeacon`. The server parses the body as JSON whatever its content type (max 32 KB) and still enforces the Origin allow-list (sendBeacon sends `Origin`). Allowed origins get `Access-Control-Allow-Origin: <origin>`; others get `403 origin_not_allowed` with no CORS header. Preflights (`OPTIONS`) are answered for `Content-Type, X-Site-Key`; when the key is in the query, a preflight from a disallowed origin gets 403.

Error codes: `401 unauthorized` (missing/unknown key), `403 origin_not_allowed`, `400 invalid_json` / `invalid_record`, `413 payload_too_large`, `429 rate_limited` (with `Retry-After`).

`POST …/subject` answers 204 even when no record has that consentId yet (it does not reveal which ids exist). Records that arrive later are not linked retroactively, so the runtime should call `identify()` after the consent POST resolves.

Rate limit: 60 records per minute per IP hash per site, in memory (per process). Subject links count against the same limit.

## Server-to-server (`/v1`, `Authorization: Bearer sk_…`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/consents?consentId=&subjectId=&from=&to=&limit=&cursor=` | Proof and audit queries |
| GET | `/v1/subjects/:subjectId/consents?limit=&cursor=` | Data access request (GDPR art. 15). Paginated like every list. |
| DELETE | `/v1/subjects/:subjectId` | Erasure (art. 17): deletes the subject's records, returns `{ deleted: n }` |
| PUT | `/v1/config` | Body `{ config, publish?: boolean, note? }`. Lets CI push a code-defined config, which validates and optionally publishes a revision. |

`PUT /v1/config` details:
- An invalid config returns `422 invalid_config` with `issues`, and nothing is saved.
- A valid config replaces the site's draft. The response is `200 { draft: { updatedAt, issues: [] }, published: null | { revision, note, publishedAt, config, created } }`.
- With `publish: true`, the revision id is the config's own `config.revision`, because the code defines it. If that revision already exists with the same content (key order ignored), the call is a no-op (`created: false`) and the revision becomes the published one again, so CI reruns are safe. If it exists with different content, the call returns `409 revision_exists`: bump `config.revision`.
- Revision ids (here and in the admin API) are 1–64 characters: letters, digits, `.`, `_`, `-`.

`from` / `to` filters (here and in the admin API) take ISO timestamps. A date-only `to` (`2026-11-13`) includes that whole UTC day.

## Admin API (`/admin/api`, session cookie, used by the console)

**Auth**
- Admins live in the `AdminUser` table, with passwords hashed by scrypt.
- On first boot, `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment create the first admin.
- Sessions use an httpOnly, `SameSite=Strict` cookie `ec_admin`, valid for 7 days. Every mutating request also checks a double-submit CSRF header `X-CSRF-Token`.

| Method | Path | Notes |
|---|---|---|
| POST | `/admin/api/auth/login` | `{ email, password }` → `{ user, csrfToken }` |
| POST | `/admin/api/auth/logout` | |
| GET | `/admin/api/auth/me` | → `{ user, csrfToken }` or 401 |
| GET | `/admin/api/sites` | → `[{ id, name, domain, publicKey, origins, publishedRevision, createdAt, stats30d: { total } }]` |
| POST | `/admin/api/sites` | `{ name, domain, origins[] }` → site + `secretKey` (shown once). Creates a starter draft config. |
| GET / PATCH / DELETE | `/admin/api/sites/:id` | PATCH `{ name?, domain?, origins? }` |
| POST | `/admin/api/sites/:id/rotate-secret` | → `{ secretKey }` (once) |
| GET | `/admin/api/sites/:id/draft` | → `{ config, updatedAt, issues: ConfigIssue[] }` |
| PUT | `/admin/api/sites/:id/draft` | `{ config }` → same shape. Saves even when invalid and returns the issues. |
| GET | `/admin/api/sites/:id/revisions` | → `[{ revision, note, publishedAt, publishedBy, recordCount }]`, newest first |
| POST | `/admin/api/sites/:id/revisions` | `{ revision?, note? }`. Publishes the draft as an immutable `PolicyVersion`. `revision` defaults to `YYYY-MM-DD` (with a `-2`, `-3`… suffix on collision) and is written into the snapshot. Returns 422 with issues when the draft is invalid. |
| GET | `/admin/api/sites/:id/revisions/:revision` | → `{ revision, note, publishedAt, config }` |
| GET | `/admin/api/sites/:id/consents` | Query: `from, to, method, revision, q` (`q` matches consentId or subjectId prefix), plus pagination. Items: `{ id, consentId, subjectId, revision, method, categories, services, language, pageUrl, ipHash, userAgent, clientTimestamp, receivedAt }` |
| GET | `/admin/api/sites/:id/consents/:recordId` | Full record + `history`: every record with the same consentId, newest first |
| GET | `/admin/api/sites/:id/consents.csv` | Same filters, streamed CSV |
| GET | `/admin/api/sites/:id/stats?days=30` | `{ total, byMethod: {accept_all,…}, byDay: [{ date, total, accept_all, reject_all, custom, close, withdraw }], byCategory: { [cat]: grantedCount }, currentRevision: { revision, publishedAt, recordsSince } }` |

Admin API details:
- `user` is `{ id, email }`. Login is rate-limited to 10 attempts per minute per IP. Logout answers 204.
- The CSRF token is bound to the session (returned by login and `me`). Mutating requests without a matching `X-CSRF-Token` get `403 csrf`.
- The session cookie has `Path=/admin`. It is `Secure` when `PUBLIC_URL` starts with `https://`.
- `POST /sites` answers `201` with the same site shape plus `secretKey`. `DELETE /sites/:id` answers 204 and deletes the site's revisions and records.
- `POST /sites/:id/revisions` answers `201 { revision, note, publishedAt, config }`. An explicit `revision` that already exists returns `409 revision_exists`. Publishing makes the new revision the site's `publishedRevision`.
- `stats`: `days` is 1–366. `byDay` holds one zero-filled entry per UTC day, oldest first, with today last. `byCategory` counts records in the window where the category was granted. `recordsSince` counts records received since the current revision was published. `currentRevision` is `null` when nothing is published.
- `consents.csv` columns: `id, receivedAt, clientTimestamp, consentId, subjectId, revision, method, grantedCategories` (space-separated), `categories, services` (JSON), `language, pageUrl, ipHash, userAgent`. The file is UTF-8 with a BOM. Cells that start with `= + - @` get a `'` prefix to block spreadsheet formula injection.

## Static files

- `/admin/*` (except `/admin/api`) serves the console SPA from `CONSOLE_DIR`. Unknown paths without a file extension fall back to `index.html`, so the console must be built with `base: '/admin/'`.
- `/static/*` serves `STATIC_DIR`, by default `packages/core/dist`, and returns 404 for files that are not there.

## Data model (Prisma, Postgres)

```prisma
model AdminUser    { id String @id @default(cuid()); email String @unique; passwordHash String; createdAt DateTime @default(now()) }
model AdminSession { id String @id; userId String; csrfToken String; expiresAt DateTime }
model Site {
  id String @id @default(cuid())
  name String
  domain String
  origins String[]
  publicKey String @unique
  secretKeyHash String @unique
  ipHashSalt String
  draftConfig Json
  draftUpdatedAt DateTime @default(now())
  publishedRevision String?
  createdAt DateTime @default(now())
}
model PolicyVersion {   // immutable
  id String @id @default(cuid())
  siteId String
  revision String
  note String?
  config Json
  publishedAt DateTime @default(now())
  publishedBy String?
  @@unique([siteId, revision])
}
model ConsentRecord {   // append-only; deleted only by subject erasure or site deletion
  id String @id @default(cuid())
  siteId String
  consentId String
  subjectId String?
  revision String
  method String
  categories Json
  services Json
  language String?
  pageUrl String?
  ipHash String?
  userAgent String?
  clientTimestamp DateTime
  receivedAt DateTime @default(now())
  @@index([siteId, receivedAt])
  @@index([siteId, consentId])
  @@index([siteId, subjectId])
}
```

Implementation notes (`apps/server/prisma/schema.prisma`):
- `draftConfig` and `PolicyVersion.config` use `@db.Json` (Postgres `json`, not `jsonb`). `jsonb` reorders object keys, and category order is significant: it is the order of the banner and the policy.
- Foreign keys with `onDelete: Cascade` link `AdminSession` to `AdminUser`, and `PolicyVersion` and `ConsentRecord` to `Site`.
