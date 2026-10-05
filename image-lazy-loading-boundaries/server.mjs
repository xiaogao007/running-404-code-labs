import http from "node:http";
import { deflateSync } from "node:zlib";
import { pathToFileURL } from "node:url";
const crc = (b) => {
  let c = 0xffffffff;
  for (const x of b) {
    c ^= x;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const t = Buffer.from(type),
    n = Buffer.alloc(4),
    c = Buffer.alloc(4);
  n.writeUInt32BE(data.length);
  c.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([n, t, data, c]);
};
function png(w, h) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w);
  header.writeUInt32BE(h, 4);
  header[8] = 8;
  header[9] = 3;
  const palette = Buffer.alloc(768);
  for (let i = 0; i < 256; i++) {
    palette[i * 3] = i;
    palette[i * 3 + 1] = (i * 7) % 256;
    palette[i * 3 + 2] = (i * 13) % 256;
  }
  const raw = Buffer.alloc((w + 1) * h);
  let seed = 12345;
  for (let y = 0; y < h; y++)
    for (let x = 1; x <= w; x++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      raw[y * (w + 1) + x] = seed & 255;
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("PLTE", palette),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const hero = png(1000, 320),
  card = png(480, 240);
export const assetSizes = { hero: hero.length, card: card.length };
const css = `*{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#18252b;font:16px system-ui}header,main{max-width:1040px;margin:auto}header{height:80px;display:flex;align-items:center;gap:20px}a{color:#156455}h1{font-size:20px}.hero{width:100%;height:auto;display:block}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px}.card{background:white;border:1px solid #ccc;padding:10px}.card img{width:100%;height:auto;display:block}.card p{margin:12px 0}footer{height:100px}@media(max-width:700px){.grid{grid-template-columns:1fr}}`;
export function createLabServer() {
  return http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    res.setHeader("Cache-Control", "no-store");
    if (u.pathname === "/style.css") {
      setTimeout(
        () => {
          res.setHeader("Content-Type", "text/css");
          res.end(css);
        },
        Math.min(2000, Math.max(0, Number(u.searchParams.get("delay")) || 0)),
      );
      return;
    }
    if (u.pathname.startsWith("/img/")) {
      res.setHeader("Content-Type", "image/png");
      res.end(u.pathname === "/img/hero.png" ? hero : card);
      return;
    }
    if (u.pathname !== "/") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const mode = ["eager", "lazy", "mixed"].includes(u.searchParams.get("mode"))
      ? u.searchParams.get("mode")
      : "mixed";
    const loading = (i) =>
      mode === "eager" || (mode === "mixed" && i < 6) ? "eager" : "lazy";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>图片加载边界实验</title><script>window.lab={lcp:[],shifts:[]};new PerformanceObserver(l=>lab.lcp.push(...l.getEntries().map(e=>({time:e.startTime,id:e.element?.id,url:e.url,size:e.size})))).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>lab.shifts.push(...l.getEntries().filter(e=>!e.hadRecentInput).map(e=>e.value))).observe({type:'layout-shift',buffered:true});</script><link rel="stylesheet" href="/style.css?delay=${Number(u.searchParams.get("cssDelay")) || 0}"></head><body><header><h1>图片加载边界实验</h1><a href="/?mode=eager">全部正常</a><a href="/?mode=lazy">全部懒加载</a><a href="/?mode=mixed">混合策略</a></header><main><img id="hero" class="hero" src="/img/hero.png" width="1000" height="320" loading="${loading(-1)}" fetchpriority="auto" alt="确定性合成主视觉"><section class="grid">${Array.from({ length: 60 }, (_, i) => `<article class="card"><img id="p${i}" src="/img/${i}.png" width="480" height="240" loading="${loading(i)}" fetchpriority="auto" alt="测试商品 ${i + 1}"><p>商品 ${i + 1} · 合成测试素材</p></article>`).join("")}</section></main><footer></footer></body></html>`,
    );
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  createLabServer().listen(4173, "127.0.0.1", () =>
    console.log("http://127.0.0.1:4173"),
  );
}
