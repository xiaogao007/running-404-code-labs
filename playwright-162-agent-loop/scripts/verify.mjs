import { spawn } from 'node:child_process';

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (code) => resolve({ code, stdout, stderr }));
});

const version = await run('npx', ['playwright', '--version']);
if (version.code !== 0 || !/^Version 1\.62\./m.test(version.stdout)) {
  throw new Error(`Expected Playwright 1.62.x, received: ${version.stdout || version.stderr}`);
}

const mcp = await run('npx', ['playwright', 'mcp', '--help']);
if (mcp.code !== 0 || !/MCP server/i.test(mcp.stdout)) {
  throw new Error(`Playwright MCP CLI is unavailable: ${mcp.stdout || mcp.stderr}`);
}

const tests = await run('npx', ['playwright', 'test', '--reporter=line']);
process.stdout.write(tests.stdout);
process.stderr.write(tests.stderr);
if (tests.code !== 0) {
  process.exit(tests.code);
}

console.log('verify: Playwright 1.62.x, MCP CLI, UI flow, and AbortSignal checks passed.');
