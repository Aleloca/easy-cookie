# @easy-cookie/next

## 0.1.7

### Patch Changes

- Updated dependencies [[`54e7f5e`](https://github.com/Aleloca/easy-cookie/commit/54e7f5e69552dd9b07e93a9a8494181d14775c9c)]:
  - @easy-cookie/core@0.1.7
  - @easy-cookie/policy@0.1.7
  - @easy-cookie/react@0.1.7

## 0.1.6

### Patch Changes

- Updated dependencies [[`214c3fd`](https://github.com/Aleloca/easy-cookie/commit/214c3fd19d3fa5a1c3e3c0d692b47cd88fc16779)]:
  - @easy-cookie/core@0.1.6
  - @easy-cookie/policy@0.1.6
  - @easy-cookie/react@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @easy-cookie/core@0.1.5
  - @easy-cookie/policy@0.1.5
  - @easy-cookie/react@0.1.5

## 0.1.4

### Patch Changes

- Updated dependencies []:
  - @easy-cookie/core@0.1.4
  - @easy-cookie/policy@0.1.4
  - @easy-cookie/react@0.1.4

## 0.1.3

### Patch Changes

- Updated dependencies []:
  - @easy-cookie/core@0.1.3
  - @easy-cookie/policy@0.1.3
  - @easy-cookie/react@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @easy-cookie/core@0.1.2
  - @easy-cookie/policy@0.1.2
  - @easy-cookie/react@0.1.2

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
  - @easy-cookie/policy@0.1.1
  - @easy-cookie/react@0.1.1
