import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createLabServer } from './server.mjs';

const server = createLabServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let checks = 0;
const results = [];
function check(condition, message) { assert.ok(condition, message); checks += 1; }

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, locale: 'zh-CN' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin);
  async function metrics() {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return page.evaluate(() => {
      const lab = document.querySelector('#lab');
      const main = document.querySelector('#lab-main');
      const region = document.querySelector('#content-region');
      return {
        available: lab.clientWidth - document.querySelector('.lab-sidebar').getBoundingClientRect().width - 16,
        mainWidth: main.getBoundingClientRect().width,
        mainClient: main.clientWidth,
        mainScroll: main.scrollWidth,
        regionClient: region.clientWidth,
        regionScroll: region.scrollWidth,
        documentClient: document.documentElement.clientWidth,
        documentScroll: document.documentElement.scrollWidth,
        state: document.querySelector('#diagnosis').dataset.state,
      };
    });
  }
  function shellFits(m, label) { check(m.documentScroll <= m.documentClient + 1, `${label}: 外部页面不应横向溢出`); }
  function contained(m, label) {
    check(m.mainWidth <= m.available + 1, `${label}: main 应收缩到可用区域`);
    check(m.mainScroll <= m.mainClient + 1, `${label}: main 不应承接内容溢出`);
    check(m.state === 'contained', `${label}: 状态文字应报告已收住`);
    shellFits(m, label);
  }

  for (const layout of ['grid', 'flex']) {
    await page.locator(`input[name="layout"][value="${layout}"]`).check();
    check(await page.locator('#zero-track').isDisabled() === (layout === 'flex'), `${layout}: Grid 专用开关状态`);
    for (const kind of ['url', 'code', 'table']) {
      await page.locator(`input[name="content"][value="${kind}"]`).check();
      await page.locator('#reset').click();
      const broken = await metrics();
      check(broken.available === 544, `${layout}/${kind}: 固定可用宽度应为 544`);
      check(broken.mainWidth > broken.available + 1, `${layout}/${kind}: 基线应真实撑大 main`);
      shellFits(broken, `${layout}/${kind}/broken`);

      await page.locator('#min-width').check();
      const boxOnly = await metrics();
      check(boxOnly.mainWidth <= boxOnly.available + 1, `${layout}/${kind}: min-width:0 应允许 main 收缩`);
      check(boxOnly.mainScroll > boxOnly.mainClient + 1, `${layout}/${kind}: 仅收缩盒子不能消除内容溢出`);
      check(boxOnly.state === 'overflow', `${layout}/${kind}: 必须报告内容仍溢出`);

      await page.locator('#content-fix').check();
      const fixed = await metrics();
      contained(fixed, `${layout}/${kind}/fixed`);
      if (kind !== 'url') {
        check(fixed.regionScroll > fixed.regionClient + 1, `${layout}/${kind}: 长内容在内部滚动`);
        await page.locator('#content-region').focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('#content-region').scrollLeft > 0);
        check(await page.locator('#content-region').evaluate((el) => el.scrollLeft > 0), `${layout}/${kind}: 键盘可滚动局部内容`);
      }
      results.push({ layout, kind, broken, boxOnly, fixed });

      if (layout === 'grid') {
        await page.locator('#reset').click();
        await page.locator('#zero-track').check();
        const trackOnly = await metrics();
        check(trackOnly.mainWidth <= trackOnly.available + 1, `grid/${kind}: minmax(0,1fr) 应允许轨道收缩`);
        check(trackOnly.mainScroll > trackOnly.mainClient + 1, `grid/${kind}: 轨道修复仍需内容处置`);
        await page.locator('#content-fix').check();
        contained(await metrics(), `grid/${kind}/track-fixed`);
      }
    }
  }

  await page.locator('input[name="layout"][value="grid"]').check();
  await page.locator('input[name="content"][value="url"]').check();
  await page.locator('#reset').click();
  await page.locator('#content-fix').check();
  contained(await metrics(), 'grid/url/anywhere-only');
  check(await page.locator('#content-note').innerText().then((text) => text.includes('min-content')), '说明 anywhere 对 min-content 的影响');

  check(await page.locator('#box-sample').evaluate((el) => el.getBoundingClientRect().width) === 372, 'content-box 应为 372px');
  await page.locator('#border-box').check();
  check(await page.locator('#box-sample').evaluate((el) => el.getBoundingClientRect().width) === 320, 'border-box 应为 320px');
  await page.locator('#border-box').uncheck();
  check(await page.locator('#box-sample').evaluate((el) => el.getBoundingClientRect().width) === 372, '盒模型开关应可逆');

  await page.locator('#min-width').focus();
  await page.keyboard.press('Space');
  check(await page.locator('#min-width').isChecked(), '空格可操作原生开关');
  check(await page.locator('#min-width').evaluate((el) => getComputedStyle(el).outlineStyle !== 'none'), '键盘焦点可见');
  check(await page.locator('#diagnosis').getAttribute('aria-live') === 'polite', '测量诊断有可访问状态区');
  check(await page.locator('html').getAttribute('lang') === 'zh-CN', '页面语言为中文');
  check(await page.locator('html').evaluate((el) => getComputedStyle(el).scrollbarColor !== 'auto'), '全局滚动条基线生效');
  check(await page.locator('#content-region').getAttribute('tabindex') === '0', '内容滚动区可聚焦');

  for (const width of [720, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('input[name="content"][value="table"]').check();
    await page.locator('#reset').click();
    shellFits(await metrics(), `${width}px/broken`);
    await page.locator('#fix').click();
    contained(await metrics(), `${width}px/fixed`);
    check(await page.locator('#fix').isVisible(), `${width}px: 修复操作仍可用`);
    await page.locator('#border-box').uncheck();
    shellFits(await metrics(), `${width}px/content-box`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), '减少动态效果状态已覆盖');
  await page.emulateMedia({ forcedColors: 'active' });
  check(await page.locator('html').evaluate((el) => getComputedStyle(el).scrollbarColor === 'auto'), '强制颜色模式恢复系统滚动条');
  check(errors.length === 0, `浏览器控制台异常：${errors.join('; ')}`);
  const response = await fetch(`${origin}/does-not-exist`);
  check(response.status === 404, '未知静态资源返回 404');

  const report = { node: process.version, browser: browser.version(), checks, results, coverage: ['Chromium desktop 1280', '720 / 390 / 320 CSS px', 'keyboard', 'reduced motion', 'forced colors'], limitations: ['未验证 Firefox、Safari 或真实移动设备', '不是完整 WCAG 合规审计', '测量结果受浏览器与本机字体影响；断言依赖几何关系而非长文本绝对宽度'] };
  await writeFile(new URL('verification-results.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PASS ${checks} checks | Node ${process.version} | Chromium ${browser.version()}`);
  console.table(results.map(({ layout, kind, broken, boxOnly, fixed }) => ({ layout, kind, available: fixed.available, broken: broken.mainWidth, shrunk: boxOnly.mainWidth, unfixedScroll: boxOnly.mainScroll, fixed: fixed.mainWidth, fixedScroll: fixed.mainScroll, innerScroll: fixed.regionScroll })));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
