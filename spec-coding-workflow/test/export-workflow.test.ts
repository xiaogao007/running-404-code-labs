import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeCreated,
  finishExport,
  isTerminal,
  missingCriterionLinks,
  missingTaskLinks,
  retryExport,
  startExport,
  type AcceptanceCriterion,
  type ExportSession,
  type TaskDefinition,
} from "../src/export-workflow.js";

const initial: ExportSession = { state: "idle", selectedOrderIds: ["o-1", "o-2"] };

const criteria: AcceptanceCriterion[] = [
  { id: "AC-1", description: "空选择不可提交", taskIds: ["T-1"] },
  { id: "AC-2", description: "请求处理中不可重复提交", taskIds: ["T-2"] },
  { id: "AC-3", description: "失败后可以重试", taskIds: ["T-3"] },
];

const tasks: TaskDefinition[] = [
  { id: "T-1", criterionIds: ["AC-1"] },
  { id: "T-2", criterionIds: ["AC-2"] },
  { id: "T-3", criterionIds: ["AC-3"] },
];

test("empty selections are rejected before a request starts", () => {
  const result = startExport({ ...initial, selectedOrderIds: [] }, "req-1");
  assert.equal(result.accepted, false);
  assert.equal(result.message, "select-at-least-one-order");
  assert.equal(result.session.state, "idle");
});

test("in-flight requests are idempotently rejected", () => {
  const submitting = startExport(initial, "req-1").session;
  const duplicate = startExport(submitting, "req-2");
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.message, "request-in-flight");
});

test("a failed export can be retried with a new request key", () => {
  const submitting = startExport(initial, "req-1").session;
  const processing = acknowledgeCreated(submitting);
  const failed = finishExport(processing, "failed", "timeout");
  assert.equal(isTerminal(failed), true);
  const retry = retryExport(failed, "req-2");
  assert.equal(retry.accepted, true);
  assert.equal(retry.session.state, "submitting");
  assert.equal(retry.session.requestKey, "req-2");
});

test("successful exports are terminal and cannot be advanced again", () => {
  const success = finishExport(acknowledgeCreated(startExport(initial, "req-1").session), "success");
  assert.equal(success.state, "success");
  assert.equal(isTerminal(success), true);
  assert.deepEqual(acknowledgeCreated(success), success);
});

test("the traceability matrix catches missing criterion and task links", () => {
  assert.deepEqual(missingCriterionLinks(criteria, tasks), []);
  assert.deepEqual(missingTaskLinks(criteria, tasks), []);
  assert.deepEqual(missingCriterionLinks(criteria, tasks.slice(0, 2)), ["AC-3"]);
  assert.deepEqual(missingTaskLinks(criteria, [{ id: "T-1", criterionIds: ["AC-1"] }, { id: "T-3", criterionIds: ["AC-3"] }]), ["AC-2"]);
});
