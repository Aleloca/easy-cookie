# @easy-cookie/react

React bindings for [easy-cookie](../../README.md): a provider, a `useConsent()` hook, and components that load scripts and embeds only after consent.

- Every export is a client component or hook. The bundle starts with `"use client"`.
- The provider is safe in SSR. It loads the browser runtime (`@easy-cookie/core`) with a dynamic `import()` inside an effect, so nothing touches the DOM on the server.
- Nothing is granted until the runtime is ready. The server render and the first client render therefore match, and there are no hydration warnings.

## Install

```sh
pnpm add @easy-cookie/react @easy-cookie/core
```

Load the banner theme once, for example `import '@easy-cookie/core/style.css'` in your root layout.

## Usage

```tsx
// app/consent.tsx
'use client';
import { EasyCookieProvider } from '@easy-cookie/react';
import config from '../easy-cookie.config';

export function Consent({ children }: { children: React.ReactNode }) {
  return <EasyCookieProvider config={config}>{children}</EasyCookieProvider>;
}
```

```tsx
// app/layout.tsx (Next.js App Router)
import { EasyCookieHead } from '@easy-cookie/next';
import { Consent } from './consent';
import config from '../easy-cookie.config';
import '@easy-cookie/core/style.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <EasyCookieHead config={config} /> {/* before GTM */}
      </head>
      <body>
        <Consent>{children}</Consent>
      </body>
    </html>
  );
}
```

If the config is published on a consent server, pass `remote` instead of `config`:

```tsx
<EasyCookieProvider remote={{ endpoint: 'https://consent.example.com', siteKey: 'pk_live_…' }}>
```

### Provider props

| Prop | |
|---|---|
| `config` / `remote` | One of the two. It is passed to `run()`, once. |
| `api` | An `EasyCookieApi` instance. Defaults to `import('@easy-cookie/core')`. Use it for tests or a custom runtime. |
| `lang` | Language of the component texts until the runtime reports its own. |
| `onError` | Called when the runtime fails to load or `run()` rejects. |

`run()` is called once per runtime instance. React StrictMode double effects and remounts do not call it again. Props are read on mount only.

### `useConsent()`

```tsx
const { consent, ready, isGranted, isServiceGranted, openPreferences, acceptAll, rejectAll, accept } = useConsent();
```

- The hook re-renders on the `consent`, `change` and `replay` events.
- `isGranted()` returns `false` until `ready` is true.
- Actions called before the runtime has loaded run once it is available.
- `useEasyCookie()` gives lower-level access: `api`, `config`, `language`.

### Components

```tsx
import { ConsentGate, ConsentScript, ConsentEmbed, PreferencesLink } from '@easy-cookie/react';

<ConsentGate category="measurement" fallback={<p>Statistics are off.</p>}>
  <Dashboard />
</ConsentGate>

// Footer link (renders a <button>, the label defaults to the localized "Cookie preferences")
<PreferencesLink className="footer-link" />

// Injected into <head> only when granted, and only once
<ConsentScript category="marketing" service="meta" id="meta-pixel">
  {`!function(f,b,e,v,n,t,s){…}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init','123');`}
</ConsentScript>
<ConsentScript category="measurement" src="https://example.com/analytics.js" />

// Placeholder until consent, then the iframe
<ConsentEmbed
  category="experience"
  service="youtube"
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
  title="Product demo"
  width={560}
  height={315}
  allowFullScreen
/>
```

`<ConsentEmbed>` renders `.ec-embed` with `.ec-embed__text`, `.ec-embed__actions` and `.ec-embed__btn` (plus `--primary`), so the core theme styles it. The texts come from `texts.embed` in the config and are available in IT and EN. It has two buttons:

- **Show content** accepts only that service and keeps every other choice.
- **Always enable "category"** accepts the whole category.

Without a `service` prop, the placeholder shows a single button that enables the category.

A script that has already run cannot be unloaded. On withdrawal, the runtime clears the category's cookies and, by default, reloads the page (`ui.reloadOnWithdraw`).

## Testing your app

Pass a fake runtime through `api`:

```tsx
render(<EasyCookieProvider config={config} api={fakeApi}>…</EasyCookieProvider>);
```

## License

MIT
