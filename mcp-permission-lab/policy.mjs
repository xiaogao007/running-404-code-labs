export const riskLevels = Object.freeze({
  L0: 'read-only-public',
  L1: 'read-only-internal',
  L2: 'business-write',
  L3: 'release-or-destructive',
})

const tools = {
  get_project_status: {
    level: 'L0',
    description: 'Read a public project status snapshot.',
    requiresConfirmation: false,
    requiresRole: null,
    idempotencyRequired: false,
  },
  search_internal_docs: {
    level: 'L1',
    description: 'Search documents inside the caller tenant.',
    requiresConfirmation: false,
    requiresRole: 'member',
    idempotencyRequired: false,
  },
  update_feature_flag: {
    level: 'L2',
    description: 'Change a feature flag in a named project.',
    requiresConfirmation: true,
    requiresRole: 'writer',
    idempotencyRequired: true,
  },
  deploy_preview: {
    level: 'L3',
    description: 'Start a preview deployment simulation.',
    requiresConfirmation: true,
    requiresRole: 'release-manager',
    idempotencyRequired: true,
  },
  delete_preview: {
    level: 'L3',
    description: 'Delete a preview deployment simulation.',
    requiresConfirmation: true,
    requiresRole: 'release-manager',
    idempotencyRequired: true,
  },
}

export function getToolPolicy(toolName) {
  const policy = tools[toolName]
  if (!policy) throw new Error(`unknown tool: ${toolName}`)
  return { name: toolName, ...policy }
}

function hasRole(actor, requiredRole) {
  if (!requiredRole) return true
  const roleOrder = ['member', 'writer', 'release-manager']
  const actual = roleOrder.indexOf(actor.role)
  const required = roleOrder.indexOf(requiredRole)
  return actual >= required
}

function validConfirmation(toolName, confirmationToken) {
  return confirmationToken === `approve:${toolName}`
}

export function decideToolCall({ toolName, actor, input = {}, confirmationToken, idempotencyKey }) {
  const policy = getToolPolicy(toolName)
  const reasons = []

  if (!actor?.id || !actor?.tenantId || !actor?.role) {
    reasons.push('actor identity, tenant, and role are required')
  }

  if (actor?.tenantId !== input.tenantId && policy.level !== 'L0') {
    reasons.push('tenant scope does not match the actor')
  }

  if (!hasRole(actor ?? {}, policy.requiresRole)) {
    reasons.push(`role ${policy.requiresRole} or higher is required`)
  }

  if (policy.requiresConfirmation && !validConfirmation(toolName, confirmationToken)) {
    reasons.push('explicit confirmation is required')
  }

  if (policy.idempotencyRequired && (!idempotencyKey || idempotencyKey.length < 8)) {
    reasons.push('an idempotency key of at least 8 characters is required')
  }

  return {
    allowed: reasons.length === 0,
    toolName,
    level: policy.level,
    reasons,
    audit: {
      actorId: actor?.id ?? 'anonymous',
      tenantId: actor?.tenantId ?? 'unknown',
      toolName,
      idempotencyKey: idempotencyKey ?? null,
    },
  }
}

export function redactAuditEntry(decision) {
  return {
    ...decision.audit,
    allowed: decision.allowed,
    level: decision.level,
    reasonCount: decision.reasons.length,
  }
}

export async function withTimeout(task, timeoutMs = 100) {
  let timer
  try {
    return await Promise.race([
      task(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`tool timed out after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
