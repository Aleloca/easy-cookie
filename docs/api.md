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

## Service catalog (library of ready-made services)

The catalog lives in `@easy-cookie/core/catalog` (`packages/core/src/catalog/`), typed by `CatalogEntry` in `catalog/types.ts`. It is plain data, so npm users, the CLI and the console share it.

- Exports: `CATALOG: CatalogEntry[]`, `findCatalogEntry(id)`, `catalogToService(entry): ServiceDeclaration`.
- `catalogToService` copies label, provider, privacyUrl, category, purpose and cookies, and sets `from: entry.id`.
- `ServiceDeclaration.from?: string` records which catalog entry a service came from. It is informational only: the owner may edit every field afterwards, and the config never depends on the catalog at runtime.
- Entries carry IT and EN text (`{ it, en }`) for `purpose`, cookie `duration` and cookie `description`.

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/admin/api/catalog` | session | `CatalogEntry[]`, sorted by group then label |

Group order is `CATALOG_GROUPS` (`analytics, advertising, tag-management, embeds, support, payments, security, infrastructure`), not alphabetical; labels sort with `localeCompare(…, 'en')`. `CATALOG` itself is already in that order. An entry's `provider` and `privacyUrl` may be empty strings (the first-party `easy-cookie` entry); `catalogToService` omits them then.

## Legal documents (cookie policy, privacy policy, terms)

Each site has exactly three documents, `kind ∈ { cookie, privacy, terms }`. They are created lazily on first read, pre-filled from the built-in templates for the site's languages.

### Content

```ts
interface LegalDocContent {
  /** One entry per language the document is written in. */
  translations: Record<string, { title: string; body: string /* Markdown */ }>;
}
```

The body is Markdown, rendered with raw HTML **disabled** (HTML in the source is shown as text). Links use the `http`, `https` and `mailto` schemes and relative URLs only.

Directives are written on their own line and expanded at render time:

| Directive | Expands to |
|---|---|
| `{{cookie-table}}` | The per-category cookie tables generated from the site's **published** banner config (`@easy-cookie/policy`). In the console preview, the draft config is used. |
| `{{services-list}}` | The list of third-party services from the config: label, provider, purpose, privacy link and data-transfer countries when known. |
| `{{preferences-link}}` | A link that opens the cookie preferences: `<a href="#" data-ec-open-preferences>`. The core runtime binds every `[data-ec-open-preferences]` element on the page. |
| `{{last-updated}}` | The publication date of the version being shown, in the document's language. |

Placeholders the owner must fill in are written as `[[Testo da compilare]]` (double square brackets). The renderer shows them highlighted. The console counts them and warns before publishing, but does not block publishing.

### Versions

- The draft is editable.
- Publishing creates an immutable `LegalDocumentVersion`, and the newest one is the version shown to visitors.
- Version ids follow the banner revision rules: `YYYY-MM-DD` by default, with a `-2` suffix on collision, or any id of 1–64 characters from `[A-Za-z0-9._-]`.
- Legal document versions are independent of the banner `revision`. Changing a legal document does not re-prompt visitors; changing what the banner declares does.

### Admin API (`/admin/api`, session + CSRF on mutations)

| Method | Path | Notes |
|---|---|---|
| GET | `/sites/:id/legal` | `[{ kind, title, languages, draftUpdatedAt, publishedVersion, publishedAt, placeholders }]` for all three kinds. `title` is in the site's default language; `placeholders` counts the `[[…]]` left in the draft. |
| GET | `/sites/:id/legal/:kind` | `{ kind, draft: LegalDocContent, draftUpdatedAt, publishedVersion, placeholders, versions: [{ version, note, publishedAt, publishedBy }] }`, with versions newest first |
| PUT | `/sites/:id/legal/:kind/draft` | `{ draft }`, same response as GET |
| POST | `/sites/:id/legal/:kind/versions` | `{ version?, note? }` → `201 { version, note, publishedAt }`. An existing explicit version returns `409 version_exists`; an empty translation set returns `422 empty_document`. |
| GET | `/sites/:id/legal/:kind/versions/:version` | `{ version, note, publishedAt, content }` |
| POST | `/sites/:id/legal/:kind/render` | `{ content, lang }` → `{ title, html }`: preview of unsaved content, with directives expanded against the **draft** banner config |
| GET | `/legal-templates/:kind?lang=it` | `{ title, body }`: the built-in template, with `{{site.name}}` and `{{site.domain}}` already replaced when `siteId` is passed as a query parameter |

Admin API details:
- Unknown `kind` → `404 not_found`. Unknown `siteId` on `/legal-templates` → 404.
- Lazy creation pre-fills one translation per language of the site's **draft** banner config: `language.available`, else `[language.default]`, else `['it']`. Templates exist in `it` and `en`; any other language is pre-filled with the English text, to translate. `{{site.name}}` / `{{site.domain}}` are replaced with the site's values.
- `GET /sites/:id/legal`: always the three kinds, in the order `cookie, privacy, terms`. `publishedVersion` and `publishedAt` are `null` until the first publication. `title` falls back like the public language (default language, then first translation); `''` when there are no translations.
- `PUT …/draft`: an invalid body (`draft` missing, not `{ translations: { [lang]: { title: string ≤ 300, body: string ≤ 200 000 } } }`, or a malformed language code) → `400 invalid_document`. Language order is kept (json column).
- `POST …/versions`: `422 empty_document` also when every translation has a blank body. A malformed explicit `version` → `400 invalid_version`. `publishedBy` is the admin's email.
- `POST …/render`: also returns `lang` (the language actually rendered), so the response is `{ title, html, lang }`. `lang` defaults to the site's default language. Content is validated like the draft (`400 invalid_document`). If the draft banner config has validation issues, the tables are left out (a notice is shown instead). `{{last-updated}}` shows today.

### Public endpoints (no auth, `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=300`)

| Method | Path | Response |
|---|---|---|
| GET | `/v1/sites/:publicKey/legal/:kind.json?lang=` | `{ kind, lang, languages, title, html, version, publishedAt }`. The language falls back to the config default, then to the first translation. Returns 404 `not_published` when nothing is published. |
| GET | `/v1/sites/:publicKey/legal/:kind.html?lang=` | The same `html` as a bare fragment (`text/html`) |
| GET | `/v1/sites/:publicKey/legal.js` | Loader script that fills every `<div data-easy-cookie-legal="cookie\|privacy\|terms" [data-lang="it"]>` on the page with the published document, and injects `/static/easy-cookie-legal.css` once (opt out with `data-no-style`). |
| GET | `/p/:publicKey/:kind?lang=` | Hosted page: a complete, standalone, readable HTML page for the document, with a language switcher and links to the site's other published documents. Use it as the banner's `policyUrl` when the site has no page of its own (the Iubenda-style hosted link). |

The rendered HTML is wrapped in `<div class="ec-legal" lang="…" data-version="…">` and starts with `<h1 class="ec-legal__title">` (the title, placeholders highlighted). Cookie tables keep the `@easy-cookie/policy` markup (category titles as `<h3>`). `title` in JSON responses is plain text with `[[…]]` brackets removed.

Public endpoint details:
- 404s (unknown key, unknown kind, nothing published) also carry `Access-Control-Allow-Origin: *`, with `Cache-Control: no-store`. The `.json` 404 body is `{ error: { code: 'not_published' } }`; `.html` returns an HTML comment; `legal.js` for an unknown key returns a JS comment; `/p/…` returns a small `noindex` page.
- Language fallback also tries the base language (`en-GB` → `en`). "Config default" is the **published** banner config's `language.default`, else the draft's.
- `legal.js`: without `data-lang`, the loader sends the page's `<html lang>`. `data-no-style` works on the `<script>` tag or on a container. Filled containers get `data-ec-legal-state="loading|ready|error"`; `window.__easyCookieLegal.scan()` fills containers added later.
- `/p/:publicKey/:kind`: links to other documents only list published ones. The banner is not loaded there, so `{{preferences-link}}` points to `https://<site domain>/` (no `data-ec-open-preferences`). The page is localized (IT/EN chrome, "Generato con / Generated with easy-cookie"), has `canonical` and `hreflang` alternates, and loads `/static/easy-cookie-legal.css`.
- `/static/easy-cookie-legal.css` is read from `STATIC_DIR`, falling back to `POLICY_DIR` (default `packages/policy/dist`). The Docker image copies it into `STATIC_DIR`. `/static/easy-cookie-legal.css` is a small, neutral, variable-driven stylesheet (`--ec-legal-*`) built from `@easy-cookie/policy`.

