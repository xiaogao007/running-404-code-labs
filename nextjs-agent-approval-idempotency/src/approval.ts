export type ApprovalState =
  | "approval-requested"
  | "approved"
  | "denied"
  | "executing"
  | "output-available"
  | "output-error";

export interface ToolCall {
  id: string;
  state: ApprovalState;
  output?: string;
}

export interface ExecutionStore {
  get(idempotencyKey: string): ToolCall | undefined;
  set(idempotencyKey: string, call: ToolCall): void;
}

export function createExecutionStore(): ExecutionStore {
  const calls = new Map<string, ToolCall>();
  return {
    get: (key) => calls.get(key),
    set: (key, call) => calls.set(key, call),
  };
}

export function requestApproval(
  store: ExecutionStore,
  idempotencyKey: string,
  callId: string,
): ToolCall {
  const existing = store.get(idempotencyKey);
  if (existing) return existing;
  const call: ToolCall = { id: callId, state: "approval-requested" };
  store.set(idempotencyKey, call);
  return call;
}

export function respondToApproval(
  store: ExecutionStore,
  idempotencyKey: string,
  approved: boolean,
): ToolCall {
  const call = store.get(idempotencyKey);
  if (!call) throw new Error("unknown tool call");
  if (call.state !== "approval-requested") return call;
  call.state = approved ? "approved" : "denied";
  return call;
}

export async function executeOnce(
  store: ExecutionStore,
  idempotencyKey: string,
  execute: () => Promise<string>,
): Promise<ToolCall> {
  const call = store.get(idempotencyKey);
  if (!call) throw new Error("unknown tool call");
  if (call.state === "output-available" || call.state === "denied") return call;
  if (call.state !== "approved") throw new Error(`cannot execute from ${call.state}`);
  call.state = "executing";
  try {
    call.output = await execute();
    call.state = "output-available";
  } catch {
    call.state = "output-error";
  }
  return call;
}
