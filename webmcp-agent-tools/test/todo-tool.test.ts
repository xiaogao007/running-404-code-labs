import assert from "node:assert/strict";
import test from "node:test";

import {
  type AddTodoTool,
  createAddTodoTool,
  createMemoryTodoStore,
  registerTodoTool,
} from "../src/todo-tool.js";

test("registers a standards-shaped WebMCP tool", async () => {
  const tools: AddTodoTool[] = [];
  const targetDocument = {
    modelContext: {
      async registerTool(tool: WebMCP.ModelContextTool) {
        tools.push(tool as AddTodoTool);
      },
    },
  } as unknown as Document;

  const status = await registerTodoTool(
    targetDocument,
    createMemoryTodoStore(),
  );

  assert.equal(status, "registered");
  assert.equal(tools.length, 1);
  assert.equal(tools[0]?.name, "add_todo");
  assert.deepEqual(tools[0]?.annotations, {
    readOnlyHint: false,
    untrustedContentHint: false,
  });
});

test("executes the tool and changes page-owned state", async () => {
  const store = createMemoryTodoStore();
  const tool = createAddTodoTool(store);

  const result = await tool.execute({ text: "  review WebMCP permissions  " });

  assert.deepEqual(result, {
    ok: true,
    item: {
      id: 1,
      text: "review WebMCP permissions",
      done: false,
    },
  });
  assert.equal(store.list().length, 1);
});

test("rejects invalid tool input before changing state", async () => {
  const store = createMemoryTodoStore();
  const tool = createAddTodoTool(store);

  await assert.rejects(
    async () => {
      await tool.execute({ text: "   " });
    },
    { name: "RangeError" },
  );
  assert.equal(store.list().length, 0);
});

test("falls back cleanly when the browser API is unavailable", async () => {
  const status = await registerTodoTool(
    {} as Document,
    createMemoryTodoStore(),
  );

  assert.equal(status, "unsupported");
});
