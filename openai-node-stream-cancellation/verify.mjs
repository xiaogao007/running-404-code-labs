import assert from 'node:assert/strict';
import http from 'node:http';
import OpenAI from 'openai';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sseEvent(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

async function startFakeOpenAI() {
  const state = { requests: 0, closed: 0, completed: 0 };
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || !req.url?.endsWith('/responses')) {
      res.writeHead(404).end();
      return;
    }

    state.requests += 1;
    let closed = false;
    req.on('close', () => {
      if (!closed && !res.writableEnded) {
        closed = true;
        state.closed += 1;
      }
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const response = {
      id: `resp_${state.requests}`,
      object: 'response',
      created_at: Math.floor(Date.now() / 1000),
      status: 'in_progress',
      error: null,
      incomplete_details: null,
      instructions: null,
      max_output_tokens: null,
      metadata: {},
      model: 'local-test',
      output: [],
      parallel_tool_calls: true,
      temperature: 1,
      tool_choice: 'auto',
      tools: [],
      top_p: 1,
      truncation: 'disabled',
      usage: null,
    };
    res.write(sseEvent({
      type: 'response.created',
      response,
      sequence_number: 0,
    }));
    res.write(sseEvent({
      type: 'response.output_item.added',
      item: { id: 'msg_1', type: 'message', status: 'in_progress', role: 'assistant', content: [] },
      output_index: 0,
      sequence_number: 1,
    }));
    res.write(sseEvent({
      type: 'response.content_part.added',
      item_id: 'msg_1',
      output_index: 0,
      content_index: 0,
      part: { type: 'output_text', annotations: [], logprobs: [], text: '' },
      sequence_number: 2,
    }));

    for (let i = 1; i <= 8; i += 1) {
      await sleep(30);
      if (closed || res.destroyed) return;
      res.write(sseEvent({
        type: 'response.output_text.delta',
        delta: `chunk-${i} `,
        item_id: 'msg_1',
        output_index: 0,
        content_index: 0,
        sequence_number: i + 2,
      }));
    }

    if (!closed && !res.destroyed) {
      res.write(sseEvent({
        type: 'response.completed',
        response: { ...response, status: 'completed', output: [{ id: 'msg_1', type: 'message', status: 'completed', role: 'assistant', content: [{ type: 'output_text', annotations: [], logprobs: [], text: 'chunk-1 chunk-2 chunk-3 chunk-4 chunk-5 chunk-6 chunk-7 chunk-8 ' }] }] },
        sequence_number: 11,
      }));
      res.write('data: [DONE]\n\n');
      state.completed += 1;
      res.end();
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    state,
    url: `http://127.0.0.1:${port}/v1`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function main() {
  const fake = await startFakeOpenAI();
  const client = new OpenAI({ apiKey: 'local-test-key', baseURL: fake.url });

  try {
    const controller = new AbortController();
    const signalStream = await client.responses.create(
      { model: 'local-test', input: 'cancel me', stream: true },
      { signal: controller.signal },
    );
    let signalChunks = 0;
    const signalRun = (async () => {
      for await (const event of signalStream) {
        if (event.type === 'response.output_text.delta') signalChunks += 1;
        if (signalChunks === 2) controller.abort();
      }
    })();
    await signalRun;
    await sleep(60);
    assert.equal(signalChunks, 2, 'AbortSignal should stop consuming after two chunks');

    const breakStream = await client.responses.create(
      { model: 'local-test', input: 'break me', stream: true },
    );
    let breakChunks = 0;
    for await (const event of breakStream) {
      if (event.type === 'response.output_text.delta') {
        breakChunks += 1;
        break;
      }
    }
    await sleep(60);
    assert.equal(breakChunks, 1, 'breaking iteration should stop after one chunk');

    const helper = client.responses.stream({ model: 'local-test', input: 'abort helper' });
    const helperRun = (async () => {
      for await (const event of helper) {
        if (event.type === 'response.output_text.delta') {
          helper.abort();
          break;
        }
      }
    })();
    await helperRun;
    await sleep(60);

    assert.equal(fake.state.requests, 3);
    assert.equal(fake.state.completed, 0, 'all three runs should be interrupted before completion');
    assert.equal(fake.state.closed, 3, 'each cancellation should close the HTTP response');
    console.log(JSON.stringify({ ...fake.state, signalChunks, breakChunks }, null, 2));
  } finally {
    await fake.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
