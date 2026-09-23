const $ = (selector) => document.querySelector(selector);
const lab = $('#lab');
const main = $('#lab-main');
const region = $('#content-region');
const minWidth = $('#min-width');
const zeroTrack = $('#zero-track');
const contentFix = $('#content-fix');
const captions = { url: '没有可用断点的长链接片段', code: '一行很长、保留空白的代码', table: '一张最小宽度为 860 px 的表格' };
let kind = 'code';

function renderSample(nextKind) {
  kind = nextKind;
  region.replaceChildren();
  if (kind === 'url') {
    const paragraph = document.createElement('p');
    paragraph.className = 'url-sample';
    paragraph.textContent = `https://example.test/reports/${'unbreakable'.repeat(18)}?mode=preview`;
    region.append(paragraph);
  } else if (kind === 'code') {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'const downloadUrl = "https://example.test/export/2026/monthly-report?fields=id,name,region,owner,created_at,updated_at,total,status&format=csv";\nconsole.log(downloadUrl);';
    pre.append(code);
    region.append(pre);
  } else {
    const table = document.createElement('table');
    table.className = 'sample-table';
    const caption = document.createElement('caption');
    caption.textContent = '导出记录 · 固定 3 条样本';
    table.append(caption);
    const head = table.createTHead().insertRow();
    for (const label of ['记录编号', '项目名称', '负责人', '创建日期', '区域', '金额', '状态']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      head.append(cell);
    }
    const body = table.createTBody();
    for (const row of [
      ['R-260923-001', '九月用户增长分析', '小林', '2026-09-23', '华东区', '¥ 12,800.00', '已完成'],
      ['R-260923-002', '产品访问路径报告', '小周', '2026-09-23', '华南区', '¥ 9,600.00', '已完成'],
      ['R-260923-003', '内容阅读趋势汇总', '小高', '2026-09-23', '华北区', '¥ 7,200.00', '处理中'],
    ]) {
      const tr = body.insertRow();
      for (const text of row) tr.insertCell().textContent = text;
    }
    region.append(table);
  }
  $('#sample-caption').textContent = captions[kind];
  $('#content-fix-label').textContent = kind === 'url' ? '允许长链接在任意处折行' : `让${kind === 'code' ? '代码块' : '表格'}局部滚动`;
  $('#content-fix-code').textContent = kind === 'url' ? 'overflow-wrap: anywhere' : 'overflow-x: auto';
  $('#content-note').textContent = kind === 'url'
    ? '注意：anywhere 的断行机会会参与 min-content 计算，因此打开折行也可能让自动最小尺寸缩小。三个开关并非完全独立。'
    : 'min-width: 0 和 minmax(0, 1fr) 负责允许收缩。要保留完整内容，还要给代码或表格自己的容器设置 overflow-x: auto。';
}

function measure() {
  const available = lab.clientWidth - $('.lab-sidebar').getBoundingClientRect().width - parseFloat(getComputedStyle(lab).columnGap);
  const mainWidth = main.getBoundingClientRect().width;
  const metrics = { available, mainWidth, mainScroll: main.scrollWidth, mainClient: main.clientWidth, regionScroll: region.scrollWidth, regionClient: region.clientWidth };
  for (const [id, value] of Object.entries({ 'available-width': available, 'main-width': mainWidth, 'main-scroll': main.scrollWidth, 'main-client': main.clientWidth })) {
    $(`#${id}`).textContent = Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  const diagnosis = $('#diagnosis');
  const shrunk = mainWidth <= available + 1;
  const contentContained = main.scrollWidth <= main.clientWidth + 1;
  diagnosis.dataset.state = shrunk && contentContained ? 'contained' : 'overflow';
  diagnosis.textContent = !shrunk
    ? '盒子还没缩下来：main 的边框盒超过了可用宽度。先检查布局项目或轨道的自动最小尺寸。'
    : !contentContained
      ? '盒子缩下来了，内容仍在越界：main 已装进格子，但 scrollWidth 大于 clientWidth。继续处理内容折行或局部滚动。'
      : '盒子与内容都已收住：main 装进可用区域；长内容已折行，或由内部区域单独滚动。';
  lab.dataset.measured = JSON.stringify(metrics);
  const width = $('#box-sample').getBoundingClientRect().width;
  $('#box-result').textContent = $('#border-box').checked
    ? `border-box：边框盒实测 ${width} px，padding 与 border 包含在 320 px 内。`
    : `content-box：320 + 24 × 2 + 2 × 2 = ${width} px，超出父容器 ${width - 320} px。`;
}

function update() {
  const layout = $('input[name="layout"]:checked').value;
  lab.dataset.layout = layout;
  lab.dataset.kind = kind;
  lab.classList.toggle('allow-shrink', minWidth.checked);
  lab.classList.toggle('zero-track', zeroTrack.checked && layout === 'grid');
  lab.classList.toggle('content-fixed', contentFix.checked);
  zeroTrack.disabled = layout !== 'grid';
  $('#box-sample').classList.toggle('border-box', $('#border-box').checked);
  $('#current-css').textContent = `${layout === 'grid'
    ? `.layout { display: grid; grid-template-columns: 160px ${zeroTrack.checked ? 'minmax(0, 1fr)' : '1fr'}; gap: 16px; }`
    : '.layout { display: flex; gap: 16px; }\n.sidebar { flex: 0 0 160px; }'}\n.main { width: 100%; box-sizing: border-box;${layout === 'flex' ? ' flex: 1 1 0;' : ''}${minWidth.checked ? ' min-width: 0;' : ''} }${contentFix.checked ? kind === 'url' ? '\n.url { overflow-wrap: anywhere; }' : '\n.content-region { overflow-x: auto; }' : ''}`;
  $('#viewport').scrollLeft = 0;
  requestAnimationFrame(measure);
}

document.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => {
  if (input.name === 'content') renderSample(input.value);
  update();
}));
window.labActions = Object.freeze({
  reset() {
    minWidth.checked = false;
    zeroTrack.checked = false;
    contentFix.checked = false;
    update();
  },
  fix() {
    minWidth.checked = true;
    contentFix.checked = true;
    update();
  },
});
new ResizeObserver(measure).observe(main);
window.addEventListener('resize', measure);
renderSample('code');
update();
