# React 19.3: ViewTransition and Fragment refs

This lab accompanies the article **"React 19.3 正式发布：ViewTransition 和 Fragment Refs 值得升级吗？"**. It verifies two React 19.3 stable APIs:

- A state update wrapped in `startTransition`, marked with `addTransitionType`, drives a directional `<ViewTransition>` update animation.
- An explicit `<Fragment ref={...}>` attaches an event listener to its first-level DOM children and focuses the first focusable descendant, without adding a wrapper DOM element.

## Environment

- Node.js 25.8.2
- npm 11.9.0
- React and React DOM 19.3.0
- Chromium supplied by Playwright

## Run

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/react-19-3-view-transition-fragment-ref
npm ci
npm run verify
```

`npm run verify` builds the Vite app and then runs two Playwright browser tests. They verify that clicking "下一张" changes the card and that the ViewTransition update callback receives the `forward` type while Chromium exposes the View Transition API. They also verify that an explicit Fragment ref receives a group click and moves focus to the first button.

## Expected result

```
2 passed
```

## Boundaries

- This is a minimal DOM example, not a router integration or a cross-platform sample. React documents `<ViewTransition>` as DOM-only at present.
- The test checks the React transition path and browser API availability, not animation pixels or duration. Visual motion should still be reviewed in the target browser and product design.
- `Fragment` shorthand (`<>...</>`) cannot receive a ref. Use `import { Fragment } from "react"` and the explicit `<Fragment ref={...}>` form.
