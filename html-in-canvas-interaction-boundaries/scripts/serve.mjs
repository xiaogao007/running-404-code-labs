import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function createLabServer() {
  return createServer(async(request,response)=>{
    try {
      const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
      const file=resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
      const rel=relative(root,file);
      if(rel.startsWith('..')||isAbsolute(rel)){response.writeHead(403).end();return;}
      const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
      const body=await readFile(file);
      response.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
      response.end(body);
    }catch{response.writeHead(404).end();}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const server=createLabServer();
  server.listen(0,'127.0.0.1',()=>console.log(`Canvas interaction lab: http://127.0.0.1:${server.address().port}`));
}
