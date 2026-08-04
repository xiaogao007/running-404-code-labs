import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, beforeEach, test } from "node:test";

import { MemoryClient } from "@tencentdb-agent-memory/memory-sdk-ts-v2/v3";

const requests = [];
const server = createServer(async (request, response) => {
  let rawBody = "";
  for await (const chunk of request) rawBody += chunk;

  requests.push({
    method: request.method,
    path: request.url,
    headers: request.headers,
    body: JSON.parse(rawBody),
  });

  response.writeHead(200, {
    "content-type": "application/json",
    "x-trace-id": `trace-${requests.length}`,
  });
  response.end(JSON.stringify({
    code: 0,
    message: "ok",
    data: { accepted_ids: ["msg-1"], items: [], total: 0 },
  }));
});

let endpoint;

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  endpoint = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.close();
  await once(server, "close");
});

beforeEach(() => {
  requests.length = 0;
});

test("constructor rejects missing strict-isolation fields", () => {
  const base = {
    endpoint: "http://127.0.0.1:8420",
    apiKey: "lab-api-key",
    serviceId: "lab-service",
    teamId: "team-1",
    agentId: "agent-1",
    userId: "user-1",
  };

  for (const field of ["teamId", "agentId", "userId"]) {
    assert.throws(
      () => new MemoryClient({ ...base, [field]: "" }),
      new RegExp(`requires non-empty ${field}`),
    );
  }
});

test("published beta.2 still sends session-less writes and untargeted deletes", async () => {
  const client = new MemoryClient({
    endpoint,
    apiKey: "lab-api-key",
    serviceId: "lab-service",
    teamId: "team-1",
    agentId: "agent-1",
    userId: "user-1",
  });

  await client.addConversation({ messages: [{ role: "user", content: "hello" }] });
  await client.deleteConversation();

  assert.deepEqual(requests.map(({ path }) => path), [
    "/v3/conversation/add",
    "/v3/conversation/delete",
  ]);
  assert.equal("session_id" in requests[0].body, false);
  assert.equal("session_id" in requests[1].body, false);
  assert.equal("message_ids" in requests[1].body, false);
});

test("v3 calls carry isolation fields, paths, and gateway headers", async () => {
  const client = new MemoryClient({
    endpoint,
    apiKey: "lab-api-key",
    serviceId: "lab-service",
    teamId: "team-1",
    agentId: "agent-1",
    userId: "user-1",
    sessionId: "session-1",
    taskId: "task-1",
  });

  const added = await client.addConversation({
    messages: [{ role: "user", content: "Remember the release checklist" }],
  });
  assert.deepEqual(added.accepted_ids, ["msg-1"]);
  assert.equal(added.trace_id, "trace-1");

  await client.withIsolation({ sessionId: null }).queryConversation({ limit: 10 });
  await client.searchAtomic({ query: "release checklist", limit: 5 });

  assert.equal(requests.length, 3);
  assert.deepEqual(requests.map(({ method, path }) => ({ method, path })), [
    { method: "POST", path: "/v3/conversation/add" },
    { method: "POST", path: "/v3/conversation/query" },
    { method: "POST", path: "/v3/atomic/search" },
  ]);

  for (const request of requests) {
    assert.equal(request.headers.authorization, "Bearer lab-api-key");
    assert.equal(request.headers["x-tdai-service-id"], "lab-service");
    assert.equal(request.headers["content-type"], "application/json");
    assert.equal(request.body.team_id, "team-1");
    assert.equal(request.body.agent_id, "agent-1");
    assert.equal(request.body.user_id, "user-1");
    assert.equal(request.body.task_id, "task-1");
  }

  assert.equal(requests[0].body.session_id, "session-1");
  assert.equal("session_id" in requests[1].body, false);
  assert.equal(requests[2].body.session_id, "session-1");
  assert.equal(requests[2].body.query, "release checklist");
});
