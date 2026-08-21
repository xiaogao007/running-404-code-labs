export interface EvaluationContext {
  subjectId: string;
  environment: "development" | "staging" | "production";
}

export interface FlagDefinition {
  key: string;
  defaultValue: boolean;
  owner: string;
  expiresAt: string;
}

export interface RemoteRule {
  enabled?: boolean;
  allowSubjects?: readonly string[];
  rolloutPercentage?: number;
}

export interface Resolution {
  value: boolean;
  reason: "default" | "disabled" | "allowlist" | "rollout" | "provider-error" | "expired";
}

export type RuleProvider = (flagKey: string, context: EvaluationContext) => RemoteRule | undefined;

export function stableBucket(flagKey: string, subjectId: string): number {
  let hash = 2_166_136_261;
  for (const character of `${flagKey}:${subjectId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 100;
}

export function evaluateFlag(
  definition: FlagDefinition,
  context: EvaluationContext,
  provider: RuleProvider,
  now = new Date(),
): Resolution {
  if (Date.parse(definition.expiresAt) <= now.getTime()) {
    return { value: definition.defaultValue, reason: "expired" };
  }

  let rule: RemoteRule | undefined;
  try {
    rule = provider(definition.key, context);
  } catch {
    return { value: definition.defaultValue, reason: "provider-error" };
  }

  if (rule?.enabled === false) return { value: false, reason: "disabled" };
  if (rule?.allowSubjects?.includes(context.subjectId)) {
    return { value: true, reason: "allowlist" };
  }
  if (rule?.rolloutPercentage !== undefined) {
    if (rule.rolloutPercentage < 0 || rule.rolloutPercentage > 100) {
      return { value: definition.defaultValue, reason: "default" };
    }
    return stableBucket(definition.key, context.subjectId) < rule.rolloutPercentage
      ? { value: true, reason: "rollout" }
      : { value: false, reason: "rollout" };
  }
  return { value: definition.defaultValue, reason: "default" };
}

export class ExposureTracker {
  private readonly seen = new Set<string>();

  recordDisplayed(flagKey: string, subjectId: string): boolean {
    const key = `${flagKey}:${subjectId}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
}

export function findExpiredFlags(
  definitions: readonly FlagDefinition[],
  now = new Date(),
): FlagDefinition[] {
  return definitions.filter((definition) => Date.parse(definition.expiresAt) <= now.getTime());
}

export function canDeleteInvoice(permissions: readonly string[]): boolean {
  return permissions.includes("invoice:delete");
}
