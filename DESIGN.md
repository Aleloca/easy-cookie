---
name: easy-cookie — Libretto
description: The consent platform's own identity (admin console + public site), drawn as an Italian postal savings passbook.
colors:
  passbook-navy: "#1e2f5a"
  navy-press: "#2a3d70"
  navy-wash: "#e7ebf3"
  stamp-violet: "#5b3f8c"
  violet-wash: "#efeaf6"
  violet-row: "#faf7fd"
  violet-recede: "#6e6582"
  print-green: "#4d7c63"
  print-green-ink: "#3f6b53"
  ground: "#f6f7f5"
  paper: "#ffffff"
  band: "#eef1ec"
  ink: "#1b1d22"
  ink-2: "#4a4f57"
  muted: "#5d625f"
  label-grey: "#5f655d"
  recede: "#6a6f75"
  hair: "#c9d0c6"
  hair-2: "#e3e6e0"
  field-line: "#858c82"
  rail-ink: "#dfe5f2"
  rail-dim: "#b9c3dc"
  rail-line: "#3c5088"
  danger: "#9f2a2a"
  danger-wash: "#fbeeee"
  ok: "#2f6a4a"
  series-reject: "#6f7fa6"
  series-close: "#868b82"
typography:
  display:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, 'Nimbus Sans', 'Liberation Sans', sans-serif"
    fontSize: "clamp(2.5rem, 1.6rem + 3.4vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  figure:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    fontFeature: "'tnum'"
  section-title:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  body-reading:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-dense:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'SF Mono', ui-monospace, Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.1em"
  data-mono:
    fontFamily: "'SF Mono', ui-monospace, Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum'"
rounded:
  none: "0px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s7: "32px"
  s8: "36px"
  s9: "48px"
  gutter: "36px"
  rail: "232px"
components:
  button-primary:
    backgroundColor: "{colors.passbook-navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.navy-press}"
    textColor: "{colors.paper}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.passbook-navy}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.navy-wash}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
  button-site:
    backgroundColor: "{colors.passbook-navy}"
    textColor: "{colors.ground}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "7px 10px"
    height: "36px"
  stamp:
    backgroundColor: "transparent"
    textColor: "{colors.stamp-violet}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
  rail:
    backgroundColor: "{colors.passbook-navy}"
    textColor: "{colors.rail-dim}"
    width: "{spacing.rail}"
  rail-item-active:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.passbook-navy}"
  tab-selected:
    backgroundColor: "{colors.passbook-navy}"
    textColor: "{colors.paper}"
  notice:
    backgroundColor: "{colors.violet-wash}"
    textColor: "{colors.ink}"
    padding: "10px 14px"
  table-header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.label-grey}"
    typography: "{typography.label}"
    padding: "9px 12px"
  kpi-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    padding: "12px 14px"
---

# Design System: easy-cookie — Libretto

## Overview

**Creative North Star: "The Passbook"**

Libretto is the identity of the consent platform itself: the admin console (`apps/console`) and the public project site (`apps/site`) share it. Each site is a passbook. Consents, configuration changes and published policy revisions are entries stamped with a date and a revision, kept newest first, never erased, only countersigned. The material is an Italian postal savings book: cool paper, a navy cover, a violet rubber stamp, a faint green security print behind headers, thin ruled lines.

The console is dense and operational: a 232px navy rail, a guilloche page header, a hairline-divided KPI strip and a register table that stays scannable at thousands of rows. The site reads the same book at reading scale: a navy masthead, a hero set in a very large grotesque, the "spread" (config on the left page, recorded entries on the right, with a navy double-rule gutter) and docs with the same navy rail. Depth comes from rules and tone, never from shadows. Corners are square everywhere.

The consent banner that ships inside host sites is a separate world ("Modulo") recorded in `packages/core/DESIGN.md`. Libretto shows the banner only as a framed specimen (preview, demo); it never restyles it.

**Key Characteristics:**
- Cool paper ground with passbook navy as the only structural colour (rail, masthead, primary buttons, table header rule, selected tab).
- Stamp violet is reserved: stamps, revisions, withdrawals, the selected record, secrets that must be copied once.
- One grotesque (Helvetica Neue / Arial stack) for everything; mono only for labels, IDs, timestamps, hashes and figures' units.
- Square corners, no shadows, 1px hairlines and 2px navy rules.
- All figures tabular.

## Colors

A paper-and-ink palette with one structural navy, one reserved stamp violet and one quiet security-print green.

### Primary
- **Passbook Navy** (`passbook-navy`): the cover. Side rail and site masthead backgrounds, primary buttons, the 2px rule under every table header and tab strip, the selected tab, filled category squares (granted), links, focus outline.
- **Navy Press** (`navy-press`): hover and busy state of navy surfaces only.
- **Navy Wash** (`navy-wash`): hover ground for ghost/quiet buttons, tabs and switcher rows; ink-toned notices.

