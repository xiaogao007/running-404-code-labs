const params = new URLSearchParams(location.search);
const mode = ['normal','cv','virtual'].includes(params.get('mode')) ? params.get('mode') : 'normal';
const count = Math.max(0, Math.min(2000, Number(params.get('count') ?? 1200) || 0));
const estimate = Math.max(40, Math.min(1000, Number(params.get('estimate') ?? 480) || 480));
document.body.dataset.mode = mode;
document.documentElement.style.setProperty('--estimate', `${estimate}px`);
for(const a of document.querySelectorAll('nav a')) {
  const target = new URL(a.href); target.searchParams.set('count',count); target.searchParams.set('estimate',estimate); a.href=target;
  if(target.searchParams.get('mode')===mode) a.setAttribute('aria-current','page');
}
const list = document.querySelector('#list');
const expanded = new Set();
const rows = Array.from({length:count},(_,i)=>({id:i,height:360+(i%3)*120}));
const targetIndex = Math.max(0, count-21);
let offsets=[], total=0, created=0;
function recalc(){total=0;offsets=rows.map(r=>{const y=total;total+=r.height+(expanded.has(r.id)?180:0)+12;return y;});}
function card(row){
  created++;
  const el=document.createElement('article');el.className='card';el.id=`record-${row.id}`;el.dataset.index=row.id;
  el.style.setProperty('--height',`${row.height+(expanded.has(row.id)?180:0)}px`);
  el.innerHTML=`<div class="card-body"><h2>订单复核记录 ${row.id+1}</h2><div class="record-id">ORDER-${String(row.id+1).padStart(4,'0')}</div><p>支付核对完成 · 等待人工复核${row.id===targetIndex?' · NEEDLE-ORCHID-742':''}</p><button type="button" aria-expanded="${expanded.has(row.id)}" aria-controls="detail-${row.id}">${expanded.has(row.id)?'收起详情':'展开详情'}</button><div class="logs">${Array.from({length:24},(_,j)=>`<span>日志 ${j+1} · 已记录</span>`).join('')}</div><div id="detail-${row.id}" class="detail" ${expanded.has(row.id)?'':'hidden'}>这是额外的复核信息。展开状态由列表外部状态保存。</div></div>`;
  el.querySelector('button').addEventListener('click',()=>{
    expanded.has(row.id)?expanded.delete(row.id):expanded.add(row.id);
    if(mode==='virtual'){recalc();renderVirtual(true);document.querySelector(`#record-${row.id} button`)?.focus({preventScroll:true});}
    else { const next=card(row);el.replaceWith(next);next.querySelector('button').focus({preventScroll:true}); }
  });
  return el;
}
let range='';
function renderVirtual(force=false){
  const origin=list.getBoundingClientRect().top+scrollY;
  const startY=Math.max(0,scrollY-origin-720),endY=scrollY-origin+innerHeight+720;
  const ids=rows.filter(r=>offsets[r.id]+r.height+(expanded.has(r.id)?180:0)>=startY&&offsets[r.id]<=endY).map(r=>r.id);
  // Retain the currently focused record so scrolling does not silently drop keyboard focus.
  const focused=document.activeElement?.closest('.card');
  if(focused&&!ids.includes(Number(focused.dataset.index)))ids.push(Number(focused.dataset.index));
  ids.sort((a,b)=>a-b);const key=ids.join(',');
  list.style.height=`${total}px`;
  if(!force&&key===range)return;range=key;
  const keep=new Set(ids.map(String));
  for(const el of list.querySelectorAll('.card'))if(!keep.has(el.dataset.index)||force)el.remove();
  for(const id of ids){let el=list.querySelector(`#record-${id}`);if(!el){el=card(rows[id]);list.append(el);}el.style.top=`${offsets[id]}px`;}
}
performance.mark('mount-start');
recalc();
if(!count){list.innerHTML='<p class="empty">没有记录。请切换到带有数据的实验地址。</p>';}
else if(mode==='virtual')renderVirtual();
else {const fragment=document.createDocumentFragment();for(const row of rows)fragment.append(card(row));list.append(fragment);}
performance.mark('mount-end');performance.measure('mount-js','mount-start','mount-end');
let scheduled=false;
addEventListener('scroll',()=>{if(mode==='virtual'&&!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;renderVirtual();});}},{passive:true});
addEventListener('resize',()=>{if(mode==='virtual')renderVirtual(true);});
async function settle(){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
async function jump(index=targetIndex){
  if(!rows[index])return;
  if(mode==='virtual'){document.activeElement?.blur();scrollTo(0,list.getBoundingClientRect().top+scrollY+offsets[index]-16);renderVirtual();await settle();return;}
  document.getElementById(`record-${index}`)?.scrollIntoView({block:'start'});
  await settle();
}
document.querySelector('#jump').disabled=!count;
document.querySelector('#status').textContent=`${count} 条合成记录 · ${mode==='virtual'?'按已知高度窗口化':mode==='cv'?'屏幕外内容由浏览器跳过渲染':'全部挂载并正常布局'}${mode==='cv'&&!CSS.supports('content-visibility','auto')?' · 当前浏览器不支持，已自然降级':''}`;
window.lab={mode,count,targetIndex,jump,settle,top(){document.activeElement?.blur();scrollTo(0,0);},get created(){return created;},get expectedHeight(){return total;}};
await settle();performance.mark('ready');window.lab.ready=true;
