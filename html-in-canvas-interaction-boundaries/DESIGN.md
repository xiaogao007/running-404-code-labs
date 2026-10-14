---
version: alpha
colors:
  paper: "#f6f8fc"
  surface: "#ffffff"
  ink: "#172844"
  muted: "#52627c"
  line: "#dce4ee"
  primary: "#137e9c"
  focus: "#b31e63"
typography:
  body:
    fontFamily: '"Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif'
  display:
    fontFamily: '"Bahnschrift", "Microsoft YaHei", sans-serif'
  data:
    fontFamily: '"Consolas", monospace'
rounded:
  panel: "10px"
  control: "6px"
omitted:
  - section: spacing
    reason: "The single-page laboratory uses documented explicit layout dimensions, without a reusable spacing scale."
  - section: components
    reason: "Native browser controls and the task-card styles are specified in the prose and UX contract."
---

## Overview

An article companion laboratory for Chinese-speaking frontend engineers. Its job is to make painted position and interactive geometry observable. The visual reference is a coordinate notebook: graph-paper canvases, a restrained ink palette, and one distinguishing overlay of cyan painted bounds and magenta hit bounds.

This is a local experimental demo, not a production administration app. It intentionally contains a clearly labelled stale-geometry failure state. No navigation, account, CRUD, remote data or durable user changes exist. The related minimal sibling workflow is the repository's IME experiment: isolated browser, native controls and actual event provenance.

## Colors

Runtime tokens live in `src/style.css`. Both panels share surface, border, text and action colors. Cyan means painted geometry; magenta means hit geometry and keyboard focus. Text explains the distinction so color is not the only signal. Canvas drawing colors are mapped explicitly in `src/lab.js`.

## Typography

Offline, system-available Chinese body fonts keep reproduction independent of external fonts. Display text uses Bahnschrift with Chinese fallback. Geometry and provenance use monospace. The panel heading line height is fixed at 1.4 to keep Latin and Chinese panels aligned.

## Layout

Maximum page width 1280px, 30px desktop side padding, 22px comparison gap; at 760px and below the panels stack with 16px page padding. The logical scene is 600×340, and the card is 280×170. Controls remain outside the canvases and wrap rather than scrolling the whole page horizontally. Native page scrollbars own document scrolling.

## Elevation & Depth

No shadow, 3D decoration or marketing metrics. One-pixel outlines separate controls and cards from the grid. Geometry overlays carry the evidence.

## Shapes

Panels and cards use 10px radius; controls use 6px. Focus uses a 3px outline with 3px offset. The deliberate failure mode moves pixels and bounds apart rather than adding animation.

## Components

Buttons, checkboxes and range inputs retain browser semantics and keyboard behavior. Status feedback is inline with `role=status`. There is no authored select, date control, dialog, upload widget or toast. Task buttons in the two rendering paths are explicitly compared variants of one shared card style and geometry model.

## Do's and Don'ts

Keep the drawing and hit outlines readable and expose measured dimensions. Label unavailable APIs and inert fallback controls. Do not call an accessibility-tree check a screen-reader test, or present experimental API support as browser-wide shipping. Reduce motion preference introduces no extra movement; no auto-playing animation is used.
