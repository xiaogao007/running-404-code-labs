import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

const server = new McpServer({ name: "Feature Flag Approval", version: "0.1.0" });
const resourceUri = "ui://update-feature-flag/mcp-app.html";
const updateInput = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  requestId: z.string().min(1),
  idempotencyKey: z.string().min(1),
});

registerAppTool(server, "update-feature-flag", {
  title: "Request feature flag change",
  description: "Requests a simulated change; the host must obtain user confirmation.",
  inputSchema: updateInput,
  _meta: { ui: { resourceUri } },
}, async (input) => {
  const parsed = updateInput.parse(input);
  if (parsed.requestId !== parsed.idempotencyKey) {
    return { isError: true, content: [{ type: "text", text: "requestId and idempotencyKey must match" }] };
  }
  return { content: [{ type: "text", text: `accepted ${parsed.key}=${parsed.enabled ? "on" : "off"}` }] };
});

registerAppResource(server, resourceUri, resourceUri, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
  contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: await fs.readFile(path.join(import.meta.dirname, "..", "dist", "mcp-app.html"), "utf8") }],
}));

const app = express();
app.use(express.json());
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => void transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3001, () => console.log("MCP server listening on http://localhost:3001/mcp"));
