---
version: alpha
name: PageRadar
description: A quiet monitoring console that makes meaningful web changes legible.
colors:
  background: '#09090b'
  surface: '#18181b'
  border: '#27272a'
  text: '#fafafa'
  muted: '#a1a1aa'
  primary: '#2dd4bf'
  danger: '#dc2626'
typography:
  sans:
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
  mono:
    fontFamily: 'ui-monospace, monospace'
rounded:
  DEFAULT: '0.5rem'
  lg: '0.75rem'
spacing:
  section-gap: '1.5rem'
  page-max: '64rem'
components:
  button:
    minHeight: '2rem'
  card:
    borderWidth: '1px'
  dialog:
    maxWidth: '28rem'
---
# PageRadar design system

## Overview

### Creative North Star
A personal radar console: quiet surfaces, chronological evidence, teal signals and explicit before/after values. Preserve the existing product's identity.

### Product context and register
Students, researchers and people tracking opportunities need to recognize actionable changes without rereading whole websites. This is an English product interface; source content may be in any language. Dates use the user's browser locale/timezone. The product has no market-specific policy. Authenticated routes use the product register; the existing landing page is its marketing register. The timeline is the signature. Controls remain familiar and restrained; avoid promotional hero treatments inside monitoring workflows.

Runtime tokens are owned by Tailwind's zinc/teal/red palette and app/globals.css. This document mirrors those sources. Cards, watch forms and shared confirmations implement the same values; changes to the palette must update both sources.

## Colors
Use background for the document, surface for cards, border for separation, text for primary evidence and muted for supporting text. Primary identifies monitoring actions and keyboard focus. Danger identifies deletion. Severity always has a text label. Dark mode is the current supported theme.

## Typography
System sans is the interface font. Monospace is reserved for extraction previews and URLs when useful. Headings use semibold 20px, body uses 14px, supporting data uses 12px. Preserve source text without interpreting its markup.

## Layout
The authenticated shell has a 14rem sidebar above the desktop breakpoint and horizontal navigation below it. Content is capped at 64rem; forms at 42rem. Sections use 1.5rem gaps. Before/after values stack on narrow screens. Busy actions reserve width and polling retains visible content.

## Elevation & Depth
Use tonal surfaces and one-pixel borders. Popovers and modal confirmations may use shadows. Avoid blur or decorative elevation in the timeline.

## Shapes
Controls use the default 0.5rem radius; cards and overlays use 0.75rem. Rectangular before/after panels remain aligned.

## Components

### Foundational visual states
Visible teal keyboard focus, muted disabled controls, inline red errors and explicit loading status. Reduced motion suppresses transitions. Global scrollbars stay visible. Empty timelines explain baseline capture.

### Buttons and actions
White or teal solid primary actions, outlined neutral actions, red final destructive confirmation. Stable busy widths and disabled duplicate submission. Reversible saves need no confirmation.

### Navigation and data display
Use links for routes and buttons for actions. Timeline records display baseline, unchanged, retry, failure and change outcomes. Cursor pagination preserves sorting. Read state is text as well as color.

### Forms and overlays
WatchForm owns create/edit/preview validation. Inputs use visible labels; validation preserves values and focuses the first invalid field. Optional selectors live in disclosure. Native range inputs are intentional. ConfirmDialog uses an app-owned native dialog with inert background, Escape, initial cancel focus and focus restoration. Notifications are a nonmodal popover with Escape and outside-click dismissal.

### Iconography
Keep the existing outlined bell and text action labels. Icons never replace an accessible name.

### Motion
Brief existing hover transitions only; never animate source evidence or loading layout. Respect reduced motion.

### Content and data visualization
State what changed, its importance and the supporting evidence. Never claim delivery before provider acceptance or infer a date extension from ambiguous dates.

## Do's and Don'ts
- Do preserve source evidence and previous/current labels.
- Do keep monitoring state visible while checks run.
- Don't inject webpage markup into the interface.
- Don't communicate importance or read state solely with color.