### Secondary
- **Stamp Violet** (`stamp-violet`): the rubber stamp. Date · revision stamps, revision dates in notices, withdrawal rows and method labels, proof titles, "this one" tags, one-time secret blocks.
- **Violet Wash** (`violet-wash`): notice band ground, selected register row and its expanded proof row, stamp hover.
- **Violet Row** (`violet-row`): faint ground for withdrawal rows and secret code blocks.
- **Violet Recede** (`violet-recede`): stamps of non-selected rows while one record is expanded (still AA).

### Tertiary
- **Print Green** (`print-green`): the security print. The guilloche band behind page headers and dialog heads, the "custom" data series.
- **Print Green Ink** (`print-green-ink`): green as text: current-revision tag, language tags, ordered-step markers. Use this, not Print Green, when green must be read.

### Neutral
- **Ground** (`ground`): the page. Cool paper white, never cream. Also the inverted active rail item and pressed language toggle.
- **Paper** (`paper`): tables, KPI strip, panels, inputs, dialogs: the sheets laid on the ground.
- **Band** (`band`): the flat base of the guilloche band.
- **Ink** (`ink`), **Ink 2** (`ink-2`), **Muted** (`muted`), **Label Grey** (`label-grey`): body text, secondary text, hints and dimmed data, mono label text.
- **Recede** (`recede`): text of non-selected rows while a record is open.
- **Hair** (`hair`) and **Hair 2** (`hair-2`): outer frames and dividers; Hair 2 for row rules inside tables.
- **Field Line** (`field-line`): input borders (darker than hairlines so fields read as fields).
- **Rail Ink / Rail Dim / Rail Line** (`rail-ink`, `rail-dim`, `rail-line`): text, inactive nav and borders on navy.
- **Danger / Danger Wash / OK** (`danger`, `danger-wash`, `ok`): errors, destructive actions, saved state.
- **Data series**: accept-all = Passbook Navy, custom = Print Green, reject-all = `series-reject`, close = `series-close`, withdraw = Stamp Violet. Each keeps at least 3:1 against paper and is always paired with a label.

### Named Rules
**The Reserved Stamp Rule.** Violet means "stamped": a revision, a date of record, a withdrawal, the record under inspection. Never use it for decoration, primary actions or generic emphasis.

**The One Cover Rule.** Navy is the only saturated structural colour. There is no blue primary, no pastel status pills, no second brand hue.

**The Ruled Notice Rule.** Notices are ruled passbook lines: a 1px rule above and below plus a wash. Never a coloured side stripe.

## Typography

**Display Font:** Helvetica Neue (with Helvetica, Arial, Nimbus Sans, Liberation Sans)
**Body Font:** the same grotesque
**Label/Mono Font:** SF Mono (with ui-monospace, Menlo, Consolas, Liberation Mono)

**Character:** one plain grotesque doing every voice, with a small mono for the bookkeeping: labels, IDs, timestamps, hashes. The contrast is size and weight, not family.

### Hierarchy
- **Display** (700, fluid 2.5–4.5rem, 1.02, tight tracking): site hero headline only, max ~20ch.
- **Headline** (700, 2.25rem, 1.05): site section heads, sitting under a 2px navy rule.
- **Title** (600, 26px, 1.15; 22px under 900px): console page titles on the guilloche band.
- **Figure** (600, 24px; 20px on phones, tabular): KPI values.
- **Section title** (600, 15px): console panel and section heads. Dialog heads use 18px/600, empty-state titles 17px/600.
- **Body** (400, 14px, 1.45): console default. **Body dense** (13.5px) for tables, buttons, inputs, notices. **Body reading** (17px, 1.6, max 60–70ch) for site and docs.
- **Label** (mono, 11px, uppercase, tracked 0.1em; 0.12em on the site): table headers, KPI labels, field labels, rail group labels, panel heads.
- **Data mono** (mono, 12.5px, tabular): consent IDs, timestamps, IP hashes, code values.

### Named Rules
**The Tabular Rule.** Every figure is tabular (`font-variant-numeric: tabular-nums`); IDs, timestamps and hashes are mono. Numbers in columns align right.

**The One Grotesque Rule.** No display face, no serif, no second sans. Hierarchy comes from size, weight and the mono label voice.

## Layout

The console is a two-column shell: a sticky 232px navy rail and a fluid main column. Pages open on a guilloche header band (title left, actions right, bottom hairline), then content padded by a 36px gutter (16px under 900px). Under 900px the rail becomes a sticky 52px navy top bar with a disclosure panel holding the same switcher and nav. Spacing runs on a 4px base (4, 8, 12, 16, 20, 24, 32, 36, 48). The KPI strip is a five-cell grid inside one hairline frame, collapsing to three columns at 1100px and two (first cell full-width) at 560px. Editors pair a fluid form column with a 340–440px live-preview column.

The site uses a 1280px max container with a fluid gutter (`clamp(16px, 4vw, 48px)`), a 70ch reading measure, and a 264px docs rail. The landing hero is a 7:5 grid; the spread is two equal pages joined by a 3px navy double rule.

Lists of record (register, revisions) are always newest first. A selected record expands in place as a proof row beneath it while the other rows recede.

