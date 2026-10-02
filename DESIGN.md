---
version: alpha
name: PageRadar
description: An intelligence workspace that turns webpage updates into clear, useful briefings.
colors:
  background: "#f5f5f0"
  surface: "#ffffff"
  border: "#d8d9ce"
  text: "#20241d"
  muted: "#606557"
  primary: "#48671a"
  danger: "#b02a3c"
typography:
  sans:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
rounded:
  DEFAULT: "10px"
  lg: "14px"
spacing:
  section-gap: "28px"
  page-max: "1440px"
components:
  button:
    minHeight: "44px"
  card:
    borderWidth: "1px"
  dialog:
    maxWidth: "28rem"
---

# PageRadar design system

## Overview

### Creative North Star

Radar studio: charcoal, electric lime, large expressive typography, and evidence-led layouts. This replaces the rejected blue intelligence-workspace direction. The overview uses a generous heading, a dominant update feed, a compact monitoring rail, and a separate followed-pages strip. The public experience opens with a centered oversized statement and a product preview. A concentric radar illustration anchors the identity; it is decorative, not a live health indicator.

### Product context

Students, researchers, and people following opportunities need to know what changed and why it matters. English interface copy; source text may use any script. Dates use browser locale/timezone. Public examples are labeled sample data. No fabricated activity, outcomes, or guarantees of perfect noise removal.

### Token ownership

Model B: app/globals.css owns semantic CSS variables. Its Tailwind v4 @theme inline adapter exposes canvas/surface/subtle/line/ink/muted/primary/on-primary/success/warning/danger utilities. Shared recipes and components consume these tokens. DESIGN.md mirrors approved values and explains their usage. Theme colors are mapped by role, never by reinterpreting arbitrary palette names.

## Colors

| Role                   | Light             | Dark              |
| ---------------------- | ----------------- | ----------------- |
| canvas                 | #f5f5f0           | #141613           |
| surface                | #ffffff           | #1c1f1a           |
| subtle                 | #eeeee6           | #252923           |
| border                 | #d8d9ce           | #373d32           |
| ink                    | #20241d           | #f3f4ec           |
| muted                  | #606557           | #acb3a3           |
| primary                | #48671a           | #d3fa6a           |
| on-primary             | #ffffff           | #141613           |
| accent-soft            | #eaf2d7           | #303c20           |
| success / success-soft | #19734c / #edf8f2 | #8cdab0 / #1b3a32 |
| warning / warning-soft | #926009 / #fff6e3 | #f2c573 / #3e3322 |
| danger / danger-soft   | #b02a3c / #fff0f2 | #ffa7b2 / #432936 |

Lime in dark mode and olive in light mode mark actions and focus. Amber marks high importance, red critical importance/errors/deletion, green successful monitoring and current evidence. Text labels always accompany status. Source changes may be negative: a green current-evidence panel identifies the new version and does not declare the change beneficial.

Light, Dark, and System are supported. System follows device preference initially. Store only the theme preference under pageradar-theme-v1; the root inline application script applies it before paint. Theme controls use a deliberately native select with platform-owned popup geometry.

## Typography

Manrope for headings and brand; Source Sans 3 for body, labels, and controls. Font files and licenses live under app/fonts and are served with next/font/local. Main body is 16px; dense metadata is 12–14px. Public hero is 52–112px; application titles 30–48px and the overview 36–64px. Timelines retain readable plain text and tabular timestamps. System fallbacks cover scripts outside the bundled font repertoire.

## Layout

Desktop workspace: 220px sidebar, 72px header, content up to 1440px with 36px padding. Below 901px, navigation becomes an accessible modal drawer and content uses 16–20px gutters. The overview leads with updates, supported by compact counts and monitoring health. Above 1100px monitored pages use a semantic table; smaller screens use cards with the same actions and data. Forms use a 768px readable column. Before/after evidence stacks below 640px. Document scrolling owns long forms and histories.

