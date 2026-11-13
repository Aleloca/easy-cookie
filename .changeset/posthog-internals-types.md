---
"@easy-cookie/posthog": patch
---

posthog-js can be passed to `connectPostHog` again without a cast: the posthog-js internals used to restart session replay are no longer part of `PostHogLike` (their stricter types conflicted). The `_onRemoteConfig` hook is restored when the adapter disconnects, so reconnecting never stacks wrappers.
