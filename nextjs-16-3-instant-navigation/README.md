# Next.js 16.3 Instant Navigation Lab

This lab accompanies an article about the opt-in Instant Navigations features in
Next.js 16.3. It demonstrates a reusable route shell, Partial
Prefetching, streamed dynamic content, and the official `instant()` Playwright
helper.

## Environment

- Node.js 20.9 or newer (verified with Node.js 25.8.2)
- npm 11.9.0
- Next.js 16.3.0
- React 19.2.8
- Chromium installed through Playwright

The stable package is pinned exactly so the verification remains reproducible.

## Install

```bash
npm ci
npx playwright install chromium
```

## Verify

```bash
npm run verify
```

The aggregate command checks the installed Next.js version, creates a production
build, starts that production build, and runs the browser assertion. The test
holds back streamed dynamic content with `@next/playwright` and verifies that the
route shell and Suspense fallback are already visible after the link click.

## Run Manually

```bash
npm run dev
```

Open `http://localhost:3000`, then navigate between the two product URLs.

## Expected Result

- The production build succeeds.
- The Playwright test passes.
- During the held navigation, `Product details` and `Checking inventory...` are
  visible before `Baseball cap` and its inventory value stream in.

## Limits

- This is a functional behavior check, not a performance benchmark.
- It does not claim that every Next.js application will navigate faster.
- Instant navigation assumes the relevant client cache is warm. A cold first
  navigation can still wait for the server to prepare the shell.
- Development uses a deliberate 700 ms delay to make the streaming boundary easy
  to observe.
- Actual prefetch requests happen in production. The test focuses on the shell
  visible at navigation time through the official testing helper.
- Instant Navigations require opt-in configuration in Next.js 16.3. Recheck the
  migration guide and API before production adoption.
