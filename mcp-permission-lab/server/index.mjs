import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { decideToolCall, getToolPolicy, redactAuditEntry, withTimeout } from '../policy.mjs'

const server = new McpServer({ name: 'mcp-permission-lab', version: '1.0.0' })
const auditLog = []

const actorSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  role: z.enum(['member', 'writer', 'release-manager']),
})

function registerPolicyTool(name, description, inputSchema, annotations, operation) {
  server.registerTool(name, { description, inputSchema, annotations }, async (input) => {
    const { actor, confirmationToken, idempotencyKey, ...operationInput } = input
    const decision = decideToolCall({
      toolName: name,
      actor,
      input: operationInput,
      confirmationToken,
      idempotencyKey,
    })
    auditLog.push(redactAuditEntry(decision))

    if (!decision.allowed) {
      return {
        isError: true,
        content: [{ type: 'text', text: JSON.stringify({ status: 'denied', ...decision }) }],
      }
    }

    const result = await withTimeout(() => operation(operationInput), 100)
    return {
      structuredContent: { status: 'allowed', ...result },
      content: [{ type: 'text', text: JSON.stringify({ status: 'allowed', ...result }) }],
    }
  })
}

registerPolicyTool(
  'get_project_status',
  getToolPolicy('get_project_status').description,
  { actor: actorSchema, tenantId: z.string().min(1), projectId: z.string().min(1) },
  { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  ({ projectId }) => ({ projectId, state: 'healthy', source: 'simulated' }),
)

registerPolicyTool(
  'search_internal_docs',
  getToolPolicy('search_internal_docs').description,
  { actor: actorSchema, tenantId: z.string().min(1), query: z.string().min(1).max(200) },
  { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  ({ query }) => ({ query, matches: ['tenant-scoped result'], source: 'simulated' }),
)

registerPolicyTool(
  'update_feature_flag',
  getToolPolicy('update_feature_flag').description,
  {
    actor: actorSchema,
    tenantId: z.string().min(1),
    projectId: z.string().min(1),
    flag: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
    enabled: z.boolean(),
    confirmationToken: z.string().optional(),
    idempotencyKey: z.string().optional(),
  },
  { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  ({ projectId, flag, enabled }) => ({ projectId, flag, enabled, state: 'simulated' }),
)

registerPolicyTool(
  'deploy_preview',
  getToolPolicy('deploy_preview').description,
  {
    actor: actorSchema,
    tenantId: z.string().min(1),
    projectId: z.string().min(1),
    confirmationToken: z.string().optional(),
    idempotencyKey: z.string().optional(),
  },
  { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  ({ projectId }) => ({ projectId, deploymentId: 'preview-simulated', state: 'simulated' }),
)

registerPolicyTool(
  'delete_preview',
  getToolPolicy('delete_preview').description,
  {
    actor: actorSchema,
    tenantId: z.string().min(1),
    projectId: z.string().min(1),
    confirmationToken: z.string().optional(),
    idempotencyKey: z.string().optional(),
  },
  { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  ({ projectId }) => ({ projectId, deleted: true, state: 'simulated' }),
)

const transport = new StdioServerTransport()
await server.connect(transport)
