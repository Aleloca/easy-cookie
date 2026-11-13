# @easy-cookie/posthog

Keeps [PostHog](https://posthog.com) in sync with easy-cookie consent, with no page reload. It follows the pattern MythicVoices uses in production:

- **Before a choice:** PostHog captures nothing.
- **After a rejection:** cookieless mode only. PostHog sets no cookies and no storage, and creates no person profiles. Autocapture, exceptions, web vitals and heatmaps are dropped.
- **After an acceptance:** normal capture with cookies, then `identify()` for logged-in users.

`posthog-js` is an optional peer dependency. The adapter types PostHog loosely, so any compatible client works.

## Requirements

- **posthog-js** with `cookieless_mode` support (≥ 1.200).
- **Cookieless server hash mode** enabled in the PostHog project settings. Without it, cookieless events are discarded.
- PostHog **must be initialised with `cookieless_mode: 'on_reject'`**. `posthogInitOptions()` does this for you.

## Install

```sh
pnpm add @easy-cookie/posthog posthog-js
```

## Usage

```ts
import posthog from 'posthog-js';
import easyCookie from '@easy-cookie/core';
import { connectPostHog, posthogInitOptions } from '@easy-cookie/posthog';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  ...posthogInitOptions({ api: easyCookie }), // cookieless_mode: 'on_reject', persistence, person_profiles, before_send
  api_host: 'https://eu.i.posthog.com',
});

const disconnect = connectPostHog(posthog, easyCookie, {
  category: 'measurement',                     // default
  identify: () => session?.user?.id,           // optional, called after opt-in only
});
```

With React, connect it in an effect inside the provider:

```tsx
'use client';
import { useEffect } from 'react';
import posthog from 'posthog-js';
import { useEasyCookie } from '@easy-cookie/react';
import { connectPostHog } from '@easy-cookie/posthog';

export function PostHogConsent({ userId }: { userId?: string }) {
  const { api } = useEasyCookie();
  useEffect(() => (api ? connectPostHog(posthog, api, { identify: () => userId }) : undefined), [api, userId]);
  return null;
}
```

## API

### `connectPostHog(posthog, api, { category?, service?, identify? })`

The adapter listens to `replay`, `consent` and `change`, and applies the current state immediately, in case the stored choice was replayed before you connected.

- **Granted:** it calls `posthog.opt_in_capturing()`, skipped when already opted in. It then calls `posthog.identify(id)` when `identify()` returns an id that differs from the current one.
- **Not granted (a choice exists):** it calls `posthog.opt_out_capturing()`. With `on_reject`, PostHog keeps counting anonymously without cookies.
- **No choice yet:** it does nothing.

It returns an unsubscribe function. Use `service: 'posthog'` to follow the service toggle instead of the category.

### `posthogInitOptions(opts?)`

Returns the recommended init options:

```ts
{
  cookieless_mode: 'on_reject',
  persistence: 'localStorage+cookie',   // used only after opt-in
  person_profiles: 'identified_only',
  before_send: consentBeforeSend(opts),
}
```

### `consentBeforeSend({ category?, api?, isGranted?, drop? })`

A `before_send` filter. Without consent it drops `$autocapture`, `$rageclick`, `$dead_click`, `$exception`, `$web_vitals` and `$$heatmap` (the list is `NON_ESSENTIAL_EVENTS`, and you can override it with `drop`). Pageviews and your own events are kept.

The consent check works like this:

1. `isGranted`, when you pass it.
2. Otherwise the runtime, when you pass `api`.
3. Otherwise the state published by the head snippet (`window.__easyCookieHead`). That state is available before the runtime loads.

## License

MIT
