# width: 100% 为什么还会撑破布局？

一页纯前端实验：在固定 720px 的后台画布中切换 Grid / Flex，以及长 URL、代码块、宽表格；分别验证项目最小宽度、Grid 轨道下限、内容处理和盒模型的作用。

## 运行

需要 Node.js 22 或更高版本及 npm。首次验证还需要安装 Playwright 的 Chromium 浏览器：

```bash
npm ci --ignore-scripts
npx playwright install chromium
npm run verify
npm run dev
```

打开 http://127.0.0.1:4173 。端口被占用时可通过环境变量 `PORT` 修改端口。页面本身无构建步骤、无后端数据、无外部资源请求；安装依赖和浏览器时需要网络。

## 观察顺序

1. 默认 Grid + 代码块，点“复现溢出”：main 虽然设置 `width: 100%`，边框盒仍超过可用的 544px。
2. 只打开“允许 main 收缩”：边框盒变成 544px，但 main 的 `scrollWidth` 仍大于 `clientWidth`。内容还在向外溢出。
3. 再打开“让代码块局部滚动”：main 的 `scrollWidth` 回到 `clientWidth`，保留完整代码的滚动区在内部。
4. 在 Grid 中，可先关闭所有开关，只打开 `minmax(0, 1fr)`，再打开内容处理，比较轨道与项目两条修复路径。
5. 切换 URL、宽表格和 Flex，重复观察。URL 的 `overflow-wrap: anywhere` 会参与 `min-content` 计算，可能同时改变自动最小尺寸，不能将三个开关看作完全独立。
6. 下方独立盒模型：父容器 320px，`width: 100%`，左右 padding 各 24px、border 各 2px。`content-box` 实测 372px；`border-box` 实测 320px。

外层实验画布可横向滚动，手机上也保留 720px 的受控条件。故意溢出只发生在实验区域内；没有通过全局 `overflow: hidden` 隐藏问题。滚动区域可聚焦，用方向键滚动。

## 文件

- `index.html`：语义结构、原生开关、测量输出。
- `styles.css`：完整样式；`.lab`、`.lab-main` 和 `.content-region` 是实验核心。
- `app.js`：创建样本、切换 CSS、读取真实几何值。
- `server.mjs`：仅允许公开页面资源的本地静态服务器。
- `verify.mjs`：实际启动 Chromium 并验证几何关系，失败时返回非零退出码。`verify-design.mjs` 另外检查九个记录颜色与运行时的一致性。
- `verification-results.json`：最近一次实际验证的环境、127 条断言及主要测量结果。
- `DESIGN.md` / `UX-CONTRACT.md`：这一页实验的样式与交互约定。
- `premium-audit.json`：静态设计契约审计证据；不能代替浏览器验证。

## 验证范围与结果

本次环境：Windows、Node.js 25.8.2、npm 11.9.0、Playwright 1.62.1、Chromium 151.0.7922.34。`npm run verify` 共通过 127 条断言。

| 内容 | Grid 基线 main 边框盒 | 只加 min-width: 0 | 此时 main scrollWidth | 完整修复 main / clientWidth / scrollWidth |
|---|---:|---:|---:|---:|
| 长 URL | 1697.625 | 544 | 1662 | 544 / 540 / 540 |
| 代码块 | 1018.0625 | 544 | 982 | 544 / 540 / 540 |
| 宽表格 | 900 | 544 | 878 | 544 / 540 / 540 |

单位为 CSS px。Flex 基线三种内容均为 720px；本例 `width: 100%` 所提供的指定尺寸会约束它的自动最小尺寸。修复后同样为 544px。具体长文本宽度受字体影响，验证主要断言大小关系，不锁死这些字体相关数字。

还覆盖 Grid 的 `minmax(0, 1fr)` 路径、仅 URL 折行、内容局部键盘滚动、原生开关键盘操作、可见焦点、320/390/720px 窄屏、减少动态效果、强制颜色、没有脚本异常、未知资源 404，以及独立盒模型的可逆切换。

## 边界

- 这是普通单轨 Grid / Flex 布局实验，不涵盖跨多个轨道的 Grid 项、纵向书写、嵌套复杂布局或替换元素的所有尺寸规则。
- 未在 Firefox、Safari 和真实移动设备上执行；不是完整 WCAG 合规审计。
- `main.scrollWidth` 与 `main.clientWidth` 比较；`getBoundingClientRect().width` 则包含边框。内外两个区域的 `scrollWidth` 不应混为一谈。
- 工具检查真实浏览器行为，但不能替代在自己的业务布局中定位真正的溢出来源。

## 技术参考

- [MDN：min-width](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/min-width)
- [MDN：minmax()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/minmax)
- [MDN：overflow-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow-wrap)
- [MDN：box-sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-sizing)
