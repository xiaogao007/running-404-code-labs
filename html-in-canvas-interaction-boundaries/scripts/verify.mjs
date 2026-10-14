import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLabServer } from './serve.mjs';
import { projectRect, rectCenter } from '../src/geometry.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=resolve(root,'node_modules/@playwright/cli/playwright-cli.js');
const run=promisify(execFile);
const assertions=[];
const environments=[];
const captures=[];
const sessions=[];
function check(label,actual,expected=true){assert.deepEqual(actual,expected,label);assertions.push(label);console.log(`PASS ${label}`);}
function aligned(a,b){return ['x','y','width','height'].every(key=>Math.abs(a[key]-b[key])<0.75);}
check('logical coordinates account for camera translation and scale',projectRect({x:68,y:158,width:240,height:44},{x:160,y:30,zoom:1.5},600),{x:262,y:267,width:360,height:66});
check('responsive CSS width scales the logical rectangle',projectRect({x:68,y:158,width:240,height:44},{x:160,y:30,zoom:1.5},300),{x:131,y:133.5,width:180,height:33});
check('rectangle center is suitable for pixel-coordinate clicks',rectCenter({x:10,y:20,width:120,height:40}),{x:70,y:40});
await mkdir(resolve(root,'.verify'),{recursive:true});
await mkdir(resolve(root,'output/playwright'),{recursive:true});
const server=createLabServer();
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
async function browser(session,...args){
  const {stdout}=await run(process.execPath,[cli,'--session',session,...args],{cwd:root,timeout:45000,maxBuffer:2*1024*1024});
  if(/^### Error/m.test(stdout))throw new Error(stdout);
  return stdout.trim();
}
async function evaluate(session,fn){return JSON.parse(await browser(session,'eval',fn.toString(),'--raw'));}
async function code(session,fn){return JSON.parse(await browser(session,'run-code',fn.toString(),'--raw'));}
async function ready(session){await evaluate(session,async()=>{await window.lab.ready();return window.lab.capabilities;});}
async function shoot(session,name){
  const destination=resolve(root,'output/playwright',name);
  await browser(session,'run-code',`async(page)=>{await page.screenshot({path:${JSON.stringify(destination)},fullPage:true});}`);
  captures.push(destination);
}
async function clickDrawn(session,mode){
  return code(session,(async(page)=>{
    const p=await page.evaluate(()=>window.lab.centers());
    await page.mouse.click(p[mode].x,p[mode].y);
    return page.evaluate(()=>({counts:window.lab.counts,events:window.lab.events}));
  }).toString().replaceAll('[mode]',`[${JSON.stringify(mode)}]`));
}

try{
  for(const dpr of [1,2]){
    const session=`canvas-native-${process.pid}-${dpr}`;sessions.push(session);
    const config=resolve(root,`.verify/native-${dpr}.json`);
    await writeFile(config,JSON.stringify({browser:{browserName:'chromium',isolated:true,launchOptions:{headless:true,channel:'chromium',args:['--enable-experimental-web-platform-features','--enable-blink-features=CanvasDrawElement']},contextOptions:{viewport:{width:1280,height:1050},deviceScaleFactor:dpr}}}));
    await browser(session,'open',base,'--config',config);
    await browser(session,'snapshot');
    await ready(session);
    const environment=await code(session,async(page)=>({version:page.context().browser().version(),...await page.evaluate(()=>window.lab.capabilities)}));
    environments.push(environment);
    check(`DPR ${dpr}: native API is enabled`,environment.nativeAvailable);
    check(`DPR ${dpr}: browser applied the configured device scale`,environment.dpr,dpr);
    check(`DPR ${dpr}: drawing did not fail`,environment.paintError,null);
    check(`DPR ${dpr}: this build's 2D call returns undefined`,environment.drawReturn,'undefined');
    let rects=await evaluate(session,()=>window.lab.rects());
    if(!aligned(rects.overlayActual,rects.overlayDrawn))console.log('Geometry diagnostics:',JSON.stringify(rects));
    check(`DPR ${dpr}: native initial hit box matches painted button`,aligned(rects.nativeActual,rects.nativeDrawn));
    check(`DPR ${dpr}: overlay initial button matches the shared coordinate model`,aligned(rects.overlayActual,rects.overlayDrawn));

    const mouse=await clickDrawn(session,'native');
    check(`DPR ${dpr}: native pixel-coordinate click activates the DOM handler`,mouse.counts.native,1);
    check(`DPR ${dpr}: native mouse click is trusted`,mouse.events.at(-1).trusted);
    const overlay=await clickDrawn(session,'overlay');
    check(`DPR ${dpr}: overlay pixel-coordinate click activates the DOM handler`,overlay.counts.overlay,1);
    await code(session,async(page)=>{
      const p=await page.evaluate(()=>window.lab.rects().nativeDrawn);
      await page.mouse.click(p.x-5,p.y+p.height/2);
      return page.evaluate(()=>window.lab.counts.native);
    }).then(count=>check(`DPR ${dpr}: a point outside the native button does not activate it`,count,1));

    await evaluate(session,()=>{window.lab.setCamera({x:90,y:24,zoom:1.5});return true;});await ready(session);
    rects=await evaluate(session,()=>window.lab.rects());
    check(`DPR ${dpr}: transformed native bounds follow painted pixels`,aligned(rects.nativeActual,rects.nativeDrawn));
    check(`DPR ${dpr}: transformed overlay bounds follow painted pixels`,aligned(rects.overlayActual,rects.overlayDrawn));
    const moved=await clickDrawn(session,'native');
    check(`DPR ${dpr}: moved and scaled native button is clickable at its painted center`,moved.counts.native,2);

    const keyboard=await code(session,async(page)=>{
      for(let i=0;i<14;i++){
        await page.keyboard.press('Tab');
        if(await page.evaluate(()=>document.activeElement.id==='native-action'))break;
      }
      const focused=await page.evaluate(()=>({id:document.activeElement.id,visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineStyle}));
      await page.keyboard.press('Enter');await page.keyboard.press('Space');
      return page.evaluate(focused=>({focused,counts:window.lab.counts,events:window.lab.events}),focused);
    });
    check(`DPR ${dpr}: Tab can reach the native button`,keyboard.focused.id,'native-action');
    check(`DPR ${dpr}: keyboard focus has a visible outline`,keyboard.focused.visible&&keyboard.focused.outline!=='none');
    check(`DPR ${dpr}: Enter and Space activate the native DOM button`,keyboard.counts.native,4);
    check(`DPR ${dpr}: keyboard activations are trusted click events`,keyboard.events.slice(-2).every(event=>event.trusted&&event.detail===0));
    await ready(session);
    if(dpr===1)await shoot(session,'keyboard-focus.png');
    const ax=await code(session,async(page)=>{
      const client=await page.context().newCDPSession(page);
      const tree=await client.send('Accessibility.getFullAXTree');await client.detach();
      return tree.nodes.filter(node=>!node.ignored&&node.role?.value==='button').map(node=>node.name?.value);
    });
    check(`DPR ${dpr}: accessibility tree exposes the native button role and name`,ax.includes('执行画布任务'));
    check(`DPR ${dpr}: accessibility tree exposes the overlay button role and name`,ax.includes('执行覆盖层任务'));

    await evaluate(session,()=>{window.lab.setCamera({x:0,y:0,zoom:1});return true;});await ready(session);
    const old=await evaluate(session,()=>window.lab.centers().native);
    await evaluate(session,()=>{window.lab.freeze(true);window.lab.setCamera({x:160,y:30,zoom:1});return true;});await ready(session);
    rects=await evaluate(session,()=>window.lab.rects());
    check(`DPR ${dpr}: preserveElementGeometry can intentionally leave old hit bounds`,Math.abs(rects.nativeActual.x-rects.nativeDrawn.x)>100);
    const missed=await clickDrawn(session,'native');
    check(`DPR ${dpr}: new painted position misses when geometry was preserved`,missed.counts.native,4);
    const ghost=await browser(session,'run-code',`async(page)=>{await page.mouse.click(${old.x},${old.y});return page.evaluate(()=>window.lab.counts.native);}`,'--raw');
    check(`DPR ${dpr}: old native hit position remains active when geometry is stale`,JSON.parse(ghost),5);
    if(dpr===1)await shoot(session,'geometry-gap.png');

    await evaluate(session,()=>{window.lab.freeze(false);return true;});await ready(session);
    rects=await evaluate(session,()=>window.lab.rects());
    check(`DPR ${dpr}: restoring automatic sync realigns hit bounds`,aligned(rects.nativeActual,rects.nativeDrawn));
    const restored=await clickDrawn(session,'native');check(`DPR ${dpr}: restored painted position is clickable`,restored.counts.native,6);
    await evaluate(session,()=>{window.lab.setCamera({x:0,y:0,zoom:0.5});return true;});await ready(session);
    rects=await evaluate(session,()=>window.lab.rects());
    check(`DPR ${dpr}: shrinking the scene also shrinks the real button's screen height`,rects.nativeActual.height<24);
    const smaller=await clickDrawn(session,'native');check(`DPR ${dpr}: small button center still hits the native handler`,smaller.counts.native,7);

    await evaluate(session,()=>{window.lab.hide(true);return true;});await ready(session);
    const hidden=await code(session,async(page)=>{
      const client=await page.context().newCDPSession(page);
      const tree=await client.send('Accessibility.getFullAXTree');await client.detach();
      return {names:tree.nodes.filter(node=>!node.ignored).map(node=>node.name?.value),...await page.evaluate(()=>({nativeInert:document.getElementById('native-action').inert,overlayDisplay:getComputedStyle(document.getElementById('overlay-action')).display}))};
    });
    check(`DPR ${dpr}: hiding removes both buttons from the accessibility tree`,!hidden.names.includes('执行画布任务')&&!hidden.names.includes('执行覆盖层任务'));
    check(`DPR ${dpr}: hidden native button is inert`,hidden.nativeInert);
    check(`DPR ${dpr}: hidden overlay is not visually displayed`,hidden.overlayDisplay,'none');
    await evaluate(session,()=>{window.lab.hide(false);window.lab.setCamera({x:0,y:0,zoom:1});return true;});await ready(session);
    if(dpr===1){
      await shoot(session,'comparison.png');
      await browser(session,'resize','390','1000');await ready(session);
      const narrow=await evaluate(session,()=>({overflow:document.documentElement.scrollWidth>innerWidth,rects:window.lab.rects()}));
      check('390px viewport has no page-wide horizontal overflow',!narrow.overflow);
      check('native geometry stays aligned after a narrow viewport resize',aligned(narrow.rects.nativeActual,narrow.rects.nativeDrawn));
      check('overlay geometry stays aligned after a narrow viewport resize',aligned(narrow.rects.overlayActual,narrow.rects.overlayDrawn));
      await shoot(session,'narrow.png');
      await browser(session,'set-reduced-motion','reduce');
      check('reduced-motion preference remains usable',await evaluate(session,()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
    }
  }

  const fallback=`canvas-unflagged-${process.pid}`;sessions.push(fallback);
  const config=resolve(root,'.verify/unflagged.json');
  await writeFile(config,JSON.stringify({browser:{browserName:'chromium',isolated:true,launchOptions:{headless:true,channel:'chromium'},contextOptions:{viewport:{width:1280,height:1050}}}}));
  await browser(fallback,'open',base,'--config',config);await browser(fallback,'snapshot');await ready(fallback);
  const unsupported=await evaluate(fallback,()=>({capabilities:window.lab.capabilities,drawType:typeof CanvasRenderingContext2D.prototype.drawElementImage,nativeInert:document.getElementById('native-card').inert}));
  check('without the flag, experimental drawElementImage is absent',unsupported.drawType,'undefined');
  check('without the flag, native branch is marked unavailable',unsupported.capabilities.nativeAvailable,false);
  check('unsupported branch cannot leave ghost keyboard controls',unsupported.nativeInert);
  const fallbackClick=await clickDrawn(fallback,'overlay');check('DOM overlay remains clickable without experimental APIs',fallbackClick.counts.overlay,1);

  await writeFile(resolve(root,'.verify/report.json'),JSON.stringify({verifiedAt:new Date().toISOString(),node:process.version,environments,assertionCount:assertions.length,assertions,captures,limitations:['No actual screen-reader or OS assistive technology test','No Origin Trial token provisioning test','No WebGL/WebGPU test','This Chromium build uses layoutsubtree; content=drawable is documented but not implemented in it','No cross-browser, mobile touch, arbitrary shape or full accessibility conformance claim']},null,2));
  console.log(`Verification passed: ${assertions.length} assertions.`);
}finally{
  for(const session of sessions)await browser(session,'close').catch(()=>{});
  await new Promise(done=>server.close(done));
}
