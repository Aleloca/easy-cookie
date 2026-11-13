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

  Each request is checked against the site's `origins` allow-list (the `Origin` header). `*` is allowed, but the console warns about it.
- **Secret key** `sk_<32 base62>`. Server-to-server only, sent as `Authorization: Bearer sk_…`.
  - It is shown once, on creation or rotation.
  - Only a sha256 hash is stored.

## Public endpoints (`/v1`, CORS enabled for the site origins)

| Method | Path | Auth | Body / response |
|---|---|---|---|
| POST | `/v1/consents` | header `X-Site-Key: pk_…` | Body: `ConsentRecordInput`. Response `201 { id, receivedAt }`. Must accept `keepalive` fetches and `text/plain` bodies (sendBeacon). |
| POST | `/v1/consents/:consentId/subject` | `X-Site-Key` | Body: `{ subjectId }`. Response `204`. Links every record with that consentId to a user id (after login). |
| GET | `/v1/sites/:publicKey/config.json` | none | The **published** `EasyCookieConfig`, with the `log` block filled with this server's endpoint and key. `Cache-Control: public, max-age=60`. Returns 404 when nothing is published yet. |
| GET | `/v1/sites/:publicKey/head.js` | none | The output of `renderHeadScript(config)`, served as `application/javascript`, `max-age=60`. |
| GET | `/v1/sites/:publicKey/embed.js` | none | Head script + inline config + loader. The loader injects `/static/easy-cookie.css` and `/static/easy-cookie.iife.js`, then calls `EasyCookie.run(config)`. A single synchronous `<script>` tag in `<head>`, like Iubenda. |
| GET | `/static/*` | none | Built assets of `@easy-cookie/core` (`easy-cookie.iife.js`, `easy-cookie.css`). |
| GET | `/health` | none | `{ ok: true, db: true }` |

What the server stores per record:
- `ipHash = sha256(site.ipHashSalt + ip)`, never the raw IP;
- the `User-Agent` header, truncated to 512 characters;
- `receivedAt` (its own clock) next to the client-provided `clientTimestamp`.

Rate limit: 60 records per minute per IP hash per site, in memory.

## Server-to-server (`/v1`, `Authorization: Bearer sk_…`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/consents?consentId=&subjectId=&from=&to=&limit=&cursor=` | Proof and audit queries |
| GET | `/v1/subjects/:subjectId/consents` | Data access request (GDPR art. 15) |
| DELETE | `/v1/subjects/:subjectId` | Erasure (art. 17): deletes the subject's records, returns `{ deleted: n }` |
| PUT | `/v1/config` | Body `{ config, publish?: boolean, note? }`. Lets CI push a code-defined config, which validates and optionally publishes a revision. |

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
