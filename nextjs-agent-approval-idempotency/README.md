# Next.js Agent approval and idempotency lab

This lab accompanies the article about production-safe Agent tool execution.
It isolates the server-side state machine behind a Next.js/AI SDK approval UI:
approval request, approval or denial, one-time execution, and idempotency-key
deduplication.

## Environment

- Node.js 22 or newer
- npm 10 or newer
- Tested locally with Node.js 25.8.2 and npm 11.9.0

## Verify

```bash
npm ci
npm run verify
```

The tests assert that repeated approval does not execute twice, denial never
executes the tool, and duplicate requests with the same idempotency key reuse
the original call.

This is a framework-independent state-machine lab. It does not call a model,
start a Next.js server, or prove provider-specific streaming behavior.
