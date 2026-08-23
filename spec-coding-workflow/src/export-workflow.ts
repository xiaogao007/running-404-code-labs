export type ExportState = "idle" | "submitting" | "processing" | "success" | "failed";

export interface ExportSession {
  state: ExportState;
  selectedOrderIds: readonly string[];
  requestKey?: string;
  error?: string;
}

export interface TransitionResult {
  session: ExportSession;
  accepted: boolean;
  message?: string;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  taskIds: readonly string[];
}

export interface TaskDefinition {
  id: string;
  criterionIds: readonly string[];
}

const terminalStates = new Set<ExportState>(["success", "failed"]);

export function startExport(session: ExportSession, requestKey: string): TransitionResult {
  if (session.selectedOrderIds.length === 0) {
    return { session, accepted: false, message: "select-at-least-one-order" };
  }
  if (session.state === "submitting" || session.state === "processing") {
    return { session, accepted: false, message: "request-in-flight" };
  }
  return {
    session: { state: "submitting", selectedOrderIds: session.selectedOrderIds, requestKey },
    accepted: true,
  };
}

export function acknowledgeCreated(session: ExportSession): ExportSession {
  if (session.state !== "submitting") return session;
  return { ...session, state: "processing" };
}

export function finishExport(session: ExportSession, outcome: "success" | "failed", error?: string): ExportSession {
  if (session.state !== "processing") return session;
  if (outcome === "success") {
    const success: ExportSession = { state: "success", selectedOrderIds: session.selectedOrderIds };
    if (session.requestKey !== undefined) success.requestKey = session.requestKey;
    return success;
  }
  return { ...session, state: "failed", error: error ?? "export-failed" };
}

export function retryExport(session: ExportSession, requestKey: string): TransitionResult {
  if (session.state !== "failed") return { session, accepted: false, message: "retry-not-available" };
  return startExport({ state: "idle", selectedOrderIds: session.selectedOrderIds }, requestKey);
}

export function isTerminal(session: ExportSession): boolean {
  return terminalStates.has(session.state);
}

export function missingCriterionLinks(
  criteria: readonly AcceptanceCriterion[],
  tasks: readonly TaskDefinition[],
): string[] {
  const linkedCriteria = new Set(tasks.flatMap((task) => task.criterionIds));
  return criteria.filter((criterion) => !linkedCriteria.has(criterion.id)).map((criterion) => criterion.id);
}

export function missingTaskLinks(
  criteria: readonly AcceptanceCriterion[],
  tasks: readonly TaskDefinition[],
): string[] {
  const taskIds = new Set(tasks.map((task) => task.id));
  return criteria
    .filter((criterion) => criterion.taskIds.some((taskId) => !taskIds.has(taskId)))
    .map((criterion) => criterion.id);
}
