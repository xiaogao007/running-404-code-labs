# Experimental interaction contract

This article companion compares one native HTML-in-Canvas control with a DOM overlay. It has no account, network mutation, persistence, navigation shell, CRUD, select/listbox, date control, modal or toast.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Scrollbar | Global stylesheet | `src/style.css` | Native document scrollbar | 390px reflow check |
| Button and range controls | Native HTML controls | `index.html` | Canvas descendant / DOM overlay task button | Coordinate clicks, Tab, Enter, Space |
| Geometry | Shared projection module | `src/geometry.js` | Automatic canvas geometry / CSS overlay transform | DPR 1/2 projection assertions |
| Status | Inline native live region | `index.html` and `src/lab.js` | Native / overlay counters | Trusted DOM event assertions |

Only the explicitly labelled freeze checkbox creates stale hit bounds. This is a measured failure demonstration, not a recommended application behavior. Hiding removes visual and accessibility participation and clears native geometry. Unsupported native APIs make descendants inert; the overlay remains the usable comparison.

Every native button has an accessible name and visible keyboard focus. Actual screen-reader, arbitrary clipping, touch and full WCAG conformance are outside this experimental contract. No claim of compliance is inferred from static inspection.
