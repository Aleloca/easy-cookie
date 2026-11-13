---
"@easy-cookie/posthog": patch
---

`connectPostHog` reads posthog-js' explicit consent status (`get_explicit_consent_status()`), so `beforeChoice: 'cookieless'` and rejections work with `cookieless_mode: 'on_reject'`, where `has_opted_out_capturing()` is already true while pending. The adapter also waits for the runtime to be ready, so a returning visitor who accepted is never opted out (and reset) before the stored choice is read.
