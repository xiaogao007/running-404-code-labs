import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TraceMap, originalPositionFor, sourceContentFor } from '@jridgewell/trace-mapping';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runFile = promisify(execFile);
const cliPath = resolve(root, 'node_modules/@playwright/cli/playwright-cli.js');
const session = `source-map-lab-${process.pid}`;
const cleanEnv = { ...process.env };
// This lab never authenticates or uploads. Do not pass inherited Sentry auth to CLI.
for (const key of Object.keys(cleanEnv)) {
  if (key.startsWith('SENTRY_')) delete cleanEnv[key];
}
async function nodeCommand(script, args = [], env = cleanEnv) {
  const result = await runFile(process.execPath, [resolve(root, script), ...args], {
    cwd: root, env, timeout: 90_000, maxBuffer: 2 * 1024 * 1024,
  });
  return result.stdout;
}
async function browser(...args) {
  const output = await nodeCommand(relative(root, cliPath), ['--session', session, ...args]);
  if (/^### Error/m.test(output)) throw new Error(output);
  return output;
}
let checks = 0;
function check(label, fn) {
  fn();
  checks++;
  console.log(`PASS ${label}`);
}
async function build(label) {
  await nodeCommand('node_modules/vite/bin/vite.js', ['build', '--outDir', `dist-${label}`], {
    ...cleanEnv, VITE_LAB_BUILD: label,
  });
  await nodeCommand('node_modules/@sentry/cli/bin/sentry-cli', ['sourcemaps', 'inject', `dist-${label}`]);
  const assetRoot = resolve(root, `dist-${label}/assets`);
  const jsName = (await readdir(assetRoot)).find(name => name.endsWith('.js'));
  assert.ok(jsName, 'Vite must produce JavaScript');
  const js = await readFile(resolve(assetRoot, jsName), 'utf8');
  const map = JSON.parse(await readFile(resolve(assetRoot, `${jsName}.map`), 'utf8'));
  const debugId = map.debugId ?? map.debug_id;
  check(`${label}: JS and map share injected Debug ID`, () => {
    assert.match(debugId, /^[0-9a-f-]{36}$/i);
    assert.ok(js.includes(debugId));
  });
  check(`${label}: hidden map has no sourceMappingURL in JS`, () => {
    assert.equal(js.includes('sourceMappingURL='), false);
  });
  return { label, jsName, js, map, debugId };
}

function requireMatchingMap(image, artifact) {
  if (!artifact) throw new Error('MAP_NOT_FOUND');
  if ((artifact.map.debugId ?? artifact.map.debug_id) !== image.debug_id) {
    throw new Error('DEBUG_ID_MISMATCH');
  }
  return new TraceMap(artifact.map);
}
// SDK stack columns are 1-based; source map generated columns are 0-based.
function mapFrame(frame, traceMap) {
  const position = originalPositionFor(traceMap, { line: frame.lineno, column: frame.colno - 1 });
  if (!position.source) throw new Error('ORIGINAL_POSITION_MISSING');
  return position;
}

await mkdir(resolve(root, '.verify'), { recursive: true });
await nodeCommand('node_modules/typescript/bin/tsc', ['--noEmit']);
console.log('PASS TypeScript type check');
const [a, b] = [await build('a'), await build('b')];
check('Different build content produces different Debug IDs', () => assert.notEqual(a.debugId, b.debugId));
const events = [];
const requests = [];
let notifyEvent;
const newEvent = new Promise(resolveEvent => { notifyEvent = resolveEvent; });
const distRoot = resolve(root, 'dist-a');
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    requests.push(path);
    if (request.method === 'POST' && path === '/api/1/envelope/') {
      const buffers = [];
      for await (const part of request) buffers.push(part);
      const lines = Buffer.concat(buffers).toString('utf8').split('\n');
      for (let i = 1; i < lines.length - 1; i += 2) {
        const item = JSON.parse(lines[i]);
        if (item.type === 'event') {
          const event = JSON.parse(lines[i + 1]);
          events.push(event);
          notifyEvent(event);
        }
      }
      response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
      return;
    }
    if (path.endsWith('.map')) {
      response.writeHead(404).end('Source maps are not publicly served in this lab');
      return;
    }
    const file = resolve(distRoot, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(distRoot + '/') && !file.startsWith(distRoot + '\\')) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': file.endsWith('.html') ? 'text/html' : 'text/javascript',
      'Cache-Control': 'no-store',
    }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const base = `http://127.0.0.1:${server.address().port}`;
