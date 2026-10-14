import { sceneSize, cardRect, buttonRect, projectRect, rectCenter } from './geometry.js';

const $ = id => document.getElementById(id);
const nativeCanvas = $('native-canvas');
const overlayCanvas = $('overlay-canvas');
const nativeAction = $('native-action');
const overlayAction = $('overlay-action');
const nativeContext = nativeCanvas.getContext('2d');
const overlayContext = overlayCanvas.getContext('2d');
const forceFallback = new URLSearchParams(location.search).has('fallback');
const nativeAvailable = !forceFallback && typeof nativeContext.drawElementImage === 'function';
const hasContentAttribute = 'content' in HTMLCanvasElement.prototype;
const branch = nativeAvailable ? (hasContentAttribute ? 'content="drawable"' : 'layoutsubtree 兼容分支') : '实验 API 不可用';
const camera = { x: 0, y: 0, zoom: 1 };
const counts = { native: 0, overlay: 0 };
const events = [];
let freeze = false;
let hidden = false;
let paintCount = 0;
let paintError = null;
let drawReturn = null;

$('native-branch').textContent = branch;
$('capabilities').textContent = `${branch} · DPR ${devicePixelRatio} · 这是本地实验，不是浏览器兼容性承诺`;
if (nativeAvailable) nativeCanvas.setAttribute(hasContentAttribute ? 'content' : 'layoutsubtree', hasContentAttribute ? 'drawable' : '');
else { nativeAction.disabled = true; $('native-card').inert = true; }

function canvasCssRect(canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}
function absoluteProjectedRect(canvas, worldRect) {
  const canvasRect = canvasCssRect(canvas);
  const p = projectRect(worldRect, camera, canvasRect.width);
  return { x: canvasRect.x + p.x, y: canvasRect.y + p.y, width: p.width, height: p.height };
}
function actualRect(element) {
  const r = element.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}
