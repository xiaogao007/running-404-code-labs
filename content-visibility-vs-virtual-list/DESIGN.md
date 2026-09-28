---
version: alpha
colors:
  background: "#eef2f7"
  surface: "#ffffff"
  text: "#182c43"
  primary: "#215ca0"
  muted: "#52677d"
  border: "#cad6e3"
typography:
  heading:
    fontFamily: "Georgia, Microsoft YaHei, serif"
  body:
    fontFamily: "Segoe UI, Microsoft YaHei, sans-serif"
  data:
    fontFamily: "Consolas, monospace"
rounded:
  control: "6px"
spacing:
  base: "12px"
---

## Overview
Chinese educational performance lab: compare identical order review cards across normal rendering, CSS containment and a known-height virtual window. A single local synthetic page; no production orders, auth, CRUD or remote data. User brief is the business source. No existing sibling implementation in this directory.
## Colors
Runtime canonical tokens live in style.css :root; this file mirrors the six named colors. Restrained blue lab-notebook palette with a left identity stripe on each record. No animation or remote fonts that could pollute measurement.
## Typography
Heading serif role, system sans body and monospace record identifiers. Keep controls readable at narrow widths.
## Layout
Shared top controls and a document-scrolling list. Each mode uses the same card renderer. Measurement fixture has exactly 1200 records by default and known 360/480/600px inner heights. Padding is included in the card height contract, and a 12px gap is added to offsets. Virtual mode is an explicitly requested experimental variant, not a recommended default for all lists.
## Components
Native navigation anchors choose modes; native buttons jump, reset, expand and collapse. app.js owns all variants. Focus outline visible; no sticky toolbar. Scrollbar owned globally by style.css. URL retains mode, count and estimate. Empty count shows an explicit empty state. Unsupported CSS falls back to normal rendering with a status note. No search form: browser find and a fixed jump target form the experiment.
## Do's and Don'ts
Do preserve expansion state across virtual unmounts. Do keep all benchmark fixtures identical. Do not call this a production dynamic-height virtualizer, a frame-rate benchmark, or an accessibility conformance audit. No business secrets, destructive actions or network APIs. Runtime verification covers narrow layout, keyboard controls, expansion, jump, search probe and node counts.
