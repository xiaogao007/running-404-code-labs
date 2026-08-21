import assert from "node:assert/strict";
import test from "node:test";
import {
  canDeleteInvoice,
  evaluateFlag,
  ExposureTracker,
  findExpiredFlags,
  stableBucket,
  type EvaluationContext,
  type FlagDefinition,
} from "../src/flags.js";

const definition: FlagDefinition = {
  key: "checkout.v2",
  defaultValue: false,
  owner: "checkout-web",
  expiresAt: "2026-12-31T00:00:00.000Z",
};

const context: EvaluationContext = {
  subjectId: "tenant-acme",
  environment: "production",
};

test("stable cohorts do not move between evaluations", () => {
  assert.equal(stableBucket("checkout.v2", "tenant-acme"), stableBucket("checkout.v2", "tenant-acme"));
  const provider = () => ({ rolloutPercentage: 50 });
  assert.deepEqual(evaluateFlag(definition, context, provider), evaluateFlag(definition, context, provider));
});

test("allowlists override percentage rollout", () => {
  const result = evaluateFlag(definition, context, () => ({ allowSubjects: ["tenant-acme"], rolloutPercentage: 0 }));
  assert.deepEqual(result, { value: true, reason: "allowlist" });
});

test("provider failures and invalid rollout values return the declared fallback", () => {
  assert.deepEqual(evaluateFlag(definition, context, () => { throw new Error("network unavailable"); }), {
    value: false,
    reason: "provider-error",
  });
  assert.deepEqual(evaluateFlag(definition, context, () => ({ rolloutPercentage: 101 })), {
    value: false,
    reason: "default",
  });
});

test("expired flags are discoverable and resolve to their default", () => {
  const expired = { ...definition, key: "legacy.search", expiresAt: "2025-01-01T00:00:00.000Z" };
  const now = new Date("2026-08-21T00:00:00.000Z");
  assert.deepEqual(findExpiredFlags([definition, expired], now).map((flag) => flag.key), ["legacy.search"]);
  assert.deepEqual(evaluateFlag(expired, context, () => ({ rolloutPercentage: 100 }), now), {
    value: false,
    reason: "expired",
  });
});

test("exposure is emitted only after display and is deduplicated", () => {
  const tracker = new ExposureTracker();
  const result = evaluateFlag(definition, context, () => ({ rolloutPercentage: 100 }));
  assert.equal(result.value, true);
  assert.equal(tracker.recordDisplayed(definition.key, context.subjectId), true);
  assert.equal(tracker.recordDisplayed(definition.key, context.subjectId), false);
});

test("a visible feature never grants server authorization", () => {
  assert.equal(evaluateFlag(definition, context, () => ({ rolloutPercentage: 100 })).value, true);
  assert.equal(canDeleteInvoice([]), false);
  assert.equal(canDeleteInvoice(["invoice:delete"]), true);
});
