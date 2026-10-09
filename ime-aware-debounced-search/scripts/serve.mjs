import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
server.listen(0, '127.0.0.1', () => {
  console.log(`Manual page with native 300 ms timers: http://127.0.0.1:${server.address().port}/?clock=real`);
});
