---
name: Taskspace
description: A cobalt-and-paper shared workboard that keeps project commitments and task context visible together.
colors:
  ink: "#202550"
  muted: "#69718d"
  cobalt: "#3543d6"
  cobalt-deep: "#252d95"
  periwinkle-pale: "#eef0ff"
  paper: "#fbfbff"
  canvas: "#e1e4ff"
  line: "#dfe2ef"
  citron: "#edff81"
  coral: "#ff765d"
  completion-green: "#3b8b69"
typography:
  display:
    fontFamily: "ArchivoDisplay, Aptos, Segoe UI Variable, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.7rem)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.065em"
  title:
    fontFamily: "ArchivoDisplay, Aptos, Segoe UI Variable, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.048em"
  body:
    fontFamily: "Aptos, Segoe UI Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    lineHeight: 1.55
  label:
    fontFamily: "Aptos, Segoe UI Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.62rem"
    fontWeight: 760
    letterSpacing: "0.08em"
rounded:
  chip: "5px"
  input: "6px"
  control: "8px"
  panel: "10px"
  dialog: "15px"
  shell: "18px"
spacing:
  micro: "2px"
  tight: "7px"
  control: "9px"
  compact: "12px"
  section: "22px"
  content: "36px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "#fff"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "35px"
  button-secondary:
    backgroundColor: "#fff"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 9px"
    height: "33px"
  input-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 11px 0 32px"
    height: "35px"
  pill-priority:
    backgroundColor: "{colors.periwinkle-pale}"
    textColor: "{colors.cobalt-deep}"
    rounded: "{rounded.chip}"
    padding: "0 6px"
    height: "20px"
  task-row-selected:
    backgroundColor: "#f7f8ff"
    rounded: "{rounded.panel}"
    padding: "0 10px"
---

# Design System: Taskspace

## Overview

**Creative North Star: "The Shared Workboard"**

Taskspace makes shared commitments feel immediate and orderly. A saturated cobalt navigation field holds identity, destinations, and people; the paper-white work canvas carries the structured project list; a live task record stays alongside it rather than replacing it. The resulting interface is compact, practical, and unmistakably collaborative—not a personal-focus dashboard.

The palette reserves its sharpest signals for meaning: citron identifies ownership and project markers, coral calls out attention and activity, and green confirms completion. Strong display typography makes the current project or task unmistakable, while the smaller Aptos system stays calm enough for dense metadata and shared context.

**Key Characteristics:**

- Cobalt navigation against a pale paper workspace.
- Structured list and open record shown in the same working frame.
- High-information task rows with quiet borders and selective color.
- Geometric diamond marks, circular people, and gently rounded utility controls.

## Colors

The palette is a role-driven workspace system: cool blue establishes place, pale neutrals make information legible, and citron/coral carry ownership and attention without becoming decoration.

### Primary

- **Cobalt navigation**: Use for the sidebar, primary actions, selected completion controls, and links that move work forward.
- **Deep cobalt**: Use as the darker counterpart for text or control states placed on citron and for the mobile navigation tray.

### Secondary

- **Citron ownership**: Use in project markers, selected-person avatars, and the small plus affordance—signals of people and shared responsibility rather than generic success.

### Tertiary

- **Coral attention**: Use for focus outlines, overdue timing, project variation, and small live-activity marks.
- **Completion green**: Use only for completed subtask state.

### Neutral

- **Paper canvas**: Use as the main working surface; keep it visually open behind task content.
- **Cool canvas**: Use outside the desktop application shell.
- **Periwinkle pale**: Use for soft selected states, composer containment, and restrained low-priority tags.
- **Ink and muted text**: Give titles and dense metadata a cool, high-legibility hierarchy.
- **Fine divider**: Separate rows, panels, and topbar regions with hairline structure instead of heavy cards.

**The Signal Colors Rule.** Citron, coral, and green communicate ownership, attention, and completion respectively. Do not use them as interchangeable decorative accents.

## Typography

**Display Font:** ArchivoDisplay, with Aptos and Segoe UI Variable fallbacks.  
**Body Font:** Aptos, Segoe UI Variable, ui-sans-serif, system-ui, sans-serif.

**Character:** The heavy, compressed display face gives project and task names a decisive editorial voice. The body system is neutral and compact, so labels, comments, dates, and collaborative metadata remain scannable.

### Hierarchy

- **Display:** Use for the primary project heading; it is large, tightly tracked, and set with a short line height.
- **Title:** Use for the selected task record heading; it inherits the display family at a smaller, similarly compact scale.
- **Section heading:** Use a restrained, bold system label for task sections and detail subsections.
- **Body:** Use for descriptions and comments; keep the looser line height for reading context.
- **Label:** Use small, weighty, letter-spaced text for navigation groups and task-record kickers. Uppercase only where the existing kicker convention calls for it.

**The Big Name, Small System Rule.** Save ArchivoDisplay for names that orient the work. All operational detail remains in the system sans.

## Layout

