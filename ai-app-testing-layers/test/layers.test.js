import test from 'node:test';
import assert from 'node:assert/strict';
import { streamText, generateText, simulateReadableStream } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { ChatController } from '../src/controller.js';
import { lookupOrder, outputSchema, makeTools } from '../src/orders.js';
import { grade, cases } from '../src/evaluation.js';

const usage = { inputTokens: { total: 1 }, outputTokens: { total: 1 } };
function mockedStream(parts) {
  return streamText({ model: new MockLanguageModelV3({ doStream: async () => ({ stream: simulateReadableStream({
    initialDelayInMs: null, chunkDelayInMs: null,
    chunks: [ { type: 'stream-start', warnings: [] }, { type: 'text-start', id: 'x' },
      ...parts.map(delta => ({ type: 'text-delta', id: 'x', delta })),
      { type: 'text-end', id: 'x' }, { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage } ],
  }) }) }), prompt: 'test', maxRetries: 0 }).fullStream;
}
test('SDK mock chunks become one completed presentation result', async () => {
  const c = new ChatController(); await c.run(mockedStream(['订单', '金额', '120元']));
  assert.deepEqual(c.state, { status: 'done', text: '订单金额120元', error: null });
});
test('empty model text ends waiting', async () => {
  const c = new ChatController(); await c.run(mockedStream([])); assert.equal(c.state.status, 'empty');
});
test('slow first chunk stays waiting until explicitly released', async () => {
  let release; const gate = new Promise(r => { release = r; });
  const c = new ChatController();
  const pending = c.run((async function* () { await gate; yield { type: 'text-delta', text: 'ok' }; })());
  assert.equal(c.state.status, 'waiting'); release(); await pending; assert.equal(c.state.status, 'done');
});
test('late old response cannot overwrite a new session', async () => {
  let release; const gate = new Promise(r => { release = r; });
  const c = new ChatController();
  const old = c.run((async function* () { await gate; yield { type: 'text-delta', text: 'OLD' }; })());
  c.switchSession(); await c.run(mockedStream(['NEW'])); release(); await old;
  assert.equal(c.state.text, 'NEW'); assert.equal(c.state.status, 'done');
});
test('tool error exits waiting and does not claim success', async () => {
  const c = new ChatController();
  await c.run((async function* () { yield { type: 'tool-error', error: new Error('private details') }; })());
  assert.deepEqual(c.state, { status: 'error', text: '', error: 'Request failed' });
});
test('late old exception cannot overwrite new success', async () => {
  let release; const gate = new Promise(r => { release = r; }); const c = new ChatController();
  const old = c.run((async function* () { await gate; throw new Error('old'); })());
  await c.run(mockedStream(['NEW'])); release(); await old; assert.equal(c.state.status, 'done');
});
test('valid tool result has cents and no tenant field', () => {
  assert.deepEqual(lookupOrder({ orderId: 'ORD-001' }, 'alpha'), { status: 'ok', orderId: 'ORD-001', amountCents: 12000 });
});
test('invalid parameter fails before lookup', () => assert.throws(() => lookupOrder({ orderId: '1' }, 'alpha')));
test('model cannot inject a tenant argument', () => assert.throws(() => lookupOrder({ orderId: 'ORD-002', tenant: 'beta' }, 'alpha')));
test('cross-tenant and absent records have the same public result', () => {
  assert.deepEqual(lookupOrder({ orderId: 'ORD-002' }, 'alpha'), { status: 'not_found' });
  assert.deepEqual(lookupOrder({ orderId: 'ORD-999' }, 'alpha'), { status: 'not_found' });
});
test('missing authenticated tenant rejects', () => assert.throws(() => lookupOrder({ orderId: 'ORD-001' }, '')));
test('unavailable is distinct from empty lookup', () => assert.deepEqual(lookupOrder({ orderId: 'ORD-001' }, 'alpha', { fail: true }), { status: 'unavailable' }));
test('malformed output is rejected', () => assert.equal(outputSchema.safeParse({ status: 'ok', orderId: 'ORD-001', amountCents: -1 }).success, false));
test('SDK executes mocked tool call through real tool boundary', async () => {
  const trace = [];
  const result = await generateText({
    model: new MockLanguageModelV3({ doGenerate: async () => ({
      content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'lookupOrder', input: '{"orderId":"ORD-001"}' }],
      finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage, warnings: [],
    }) }), tools: makeTools('alpha', {}, trace), prompt: 'test', maxRetries: 0,
  });
  assert.equal(result.toolResults.length, 1); assert.equal(trace[0].output.amountCents, 12000);
});
test('grader rejects correct-looking answer without a tool trace', () => {
  assert.equal(grade(cases[0], '{"status":"ok","orderId":"ORD-001","amountCents":12000}', []).passed, false);
});
test('grader accepts grounded exact facts and rejects wrong amount', () => {
  const trace = [{ input: { orderId: 'ORD-001' }, output: { status: 'ok' } }];
  assert.equal(grade(cases[0], '{"status":"ok","orderId":"ORD-001","amountCents":12000}', trace).passed, true);
  assert.equal(grade(cases[0], '{"status":"ok","orderId":"ORD-001","amountCents":1}', trace).passed, false);
});
