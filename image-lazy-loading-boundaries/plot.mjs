import {readFile, writeFile} from 'node:fs/promises';
// A resource-timing diagram of one actual round, not a synthetic median waterfall.
const report=JSON.parse(await readFile(new URL('./reports/benchmark.json',import.meta.url),'utf8'));
const modes=['eager','lazy','mixed'],labels={eager:'全部正常加载',lazy:'全部懒加载',mixed:'混合策略'};
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="680" viewBox="0 0 1200 680"><rect width="1200" height="680" fill="#f6f4ee"/><g font-family="Microsoft YaHei, sans-serif" fill="#182b31"><text x="48" y="56" font-size="28" font-weight="bold">主视觉图加载时间线：样式表额外延迟 600ms</text><text x="48" y="92" font-size="16">第 1 轮原始样本 · 横轴为导航后的毫秒数 · 色条包含排队、等待与下载</text>';
const x=t=>210+t/5000*900;
for(let t=0;t<=5000;t+=1000)svg+=`<path d="M${x(t)} 130V530" stroke="#d7dedb"/><text x="${x(t)}" y="560" font-size="15" text-anchor="middle">${t} ms</text>`;
for(let i=0;i<3;i++){const r=report.samples.find(s=>s.mode===modes[i]&&s.cssDelay===600&&s.round===0),h=r.resources.find(s=>s.url==='/img/hero.png'),y=185+i*135;svg+=`<text x="48" y="${y+24}" font-size="20">${labels[r.mode]}</text><rect x="${x(h.start)}" y="${y}" width="${x(h.end)-x(h.start)}" height="38" rx="5" fill="${i===1?'#c47444':'#267b71'}"/><path d="M${x(r.lcpMs)} ${y-12}v65" stroke="#182b31" stroke-width="3"/><text x="${x(h.start)}" y="${y-22}" font-size="15">开始 ${Math.round(h.start)} ms</text><text x="${x(r.lcpMs)}" y="${y+81}" font-size="15" text-anchor="middle">LCP ${Math.round(r.lcpMs)} ms</text>`;}
svg+='<text x="48" y="616" font-size="16">黑线：LCP；色条终点：图片响应结束。三轮中位数另见报告，不能从单轮推断线上收益。</text><text x="48" y="650" font-size="14">Chromium 151 · 1280×900 · 冷缓存 · 512000 B/s · 模拟延迟 80ms</text></g></svg>';
await writeFile(new URL('./reports/hero-timeline.svg',import.meta.url),svg);
