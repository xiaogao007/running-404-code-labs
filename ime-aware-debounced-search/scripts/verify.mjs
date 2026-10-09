import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runModuleChecks } from './module-checks.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const session = `ime-debounce-${process.pid}`;
const cli = resolve(root, 'node_modules/@playwright/cli/playwright-cli.js');
const results = [];
const moduleAssertions = runModuleChecks();
await mkdir(resolve(root, '.verify'), { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) {
      response.writeHead(403).end(); return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html' : 'text/javascript' }).end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const base = `http://127.0.0.1:${server.address().port}`;
async function browser(...args) {
  const result = await run(process.execPath, [cli, '--session', session, ...args], {
    cwd: root, timeout: 90_000, maxBuffer: 2 * 1024 * 1024,
  });
  if (/^### Error/m.test(result.stdout)) throw new Error(result.stdout);
  return result.stdout;
}
async function evaluate(fn) {
  const output = await browser('eval', `(${fn.toString()})()`);
  const json = output.match(/### Result\r?\n([\s\S]*?)\r?\n### Ran/)[1];
  return JSON.parse(json);
}
function check(label, actual, expected = true) {
  assert.deepEqual(actual, expected);
  results.push(label);
  console.log(`PASS browser: ${label}`);
}

try {
  const config = resolve(root, '.verify/cli.config.json');
  await writeFile(config, JSON.stringify({ browser: {
    browserName: 'chromium', isolated: true, launchOptions: { headless: true, channel: 'chromium' },
  } }));
  await browser('open', base, '--config', config);
  const snapshot = await browser('snapshot');
  const inputRef = snapshot.match(/textbox "Search" \[ref=(e\d+)\]/)?.[1];
  assert.ok(inputRef, `Input reference missing from fresh snapshot: ${snapshot}`);
  await browser('click', inputRef);
  await browser('type', 'abc');
  const ordinary = await evaluate(() => {
    window.lab.clock.tick(300);
    return { value: window.lab.input.value, logs: window.lab.logs.fixed,
      trusted: window.lab.provenance.filter(event => event.type === 'input').every(event => event.isTrusted) };
  });
  check('Playwright keyboard enters ordinary Latin text', ordinary.value, 'abc');
  check('ordinary trusted input debounces to one search', ordinary.logs, ['abc']);
  check('ordinary keyboard input events have isTrusted=true', ordinary.trusted);
  await browser('press', 'Enter');
  const ordinaryEnter = await evaluate(() => ({
    submitted: window.lab.submits.filter(item => item.mode === 'fixed').map(item => item.value),
    trusted: window.lab.provenance.filter(event => event.type === 'keydown').at(-1)?.isTrusted,
  }));
  check('ordinary keyboard Enter calls the DOM submit handler once', ordinaryEnter.submitted, ['abc']);
  check('ordinary keyboard Enter is a trusted event', ordinaryEnter.trusted);

  // All events below are explicitly synthetic; they do not invoke a real OS IME.
  const synthetic = await evaluate(() => {
    const { input, clock, logs, controllers, submits, provenance } = window.lab;
    submits.length = 0;
    const checks = [];
    const same = (label, actual, expected) => checks.push({ label, actual: structuredClone(actual), expected });
    const emitInput = (value, inputType, isComposing) => {
      input.value = value;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType, isComposing }));
    };
    const start = () => input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    const end = data => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data }));

    emitInput('old', 'insertText', false); clock.tick(100); start();
    emitInput('oldzhong', 'insertCompositionText', true); clock.tick(600);
    same('synthetic long pause: naive searches the composing DOM value', logs.naive, ['abc', 'oldzhong']);
    same('synthetic start: gate-only leaks its older queued timer', logs['gate-only'], ['abc', 'old']);
    same('synthetic start: fixed cancels the older queued timer', logs.fixed, ['abc']);
    same('composition still changes the DOM value', input.value, 'oldzhong');
    same('fixed state observes composing text without searching', controllers.fixed.state.currentValue, 'oldzhong');
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', isComposing: true }));
    same('synthetic composing Enter produces no submit', submits, []);
    input.value = 'old中'; end('中'); clock.tick(300);
    same('compositionend uses full input.value rather than fragment event.data', logs.fixed, ['abc', 'old中']);

    start(); emitInput('beijing', 'insertCompositionText', true);
    emitInput('北京', 'insertText', false); end('北京'); clock.tick(300);
    same('tested final-input-before-end permutation searches once', logs.fixed, ['abc', 'old中', '北京']);
    start(); emitInput('shanghai', 'insertCompositionText', true);
    input.value = '上海'; end('上海'); emitInput('上海', 'insertText', false); clock.tick(300);
    same('tested final-input-after-end permutation searches once', logs.fixed, ['abc', 'old中', '北京', '上海']);

    start(); emitInput('上海pin', 'insertCompositionText', true); input.value = '上海'; end(''); clock.tick(300);
    same('cancel-like empty data with restored DOM value does not search empty string', logs.fixed, ['abc', 'old中', '北京', '上海']);
    emitInput('粘贴内容', 'insertFromPaste', false); clock.tick(300);
    same('synthetic paste input follows ordinary debounce', logs.fixed, ['abc', 'old中', '北京', '上海', '粘贴内容']);
    emitInput('clear-me', 'insertText', false); emitInput('', 'deleteContentBackward', false); clock.tick(300);
    same('clearing DOM input cancels a pending task', logs.fixed, ['abc', 'old中', '北京', '上海', '粘贴内容']);
    emitInput('destroy-me', 'insertText', false); controllers.fixed.destroy(); clock.tick(300);
    same('destroy cancels pending browser-controller work', logs.fixed, ['abc', 'old中', '北京', '上海', '粘贴内容']);
    same('composition events are marked untrusted', provenance.filter(event => event.type.startsWith('composition')).every(event => event.isTrusted === false), true);
    same('paste InputEvent is marked untrusted', provenance.find(event => event.inputType === 'insertFromPaste')?.isTrusted, false);
    return { checks, provenance };
  });
  for (const item of synthetic.checks) check(item.label, item.actual, item.expected);
  const version = (await browser('run-code', 'async (page) => page.context().browser().version()')).match(/\d+\.\d+\.\d+\.\d+/)?.[0];
  const report = { node: process.version, chromium: version, moduleAssertions,
    browserAssertions: results.length, totalAssertions: moduleAssertions + results.length,
    browserChecks: results, eventProvenance: synthetic.provenance,
    scope: 'Actual Chromium DOM and ordinary keyboard; composition and paste events are synthetic; fake clock; no OS IME or live search backend.' };
  await writeFile(resolve(root, '.verify/report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, eventProvenance: `${synthetic.provenance.length} events; see .verify/report.json` }, null, 2));
  console.log(`Verification passed: ${report.totalAssertions} assertions (${moduleAssertions} module + ${results.length} browser).`);
} finally {
  await browser('close').catch(() => {});
  await new Promise(resolveClose => server.close(resolveClose));
}