### Packages

- `@easy-cookie/policy`:
  - `renderLegalDocument(content, lang, { config, version?, publishedAt?, site?, heading?, preferencesHref? }) → { lang, title, html }` (shared by the server and SSR);
  - `fetchLegalDocument({ endpoint, siteKey, kind, lang, init?, fetch? })` → the `.json` body, or `null` on 404. Also available from the small `@easy-cookie/policy/client` entry (no Markdown renderer), which `@easy-cookie/next` uses;
  - `LEGAL_TEMPLATES`, `legalTemplate(kind, lang, site?)`, `countPlaceholders(content)`, `legalContentError(value)`;
  - `@easy-cookie/policy/legal.css` (`dist/easy-cookie-legal.css`).
- `@easy-cookie/policy/react`: `<LegalDocument endpoint siteKey kind lang />`, which fetches on the client, and `<LegalDocumentHtml doc={…} />` to render a document fetched on the server.
- `@easy-cookie/next/server`: `getLegalDocument({ endpoint, siteKey, kind, lang, revalidate? })` for Server Components, using `fetch` with `next: { revalidate }` (default 300 s), so legal pages are server-rendered and indexable.

### Data model

```prisma
model LegalDocument {
  id               String   @id @default(cuid())
  siteId           String
  kind             String           // cookie | privacy | terms
  draft            Json     @db.Json
  draftUpdatedAt   DateTime @default(now())
  publishedVersion String?
  site             Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  versions         LegalDocumentVersion[]
  @@unique([siteId, kind])
}
/// Immutable.
model LegalDocumentVersion {
  id          String   @id @default(cuid())
  documentId  String
  version     String
  note        String?
  content     Json     @db.Json
  publishedAt DateTime @default(now())
  publishedBy String?
  document    LegalDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  @@unique([documentId, version])
}
```

## Importing records

`easy-cookie-server import <siteId> <file.jsonl> [--dry-run]` loads historical proofs, for example from a home-made consent log, into a site's register.

- The file is JSON Lines: one `ImportRecord` per line (`apps/server/src/services/import.ts`). Each record has:
  - `consentId`, `revision`, `method`, `categories` (an object of booleans) and `clientTimestamp` (ISO);
  - optionally `subjectId`, `services`, `language`, `pageUrl`, `ipHash`, `userAgent`, and `receivedAt` (defaults to `clientTimestamp`).
- Records keep their original timestamps.
- Use a revision id that marks them as imported, e.g. `legacy-1.0.0`.
- `ipHash` is stored as-is. Hashes made by another system with another salt cannot be compared with this server's.
- All or nothing: if any line is invalid, nothing is imported and every invalid line is reported.
- Re-running the same file is safe. A record with the same `consentId`, `clientTimestamp` and `method` already in the register is skipped.
