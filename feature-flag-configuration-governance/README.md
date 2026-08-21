# Feature Flag configuration governance lab

This lab accompanies the article about frontend Feature Flag governance. It
models deterministic cohorts, allowlists, known fallbacks when a provider fails,
exposure deduplication after rendering, expiry scanning, and the separation
between a UI rollout and server authorization.

## Environment

- Node.js 22 or newer
- npm 10 or newer
- Tested locally with Node.js 25.8.2 and npm 11.9.0

## Verify

```bash
npm ci
npm run verify
```

The test suite verifies that a subject remains in the same rollout bucket,
allowlists take precedence over percentage rollout, provider errors use the
declared default, expired definitions are found, and exposures are recorded once
after display. It also asserts that a successful Feature Flag evaluation cannot
grant the separate `invoice:delete` permission.

## Boundaries

This is a framework-independent domain lab. It does not start a Next.js app,
call an OpenFeature provider, persist exposure events, or replace backend
authorization. Production code should validate the remote configuration schema,
use a stable opaque subject identifier, and send authorization checks to the
server on every protected request.
