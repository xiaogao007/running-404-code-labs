import assert from "node:assert/strict";
import test from "node:test";
import { createRenderPlan } from "../src/render-plan.js";

const validContract = {
  version: "1",
  screen: { title: "订阅更新", description: "每周发送一封工程实践摘要。" },
  components: [
    { id: "email", type: "textInput", label: "邮箱", token: "surface.default", name: "email", inputMode: "email", required: true },
    { id: "role", type: "select", label: "角色", token: "surface.muted", name: "role", options: [{ label: "前端", value: "frontend" }, { label: "全栈", value: "fullstack" }] },
    { id: "subscribe", type: "button", label: "订阅", token: "action.primary", action: "submit" },
  ],
};

test("renders a trusted plan from a constrained contract", () => {
  const { plan, validation } = createRenderPlan(validContract);
  assert.equal(validation.ok, true);
  assert.equal(plan.mode, "contract");
  assert.equal(plan.nodes.length, 3);
});

test("falls back when a model tries to return executable JSX", () => {
  const { plan, validation } = createRenderPlan({ ...validContract, jsx: "<button onClick={steal()}>订阅</button>" });
  assert.equal(validation.ok, false);
  assert.equal(plan.mode, "fallback");
});

test("falls back for a design token outside the allowlist", () => {
  const unsafeToken = structuredClone(validContract);
  unsafeToken.components[0].token = "linear-gradient(red, blue)";
  const { plan, validation } = createRenderPlan(unsafeToken);
  assert.equal(validation.ok, false);
  assert.equal(plan.mode, "fallback");
});

test("falls back when component ids collide", () => {
  const collision = structuredClone(validContract);
  collision.components[1].id = "email";
  const { plan, validation } = createRenderPlan(collision);
  assert.equal(validation.ok, false);
  assert.equal(plan.mode, "fallback");
});
