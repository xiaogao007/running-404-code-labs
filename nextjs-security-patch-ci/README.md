# Next.js security patch CI gate

This lab turns the July 2026 Next.js security release into a small, executable
dependency gate. It does not simulate a vulnerability or claim to exploit a
CVE.

## What it verifies

- `next` is pinned to an exact version in `package.json`.
- `package-lock.json` resolves the same direct version.
- The version is on a branch reviewed in `security-policy.json` and is not
  below the official July 2026 patched floor.
- Policy behavior includes expected-pass and expected-fail tests.
- The default verification replays the 2026-08-03 audit snapshot so readers can
  reproduce the article after its short-lived waivers expire.
- `npm run ci:security` additionally queries the npm public registry. Every
  current high-or-higher finding must either be fixed or have an explicit,
  unexpired entry in `audit-waivers.json`.

## Environment

- Node.js 20.9.0 or newer (required by Next.js 16.2.12)
- npm 11 or newer recommended
- Network access for installation and `npm audit`

Validated on Windows with Node.js 25.8.2 and npm 11.9.0 on 2026-08-03.

## Run

```bash
npm ci
npm run verify
```

Expected aggregate result: the version policy passes, six policy tests pass,
and the article's audit snapshot confirms that all three findings were reviewed
on 2026-08-03.

To run the time-sensitive gate intended for CI, use:

```bash
npm run ci:security
```

This command is expected to fail after a waiver expires or when the registry
returns a new unreviewed high-or-higher advisory. Review and update the policy;
do not make it green by extending dates without investigating the finding.

To see npm's unmodified exit code and report, run:

```bash
npm run audit:raw
```

On 2026-08-03, the live audit reported three high package-level vulnerabilities
through `postcss` and `sharp`. The aggregate gate passes only because the three
high-severity advisories have explicit exceptions expiring on 2026-08-10. The
moderate PostCSS advisory is visible in the raw report but is below this lab's
configured failure threshold.

To use the workflow in a standalone application, copy
`examples/security-gate.yml` to `.github/workflows/security-gate.yml`. The
Dependabot example belongs at `.github/dependabot.yml`.

## Policy maintenance

`security-policy.json` is a reviewed snapshot, not a live vulnerability feed.
When Next.js publishes another security release:

1. Read the official release and support policy.
2. Update `checkedAt`, the source URL, branches, and minimum patched versions.
3. Update the exact `next` version and lockfile.
4. Remove resolved waivers, review new advisories, and set short deadlines only
   for risks the team explicitly accepts.
5. Run the full verification command and review the application test suite.

Sources used for the snapshot:

- https://nextjs.org/blog/july-2026-security-release
- https://nextjs.org/support-policy
- https://github.com/vercel/next.js/releases/tag/v16.2.12

## Limits

- A green `npm run verify` result proves only the declared dependency policy and
  the committed 2026-08-03 audit snapshot. A green `npm run ci:security` result
  additionally proves that the registry's current high-or-higher findings have
  been reviewed; neither proves that an application is free of vulnerabilities.
- `npm audit` requires network access and submits a description of the
  dependency tree to `https://registry.npmjs.org`. The registry's advisory
  state can change after this lab is published.
- A waiver is not a fix. The included exceptions are deliberately short-lived
  so `npm run ci:security` turns red unless they are reviewed after 2026-08-10.
- This lab does not start a Next.js application, test runtime behavior, scan
  containers, or replace application tests, SAST, DAST, or incident response.
- The reviewed floors are time-sensitive and must be updated after new official
  releases.
