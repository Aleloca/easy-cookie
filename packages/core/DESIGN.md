---
name: easy-cookie — Modulo
description: The visitor-facing consent UI that ships inside host sites; a choice drawn as flat colour modules, restyled entirely through --ec-* custom properties.
colors:
  ink: "#1c1c1a"
  ink-2: "#4a4a46"
  bg: "#ffffff"
  hair: "#d9d9d3"
  wash: "#f4f4f1"
  on-ink: "#ffffff"
  toggle-off: "#77776f"
  c-measurement: "#2457c5"
  c-functionality: "#b8800f"
  c-experience: "#2f8f5b"
  c-marketing: "#d63a26"
  c-extra-1: "#7a4fa0"
  c-extra-2: "#0f7f86"
  c-extra-3: "#8a5a2b"
  dark-bg: "#161615"
  dark-ink: "#f1f1ec"
  dark-ink-2: "#b9b9b1"
  dark-hair: "#3a3a36"
  dark-wash: "#22221f"
  dark-c-measurement: "#7a9cff"
  dark-c-functionality: "#f0b33a"
  dark-c-experience: "#4cc283"
  dark-c-marketing: "#ff6a52"
  dark-c-extra-1: "#b48ae0"
  dark-c-extra-2: "#3cc4cc"
  dark-c-extra-3: "#d39a5f"
typography:
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.2
  small:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "'tnum'"
rounded:
  none: "0px"
spacing:
  gap: "8px"
  module-gap: "6px"
  pad: "28px"
  pad-phone: "20px"
  module: "40px"
  module-phone: "32px"
  module-mini: "12px"
  width: "560px"
components:
  banner:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.pad}"
    width: "{spacing.width}"
  button-choice:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    height: "48px"
  button-customize:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    height: "48px"
  button-customize-hover:
    backgroundColor: "{colors.wash}"
  button-close:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "40px"
  module:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
    size: "{spacing.module}"
  reopen-button:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.none}"
    size: "48px"
  embed-placeholder:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.pad}"
---

# Design System: easy-cookie — Modulo

## Overview

**Creative North Star: "The Consent Mosaic"**

Modulo is the consent UI that `@easy-cookie/core` renders inside other people's websites: the first-layer banner, the preferences panel, the reopen button, the blocked-embed placeholder and the generated cookie-policy tables. Its reference is Olivetti corporate design of the 1950s–70s, reduced to a working theme: white ground, near-black ink, 1px ink borders, square corners, flat colour.

Each consent category is a flat colour module. A visitor's choice is a small composition read at a glance: filled means granted, outlined means denied. The same grammar recurs everywhere: the 40px mosaic at the top of the banner, the legend swatches, the swatch beside each category in preferences, the 2×2 mini mosaic inside the reopen button, the module on a blocked embed and the square before each category in the cookie policy.

The whole public API is the set of `--ec-*` custom properties declared on `:root` and `:host` in `src/ui/theme.scss`. The host's brand wins by overriding them; selectors are not part of the contract. The engine's own `--cc-*` variables are derived from `--ec-*` and should not be set directly. This file documents the defaults. The platform's own identity (console and site, "Libretto") is recorded separately in the repository root `DESIGN.md`.

**Key Characteristics:**
- Two equal doors: Accept all and Reject all are identical solid-ink halves of one grid; Customize spans both, outlined.
- Category colour carries meaning only together with fill state and a text label.
- Square corners, no shadows, 1px ink frame, hairline seams.
- The host's font (system-ui stack by default) and two text sizes do almost all the work.
- One reserved focus treatment: a 2px ink ring at a 2px offset.

## Colors

Ink on white, with a small fixed set of category hues that only appear inside modules and swatches.

### Primary
- **Ink** (`ink`, `--ec-ink`): text, the 1px frame, both choice buttons, the necessary module, toggles when on, the focus ring.
- **Secondary Ink** (`ink-2`, `--ec-ink-2`): body copy, legend, service metadata, read-only (necessary) toggle track.

