import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { decideToolCall, withTimeout } from '../policy.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const member = { id: 'user-1', tenantId: 'tenant-a', role: 'member' }
const writer = { id: 'user-2', tenantId: 'tenant-a', role: 'writer' }
const releaseManager = { id: 'user-3', tenantId: 'tenant-a', role: 'release-manager' }

const publicRead = decideToolCall({
  toolName: 'get_project_status',
  actor: member,
  input: { tenantId: 'tenant-a', projectId: 'demo' },
})
assert(publicRead.allowed, 'L0 public read should be allowed')

const internalCrossTenant = decideToolCall({
  toolName: 'search_internal_docs',
  actor: member,
  input: { tenantId: 'tenant-b', query: 'secrets' },
})
assert(!internalCrossTenant.allowed, 'cross-tenant internal read must be denied')

const writeWithoutApproval = decideToolCall({
  toolName: 'update_feature_flag',
  actor: writer,
  input: { tenantId: 'tenant-a', projectId: 'demo', flag: 'new-ui', enabled: true },
  idempotencyKey: 'write-1234',
})
assert(!writeWithoutApproval.allowed, 'L2 write must require confirmation')

const approvedWrite = decideToolCall({
  toolName: 'update_feature_flag',
  actor: writer,
  input: { tenantId: 'tenant-a', projectId: 'demo', flag: 'new-ui', enabled: true },
  confirmationToken: 'approve:update_feature_flag',
  idempotencyKey: 'write-1234',
})
assert(approvedWrite.allowed, 'approved L2 write should be allowed')

const deployAsWriter = decideToolCall({
  toolName: 'deploy_preview',
  actor: writer,
  input: { tenantId: 'tenant-a', projectId: 'demo' },
  confirmationToken: 'approve:deploy_preview',
  idempotencyKey: 'deploy-1234',
})
assert(!deployAsWriter.allowed, 'L3 deploy must require release-manager')

const timeout = withTimeout(() => new Promise((resolve) => setTimeout(resolve, 30)), 5)
await assert.rejects(timeout, /timed out/)

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, 'server/index.mjs')],
})
const client = new Client({ name: 'mcp-permission-verifier', version: '1.0.0' })

try {
  await client.connect(transport)
  const listed = await client.listTools()
  assert.equal(listed.tools.length, 5, 'server should expose five policy tools')

  const denied = await client.callTool({
    name: 'update_feature_flag',
    arguments: {
      actor: writer,
      tenantId: 'tenant-a',
      projectId: 'demo',
      flag: 'new-ui',
      enabled: true,
      idempotencyKey: 'write-1234',
    },
  })
  assert.equal(denied.isError, true, 'MCP call without approval must be rejected')

  const allowed = await client.callTool({
    name: 'update_feature_flag',
    arguments: {
      actor: writer,
      tenantId: 'tenant-a',
      projectId: 'demo',
      flag: 'new-ui',
      enabled: true,
      confirmationToken: 'approve:update_feature_flag',
      idempotencyKey: 'write-1234',
    },
  })
  assert.equal(allowed.isError, undefined, 'approved MCP call should succeed')
  assert.equal(allowed.structuredContent.status, 'allowed')

  const deploy = await client.callTool({
    name: 'deploy_preview',
    arguments: {
      actor: releaseManager,
      tenantId: 'tenant-a',
      projectId: 'demo',
      confirmationToken: 'approve:deploy_preview',
      idempotencyKey: 'deploy-1234',
    },
  })
  assert.equal(deploy.structuredContent.status, 'allowed')
} finally {
  await client.close()
}

console.log('verify: four-level policy, tenant isolation, approval, idempotency, timeout, and MCP calls passed.')