function background(ctx, canvas) {
  ctx.reset();
  ctx.setTransform(canvas.width / sceneSize.width, 0, 0, canvas.height / sceneSize.height, 0, 0);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, sceneSize.width, sceneSize.height);
  ctx.strokeStyle = '#e4ebf4'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 20; x < sceneSize.width; x += 20) { ctx.moveTo(x,0); ctx.lineTo(x,sceneSize.height); }
  for (let y = 20; y < sceneSize.height; y += 20) { ctx.moveTo(0,y); ctx.lineTo(sceneSize.width,y); }
  ctx.stroke();
}
function outline(ctx, canvas, rectangle, color, dashed = false) {
  const bounds = canvasCssRect(canvas);
  ctx.save();
  ctx.setTransform(canvas.width / bounds.width, 0, 0, canvas.height / bounds.height, 0, 0);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.setLineDash(dashed ? [5,4] : []);
  ctx.strokeRect(rectangle.x-bounds.x, rectangle.y-bounds.y, rectangle.width, rectangle.height);
  ctx.restore();
}
function paintNative() {
  background(nativeContext,nativeCanvas);
  if (!nativeAvailable) {
    nativeContext.fillStyle = '#52627c'; nativeContext.font = '18px sans-serif';
    nativeContext.fillText('实验 API 不可用，请使用右侧覆盖层',32,80);
    paintCount++; return;
  }
  try {
    nativeContext.translate(camera.x,camera.y);
    nativeContext.scale(camera.zoom,camera.zoom);
    // Explicit destination sizes keep the logical scene independent of snapshot DPR.
    nativeContext.drawElementImage($('native-card'),cardRect.x,cardRect.y,cardRect.width,cardRect.height);
    if (!hidden) {
      const result = nativeContext.drawElementImage(nativeAction,buttonRect.x,buttonRect.y,buttonRect.width,buttonRect.height,{preserveElementGeometry:freeze});
      drawReturn = result === undefined ? 'undefined' : result?.constructor?.name;
      if (result && typeof result.toString === 'function') nativeAction.style.transform = result.toString();
      outline(nativeContext,nativeCanvas,absoluteProjectedRect(nativeCanvas,buttonRect),'#137e9c');
      outline(nativeContext,nativeCanvas,actualRect(nativeAction),'#b31e63',true);
    }
    paintError = null;
  } catch (error) { paintError = error.message; }
  paintCount++;
  metrics();
}
function metrics() {
  const nativeBox = actualRect(nativeAction);
  const overlayBox = actualRect(overlayAction);
  const expected = absoluteProjectedRect(nativeCanvas,buttonRect);
  const delta = Math.hypot(nativeBox.x-expected.x,nativeBox.y-expected.y);
  $('native-metric').textContent = nativeAvailable
    ? (paintError ?? `绘制/命中位置差 ${delta.toFixed(1)} CSS px · 按钮 ${nativeBox.width.toFixed(1)}×${nativeBox.height.toFixed(1)} · 返回 ${drawReturn}`)
    : '原生实验分支已停用；不会留下可聚焦的隐藏按钮';
  $('overlay-metric').textContent = `按钮 ${overlayBox.width.toFixed(1)}×${overlayBox.height.toFixed(1)} CSS px · CSS 变换由应用维护`;
}
function refresh() {
  $('zoom').value = String(camera.zoom);
  $('zoom-value').value = `${Math.round(camera.zoom*100)}%`;
  $('pan-x').value = String(camera.x); $('pan-x-value').value = String(camera.x);
  background(overlayContext,overlayCanvas);
  const rect = projectRect(cardRect,camera,canvasCssRect(overlayCanvas).width);
  $('overlay-card').style.transform = `translate(${rect.x}px,${rect.y}px) scale(${rect.width/cardRect.width})`;
  if (nativeAvailable) nativeCanvas.requestPaint(); else paintNative();
  metrics();
}
function resize() {
  for (const canvas of [nativeCanvas,overlayCanvas]) {
    const bounds = canvasCssRect(canvas);
    canvas.width = Math.round(bounds.width*devicePixelRatio);
    canvas.height = Math.round(bounds.height*devicePixelRatio);
  }
  refresh();
}
function setHidden(value) {
  hidden = value; $('hide-actions').checked = value;
  for (const button of [nativeAction,overlayAction]) { button.hidden = value; button.inert = value; }
  if (nativeAvailable && value && typeof nativeCanvas.clearElementGeometry === 'function') nativeCanvas.clearElementGeometry(nativeAction);
  refresh();
}
function execute(mode,event) {
  counts[mode]++;
  events.push({mode,type:event.type,trusted:event.isTrusted,detail:event.detail});
  $(`${mode}-status`).textContent = `${mode==='native'?'画布':'覆盖层'}任务执行 ${counts[mode]} 次`;
  $('event-log').textContent = `${mode==='native'?'画布':'覆盖层'}按钮收到 click · isTrusted=${event.isTrusted} · detail=${event.detail}`;
}
nativeAction.addEventListener('click',event=>execute('native',event));
overlayAction.addEventListener('click',event=>execute('overlay',event));
$('zoom').addEventListener('input',event=>{ camera.zoom=Number(event.target.value); refresh(); });
$('pan-x').addEventListener('input',event=>{ camera.x=Number(event.target.value); refresh(); });
$('move').addEventListener('click',()=>{camera.x=160;camera.y=30;refresh();});
$('reset').addEventListener('click',()=>{camera.x=0;camera.y=0;camera.zoom=1;freeze=false;$('freeze').checked=false;setHidden(false);});
$('freeze').addEventListener('change',event=>{freeze=event.target.checked;refresh();});
$('hide-actions').addEventListener('change',event=>setHidden(event.target.checked));
nativeCanvas.addEventListener('paint',paintNative);
new ResizeObserver(resize).observe($('native-scene'));
new ResizeObserver(resize).observe($('overlay-scene'));

window.lab = {
  camera,counts,events,
  get capabilities() { return {nativeAvailable,hasContentAttribute,branch,drawReturn,dpr:devicePixelRatio,paintCount,paintError}; },
  setCamera(value) { Object.assign(camera,value); refresh(); },
  freeze(value) { freeze=value;$('freeze').checked=value;refresh(); },
  hide:setHidden,
  rects() { return {nativeActual:actualRect(nativeAction),nativeDrawn:absoluteProjectedRect(nativeCanvas,buttonRect),overlayActual:actualRect(overlayAction),overlayDrawn:absoluteProjectedRect(overlayCanvas,buttonRect)}; },
  centers() { return {native:rectCenter(absoluteProjectedRect(nativeCanvas,buttonRect)),overlay:rectCenter(absoluteProjectedRect(overlayCanvas,buttonRect))}; },
  async ready() { const current=paintCount; refresh(); if(!nativeAvailable)return; await new Promise((resolve,reject)=>{const start=performance.now();function poll(){if(paintCount>current)return resolve();if(performance.now()-start>2500)return reject(new Error('Canvas paint did not complete'));requestAnimationFrame(poll);}poll();}); },
};
resize();
