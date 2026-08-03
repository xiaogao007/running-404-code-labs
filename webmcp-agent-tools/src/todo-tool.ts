export interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

export interface TodoStore {
  add(text: string): TodoItem;
  list(): readonly TodoItem[];
}

export interface AddTodoInput extends Record<string, unknown> {
  text: string;
}

export type AddTodoTool = Omit<WebMCP.ModelContextTool, "execute"> & {
  execute: WebMCP.ToolExecuteCallback<AddTodoInput>;
};

export function createMemoryTodoStore(): TodoStore {
  const items: TodoItem[] = [];

  return {
    add(text) {
      const item = { id: items.length + 1, text, done: false };
      items.push(item);
      return item;
    },
    list() {
      return items;
    },
  };
}

export function createAddTodoTool(store: TodoStore): AddTodoTool {
  return {
    name: "add_todo",
    title: "Add a to-do item",
    description: "Adds one item to the to-do list visible in the current page.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          minLength: 1,
          maxLength: 120,
          description: "The to-do text to add.",
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    async execute(input) {
      const text = readTodoText(input);
      const item = store.add(text);
      return { ok: true, item };
    },
  };
}

export async function registerTodoTool(
  targetDocument: Document,
  store: TodoStore,
): Promise<"registered" | "unsupported"> {
  const modelContext = targetDocument.modelContext;
  if (!modelContext) {
    return "unsupported";
  }

  await modelContext.registerTool(createAddTodoTool(store));
  return "registered";
}

function readTodoText(input: AddTodoInput): string {
  if (!("text" in input) || typeof input.text !== "string") {
    throw new TypeError("text must be a string");
  }

  const text = input.text.trim();
  if (text.length === 0 || text.length > 120) {
    throw new RangeError("text must contain between 1 and 120 characters");
  }

  return text;
}
