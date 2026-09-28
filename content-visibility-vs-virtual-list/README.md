# 长页面：普通渲染、content-visibility 与窗口化

同一份 1200 条合成订单复核记录，比较三种渲染方式。没有真实订单、API 或外部字体。

## 复现

实测：Windows 11 (10.0.26200)、Intel i5-13500H、Node.js 25.8.2、npm 11.9.0、Playwright 1.62.1、其自带 Chromium 151.0.7922.34（headless）。其他引擎未测。

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/content-visibility-vs-virtual-list
npm ci
npx playwright install chromium
npm run verify
npm run bench
npm run dev
```

dev 地址 http://127.0.0.1:4179。普通/CSS/窗口化分别用 `?mode=normal`、`?mode=cv`、`?mode=virtual`。
可用 count=0 检查空状态；estimate=40 可观察故意低估的 CSS 占位。参数 count 上限 2000。

## 同一数据与实现边界

- 三种模式共享 card()，每张卡有标题、标识、说明、按钮、24 条日志与展开内容。
- 基础内部高度循环为 360/480/600px，展开增加 180px，卡片间距 12px。
- CSS 方案在外层卡片使用 content-visibility:auto 和 contain-intrinsic-size:auto var(--estimate)，默认 estimate=480px。内部盒子提供实际高度，外层没有指定固定高度。
- 窗口化示例预先知道合成卡片高度，用前缀偏移计算位置，只挂载视口和 720px 缓冲区内的卡片。保留有焦点的卡片，展开状态存放于外部 Set。
- 这是已知高度的最小窗口化实现，不是生产级动态高度列表，也不是 React/Vue 或某个虚拟列表库的性能排名。它仍保留完整数据数组，扫描数据寻找范围。

## 验证

`npm run verify` 自动启动随机本地端口并在结束时关闭，完成 32 项断言，包括挂载数量、window.find 搜索探针、远处定位、键盘展开、离开后展开状态保留、390px 窄屏无横向溢出、卡片内容不裁切、无脚本异常和空状态。
report 写入 reports/verification.json，截图进入被忽略的 output/playwright/。

window.find 是 Chromium 的页面内查找探针，不是对浏览器原生 Ctrl+F 搜索栏的自动化，也不是跨浏览器或屏幕阅读器验证。远处标记在 normal/CSS 中可查到，在初始窗口化页面中不可查到；应用的“定位”按钮能在三组中定位该记录。

## 性能方法

1280×900 视口，无 CPU/网络节流。本地内容，不含网络资源加载成本。每模式预热一次，随后五次测量，每次新建页面并轮换方案顺序，报告中位数。
初始测量点：数据挂载后经过两次 requestAnimationFrame，并由自动化等待 ready 后读取 Chromium CDP Performance.getMetrics。LayoutDuration/RecalcStyleDuration 是累计引擎计时，不是 FCP/LCP、总加载时间或含绘制的总渲染耗时。mountJS 是同步创建与挂载阶段的 performance.measure。
滚动工作负载：连续 120 个 requestAnimationFrame，每次滚动 240 CSS px，取前后布局与样式计时差。不是实际 FPS/INP，也没有遍历全部 1200 条。
JSHeapUsedSize 未强制 GC，只作原始观察；不是 DOM/C++/GPU/浏览器总内存，不作内存优劣结论。

2026-09-28 的记录（毫秒，中位数）：

| 指标 | normal | cv | virtual |
| --- | ---: | ---: | ---: |
| 初始卡片数量 | 1200 | 1200 | 3 |
| 初始 Element 数量 | 38421 | 38421 | 117 |
| 同步创建/挂载 JS | 33.9 | 33.4 | 1.4 |
| 初始 LayoutDuration | 199.9 | 28.9 | 26.4 |
| 初始 RecalcStyleDuration | 30.6 | 3.9 | 1.0 |
| 滚动阶段新增 LayoutDuration | 0.0 | 71.1 | 28.5 |

初始普通布局多做工作，滚动时没有新增布局，并不代表它的滚动没有绘制/合成成本或必然流畅。CSS 方案的部分布局工作推迟到了滚动时。数据仅支持该合成场景；不承诺通用提升百分比。

占位探针仅单次观察：estimate=40 时，从顶端跳到远处记录，文档高度从 78919px 变到 100039px；estimate=480 时从 590639px 到 590519px。目标顶部约为16px，说明高度变化与目标定位失败不是同一件事。此处没有测 CLS，不能把高度差当成 CLS 或用户可见抖动量。

原始每轮数据、机器配置和探针见 reports/benchmark.json。重新运行会覆盖报告；需要对照时先另存。

## 适用边界

本实验验证的是布局/样式开销、元素规模及指定交互，不含真实 React/Vue 挂载、组件订阅、图片加载、接口延迟、浏览器原生搜索栏、全列表键盘遍历、打印、读屏与业务弹层。初始挂载时间不是框架组件生命周期指标。布局测量 API 可能使跳过的子树重新参与渲染，因此交互探针在单独页面运行，不混入初始性能计时。

CSS 方案保留 DOM，不能当作自动卸载组件或自动停止业务定时器。窗口化需要额外的搜索、定位、焦点和状态管理；CSS containment 对定位与溢出也有影响，不能直接对任意含弹层的区域全局套用。

## 一手参考

- https://web.dev/articles/content-visibility
- https://drafts.csswg.org/css-contain-2/#content-visibility （编辑草案）
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain-intrinsic-size
- https://web.dev/articles/virtualize-long-lists-react-window

本文实验为 MIT 授权代码；文章和内部编辑材料不存放在本仓库。
