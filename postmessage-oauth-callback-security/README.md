# Secure `postMessage` OAuth callback

This lab accompanies **"浏览器窗口通信别再 `postMessage('*')`：前端登录回调的安全清单"**. It demonstrates a browser-side callback contract with three local origins:

- `http://127.0.0.1:4174`: parent application.
- `http://127.0.0.1:4175`: expected callback origin.
- `http://127.0.0.1:4176`: simulated attacker origin.

The parent accepts a callback only when all four checks pass: exact `event.origin`, the expected popup `event.source`, a strict message shape, and a matching `state` value.

## Environment

- Node.js 25.8.2
- npm 11.9.0
- React and React DOM 19.3.0
- Chromium supplied by Playwright

## Run

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/postmessage-oauth-callback-security
npm ci
npm run verify
```

`npm run verify` builds the app and runs three Playwright browser tests:

1. A valid callback from the expected popup and origin is accepted.
2. A message missing the required `code` field is rejected by the schema check.
3. The expected popup is navigated to a different origin. Its lookalike callback is rejected by the origin check even though its `WindowProxy` is still the expected source.

## Boundaries

- All callback data is synthetic. The app does not contact an authorization server and never handles a real authorization code, access token, or refresh token.
- Browser-side message validation does not replace OAuth server-side controls such as registered redirect URIs, PKCE, authorization-code validation, or token exchange.
- The fixed `state` value exists only to make the test deterministic. A real authorization flow needs an unpredictable, request-bound value and server-side verification.
