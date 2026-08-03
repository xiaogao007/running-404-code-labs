# WebMCP agent tools lab

This lab accompanies the article about WebMCP and shows the application-side
shape of an imperative WebMCP tool. It uses the official `webmcp-types` package
to type-check `document.modelContext.registerTool()`, then executes the tool
through a small in-memory test harness.

## Environment

- Node.js 22 or newer
- npm 10 or newer
- Tested on Windows 11 with Node.js 25.8.2 and npm 11.9.0

## Install and verify

```bash
npm ci
npm run verify
```

Expected result: TypeScript type checking succeeds and all four tests pass.
The tests cover tool registration, successful execution, invalid input, and a
progressive-enhancement fallback when `document.modelContext` is unavailable.

## What this proves

- The example matches the `document.modelContext` TypeScript declarations in
  `webmcp-types@0.1.3`.
- The tool exposes a name, description, JSON Schema-shaped input contract,
  execution callback, and security annotations.
- The page-owned state changes only after runtime input validation succeeds.
- A site can keep working when the experimental browser API is unavailable.

## What this does not prove

This is not a browser conformance test and does not claim stable WebMCP support.
As of 2026-08-03, WebMCP is a W3C Community Group draft. Chrome lists a developer
trial in Chrome 146, an origin trial planned for Chrome 149 through 156, and an
estimated shipping milestone of Chrome 157. Firefox and WebKit have no public
implementation signal on Chrome Status.

To inspect the native API in an eligible Chrome development build, enable
`chrome://flags/#enable-webmcp-testing`, restart Chrome, and check
`"modelContext" in document`. Browser flags and API details may change while
the proposal is under active discussion.

`webmcp-types@0.1.3` currently omits the type argument on one internal generic.
The project therefore enables `skipLibCheck` for dependency declarations while
re-applying `WebMCP.ToolExecuteCallback<AddTodoInput>` to the tool callback in
application code. `npm run typecheck` still checks all source and test files.

## Sources

- Specification: https://webmachinelearning.github.io/webmcp/
- Chrome documentation: https://developer.chrome.com/docs/ai/webmcp
- Chrome implementation status: https://chromestatus.com/feature/5117755740913664
