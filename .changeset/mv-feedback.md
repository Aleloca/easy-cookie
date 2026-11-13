---
"@easy-cookie/core": patch
"@easy-cookie/posthog": patch
"@easy-cookie/policy": patch
"@easy-cookie/next": patch
"@easy-cookie/react": patch
---

Fixes from the first real integration (MythicVoices):

- core: `identify()` resolves to a boolean, waits for the consent record, and queues the subject when called before the first choice. `window.__easyCookieHead` stays in sync after on-page choices. Categories without services are left out once services are declared.
- posthog: `before_send` types now match posthog-js. New `beforeChoice` (`'pending'` clears a stale opt-in, `'cookieless'` counts without cookies) and `sessionReplay` options. Opt-in sends no `$opt_in` event.
- policy: headings in legal documents get stable `id` anchors.
- next: `getRemoteConfig()` for server-side consent checks with a console-managed config.
- READMEs: the GTM event name and the category ids are configurable.
