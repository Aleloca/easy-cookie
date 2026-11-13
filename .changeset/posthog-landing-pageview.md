---
"@easy-cookie/posthog": patch
---

`connectPostHog` calls `opt_out_capturing()` once per page load even when PostHog is already opted out, so in `cookieless_mode: 'on_reject'` the landing `$pageview` of returning visitors who rejected (or have not chosen, with `beforeChoice: 'cookieless'`) is counted. posthog-js only resets the instance when the visitor was opted in, so this is safe.