## Elevation & Depth

Flat. There are no drop shadows anywhere in Libretto. Depth is conveyed by tone and rules: paper sheets on a ground, 1px hairline frames, 2px navy rules under headers, the violet wash on a selected record, and the dialog backdrop (ink at 50%). The only `box-shadow` in the build is an inset 1px navy line that thickens a selected radio card's border, which is a stroke, not elevation.

### Named Rules
**The Flat Ledger Rule.** Surfaces never float. If something needs to stand out, give it a rule, a wash or the navy, not a shadow.

## Shapes

Square corners throughout (0 radius on buttons, inputs, dialogs, tables, tabs, notices, code). Borders are the main form language: 1px hairlines for frames and dividers, 1px navy for ghost buttons, dialogs, segmented controls and the site switcher list, 2px navy for header rules. Category squares are 9px (console) or 11px (site) outlined squares with a 1.5px navy stroke, filled when granted. The stamp is the one shape allowed off-axis: it sits rotated about -2° (-1.5° on the site).

## Components

### Buttons
- **Shape:** square, 36px min height in the console, 44px on the site.
- **Primary:** navy fill, white text, 13.5px/500 (site 15px/600). Hover to Navy Press over 120ms.
- **Ghost:** transparent with a 1px navy border and navy text; hover to Navy Wash.
- **Quiet:** borderless navy text, 32px min height, for row-level actions.
- **Danger:** Danger fill, white text.
- **Disabled / Busy:** disabled turns to Hair 2 with muted text; busy keeps the navy and shows a progress cursor.

### Stamp (signature)
A violet rubber stamp: 1.5px violet border (1px on the site), violet mono 11px/600 text, tabular, slight rotation, transparent ground. Content is always date · revision. When a revision is published it is stamped in with a two-step press (scale 1.04 to 1 with a brief violet tint, 120ms, stepped); reduced motion makes it instant. On the site the hero stamp lands once with the same press (160ms).

### Register table
Paper table in a hairline frame. Header cells are mono labels over a 2px navy rule; rows are 38px with Hair 2 row rules. Column order starts with the stamp. Category squares show the choice; withdrawals tint the row Violet Row with a violet method label. Clicking a row selects it: the row and its proof row take Violet Wash, a violet bottom rule closes the proof, and every other row recedes (text to Recede, stamps to Violet Recede, squares to a grey-blue).

### KPI strip
Five paper cells in one hairline frame, hairline dividers between cells. Each cell: mono label (optionally led by a 9px series key), a 24px tabular figure and a mono sub-count.

### Notice
A ruled passbook line: 1px violet rules top and bottom, Violet Wash ground, violet bold for the revision. The ink variant swaps to navy rules and Navy Wash.

### Inputs / Fields
- **Style:** paper ground, 1px Field Line border, square, 36px min height, 7px 10px padding. Label above in mono caps.
- **Hover / Focus:** border to Ink 2 on hover; on focus a 2px navy outline (offset -1px) and navy border.
- **Error / Read-only:** Danger border with a 12.5px danger message; read-only fields sit on Ground with Ink 2 text.

### Tabs and segmented controls
Tabs sit on a 2px navy baseline; the selected tab is a solid navy block with white 600 text, hover is Navy Wash. Segmented controls are a 1px navy frame with navy dividers; pressed segments fill navy.

### Navigation
- **Console rail:** navy, 232px, brand at top, site switcher (1px Rail Line border), nav items in Rail Dim at 14px. Hover brightens to white on a 6% white wash; the active item inverts to a Ground block with navy 600 text. Footer holds the IT/EN toggle (mono, pressed = inverted) and logout.
- **Site masthead:** navy bar, 60px, wordmark left, 44px-tall nav links in paper; hover to Navy Press.

### Dialog
Paper sheet, 1px navy border, 560px (720px wide variant), ink 50% backdrop. Head on the guilloche band over a 2px navy rule; footer actions right-aligned over a hairline. Opens with a 160ms rise of 6px.

### Guilloche band (signature)
A faint green security print behind page headers and dialog heads (console: concentric radial line pattern over Band; site: a repeating SVG wave at 22% opacity). It is texture only and never carries content.

## Do's and Don'ts

### Do:
- **Do** keep every corner square and every surface flat.
- **Do** put violet only on stamps, revisions, withdrawals, the selected record and one-time secrets.
- **Do** set every number tabular, and IDs, timestamps and hashes in mono.
- **Do** order records newest first and expand a selected record in place, letting the rest recede.
- **Do** use mono 11px tracked caps for labels and table headers, over a 2px navy rule.
- **Do** keep a 2px navy focus outline with 2px offset (switch it to Ground on navy surfaces).

### Don't:
- **Don't** add drop shadows, rounded cards, pastel status pills or a blue primary.
- **Don't** use a coloured side stripe for notices or alerts; use the ruled line.
- **Don't** use a cream or warm paper; the ground is cool.
- **Don't** introduce a second typeface or a display face.
- **Don't** style the consent banner with Libretto tokens; it is its own world.
