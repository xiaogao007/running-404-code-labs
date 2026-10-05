import test from "node:test";
import assert from "node:assert/strict";
import { renderDecision } from './render.mjs';
import { cases, service, run, grade, validateFinal } from "./lab.mjs";
test('retry cannot exceed shared tool budget',async()=>{
 const s=service({fail:'always'});
 for(let i=0;i<7;i++) await s.execute('search_knowledge',{topic:'shipping'});
 await assert.rejects(()=>s.execute('get_order',{orderId:'O100'}),/tool-budget/);
 assert.equal(s.trace.length,8);
});
test('display does not claim a transfer happened',()=>{
 const f={status:'handoff',adviceCodes:[],evidenceIds:[],questionFields:[],reasonCode:'unsupported',message:'已为您转交人工'};
 assert.equal(renderDecision(f),'此问题需要人工处理；尚未提交转交请求。');
});
test('display does not repeat unsupported generated advice',()=>{
 const f={status:'resolved',adviceCodes:['RETRY_PAYMENT'],evidenceIds:['order:O200','kb:payment'],questionFields:[],reasonCode:'',message:'换支付方式，联系客服'};
 assert.equal(renderDecision(f),'订单支付失败，建议重新尝试支付。');
});
test("temporary failure retries once", async () => {
  const s = service({ fail: "once" });
  assert.equal(
    (await s.execute("get_order", { orderId: "O100" })).evidenceId,
    "order:O100",
  );
  assert.equal(s.trace.length, 2);
});
test("persistent failure stops at two attempts", async () => {
  const s = service({ fail: "always" });
  assert.equal(
    (await s.execute("get_order", { orderId: "O100" })).error,
    "unavailable",
  );
  assert.equal(s.trace.length, 2);
});
test("missing input does not fabricate an order", async () => {
  assert.equal(
    (await service({}).execute("get_order", { orderId: null })).error,
    "missing",
  );
});
test("unknown tool rejected", async () => {
  await assert.rejects(
    () => service({}).execute("delete_account", {}),
    /unknown-tool/,
  );
});
test("grader rejects advice with invented evidence", () => {
  assert.equal(
    grade(cases[0], {
      outcome: {
        status: "resolved",
        adviceCodes: ["WAIT_TRANSIT"],
        evidenceIds: ["order:O100", "kb:shipping"],
      },
      trace: [],
    }).passed,
    false,
  );
});
test("final contract rejects malformed result", () => {
  assert.equal(validateFinal({ status: "done" }), false);
});
const response = (name, args) => ({
  message: {
    role: "assistant",
    content: null,
    tool_calls: [
      {
        id: "test-call",
        type: "function",
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  },
});
test("conditional asks without tools after missing input classification", async () => {
  const result = await run("conditional", cases[2], async () =>
    response("classify", {
      topics: ["shipping"],
      orderId: null,
      unsupported: false,
    }),
  );
  assert.equal(result.trace.length, 0);
  assert.equal(result.calls.length, 1);
  assert.ok(grade(cases[2], result).passed);
});
test("agent loop cannot run indefinitely", async () => {
  await assert.rejects(
    () =>
      run("agent", cases[0], async () =>
        response("search_knowledge", { topic: "shipping" }),
      ),
    /invalid-final/,
  );
});
