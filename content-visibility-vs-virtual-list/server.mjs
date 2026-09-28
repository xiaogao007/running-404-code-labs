import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const routes={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
export function createLabServer(){return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;const file=routes[path];
  if(!file){res.writeHead(404);res.end('Not found');return;}
  try{res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(new URL(file,import.meta.url)));}catch{res.writeHead(500);res.end('Read failed');}
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){const server=createLabServer();server.listen(4179,'127.0.0.1',()=>console.log('http://127.0.0.1:4179'));}
