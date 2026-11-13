---
version: 1
slug: "src"
primary_target: "src"
related_targets: []
---

# Platform: admin console + public site

Scope: apps/console (admin console of the consent server: sites, banner configuration with live preview, policy revisions, consent register, API keys) and apps/site (public project site: landing, docs, live demo). One identity for both. Mode: Operate for the console; the public site inherits the world with Read/Persuade pages.
Audience/job: site owners and developers (Italian/EU indie devs, small businesses) who configure consent once and must later prove it to an auditor.
Constraints: WCAG 2.2 AA; IT UI first, EN available; dense data (thousands of records) must stay scannable; no invented adoption claims on the site.
Memorable moment: the register reads like a passbook — every row carries a violet date-and-revision stamp, and nothing is ever erased, only countersigned.

## Direction contract

THESIS: The platform is each site's passbook: consents, config changes and published policy revisions are entries stamped with date and revision, append-only, countersigned rather than erased. Refuses the category default: grey SaaS sidebar, rounded KPI cards, pastel pills, blue primary.

OWN-WORLD: Italian postal savings passbook. Ground #f6f7f5 (cool paper white, never cream), passbook navy #1e2f5a for the side rail, primary buttons and table header rule; ink #1b1d22; stamp violet #5b3f8c reserved for stamps, revisions and withdrawals; security-print green #4d7c63 for kickers and the faint guilloche band behind page headers; hairlines #c9d0c6. Square corners, no shadows. One grotesque (Helvetica Neue/Arial stack) for everything; labels in 11px mono caps tracked .1–.14em (from Design Annual); all figures tabular, IDs/timestamps/hashes in mono (from Datamatics).

STORY: The owner opens a site, sees at a glance how visitors chose in the last 30 days and whether a new revision is re-prompting people, finds any single consent by ID or user, expands it to see the full proof, exports it, and edits the banner config with a live preview before publishing a new stamped revision.

FIRST VIEWPORT: 232px navy rail (brand, site switcher, nav: Panoramica, Registro consensi, Configurazione banner, Versioni policy, Chiavi API, Impostazioni; active item inverted to paper). Page header on a guilloche band: mono kicker breadcrumb, 26px title, Filters + Export CSV at right. Violet-ruled notice line for the current revision. Five-cell KPI strip with hairline dividers. Filter row. Dense register table: violet stamp column (date · revision) first, consent ID mono, method, category squares (filled navy = granted), user, IP hash dimmed.

FORM: grounded candidate 4 of 7 (passbook), assigned by roll; seed:4edfb2f2652695f4. Raises: tabular mono figures (Datamatics); one grotesque + mono caps labels (Design Annual); selected record expands in place with full proof while others recede (Streaming Wall); time always newest-first (Labanotation). Signature interaction: publishing a revision stamps it in — the stamp lands with a 2-frame press (scale 1.04→1, 120ms), reduced-motion = instant.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
