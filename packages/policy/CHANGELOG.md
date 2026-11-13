# @easy-cookie/policy

## 0.1.6

### Patch Changes

- [`214c3fd`](https://github.com/Aleloca/easy-cookie/commit/214c3fd19d3fa5a1c3e3c0d692b47cd88fc16779) Thanks [@Aleloca](https://github.com/Aleloca)! - Built-in Spanish (`es`), French (`fr`), German (`de`, "Sie" form) and European Portuguese (`pt`). The banner and preferences texts, the known category names and descriptions, every service catalog entry (purposes, cookie durations and descriptions, transfer safeguards, owner notes), the cookie policy labels and the legal-document directive labels now exist in these languages besides Italian and English. A regional code such as `de-AT` uses its base language, and any other language still falls back to English. The new `BUILTIN_LANGUAGES`, `BuiltinLanguage` and `builtinLanguage()` from `@easy-cookie/core/shared`, and `policyLabelsFor()` from `@easy-cookie/policy`, expose this. The legal templates stay Italian and English.

  The runtime now also opens the preferences from elements with Iubenda's `iubenda-cs-preferences-link` class, as it does for `data-ec-open-preferences`, so sites migrating from Iubenda can keep their "update cookie preferences" links unchanged.

- Updated dependencies [[`214c3fd`](https://github.com/Aleloca/easy-cookie/commit/214c3fd19d3fa5a1c3e3c0d692b47cd88fc16779)]:
  - @easy-cookie/core@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @easy-cookie/core@0.1.5

## 0.1.4

### Patch Changes

- Updated dependencies []:
  - @easy-cookie/core@0.1.4

## 0.1.3

### Patch Changes

- Updated dependencies []:
  - @easy-cookie/core@0.1.3

## 0.1.2

### Patch Changes

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
