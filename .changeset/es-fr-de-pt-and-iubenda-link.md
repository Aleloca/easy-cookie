---
"@easy-cookie/core": patch
"@easy-cookie/policy": patch
---

Built-in Spanish (`es`), French (`fr`), German (`de`, "Sie" form) and European Portuguese (`pt`). The banner and preferences texts, the known category names and descriptions, every service catalog entry (purposes, cookie durations and descriptions, transfer safeguards, owner notes), the cookie policy labels and the legal-document directive labels now exist in these languages besides Italian and English. A regional code such as `de-AT` uses its base language, and any other language still falls back to English. The new `BUILTIN_LANGUAGES`, `BuiltinLanguage` and `builtinLanguage()` from `@easy-cookie/core/shared`, and `policyLabelsFor()` from `@easy-cookie/policy`, expose this. The legal templates stay Italian and English.

The runtime now also opens the preferences from elements with Iubenda's `iubenda-cs-preferences-link` class, as it does for `data-ec-open-preferences`, so sites migrating from Iubenda can keep their "update cookie preferences" links unchanged.
