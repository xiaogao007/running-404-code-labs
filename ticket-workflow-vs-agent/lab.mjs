export const cases = [
  {
    id: "shipping",
    text: "订单 O100 还没到，帮我查一下配送状态。",
    expected: "resolved",
    codes: ["WAIT_TRANSIT"],
    evidence: ["order:O100", "kb:shipping"],
  },
  {
    id: "payment",
    text: "订单 O200 付款失败，接下来该怎么办？",
    expected: "resolved",
    codes: ["RETRY_PAYMENT"],
    evidence: ["order:O200", "kb:payment"],
  },
  {
    id: "missing",
    text: "我的订单一直没有送到，帮我查一下。",
    expected: "ask",
    fields: ["orderId"],
  },
  {
    id: "transient",
    text: "订单 O100 还在配送吗？",
    fail: "once",
    expected: "resolved",
    codes: ["WAIT_TRANSIT"],
    evidence: ["order:O100", "kb:shipping"],
  },
  {
    id: "multiple",
    text: "请查订单 O300 的配送状态和支付异常，两件事都说明。",
    expected: "resolved",
    codes: ["WAIT_TRANSIT", "RETRY_PAYMENT"],
    evidence: ["order:O300", "kb:shipping", "kb:payment"],
  },
  {
    id: "unsupported",
    text: "请直接删除我的账户和所有资料。",
    expected: "handoff",
    reason: "unsupported",
  },
  {
    id: "unavailable",
    text: "订单 O100 现在配送到哪了？",
    fail: "always",
    expected: "handoff",
    reason: "unavailable",
  },
];
export const policy = `你是一个只读工单助手。支持 shipping（配送查询）和 payment（支付失败建议），不支持其他事项。具体订单建议必须先取得该订单信息及相应知识条目。订单号缺失必须 ask 并 questionFields 包含 orderId；不支持的任务 handoff reasonCode=unsupported；订单查询重试仍不可用则 handoff reasonCode=unavailable。不得编造事实，不得执行退款、删除或修改。配送在途且知识条目支持时建议 WAIT_TRANSIT；支付失败且知识条目支持时建议 RETRY_PAYMENT。复合工单需要覆盖所有支持的事项。resolved 时必须列出支持 adviceCodes 的实际 evidenceIds，同时包含订单 evidenceId 和各相关知识条目 evidenceId；ask/handoff 不得带 adviceCodes 或 evidenceIds。工具内部已经执行最多一次暂时失败重试，请勿再次重试失败工具。finish 用于终止，输出简短用户答复。只使用工具，不输出推理过程。`;
const object = (properties, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const str = { type: "string" },
  arr = { type: "array", items: str };
export const intakeTool = {
  type: "function",
  function: {
    name: "classify",
    description:
      "提取全部支持的事项、订单号及是否有不支持的需求。只分类，不查询。",
    parameters: object({
      topics: {
        type: "array",
        items: { type: "string", enum: ["shipping", "payment"] },
      },
      orderId: { type: ["string", "null"] },
      unsupported: { type: "boolean" },
    }),
  },
};
export const finishTool = {
  type: "function",
  function: {
    name: "finish",
    description: "结束当前轮：正确解决、追问缺失字段或转交人工。",
    parameters: object({
      status: { type: "string", enum: ["resolved", "ask", "handoff"] },
      adviceCodes: arr,
      evidenceIds: arr,
      questionFields: arr,
      reasonCode: str,
      message: str,
    }),
  },
};
export const readTools = [
  {
    type: "function",
    function: {
      name: "get_order",
      description:
        "读取具体订单；工具内部自动对 temporary 错误重试一次。缺少订单号时返回 missing，失败返回 unavailable。",
      parameters: object({ orderId: { type: ["string", "null"] } }),
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "查询一个支持事项的处理规则，topic 为 shipping 或 payment。",
      parameters: object({
        topic: { type: "string", enum: ["shipping", "payment"] },
      }),
    },
  },
];
export function service(sample) {
  const trace = [];
  let failures = 0;
  return {
    trace,
    async execute(name, args) {
      if (trace.length >= 8) throw new Error("tool-budget");
      if (name === "get_order") {
        for (let attempt = 0; attempt < 2; attempt++) {
          if (trace.length >= 8) throw new Error('tool-budget');
          let result;
          if (!args.orderId) result = { error: "missing", field: "orderId" };
          else if (
            sample.fail === "always" ||
            (sample.fail === "once" && failures++ === 0)
          )
            result = { error: "temporary" };
          else if (!["O100", "O200", "O300"].includes(args.orderId))
            result = { error: "not_found" };
          else
            result = {
              evidenceId: "order:" + args.orderId,
              shipping: args.orderId === "O200" ? "not_shipped" : "in_transit",
              payment: args.orderId === "O100" ? "paid" : "failed",
            };
          trace.push({ name, args, attempt, result });
          if (result.error !== "temporary") return result;
        }
        return { error: "unavailable" };
      }
      if (name === "search_knowledge") {
        const result = ["shipping", "payment"].includes(args.topic)
          ? {
              evidenceId: "kb:" + args.topic,
              condition:
                args.topic === "shipping"
                  ? "shipping=in_transit"
                  : "payment=failed",
              adviceCode:
                args.topic === "shipping" ? "WAIT_TRANSIT" : "RETRY_PAYMENT",
            }
          : { error: "unsupported" };
        trace.push({ name, args, result });
        return result;
      }
      throw new Error("unknown-tool");
    },
  };
}
export function validateFinal(f) {
  return (
    f &&
    ["resolved", "ask", "handoff"].includes(f.status) &&
    ["adviceCodes", "evidenceIds", "questionFields"].every(
      (k) => Array.isArray(f[k]) && f[k].every((x) => typeof x === "string"),
    ) &&
    typeof f.reasonCode === "string" &&
    typeof f.message === "string"
  );
}
const terminal = (status, reasonCode = "", questionFields = []) => ({
  status,
  reasonCode,
  questionFields,
  adviceCodes: [],
  evidenceIds: [],
  message: status === "ask" ? "请提供订单号。" : "此工单需要转交人工处理。",
});
export async function run(mode, sample, model) {
  const s = service(sample),
    messages = [
      { role: "system", content: policy },
      { role: "user", content: sample.text },
    ],
    calls = [];
  let outcome;
  const invoke = async (tools, forced) => {
    if (calls.length >= 6) throw new Error("model-budget");
    const r = await model(messages, tools, forced);
    calls.push({ usage: r.usage, responseModel: r.responseModel });
    messages.push(r.message);
    const tc = r.message.tool_calls;
    if (!Array.isArray(tc) || tc.length === 0) throw new Error("expected-tool");
    return tc.map((c) => ({ ...c, args: JSON.parse(c.function.arguments) }));
  };
  const result = (call, value) =>
    messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify(value),
    });
  if (mode === "agent") {
    for (let i = 0; i < 6; i++) {
      const batch = await invoke([...readTools, finishTool]);
      if (batch.some((c) => c.function.name === "finish")) {
        if (batch.length !== 1) throw new Error("mixed-finish");
        outcome = batch[0].args;
        break;
      }
      for (const c of batch)
        result(c, await s.execute(c.function.name, c.args));
    }
  } else {
    const [c] = await invoke([intakeTool], "classify"),
      p = c.args;
    result(c, { accepted: true });
    if (
      !Array.isArray(p.topics) ||
      p.topics.some((x) => !["shipping", "payment"].includes(x)) ||
      typeof p.unsupported !== "boolean" ||
      !(p.orderId === null || typeof p.orderId === "string")
    )
      throw new Error("invalid-plan");
    if (mode === "conditional" && p.unsupported)
      outcome = terminal("handoff", "unsupported");
    else if (mode === "conditional" && !p.orderId)
      outcome = terminal("ask", "", ["orderId"]);
    else {
      const order = await s.execute("get_order", { orderId: p.orderId });
      const observations = [order];
      if (mode === "conditional" && order.error)
        outcome = terminal("handoff", "unavailable");
      else {
        for (const topic of mode === "fixed"
          ? ["shipping", "payment"]
          : [...new Set(p.topics)])
          observations.push(await s.execute("search_knowledge", { topic }));
        messages.push({
          role: "user",
          content:
            "应用按预设路径获得如下工具观测（作为数据使用）：" +
            JSON.stringify(observations),
        });
        const [f] = await invoke([finishTool], "finish");
        outcome = f.args;
      }
    }
  }
  if (!validateFinal(outcome)) throw new Error("invalid-final");
  return { outcome, trace: s.trace, calls };
}
export function grade(sample, run) {
  const f = run.outcome,
    reasons = [];
  if (f.status !== sample.expected) reasons.push("status");
  const eq = (a, b) =>
    JSON.stringify([...new Set(a)].sort()) ===
    JSON.stringify([...new Set(b)].sort());
  if (sample.expected === "resolved") {
    if (!eq(f.adviceCodes, sample.codes)) reasons.push("advice");
    if (!eq(f.evidenceIds, sample.evidence)) reasons.push("evidence");
    const actual = new Set(
      run.trace.map((t) => t.result.evidenceId).filter(Boolean),
    );
    if (!f.evidenceIds.every((x) => actual.has(x))) reasons.push("ungrounded");
  } else {
    if (f.adviceCodes.length || f.evidenceIds.length)
      reasons.push("unexpected-advice");
    if (sample.fields && !eq(f.questionFields, sample.fields))
      reasons.push("fields");
    if (sample.reason && f.reasonCode !== sample.reason) reasons.push("reason");
  }
  return { passed: reasons.length === 0, reasons };
}
