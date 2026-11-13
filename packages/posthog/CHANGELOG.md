# @easy-cookie/posthog

## 0.1.4

### Patch Changes

- [`adf30eb`](https://github.com/Aleloca/easy-cookie/commit/adf30eb1ca89972e4668f44e3732f72cc84060a4) Thanks [@Aleloca](https://github.com/Aleloca)! - With `sessionReplay: true`, session replay now starts on the page where a visitor accepts after cookieless counting (`beforeChoice: 'cookieless'` or after a rejection). posthog-js resets the instance on that switch and its new recorder waits for a remote config that is fetched only once per page load; the adapter now keeps that config (or fetches it again) and hands it to the new recorder. The calls are guarded, so with an incompatible posthog-js the replay simply starts on the next page load.

- Updated dependencies []:
  - @easy-cookie/core@0.1.4

## 0.1.3

### Patch Changes

- [`7c77db9`](https://github.com/Aleloca/easy-cookie/commit/7c77db98f770f731ad5b3ca856a195c6d695aaf5) Thanks [@Aleloca](https://github.com/Aleloca)! - `connectPostHog` calls `opt_out_capturing()` once per page load even when PostHog is already opted out, so in `cookieless_mode: 'on_reject'` the landing `$pageview` of returning visitors who rejected (or have not chosen, with `beforeChoice: 'cookieless'`) is counted. posthog-js only resets the instance when the visitor was opted in, so this is safe.

- Updated dependencies []:
  - @easy-cookie/core@0.1.3

## 0.1.2

### Patch Changes

- [`9d6adb7`](https://github.com/Aleloca/easy-cookie/commit/9d6adb76f01cc77572741dc63f23bb6155bd93ed) Thanks [@Aleloca](https://github.com/Aleloca)! - `connectPostHog` reads posthog-js' explicit consent status (`get_explicit_consent_status()`), so `beforeChoice: 'cookieless'` and rejections work with `cookieless_mode: 'on_reject'`, where `has_opted_out_capturing()` is already true while pending. The adapter also waits for the runtime to be ready, so a returning visitor who accepted is never opted out (and reset) before the stored choice is read.

- Updated dependencies []:
  - @easy-cookie/core@0.1.2

## 0.1.1

### Patch Changes

- [`49bfab9`](https://github.com/Aleloca/easy-cookie/commit/49bfab913dae11da2520a8ead394d6bbe11d07b2) Thanks [@Aleloca](https://github.com/Aleloca)! - Fixes from the first real integration (MythicVoices):

  - core: `identify()` resolves to a boolean, waits for the consent record, and queues the subject when called before the first choice. `window.__easyCookieHead` stays in sync after on-page choices. Categories without services are left out once services are declared.
  - posthog: `before_send` types now match posthog-js. New `beforeChoice` (`'pending'` clears a stale opt-in, `'cookieless'` counts without cookies) and `sessionReplay` options. Opt-in sends no `$opt_in` event.
  - policy: headings in legal documents get stable `id` anchors.
  - next: `getRemoteConfig()` for server-side consent checks with a console-managed config.
  - READMEs: the GTM event name and the category ids are configurable.

- Updated dependencies [[`49bfab9`](https://github.com/Aleloca/easy-cookie/commit/49bfab913dae11da2520a8ead394d6bbe11d07b2)]:
  - @easy-cookie/core@0.1.1
