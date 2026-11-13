# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- **UI library:** vanilla TypeScript + CSS custom properties, built from a source fork of orestbida/vanilla-cookieconsent v3.3.0 (MIT).
- **Packages:** React/Next.js adapters. Consent server on Node + Hono + Prisma + Postgres. See `docs/ARCHITECTURE.md`.

## Users

- **Site visitors (primary, equal weight).** People landing on a host website, often on a phone, who meet the banner before anything else. Their job is to make a real choice in a few seconds and change it later just as easily, without feeling pushed.
- **Developers (primary, equal weight).** The maintainer's own projects first (FermoUnAttimo, MythicVoices), then open-source adopters replacing Iubenda. Their job is to integrate, configure categories and services once, restyle the UI to their brand in minutes, and prove consent to an auditor.

## Product Purpose

Easy-cookie is a self-hosted, open-source replacement for the Iubenda pieces small projects need:
- a consent banner and preferences with prior blocking and Google Consent Mode v2;
- a proof-of-consent service;
- a cookie policy table generated from one config.

Success means:
- one library reused across all the maintainer's sites;
- compliance with the Italian Garante 2021 cookie guidelines and the EDPB banner taskforce findings, out of the box;
- no third-party SaaS in the loop.

## Positioning

- **Compliant by construction.** Equal-weight accept and reject, the X counts as reject, categories off by default, re-prompt by revision and expiry. Integrators cannot misconfigure these, unlike libraries that leave them as options.
- **One config drives everything.** The same file feeds the banner, the cookie tables, the cookie cleanup, Consent Mode and the published policy.
- **Self-hosted proof of consent** in the spirit of Iubenda's Consent Database.

## Operating Context

- The banner is embedded in host sites with unrelated identities: an Italian editorial/e-commerce site with ink/cream/amber tokens, and a dark-leaning Tailwind SaaS app.
- It appears on first visit, over real content, on mobile and desktop.
- A reopen control stays available on every page, but some app routes need it hidden or moved.
- Embeds blocked before consent (e.g. YouTube) show an in-place placeholder.
- A generated cookie policy table lives inside the host's own policy page.

## Capabilities and Constraints

- **Surfaces:** first-layer banner, preferences panel (category toggles, per-service cookie tables), floating reopen button, iframe placeholder, generated cookie-policy table, plus a docs/demo site.
- **Legal floor:**
  - accept and reject have equal prominence, with no dark patterns;
  - the X equals reject;
  - scrolling never counts as consent;
  - no pre-ticked boxes;
  - withdrawing is as easy as consenting;
  - there is a policy link on the first layer.
- **Theming:** the default theme must be restyled through CSS custom properties (color, type, radius, spacing, motion), with a light and a dark scheme.
- **i18n:** IT + EN at launch; every string is overridable, including the cookie tables.
- **Accessibility:** keyboard operable, focus trap in the preferences panel, ARIA roles, WCAG 2.2 AA contrast in the default themes, `prefers-reduced-motion` respected.
- **Size budget:** small (target under ~15 kB gz for JS).

## Brand Commitments

- **Name:** "easy-cookie". No logo or voice exists yet.
- **Default theme:** neutral and adaptable, so it integrates into any host. Easy-cookie's own stronger identity lives on its docs/demo site, not inside host pages.

## Evidence on Hand

- `docs/research/existing-implementations.md` and `docs/research/iubenda.md`.
- No users, adopters, benchmarks, or testimonials exist yet. Do not fabricate them.

## Product Principles

1. **Fairness is visible.** The banner never makes rejecting harder, smaller, or later than accepting.
2. **Get out of the way.** Decide in seconds, then disappear; reopen is always one tap away but never in the way of the host app.
3. **The host's brand wins.** Defaults are good enough to ship as they are, and trivially overridable.
4. **One source of truth.** What the visitor sees, what gets blocked, and what the policy says can never drift apart.

## Accessibility & Inclusion

WCAG 2.2 AA. Full keyboard and screen-reader support, `prefers-reduced-motion`, and the default themes must remain usable at 200% zoom and 320px widths.
