import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const dist = join(process.cwd(), "dist");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function serveFile(request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(requestedPath).replace(/^([.][.][\\/])+/, "");

  try {
    const file = await readFile(join(dist, safePath));
    response.writeHead(200, { "content-type": contentTypes[extname(safePath)] ?? "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

for (const port of [4174, 4175, 4176]) {
  createServer(serveFile).listen(port, "127.0.0.1");
}
