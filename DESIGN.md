---
version: alpha
name: PageRadar
description: An intelligence workspace that turns webpage updates into clear, useful briefings.
colors:
  background: "#f4f7fc"
  surface: "#ffffff"
  border: "#d8e1ef"
  text: "#17243b"
  muted: "#52627a"
  primary: "#245cdf"
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

A personal intelligence workspace: readable updates, source evidence, and a connected signal timeline. The approved redesign replaces the original zinc/teal console across all routes. The radar mark provides the identity; the timeline supplies the visual signature. Public pages demonstrate a useful deadline update. Authenticated pages lead with real changes and explicit monitoring status.

### Product context

Students, researchers, and people following opportunities need to know what changed and why it matters. English interface copy; source text may use any script. Dates use browser locale/timezone. Public examples are labeled sample data. No fabricated activity, outcomes, or guarantees of perfect noise removal.

### Token ownership

Model B: app/globals.css owns semantic CSS variables. Its Tailwind v4 @theme inline adapter exposes canvas/surface/subtle/line/ink/muted/primary/on-primary/success/warning/danger utilities. Shared recipes and components consume these tokens. DESIGN.md mirrors approved values and explains their usage. Theme colors are mapped by role, never by reinterpreting arbitrary palette names.

## Colors

| Role                   | Light             | Dark              |
| ---------------------- | ----------------- | ----------------- |
| canvas                 | #f4f7fc           | #101827           |
| surface                | #ffffff           | #192438           |
| subtle                 | #edf2f9           | #202e45           |
| border                 | #d8e1ef           | #34445e           |
| ink                    | #17243b           | #e8eef8           |
| muted                  | #52627a           | #adbbd0           |
| primary                | #245cdf           | #8cb4ff           |
| on-primary             | #ffffff           | #101827           |
| accent-soft            | #eaf0ff           | #253958           |
| success / success-soft | #19734c / #edf8f2 | #8cdab0 / #1b3a32 |
| warning / warning-soft | #926009 / #fff6e3 | #f2c573 / #3e3322 |
| danger / danger-soft   | #b02a3c / #fff0f2 | #ffa7b2 / #432936 |

Blue marks actions and focus. Amber marks high importance, red critical importance/errors/deletion, green successful monitoring and current evidence. Text labels always accompany status. Source changes may be negative: a green current-evidence panel identifies the new version and does not declare the change beneficial.

Light, Dark, and System are supported. System follows device preference initially. Store only the theme preference under pageradar-theme-v1; the root inline application script applies it before paint. Theme controls use a deliberately native select with platform-owned popup geometry.

## Typography

Manrope for headings and brand; Source Sans 3 for body, labels, and controls. Font files and licenses live under app/fonts and are served with next/font/local. Main body is 16px; dense metadata is 12–14px. Public hero is 42–68px; application titles 26–34px. Timelines retain readable plain text and tabular timestamps. System fallbacks cover scripts outside the bundled font repertoire.

## Layout

Desktop workspace: 240px sidebar, 80px header, content up to 1440px with 32px padding. Below 901px, navigation becomes an accessible modal drawer and content uses 16–20px gutters. The overview leads with updates, supported by compact counts and monitoring health. Above 1100px monitored pages use a semantic table; smaller screens use cards with the same actions and data. Forms use a 768px readable column. Before/after evidence stacks below 640px. Document scrolling owns long forms and histories.

## Elevation & Depth

White/navy tonal panels, one-pixel borders, and restrained shadows. Radar rings appear only behind the public example; decorative elements do not obscure data or controls. Dialogs and notification popovers remain opaque, readable, and above the workspace.

## Shapes

10px controls and evidence panels; 14px primary panels; compact 7px status labels. Status dots accompany a written status. The custom radar mark uses a rounded frame and concentric rings.

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
