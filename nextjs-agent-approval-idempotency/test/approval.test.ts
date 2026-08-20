import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionStore,
  executeOnce,
  requestApproval,
  respondToApproval,
} from "../src/approval.js";

test("repeated approval is idempotent", async () => {
  const store = createExecutionStore();
  requestApproval(store, "chat-1:message-1:call-1", "call-1");
  respondToApproval(store, "chat-1:message-1:call-1", true);
  respondToApproval(store, "chat-1:message-1:call-1", true);

  let executions = 0;
  const call = await executeOnce(store, "chat-1:message-1:call-1", async () => {
    executions += 1;
    return "deleted";
  });
  await executeOnce(store, "chat-1:message-1:call-1", async () => {
    executions += 1;
    return "should not run";
  });

  assert.equal(executions, 1);
  assert.equal(call.state, "output-available");
  assert.equal(call.output, "deleted");
});

test("denial never executes the tool", async () => {
  const store = createExecutionStore();
  requestApproval(store, "chat-1:message-2:call-1", "call-1");
  respondToApproval(store, "chat-1:message-2:call-1", false);

  let executions = 0;
  const call = await executeOnce(store, "chat-1:message-2:call-1", async () => {
    executions += 1;
    return "danger";
  });

  assert.equal(executions, 0);
  assert.equal(call.state, "denied");
});

test("the same idempotency key reuses the existing pending call", () => {
  const store = createExecutionStore();
  const first = requestApproval(store, "chat-1:message-3:call-1", "call-1");
  const second = requestApproval(store, "chat-1:message-3:call-1", "call-2");
  assert.equal(first, second);
  assert.equal(second.id, "call-1");
});
