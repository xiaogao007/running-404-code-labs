import assert from "node:assert/strict";
import test from "node:test";
import { validateProject } from "../lib/policy.mjs";

const policy = {
  allowedBranches: [
    {
      major: 16,
      minor: 2,
      channel: "Active LTS",
      minimumPatchedVersion: "16.2.11",
    },
    {
      major: 15,
      minor: 5,
      channel: "Maintenance LTS",
      minimumPatchedVersion: "15.5.21",
    },
  ],
};

test("accepts the reviewed Active LTS patch", () => {
  assert.deepEqual(validate("16.2.11"), []);
});

test("accepts a newer patch on the reviewed branch", () => {
  assert.deepEqual(validate("16.2.12"), []);
});

test("rejects a version below the reviewed security floor", () => {
  assert.match(validate("16.2.10").join("\n"), /below the reviewed floor/);
});

test("rejects an unsupported major", () => {
  assert.match(validate("14.2.35").join("\n"), /outside the policy/);
});

test("rejects a semver range so the lockfile cannot drift silently", () => {
  assert.match(validate("^16.2.11").join("\n"), /must use an exact version/);
});

test("rejects a lockfile mismatch", () => {
  const errors = validate("16.2.11", "16.2.10");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /installed next/);
});

function validate(requested, installed = requested) {
  return validateProject({
    manifest: { dependencies: { next: requested } },
    lockfile: {
      packages: {
        "": { dependencies: { next: requested } },
        "node_modules/next": { version: installed },
      },
    },
    policy,
  });
}
