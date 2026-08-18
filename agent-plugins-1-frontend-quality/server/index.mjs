import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const profiles = {
  'agent-ui': [
    'lint and type-check changed code',
    'exercise loading, empty, error, and success states',
    'run keyboard and small-screen checks',
    'record skipped checks and residual risk',
  ],
  'data-flow': [
    'validate input and output contracts',
    'test timeout, cancellation, and partial failure',
    'confirm logs exclude secrets and personal data',
    'record rollback and recovery behavior',
  ],
  dependency: [
    'review the lockfile diff and package provenance',
    'run audit and license checks required by the repository',
    'execute the full test and build pipeline',
    'record version constraints and rollback steps',
  ],
}

const server = new McpServer({
  name: 'frontend-quality-gate',
  version: '1.0.0',
})

server.registerTool(
  'get_frontend_quality_gate',
  {
    title: 'Get frontend quality gate',
    description: 'Returns a read-only checklist for a frontend change type.',
    inputSchema: {
      changeType: z.enum(['agent-ui', 'data-flow', 'dependency']),
    },
  },
  async ({ changeType }) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          profile: process.env.QUALITY_PROFILE ?? 'baseline',
          changeType,
          checks: profiles[changeType],
        }),
      },
    ],
  }),
)

const transport = new StdioServerTransport()
await server.connect(transport)
