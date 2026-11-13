---
"@easy-cookie/posthog": patch
---

With `sessionReplay: true`, session replay now starts on the page where a visitor accepts after cookieless counting (`beforeChoice: 'cookieless'` or after a rejection). posthog-js resets the instance on that switch and its new recorder waits for a remote config that is fetched only once per page load; the adapter now keeps that config (or fetches it again) and hands it to the new recorder. The calls are guarded, so with an incompatible posthog-js the replay simply starts on the next page load.
