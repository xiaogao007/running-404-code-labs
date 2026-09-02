import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(root, "dist", "mcp-app.html"), "utf8");
const server = fs.readFileSync(path.join(root, "src", "server.mts"), "utf8");
const ui = fs.readFileSync(path.join(root, "src", "mcp-app.tsx"), "utf8");

assert.match(html, /Feature Flag Approval/);
assert.match(server, /ui:\s*\{\s*resourceUri\s*\}/);
assert.match(server, /requestId and idempotencyKey must match/);
assert.match(ui, /app\.callServerTool/);
assert.match(ui, /app\.ontoolresult/);
assert.match(ui, /idempotencyKey/);

console.log("verify: bundled MCP App, tool/resource metadata, request correlation, and idempotency guard passed.");
