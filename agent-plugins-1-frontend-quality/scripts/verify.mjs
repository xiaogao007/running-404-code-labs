import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { parse } from 'yaml'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'))
}

function extractFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  assert(match, 'SKILL.md must start with YAML frontmatter')
  return parse(match[1])
}

function assertContained(pluginRoot, candidate, label) {
  const resolvedRoot = path.resolve(pluginRoot)
  const resolvedCandidate = path.resolve(pluginRoot, candidate)
  assert(
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`),
    `${label} escapes the plugin root: ${candidate}`,
  )
}

function validateMcpPaths(config) {
  for (const [name, server] of Object.entries(config.mcpServers)) {
    if (server.type !== 'stdio') continue

    if (server.command.includes('/') || server.command.includes('\\')) {
      assert(server.command.startsWith('./'), `${name}.command must start with ./`)
      assertContained(root, server.command, `${name}.command`)
    }

    if (server.cwd?.startsWith('./')) {
      assertContained(root, server.cwd, `${name}.cwd`)
    }
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: true })
const pluginSchema = await readJson('schemas/plugin.schema.json')
const mcpSchema = await readJson('schemas/mcp.schema.json')
const validatePlugin = ajv.compile(pluginSchema)
const validateMcp = ajv.compile(mcpSchema)

const plugin = await readJson('plugin.json')
assert(validatePlugin(plugin), ajv.errorsText(validatePlugin.errors))

const invalidPlugin = await readJson('fixtures/invalid-plugin.json')
assert.equal(validatePlugin(invalidPlugin), false, 'invalid manifest must be rejected')

const mcp = await readJson('mcp.json')
assert(validateMcp(mcp), ajv.errorsText(validateMcp.errors))
validateMcpPaths(mcp)

const escapingMcp = structuredClone(mcp)
escapingMcp.mcpServers['frontend-quality'].command = '../outside/server'
assert.throws(() => validateMcpPaths(escapingMcp), /must start with \.\//)

const skillDirectories = await readdir(path.join(root, 'skills'), { withFileTypes: true })
const skills = skillDirectories.filter((entry) => entry.isDirectory())
assert(skills.length > 0, 'at least one skill is required for this example')

for (const directory of skills) {
  const markdown = await readFile(path.join(root, 'skills', directory.name, 'SKILL.md'), 'utf8')
  const frontmatter = extractFrontmatter(markdown)
  assert.equal(frontmatter.name, directory.name, `skill name must match directory: ${directory.name}`)
  assert.equal(typeof frontmatter.description, 'string')
  assert(frontmatter.description.length > 0, `skill description is required: ${directory.name}`)
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, 'server/index.mjs')],
  env: { ...process.env, QUALITY_PROFILE: 'verification' },
})
const client = new Client({ name: 'agent-plugins-verifier', version: '1.0.0' })

try {
  await client.connect(transport)
  const result = await client.callTool({
    name: 'get_frontend_quality_gate',
    arguments: { changeType: 'agent-ui' },
  })
  const payload = JSON.parse(result.content[0].text)
  assert.equal(payload.profile, 'verification')
  assert.equal(payload.changeType, 'agent-ui')
  assert.equal(payload.checks.length, 4)
} finally {
  await client.close()
}

console.log('verify: plugin schema, MCP schema, skill discovery, path containment, and MCP tool passed.')
