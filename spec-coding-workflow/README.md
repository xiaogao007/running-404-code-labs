# Spec Coding workflow lab

This lab accompanies the article about Spec Coding and Spec-Driven Development.
It turns a small batch-export specification into a typed state machine and a
traceability check from acceptance criteria to implementation tasks.

## Environment

- Node.js 22 or newer
- npm 10 or newer
- Tested locally with Node.js 25.8.2 and npm 11.9.0

## Verify

```bash
npm ci
npm run verify
```

The tests cover empty-selection rejection, in-flight duplicate protection,
failure and retry transitions, terminal success behavior, and missing links in
the acceptance-criteria/task matrix.

## Boundaries

This is a framework-independent domain lab. It does not invoke an AI model,
install GitHub Spec Kit or Kiro, call a real export API, or claim that a
specification automatically produces correct production code. The point is to
make two contracts executable: the state transitions described by a spec and
the traceability links that let a reviewer find the task and test for each
acceptance criterion.
