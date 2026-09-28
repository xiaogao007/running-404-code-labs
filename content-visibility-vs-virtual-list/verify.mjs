import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createLabServer } from './server.mjs';
const server=createLabServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();let checks=0;const observations=[];
function check(value,label){assert.ok(value,label);checks++;}
await mkdir('reports',{recursive:true});await mkdir('output/playwright',{recursive:true});
try{
 for(const mode of ['normal','cv','virtual']){
  const page=await browser.newPage({viewport:{width:1280,height:900},locale:'zh-CN'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/?mode=${mode}`);await page.waitForFunction(()=>window.lab?.ready);
  const mounted=await page.locator('.card').count();check(mode==='virtual'?mounted<20:mounted===1200,`${mode} mounted count`);
  const found=await page.evaluate(()=>{getSelection().removeAllRanges();return window.find('NEEDLE-ORCHID-742');});
  observations.push({mode,initialMounted:mounted,windowFind:found});check(found===(mode!=='virtual'),`${mode} window.find expected availability`);
  await page.evaluate(()=>{getSelection().removeAllRanges();scrollTo(0,0);});await page.evaluate(()=>lab.settle());
  await page.locator('#jump').click();const target=await page.evaluate(()=>lab.targetIndex);
  check(await page.locator(`#record-${target}`).count()===1,`${mode} jump mounts target`);
  const top=await page.locator(`#record-${target}`).evaluate(el=>el.getBoundingClientRect().top);check(Math.abs(top-16)<3,`${mode} target alignment ${top}`);
  const toggle=page.locator(`#record-${target} button`);await toggle.focus();await page.keyboard.press('Enter');check(await toggle.getAttribute('aria-expanded')==='true',`${mode} keyboard expansion`);
  await page.locator('#top').click();await page.evaluate(()=>lab.settle());await page.locator('#jump').click();check(await toggle.getAttribute('aria-expanded')==='true',`${mode} expansion retained`);
  await page.screenshot({path:`output/playwright/${mode}-desktop.png`});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>lab.settle());check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`${mode} mobile horizontal fit`);
  check(await page.locator(`#record-${target} .card-body`).evaluate(el=>el.scrollHeight<=el.clientHeight+1),`${mode} expanded card content fits mobile`);
  await page.screenshot({path:`output/playwright/${mode}-mobile.png`});check(errors.length===0,`${mode} no script errors`);
  await page.evaluate(()=>lab.top());await page.evaluate(()=>lab.settle());check(await page.locator('#record-0 .card-body').evaluate(el=>el.scrollHeight<=el.clientHeight+1),`${mode} collapsed card content fits mobile`);
  await page.close();
 }
 const empty=await browser.newPage();await empty.goto(`${origin}/?count=0&mode=virtual`);await empty.waitForFunction(()=>window.lab?.ready);check(await empty.locator('#jump').isDisabled(),'empty disables jump');check(await empty.locator('.empty').count()===1,'empty text');await empty.close();
 await writeFile('reports/verification.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),checks,observations,scope:'Chromium headless; window.find probe is not native Ctrl+F UI or screen-reader verification'},null,2)+'\n');
 console.log(JSON.stringify({checks,observations}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