### Secondary (category modules)
- **Necessary**: always Ink (`--ec-c-necessary: var(--ec-ink)`).
- **Measurement Blue** (`c-measurement`), **Functionality Ochre** (`c-functionality`), **Experience Green** (`c-experience`), **Marketing Red** (`c-marketing`): the four optional categories.
- **Extra 1–3** (`c-extra-1..3`: violet, teal, umber): assigned in order to custom categories beyond the five defaults.

Defaults are assigned in `src/shared/defaults.ts` as `var(--ec-c-*)`, so a site overrides a category hue with one property. Functionality ships as a deep ochre (#b8800f) rather than the brighter direction-contract yellow, so its outline stays visible on white.

### Neutral
- **Background** (`bg`, `--ec-bg`): banner, panel, reopen button, embed placeholder, the gap ring of the focus ring.
- **Hair** (`hair`, `--ec-hair`): seams between preferences sections, service rows, the close button's resting border.
- **Wash** (`wash`, `--ec-wash`): hover ground for outlined buttons and the reopen button, preferences footer.
- **On Ink** (`on-ink`, `--ec-on-ink`): text on solid-ink buttons.
- **Toggle Off** (`toggle-off`): engine toggle track when off (#8a8a82 in dark).
- **Overlay** (`--ec-overlay`, ink at 45%; black at 60% in dark): behind the preferences panel only. The first-layer banner never dims the page.

### Dark scheme
Applied by adding `ec--dark` to `<html>` (or any ancestor via `.ec--dark`). The runtime adds it when `ui.colorScheme` is `"dark"`, or `"auto"` and the visitor prefers dark. The scheme inverts the neutrals (`dark-bg`, `dark-ink`, `dark-ink-2`, `dark-hair`, `dark-wash`; On Ink becomes the dark background) and swaps each optional category to a lighter tint (`dark-c-*`) so modules keep contrast on near-black.

### Named Rules
**The Equal Doors Rule.** Accept and Reject use the same token (`--ec-ink`), the same size and the same weight, in a two-column grid that forces equal width. Never give either a different colour, size or position of honour.

**The Never Hue Alone Rule.** A category's state is fill versus outline plus a text state ("sempre attivi", "spenti", "attivi"); colour only tells categories apart.

## Typography

**Body Font:** `--ec-font` (system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial); a host may set it to its own face.
**Mono Font:** `--ec-font-mono` (ui-monospace, SF Mono, Menlo, Consolas) for cookie names and durations in tables.

**Character:** neutral and native: the banner should read in the host's voice. Hierarchy is two sizes and a weight.

### Hierarchy
- **Title** (`--ec-title`, 600, 20px, 1.25, -0.01em, balanced): banner and preferences titles.
- **Body** (`--ec-text`, 400, 15px, 1.5, max 62ch): banner description, section descriptions, embed message (max 52ch). Buttons use the same size at 600.
- **Small** (`--ec-small`, 13px): mosaic legend, service metadata, badges, policy tables, the "always on" note.

### Named Rules
**The Two Sizes Rule.** Body and title carry the UI; the small size is reserved for legend, metadata and tables. Do not add a third heading size.

## Layout

The default banner is a box anchored bottom-left (other positions: bottom-right, bottom centre, centre), `--ec-width` wide (560px), with `--ec-pad` (28px) padding. Top to bottom: the mosaic row (40px modules, 6px gaps) with its legend beneath, a 52px right margin clearing the close button; the title; the body with the cookie-policy link; then a grid of buttons with 8px gaps: Accept all | Reject all in two equal columns, Customize spanning both below. The close X sits top-right inside the padding.

Under 640px the banner becomes a full-width bottom sheet: margins drop to 0, only a top border remains, padding 20px, modules 32px, the legend becomes a two-column grid, max height 88vh with internal scroll.

While the preferences panel is open the banner is hidden so only one ink frame shows at a time; it returns if preferences close without a choice. The reopen button is fixed 16px from the bottom corner and hides while either layer is open.

## Elevation & Depth

Flat. `--ec-shadow` defaults to `none` and is applied to the banner and preferences panel only so a host can opt in. Separation comes from the 1px ink frame (`--ec-border`) and hairline seams; the preferences panel adds the overlay. Toggles and their knobs use inset 1px ink lines as strokes, not elevation.

### Named Rules
**The Hairline Seams Rule.** Edges are drawn, never cast. The default theme ships no drop shadow on any surface.

## Shapes

All corners are `--ec-radius` (0px), and the engine's modal, button and toggle radii are bound to it, so a host that wants rounding sets one property. The module is the signature shape: a square with a 2px border in its category colour, filled when granted. Swatches repeat it small (10–14px, 0.8em inline) and the reopen button holds a 2×2 grid of 12px modules with 1.5px borders.

## Components

### Consent banner (first layer)
- **Frame:** Background, 1px ink border, square, no shadow, 28px padding, 15px/1.5 text.
- **Mosaic:** one module per category in config order; necessary is filled on first view, the others outlined. Legend lines pair a swatch with the category name and its state.
- **Actions:** Accept all and Reject all, both solid ink with On Ink text, 48px min height, 600 weight; hover underlines the label. Customize is outlined (Background, ink border), hover to Wash.
- **Close (X):** 40px square, hairline border turning ink on hover, 14px ink cross. Closing counts as reject.
- **Entrance:** fades and rises 12px (180ms opacity, 240ms transform, ease-out); instant under reduced motion.

### Signature motion: the mosaic fill
On a choice, modules fill left to right one step at a time: each module's background changes in two hard steps over `--ec-step` (120ms), delayed by its index times `--ec-step`. The reopen button's mini mosaic replays the fill once it is visible. Reduced motion makes all fills instant.

### Preferences panel
Engine modal restyled: 1px ink frame, square, title at 20/600. Each category row starts with its swatch (outlined, filled when its toggle is on), then the title. Services are listed with fixed furniture: name (15/600 ink), then provider, duration and purpose in Small Secondary Ink, separated by hairlines. Toggles are square: off is an outlined Background track and knob, on is a filled ink track, read-only (necessary) is a filled Secondary Ink track with an "always on" note. Footer buttons are 44px, 600, ink-bordered.

### Reopen button
48px square fixed bottom-left (or bottom-right), 1px ink border, Background ground, hover Wash. Inside: a 2×2 grid of mini modules showing the current choice, so the visitor always sees their state and how to change it.

### Embed placeholder
Replaces a blocked iframe at full width, 200px min height, 28px padding, 1px ink frame. Shows the category's 40px outlined module, a 15px message (max 52ch) and two buttons: "show the content" (solid ink, loads this embed once) and "always enable this category" (outlined).

### Cookie policy tables
Each category heading is led by a small filled square in its category colour. Tables are full width, 0.9em, tabular, headers 600 over a 1px currentColor rule, rows divided by hairlines, cookie names in mono. Inherits the host's font and colour.

### Focus
Every interactive element uses `--ec-focus` (a 2px Background gap ring inside a 2px ink ring) as a box-shadow, replacing the outline. It is the only focus treatment.

## Do's and Don'ts

### Do:
- **Do** restyle only through `--ec-*` custom properties; treat selectors as private.
- **Do** keep Accept all and Reject all identical in colour, size, weight and width.
- **Do** show state as filled versus outlined modules plus a text state.
- **Do** keep corners at `--ec-radius` and edges as 1px lines.
- **Do** give every motion a reduced-motion instant path.

### Don't:
- **Don't** give Accept a brand colour and Reject a grey or a text link.
- **Don't** dim or block the page behind the first layer; no cookie wall.
- **Don't** add a drop shadow, rounded card or cookie illustration to the default theme.
- **Don't** set the engine's `--cc-*` variables directly; derive them from `--ec-*`.
- **Don't** add a second focus style.