let eventTimeout;
let browserVersion;
try {
  const configPath = resolve(root, '.verify/cli.config.json');
  await writeFile(configPath, JSON.stringify({ browser: {
    browserName: 'chromium', isolated: true, launchOptions: { headless: true, channel: 'chromium' },
  } }));
  await browser('open', base, '--config', configPath);
  const snapshotOutput = await browser('snapshot');
  const snapshotPath = snapshotOutput.match(/\[Snapshot\]\(([^)]+)\)/)?.[1];
  const inlineSnapshot = snapshotOutput.match(/```yaml\r?\n([\s\S]*?)```/)?.[1];
  const snapshot = inlineSnapshot ?? (snapshotPath && await readFile(resolve(root, snapshotPath), 'utf8'));
  assert.ok(snapshot, `CLI snapshot missing: ${snapshotOutput}`);
  const triggerRef = snapshot.match(/button "Trigger known error" \[ref=(e\d+)\]/)?.[1];
  assert.ok(triggerRef, `Button reference missing: ${snapshot}`);
  await browser('click', triggerRef);
  const event = await Promise.race([
    newEvent,
    new Promise((_, reject) => { eventTimeout = setTimeout(() => reject(new Error('SDK event timed out')), 15_000); }),
  ]);
  clearTimeout(eventTimeout);
  const versionOutput = await browser('run-code', 'async (page) => page.context().browser().version()');
  browserVersion = versionOutput.match(/\d+\.\d+\.\d+\.\d+/)?.[0];
  assert.ok(browserVersion, `Browser version must be reported by actual running browser: ${versionOutput}`);
  const exception = event.exception.values.find(value => value.value === 'source-map-lab-a');
  check('Browser SDK captures the known uncaught exception', () => assert.ok(exception));
  const frame = exception.stacktrace.frames.find(value => value.filename?.includes(a.jsName));
  check('Captured stack points to deployed build A with line and column', () => {
    assert.ok(frame);
    assert.ok(frame.lineno > 0 && frame.colno > 0);
  });
  const image = event.debug_meta?.images?.find(value => value.code_file === frame.filename);
  check('Event debug_meta links frame filename to build A Debug ID', () => {
    assert.ok(image);
    assert.equal(image.type, 'sourcemap');
    assert.equal(image.debug_id, a.debugId);
  });
  const traceMap = requireMatchingMap(image, a);
  const original = mapFrame(frame, traceMap);
  const source = await readFile(resolve(root, 'src/main.ts'), 'utf8');
  const sourceLines = source.split('\n');
  const expectedLine = sourceLines.findIndex(line => line.includes('throw new Error')) + 1;
  const expectedColumn = sourceLines[expectedLine - 1].indexOf('Error(');
  check('Correct artifact maps to src/main.ts at exact Error constructor line and column', () => {
    assert.match(original.source, /src\/main\.ts$/);
    assert.equal(original.line, expectedLine);
    assert.equal(original.column, expectedColumn);
  });
  check('Map embeds the original TypeScript source (platform newlines normalized)', () => {
    assert.equal(sourceContentFor(traceMap, original.source).replace(/\r\n/g, '\n'), source.replace(/\r\n/g, '\n'));
  });
  check('Expected failure: missing map is explicitly rejected', () => {
    assert.throws(() => requireMatchingMap(image, null), /MAP_NOT_FOUND/);
  });
  check('Expected failure: map from build B is rejected by Debug ID', () => {
    assert.throws(() => requireMatchingMap(image, b), /DEBUG_ID_MISMATCH/);
  });
  const noSourcesMap = { ...a.map };
  delete noSourcesMap.sourcesContent;
  const traceNoSources = requireMatchingMap(image, { map: noSourcesMap });
  check('Missing sourcesContent still preserves original file/line/column', () => {
    assert.deepEqual(mapFrame(frame, traceNoSources), original);
  });
  check('Missing sourcesContent cannot supply source code context locally', () => {
    assert.equal(sourceContentFor(traceNoSources, original.source, true), null);
  });
  const servedJs = await (await fetch(`${base}/assets/${a.jsName}`)).text();
  check('Deployed JS is byte-identical to injected build artifact', () => assert.equal(servedJs, a.js));
  const mapResponse = await fetch(`${base}/assets/${a.jsName}.map`);
  check('Map is not public on the static server', () => assert.equal(mapResponse.status, 404));
  const report = {
    node: process.version,
    checks,
    browserVersion,
    mapDebugIdField: a.map.debugId ? 'debugId' : 'debug_id',
    buildA: { file: a.jsName, debugId: a.debugId },
    buildB: { file: b.jsName, debugId: b.debugId },
    eventId: event.event_id,
    generated: { file: frame.filename, line: frame.lineno, columnOneBased: frame.colno },
    original: { file: original.source, line: original.line, columnZeroBased: original.column },
    requests,
    scope: 'Local browser SDK event + local source map decoding. No Sentry cloud upload or symbolication.',
  };
  await writeFile(resolve(root, '.verify/report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Verification passed: ${checks} assertions + TypeScript type check.`);
} finally {
  clearTimeout(eventTimeout);
  await browser('close').catch(() => {});
  await new Promise(resolveClose => server.close(resolveClose));
}
