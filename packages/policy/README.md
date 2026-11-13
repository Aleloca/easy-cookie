# @easy-cookie/policy

Generates the cookie section of your cookie policy from the same easy-cookie config that drives the banner. The banner tables, the policy and the cleanup rules can no longer drift apart.

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

## License

MIT
