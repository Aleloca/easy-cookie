---
version: 1
slug: "packages-core-src-ui"
primary_target: "packages/core/src/ui"
related_targets: ["apps/playground"]
---

# Consent UI (banner, preferences, reopen button, embed placeholder, policy table)

Scope: every visitor-facing surface rendered by @easy-cookie/core inside host sites, plus the playground/demo. Mode: Operate (visitor task: make a fair consent choice in seconds; change it later as easily).
Audience/job: site visitors on phone and desktop; developers restyling via CSS custom properties.
Constraints: Garante 2021 / EDPB: equal-weight accept/reject, X = reject, categories off by default, policy link in first layer; WCAG 2.2 AA; host brand wins via tokens; IT + EN.
Memorable moment: the consent mosaic — your choice drawn as a row of colour modules.

## Direction contract

THESIS: Each consent category is a flat colour module; a visitor's choice is a small composition read at a glance (filled = granted, outlined = denied). Refuses the category default: rounded white card, soft shadow, cookie emoji, blue Accept with a grey Reject.

OWN-WORLD: Olivetti corporate design 1950–70 (Pintori/Nizzoli) reduced to a working theme: white ground, near-black ink #1c1c1a, 1px ink borders, square corners, no drop shadows (hairline seams only, from Developer Console). Category module colours: necessary ink, measurement #2457c5, functionality #e0a420, marketing #d63a26, experience #2f8f5b — all tokens. One grotesk via system-ui stack (host font inheritable), two sizes do all the work (from Acetate Manual). Focus is the one reserved treatment: a 2px ink ring with 2px offset (from Orienteering).

STORY: The visitor sees which kinds of cookies exist, that only necessary ones are on, and two equal doors. Choosing fills or leaves the modules; the same mosaic later sits in the reopen button, so they always know their state and how to change it.

FIRST VIEWPORT: Box banner bottom-left, 560px (full-width bottom sheet under 640px), 1px ink border, 28px padding. Top: mosaic row of 40px modules (necessary filled, others outlined) with a legend line beneath. Then title (20/600), body (15/1.5) with cookie policy link. Then a 2-col grid: Accept all | Reject all, both solid ink, identical; Customize spanning both columns, outlined. X (32px) top-right = reject. No dimming, no cookie wall.

FORM: grounded candidate 7 of 7 (Olivetti corporate design), assigned by roll; seed:1a882d3e0de60a45. Raises: state never hue alone (Emission Line Rail); equal halves enforced by grid (Cassette J-card); fixed furniture per service row: name, provider, duration, purpose (Character Catalog); two type sizes (Acetate Manual); one reserved focus treatment (Orienteering); hairline seams not shadows (Developer Console). Signature motion: modules fill left-to-right in 120ms steps on choice; reduced-motion = instant.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
