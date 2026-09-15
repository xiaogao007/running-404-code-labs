import type { UiContract } from "./types.js";
import { validateContract, type ValidationResult } from "./validate.js";

export type RenderPlan =
  | { mode: "contract"; title: string; description: string; nodes: UiContract["components"] }
  | { mode: "fallback"; title: string; description: string; nodes: [{ type: "button"; id: "retry"; label: "重新生成"; token: "action.primary"; action: "submit" }] };

export function createRenderPlan(candidate: unknown): { plan: RenderPlan; validation: ValidationResult } {
  const validation = validateContract(candidate);

  if (!validation.ok) {
    return {
      validation,
      plan: {
        mode: "fallback",
        title: "暂时无法生成界面",
        description: "请调整需求后重新生成。",
        nodes: [{ type: "button", id: "retry", label: "重新生成", token: "action.primary", action: "submit" }],
      },
    };
  }

  return {
    validation,
    plan: {
      mode: "contract",
      title: validation.contract.screen.title,
      description: validation.contract.screen.description,
      nodes: validation.contract.components,
    },
  };
}
