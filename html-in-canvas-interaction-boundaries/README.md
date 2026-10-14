# Canvas 里的 HTML 按钮交互边界

一份无框架的最小实验，比较真实 HTML 按钮绘入 2D Canvas 与 DOM 覆盖层。两侧使用同一份相机、卡片和按钮坐标模型；测试通过真实鼠标坐标与键盘操作触发 DOM 事件，不用 `element.click()` 代替命中检测。

## 环境和命令

2026-10-14 验证：Windows 11、Node.js 25.8.2、`@playwright/cli` 0.1.22、Playwright `1.64.0-alpha-1790635538000`、Chromium 155.0.8059.12。依赖版本由锁文件固定。

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/html-in-canvas-interaction-boundaries
npm ci
npx playwright install chromium --no-shell
npm run check
npm run verify
```

预期 `Verification passed: 69 assertions.` 和退出码 0。报告写入忽略提交的 `.verify/report.json`，截图写入 `output/playwright/`。浏览器使用独立临时 profile，不需要账号或 Cookie。

```bash
npm run serve
```

在 Canary 或具有实验实现的 Chromium 中打开命令打印的本地 URL。按 WICG 开发者试验说明启用 `canvas-draw-element` 与 Experimental Web Platform Features；这是本地开关实验，不是 Origin Trial token 部署验证。无 API 时左侧停用，右侧覆盖层仍可操作。

## 测量结果与版本边界

- 此 **具体构建** 仍只有 `layoutSubtree` 属性；直接使用 `content="drawable"` 会得到要求 `layoutsubtree` 的运行时错误。原型用原型属性能力检测选择兼容分支，不根据版本数字硬编码。
- 同一构建的 `drawElementImage` 返回 `undefined`，并且自动更新 2D 元素几何。DPR 1/2 下，指定目标宽高后，DOM 命中框与绘制坐标在 0.75 CSS px 容差内一致。
- 鼠标按绘制中心坐标点击可进入真实按钮的 DOM 处理器，`isTrusted=true`；边框外点不触发按钮。Tab 可达，Enter 和空格触发真实键盘来源的 click。
- `preserveElementGeometry: true` 故意保留旧几何后再移动 160×30 个场景单位，会出现新绘制位置不触发、旧点击区域仍触发的反例。恢复自动同步后重新对齐。
- 无障碍树包含按钮角色和明确名称；隐藏时 `hidden`、`inert` 和几何清理移除未使用控件。**没有测试 NVDA、VoiceOver 或其他真实屏幕阅读器。**
- 场景缩小会同步缩小按钮物理尺寸；50% 场景下本实验按钮高度小于 24 CSS px。该现象不等于已经判定 WCAG 违规，目标尺寸还需按实际间距和例外核对。
- 390px 窄视口没有页面级横向溢出，缩放模型仍与几何对齐；减少动态效果偏好可正常使用。
- 未开启实验开关的同一 Chromium 中 API 缺失，原生分支停用且不留下隐藏的可聚焦按钮，覆盖层仍可点击。

本实验没有覆盖 `content="drawable"` 新属性的真实运行、Origin Trial 注册、WebGL/WebGPU、任意形状/裁切命中、跨浏览器、系统辅助技术、移动端触摸或完整可访问性合规。不得把上述窄场景结果外推为平台兼容承诺。

## 坐标与 DPR

统一使用 600×340 的逻辑场景。Canvas 位图按实际 CSS 尺寸乘 DPR 分配，绘制上下文再映射到逻辑场景；DOM 覆盖层则由同一坐标模型生成 CSS 变换。

`drawElementImage` 显式传递目标宽高，避免将快照默认尺寸直接当作逻辑 CSS 尺寸。前期探测中，DPR 2 下默认目标尺寸使 240px 的按钮在本场景中呈现约 477.6 CSS px 宽；改为显式目标宽高后约为 238.8 CSS px，与覆盖层一致。这个数值取决于本实验面板的 597px CSS 宽度，不是所有 Canvas 的固定行为。

## 文件和验证范围

- `src/geometry.js`：相机与矩形投影，包含卡片边框对按钮绝对定位的影响。
- `src/lab.js`：能力检测、2D 绘制、覆盖层 CSS 变换、几何停止/恢复与隐藏处理。
- `scripts/verify.mjs`：3 项投影断言、DPR 1/2 交互与语义、窄视口、减少动态效果、未开关降级，共 69 项断言。
- `verification.json`：该次验证的可公开环境、断言和范围摘要；复测以新生成的本地报告为准。
- `assets/`：本实验自己的页面截图，供文章引用，不含账号、浏览器用户数据或第三方产品画面。

官方依据：

- https://developer.chrome.com/blog/html-in-canvas-ot-changes
- https://github.com/WICG/html-in-canvas/blob/main/README.md
- https://html.spec.whatwg.org/multipage/canvas.html
