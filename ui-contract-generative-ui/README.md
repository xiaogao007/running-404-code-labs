# UI Contract for generative UI lab

This lab accompanies the article about keeping model-generated UI inside a
trusted frontend boundary. The model-facing value is JSON only. The renderer
accepts three fixed component types, an allowlisted design-token vocabulary,
and a small action vocabulary; it never executes model-provided JSX, HTML, or
event-handler strings.

## Environment

- Node.js 22 or newer
- npm 10 or newer
- Tested locally with the versions recorded after `npm run verify`

## Verify

```bash
npm ci
npm run verify
```

The test suite proves that a valid contract produces a render plan and that
unknown properties (including JSX), unapproved design tokens, and duplicate
component IDs return the static fallback plan.

## Scope and limitations

This is a framework-independent contract layer. A production React adapter
must still bind labels to controls, sanitize server-provided text at its own
rendering boundary, enforce authorization for submitted actions, and test the
finished UI with assistive technology. The lab does not call a model or claim
provider-specific structured-output reliability.
