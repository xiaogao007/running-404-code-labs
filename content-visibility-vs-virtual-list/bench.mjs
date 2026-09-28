import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import os from 'node:os';
import { createLabServer } from './server.mjs';
const server=createLabServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
const modes=['normal','cv','virtual'];const samples=[];const probes=[];
const metric=async cdp=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
try{
 for(let round=-1;round<5;round++){
  const order=round<0?modes:[...modes.slice(round%3),...modes.slice(0,round%3)];
  for(const mode of order){
   const page=await browser.newPage({viewport:{width:1280,height:900},locale:'zh-CN'});const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
   await page.goto(`${origin}/?mode=${mode}`);await page.waitForFunction(()=>window.lab?.ready);
   const initial=await metric(cdp);
   const data=await page.evaluate(()=>({elements:document.querySelectorAll('*').length,cards:document.querySelectorAll('.card').length,created:lab.created,mountJS:performance.getEntriesByName('mount-js')[0].duration,documentHeight:document.documentElement.scrollHeight}));
   // Fixed scroll workload: 120 frames, 240 CSS pixels per frame. Not an FPS benchmark.
   await page.evaluate(()=>new Promise(resolve=>{let n=0;function step(){scrollTo(0,++n*240);if(n<120)requestAnimationFrame(step);else requestAnimationFrame(()=>requestAnimationFrame(resolve));}requestAnimationFrame(step);}));
   const after=await metric(cdp);
   if(round>=0)samples.push({mode,round,...data,layoutMs:initial.LayoutDuration*1000,styleMs:initial.RecalcStyleDuration*1000,scriptMs:initial.ScriptDuration*1000,jsHeapBytes:initial.JSHeapUsedSize,scrollLayoutMs:(after.LayoutDuration-initial.LayoutDuration)*1000,scrollStyleMs:(after.RecalcStyleDuration-initial.RecalcStyleDuration)*1000});
   await page.close();
  }
  console.log(`round ${round<0?'warmup':round+1} complete`);
 }
 for(const estimate of [40,480]){
  const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto(`${origin}/?mode=cv&estimate=${estimate}`);await page.waitForFunction(()=>lab.ready);
  const before=await page.evaluate(()=>({height:document.documentElement.scrollHeight,y:scrollY}));
  await page.evaluate(()=>lab.jump());const after=await page.evaluate(()=>({height:document.documentElement.scrollHeight,y:scrollY,targetTop:document.getElementById(`record-${lab.targetIndex}`).getBoundingClientRect().top}));
  probes.push({estimate,before,after});await page.close();
 }
 const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
 const summary=modes.map(mode=>{const rows=samples.filter(s=>s.mode===mode);const out={mode};for(const key of ['elements','cards','created','mountJS','layoutMs','styleMs','scriptMs','jsHeapBytes','scrollLayoutMs','scrollStyleMs'])out[key]=median(rows.map(r=>r[key]));return out;});
 const report={date:new Date().toISOString(),browser:browser.version(),node:process.version,os:`${os.platform()} ${os.release()}`,cpu:os.cpus()[0].model,viewport:{width:1280,height:900},count:1200,warmupsPerMode:1,measuredRunsPerMode:5,throttling:'none',method:'new page per run; rotated order; Performance.getMetrics after initial double rAF; 120 scroll frames * 240px; JS heap is not total process/DOM memory',summary,probes,samples};
 await mkdir('reports',{recursive:true});await writeFile('reports/benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary,probes},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
