# Order export implementation plan

- Represent the UI lifecycle as `idle -> submitting -> processing -> success | failed`.
- Reject empty selections and in-flight duplicates before calling the API.
- Preserve a request key so the server can apply its own idempotency policy.
- Keep authorization and file generation outside this frontend state machine.