Desktop is a framed two-column shell: a fixed-width cobalt sidebar and an expanding workspace inside an inset application surface. The workspace begins with an action topbar, then divides into a broad structured-list stage and a narrower live task record. The content column uses generous inner padding while rows themselves remain compact and continuously separated by thin dividers.

The shell narrows at the existing 1050px breakpoint by reducing sidebar and panel widths, then removes the sidebar at 800px. At 620px, the list becomes the primary canvas and task details rise as a rounded bottom sheet; low-value row metadata is hidden before task names or due information. A fixed four-item deep-cobalt mobile navigation remains available above the lower edge.

**The Coexisting Context Rule.** On wide screens, preserve the task list and selected record side by side. Do not make the record a route or modal when both can coexist.

The shared component radii are exposed as `--taskspace-radius-chip` (5px), `--taskspace-radius-input` (6px), `--taskspace-radius-control` (8px), and `--taskspace-radius-panel` (10px).

## Elevation & Depth

This is a mostly flat workspace with structural borders and tonal shifts doing the daily work. Elevation is reserved for the desktop app shell, modal dialog, toast, and mobile detail sheet—transient or floating states that genuinely need separation.

### Shadow Vocabulary

- **Application shell:** `0 30px 70px -44px #191c5366` frames the desktop workspace softly against the cool outer canvas.
- **Dialog:** `0 30px 70px -38px #161946b3` lifts the project-creation form above its dimmed overlay.
- **Toast:** `0 18px 42px -24px #191b4585` lets feedback float without becoming a card stack.
- **Mobile detail sheet:** `0 -20px 50px -35px #1c1f4a8c` clarifies that task context has temporarily layered above the list.

**The Flat-Until-Floating Rule.** Ordinary sections, rows, and controls use borders and soft surface changes, not elevation.

## Shapes

The form language is practical and gently softened: compact controls use a modest corner radius, composed panels become slightly rounder, and the application shell has the broadest rounding. Pills are short and almost square; completion controls and avatars are fully circular. The distinctive diamond project mark is a rounded square rotated 45 degrees, with a circular cobalt cutout.

Borders are thin and cool-toned. Selected task rows gain a soft rounded highlight, not a card treatment.

## Components

### Buttons

- **Primary:** Solid cobalt with white, high-weight compact text. Use for consequential creation and submission in the topbar or inline composer.
- **Secondary:** White, line-bordered utility buttons with cool ink; hover moves them to a pale periwinkle surface with stronger blue text.
- **Sidebar create:** A translucent white-outline button inside the cobalt field; its citron circular plus makes creation visible without adding another full accent block.
- **Focus:** All interactive controls use a coral outline with a visible offset.

### Inputs / Fields

- **Search:** A paper-toned, line-bordered field with a small leading search icon; it is compact enough to stay in the action topbar.
- **Composer and dialog fields:** White fields inside a pale or white panel, using slightly tighter corners than surrounding containers. Keep labels small, calm, and operational.
- **Focus:** Use the shared coral offset outline; do not substitute a blue glow.

### Navigation

- **Desktop sidebar:** Cobalt field, white brand, muted-periwinkle labels, and translucent-white hover/active fills. Navigation uses compact icons and row-height controls rather than large tabs.
- **Project rows:** Use a rotated colored marker plus overlapping member avatars to keep project identity and people visible in a single compact row.
- **Mobile:** Replace the sidebar with a fixed deep-cobalt rounded tray containing four equal navigation targets.

### Task Rows

- **Structure:** A circular completion control, title/subtitle block, priority pill, tag, due information, and owner avatar form a fixed, scan-first row.
- **Selected state:** Use the pale highlight with soft rounding and preserve its section position.
- **Completion:** Fill the circle cobalt for a completed task; completed subtasks use green and strikethrough text.
- **Responsive behavior:** Hide secondary tags and priority before obscuring title, due, or owner.

### Pills

- **Priority:** Short, bold, low-radius labels with semantic pale backgrounds; P1 is coral-tinted, P2 is warm yellow, P3 is periwinkle, and P4 is cool gray.
- **Tag:** A separate green-tinted label for work category. Keep tags descriptive rather than action-like.

### Detail Record

- **Surface:** A distinct pale-periwinkle right panel with a thin left divider.
- **Content:** Start with a small uppercase project/section kicker, then the task title, description, property rows, subtasks, comments, and activity.
- **Mobile:** Convert the same record to a fixed bottom sheet; retain the list underneath so the user does not lose section context.

## Do's and Don'ts

### Do:

- **Do** use cobalt for navigation and primary advancement, with paper surfaces for the day-to-day work.
- **Do** keep owner, planned date, priority, label, and section context visible in the task list or selected record.
- **Do** pair a structured list with its selected detail record on wide screens.
- **Do** reserve citron for people and ownership signals, coral for attention, and green for completion.
- **Do** use thin dividers and pale selection surfaces to organize dense information.

### Don't:

- **Don't** turn every task row or section into a raised card.
- **Don't** hide task context behind a personal-focus queue or replace the selected record with a full-screen detour on desktop.
- **Don't** treat coral, citron, and green as interchangeable decoration.
- **Don't** use the display face for dense metadata, controls, or body copy.