## Elevation & Depth

Ivory/charcoal tonal panels, one-pixel rules, and minimal shadows. The landing preview has a restrained deep shadow. Radar artwork appears in the overview, public preview, and auth story, and is aria-hidden. It carries no live operational claims. Reduced motion disables its slow rotation. Dialogs and notification popovers remain opaque, readable, and above the workspace.

## Shapes

8px controls, 7px evidence panels, 12–16px primary panels; compact 7px status labels. Status dots accompany a written status. The custom radar mark uses a circular frame and concentric rings.

## Components

Canonical owners: Brand and Icon own identity/iconography; ThemeControl owns theme choices; CSS btn/panel/badge/evidence recipes own shared presentation; states.tsx owns loading/empty/error/refresh feedback; ConfirmDialog owns destructive confirmation; PasswordInput owns visibility toggling; WatchForm owns monitoring preferences; BeforeAfter and ChangeCard own evidence; chrome.tsx owns workspace navigation and notification popover. UX-CONTRACT.md records behavioral ownership.

Primary buttons use primary/on-primary; secondary actions use surface/ink; destructive actions use danger-soft/danger. Disabled and pending controls reserve dimensions. Forms retain values on failure and focus invalid controls. All interactive controls have visible focus and pointer/hover feedback.

The signal timeline connects source, classification, explanation, previous/current evidence, and detection time. Source content always renders as text. Sample evidence shares the production BeforeAfter and ImportanceBadge components.

## Do's and Don'ts

- Put meaningful updates before operational counts and page management.
- Preserve verification, opt-in, suppression, queued/accepted/delivered states distinctly.
- Retain cached data during background refresh; never refresh over an unsaved form.
- Use static examples only in clearly labeled public demonstrations.
- Do not render source HTML, invent analytics, hide failures, or communicate importance only by color.
- Respect reduced motion, visible scrollbars, keyboard controls, and narrow screens.

## Concept and implementation decisions

Reference: charcoal/lime PageRadar concept generated October 2, 2026. The concept guides palette, prominent heading, narrow sidebar, evidence feed, radar summary rail, and bottom monitored-page area. Production deliberately retains existing functional labels, real GraphQL counts, and notification settings. No sample metrics are shown in the authenticated workspace. The light variant uses accessible olive actions on warm neutral surfaces.

Public copy: “Your internet. In focus.” Primary action: Start monitoring. Secondary action: Explore the demo. The three-step setup sequence follows the product preview and use cases. Authentication uses a separate statement-and-radar panel with the familiar form, password control, and validation.

### Visual verification ledger — radar studio

Compared the generated desktop concept with production Playwright captures at 1280px desktop and Pixel 7 mobile:

| Dimension | Concept / implementation comparison | Resolution |
| --- | --- | --- |
| Composition | Narrow sidebar, dominant heading, feed left and summary right | Matched; compacted the right rail after the first capture created excess whitespace |
| Palette | Charcoal ground, ivory type, electric lime actions | Matched through semantic tokens; light mode intentionally uses olive for readable contrast |
| Type | Oversized, tightly spaced heading and readable evidence | Established a 36–64px overview heading and 24px change title; preserved local licensed fonts |
| Evidence | Previous/current evidence beneath summary | Kept real plain-text evidence panels instead of invented webpage screenshots |
| Monitoring | Radar with counts alongside it | Matched composition; counts use real API meanings and artwork is decorative |
| Controls | Clear primary creation action and persistent navigation | Preserved Add page and native theme controls; lime active navigation is an intentional stronger selection state |
| Responsive | Desktop composition requires adaptation on narrow screens | Sidebar becomes a keyboard-accessible drawer; columns stack with no horizontal overflow |

Production build, TypeScript and ESLint passed. All 22 browser tests passed; the eight design and primary-flow checks passed again after the final spacing refinements. Theme screenshots disable animation to capture settled colors. Concept imagery is a design reference only, not shipped as application UI.
