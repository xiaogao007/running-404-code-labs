# Order export specification

## User story

As an operator, I want to export selected orders so that I can reconcile them
offline.

## Acceptance criteria

- AC-1: an empty selection cannot start an export request.
- AC-2: a request already submitting or processing cannot be submitted again.
- AC-3: a failed export can be retried with a new request key.

## Non-goals

- This spec does not define the file format, authorization policy, or worker
  implementation.
