import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function serve(port) {
  return createServer(async (req, res) => {
    const pathname = req.url === '/' ? '/index.html' : new URL(req.url, `http://localhost:${port}`).pathname;
    try {
      const body = await readFile(join(root, pathname.slice(1)));
      res.writeHead(200, { 'content-type': types[extname(pathname)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  }).listen(port, '127.0.0.1');
}

serve(4173);
serve(4174);
console.log('Parent: http://127.0.0.1:4173  Child: http://127.0.0.1:4174');
