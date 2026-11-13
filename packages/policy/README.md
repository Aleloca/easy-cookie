# @easy-cookie/policy

Generates the cookie section of your cookie policy from the same easy-cookie config that drives the banner. The banner tables, the policy and the cleanup rules can no longer drift apart.

It also renders full **legal documents** (cookie policy, privacy policy, terms) written in Markdown, with directives filled from the config. The consent server uses the same renderer. See [Legal documents](#legal-documents).

- DOM-free. It runs at build time, on the server, in a React Server Component or in a CLI.
- Output formats: an HTML string, Markdown, or React (`@easy-cookie/policy/react`).
- The HTML has class names only (`ec-policy*`) and no inline styles.
- Table headers ship in Italian and English. Other languages fall back to English, and every label can be overridden.

## Install

```sh
pnpm add @easy-cookie/policy
```

## Usage

### React / Next.js (server component)

```tsx
// app/cookie-policy/page.tsx
import { CookiePolicy } from '@easy-cookie/policy/react';
import config from '../../easy-cookie.config';

export default function Page() {
  return (
    <article>
      <h1>Cookie policy</h1>
      <p>…your own introduction (data controller, legal basis, rights)…</p>
      <CookiePolicy config={config} lang="it" />
    </article>
  );
}
```

### HTML string / Markdown

```ts
import { buildPolicyModel, renderPolicyHtml, renderPolicyMarkdown } from '@easy-cookie/policy';

const model = buildPolicyModel(config, 'en');          // categories → services → cookies, localized
const html = renderPolicyHtml(model, { headingLevel: 3 });
const md = renderPolicyMarkdown(model);
```

`buildPolicyModel(config, lang, { date?, labels? })`:

- The date defaults to the revision when the revision starts with `YYYY-MM-DD`.
- Cookies declared as regular expressions (`pattern: true`) are shown in a readable form, for example `^_ga_.*$` becomes `_ga_*`. The full pattern goes in the `title` attribute.

`renderPolicyHtml(model, opts)` options:

| Option | Default | |
|---|---|---|
| `headingLevel` | `2` | Heading level of the category titles |
| `idPrefix` | `ec-policy-` | Section ids, for example `#ec-policy-measurement` |
| `meta` | `true` | Shows the "Last updated · Revision" line |
| `hideEmpty` | `false` | Skips categories without services |

The output has this structure:

```html
<div class="ec-policy" lang="en">
  <p class="ec-policy__meta">Last updated: <time datetime="2026-11-13">November 13, 2026</time> · Revision: …</p>
  <section class="ec-policy__category" id="ec-policy-measurement" data-category="measurement">
    <h2 class="ec-policy__title">Measurement</h2>
    <p class="ec-policy__description">…</p>
    <div class="ec-policy__table-wrap">
      <table class="ec-policy__table">
        <caption class="ec-policy__caption">…</caption>
        <thead><tr><th>Cookie</th><th>Service</th><th>Provider</th><th>Duration</th><th>Purpose</th></tr></thead>
        <tbody><tr data-service="ga4"><th scope="row"><code class="ec-policy__cookie">_ga</code></th>…
          <td class="ec-policy__provider"><a class="ec-policy__link" href="https://policies.google.com/privacy">Google Ireland Ltd</a></td>…
```

- A service without cookies still gets a row, with `—` in the cookie column.
- A read-only category gets `.ec-policy__badge` ("Always on").
- All text is HTML-escaped.
- A privacy URL is linked only when it is `http(s):`, `mailto:` or relative.

### autoClear rules

```ts
import { autoClearRules, matchesRule } from '@easy-cookie/policy';

autoClearRules(config);
// { measurement: [{ name: '^_ga$', pattern: true, service: 'ga4' }, …], marketing: [...] }
```

The function returns, per category, the cookies to delete when that category is withdrawn. Read-only categories are not included. `matchesRule(rule, cookieName)` tests one cookie name against a rule.

## Legal documents

A legal document is Markdown text per language:

```ts
interface LegalDocContent {
  translations: Record<string, { title: string; body: string /* Markdown */ }>;
}
```

### Rendering

```ts
import { renderLegalDocument } from '@easy-cookie/policy';

const { lang, title, html } = renderLegalDocument(content, 'it', {
  config,                        // banner config for {{cookie-table}} / {{services-list}}
  version: '2026-11-13',         // optional, written as data-version
  publishedAt: '2026-11-13',     // for {{last-updated}}; defaults to today (previews)
  site: { name: 'Acme', domain: 'acme.it' }, // for {{site.name}} / {{site.domain}} left in the text
});
```

- The translation for `lang` is used. Otherwise the renderer falls back to the base language (`en-GB` → `en`), then to `config.language.default`, then to the first translation. The result reports the language it used.
- Markdown is rendered with [markdown-it](https://github.com/markdown-it/markdown-it): raw HTML is **disabled** (it shows as text), bare URLs are linked, and links accept only `http:`, `https:`, `mailto:` and relative URLs. External links get `rel="noopener noreferrer"`.
- The output is `<div class="ec-legal" lang="…">` with an `<h1 class="ec-legal__title">` (pass `heading: false` to leave it out) followed by the body.

| Directive | Output |
|---|---|
| `{{cookie-table}}` (own line) | The per-category cookie tables of `renderPolicyHtml()` (`<h3>` titles, no meta line). Without `config`, a short notice. |
| `{{services-list}}` (own line) | `<ul class="ec-legal__services">`: label, provider, purpose, category, privacy link and, for services added from the catalog (`from`), the transfer countries and safeguard. Services without a `provider` (first party) are skipped. |
| `{{preferences-link}}` | `<a href="#" class="ec-legal__preferences" data-ec-open-preferences>`, which the core runtime binds to `openPreferences()`. With `preferencesHref`, a plain link to that URL instead (for pages without the banner). |
| `{{last-updated}}` | On its own line: "Ultimo aggiornamento: 13 novembre 2026" (`.ec-legal__updated`). Inline: just the `<time>`. |
| `{{site.name}}`, `{{site.domain}}` | The `site` values, when given. |

`[[Text to fill in]]` placeholders render as `<mark class="ec-legal__todo">Text to fill in</mark>`. `countPlaceholders(content)` counts the ones left.

Other helpers: `pickLegalLanguage`, `legalContentError` (validation), `fillSiteVariables`, `isSafeLegalUrl`, `LEGAL_KINDS`.

### Built-in templates

`LEGAL_TEMPLATES[kind][lang]` holds IT and EN drafts for `cookie`, `privacy` and `terms`. `legalTemplate(kind, lang, site?)` returns one, with `{{site.*}}` filled in (unknown languages get English).

- **Privacy policy:** controller, data categories, purposes and legal bases (art. 6 GDPR), whether data must be provided, retention, recipients, `{{services-list}}`, transfers outside the EEA, rights (artt. 15–22), complaint to the Garante, contact.
- **Cookie policy:** what cookies are, how they are used (technical vs consent-based), categories, `{{cookie-table}}`, managing consent (`{{preferences-link}}`), browser settings, controller, last update.
- **Terms:** a generic skeleton for a site or service.

They are **starting drafts, not legal advice**. Every owner-specific value is a `[[placeholder]]`, and the first line of each template is a placeholder that asks for a professional review. Delete it once the text is reviewed.

### Fetching published documents

```ts
import { fetchLegalDocument } from '@easy-cookie/policy/client'; // tiny entry, no Markdown renderer

const doc = await fetchLegalDocument({ endpoint: 'https://consent.example.com', siteKey: 'pk_…', kind: 'privacy', lang: 'it' });
// { kind, lang, languages, title, html, version, publishedAt } or null when nothing is published
```

`fetchLegalDocument` is also exported from the root and from `/react`. It accepts `init` (extra `fetch` options) and `fetch` (a custom implementation).

### React

```tsx
import { LegalDocument, LegalDocumentHtml } from '@easy-cookie/policy/react';

// Server-rendered (RSC, SSR): fetch first, then render.
<LegalDocumentHtml doc={doc} fallback={<p>Not published yet.</p>} />

// Client-side fetch (a "use client" component).
<LegalDocument endpoint="https://consent.example.com" siteKey="pk_…" kind="cookie" lang="it" loading={<p>…</p>} />
```

For Next.js, `getLegalDocument()` in `@easy-cookie/next/server` wraps `fetchLegalDocument` with `next: { revalidate }`.

### Stylesheet

`@easy-cookie/policy/legal.css` (`dist/easy-cookie-legal.css`, also served by the consent server at `/static/easy-cookie-legal.css`) is a small, neutral stylesheet for `.ec-legal`: readable measure, headings, lists, tables (including the cookie tables), the services list and the placeholder marks. All selectors use `:where()`, so your own rules always win. Restyle it with these variables, set on `:root`, on `.ec-legal` or on any ancestor:

| Variable | Default | Role |
|---|---|---|
| `--ec-legal-font` | `system-ui, sans-serif` | Font |
| `--ec-legal-ink` / `--ec-legal-muted` | `#1c1c1a` / `#5a5a55` | Text, secondary text |
| `--ec-legal-line` | `#dcdcd6` | Rules and table borders |
| `--ec-legal-accent` | `#1a56c4` | Links and focus ring |
| `--ec-legal-todo` | `#fff2a8` | Placeholder highlight |
| `--ec-legal-max-width` | `72ch` | Measure |

## License

MIT
