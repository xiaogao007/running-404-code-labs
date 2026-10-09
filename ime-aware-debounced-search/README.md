# 搜索框加了防抖，为什么中文还没打完就开始搜索？

无框架的最小实验：比较普通防抖 `naive`、只挡住组合期新输入的 `gate-only`、在组合开始时取消旧任务的 `fixed`。所有“搜索”只是把字符串写入日志，没有远程请求或真实搜索结果。

**自动验证在真实 Chromium 中运行，但 `CompositionEvent`、组合 `InputEvent` 和粘贴 `InputEvent` 是脚本合成的 `isTrusted=false` 事件。它没有操作系统输入法实测，不能据此宣称兼容所有浏览器、系统或输入法。** 普通英文输入和 Enter 通过 Playwright 键盘操作，事件实际为 `isTrusted=true`。

## 环境与运行

2026-10-09 实际验证环境：Windows 11、Node.js 25.8.2、npm 11.9.0、`@playwright/cli` 0.1.22、它锁定的 Playwright `1.64.0-alpha-1790635538000`、Chromium 155.0.8059.12。

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/ime-aware-debounced-search
npm ci
npx playwright install chromium --no-shell
npm run verify
```

Node.js 要求 22 或更高。首次安装依赖与浏览器需要网络；浏览器版本由锁文件决定。自动验证使用隔离的临时浏览器 profile、本机可用端口和 fake clock，无需任何账号或凭据。

预期输出：`Verification passed: 51 assertions (31 module + 20 browser).`，退出码为 `0`。

## 三种实现的差别

| 实现 | 组合期间的新 input | compositionstart 前已排队的旧 timer |
| --- | --- | --- |
| `naive` | 继续重排防抖任务，停顿超过 300 ms 就搜索 | 可能执行或被后续 input 重排 |
| `gate-only` | 跳过新任务 | 旧任务仍可能执行 |
| `fixed` | 记录当前值，但不排搜索任务 | 立即取消旧任务 |

`fixed` 在 `compositionend` 读取完整的 `input.value`。该事件的 `data` 可能是片段，也可能为空；实验没有把它当作完整搜索词。最终 `input` 在结束前或结束后的两种人为排列均有断言，这些是需要处理的排列，**不是对某个系统实际事件顺序的测量结论**。

同一个查询会话中，已搜索词做去重；清空输入定义为开始新的查询会话，取消任务、重置去重记录，不搜索空字符串。因此清空后重新输入前一个词，会再次搜索。销毁时清理 timer。组合取消并恢复原值时，若原值已搜索则去重；若原值原本还在等待、随后被 compositionstart 取消，则重新排队，满 300 ms 后补发。Enter 同时检查控制器记录的组合状态和键盘事件的 `isComposing`，避免在这些状态仍成立时提交。本实验没有用 `keyCode=229` 推导跨平台规则，也没有证明确认候选词的 Enter 在所有环境中都携带相同标志。

## 51 项断言覆盖

- **31 项模块断言**：普通防抖、已搜索词去重、三种实现的长组合停顿、观察值更新、旧 timer 对照、最终 input 的两种排列及延迟重复事件、组合取消后恢复已搜索或尚未搜索的原词、缺少开始事件但 `isComposing=true` 的输入、组合期 Enter 和普通 Enter、空值取消、清空后重输前一查询、销毁与后续回调。
- **20 项 Chromium 断言**：普通英文输入与 Enter 的真实键盘桥接；合成组合事件与旧 timer 对照；DOM 值变化但 fixed 不搜索；结束时使用全文而非片段；最终 input 的两种排列；空 data 与恢复值；合成粘贴；清空与销毁；事件 `isTrusted` 来源。

事件轨迹、实际 Chromium 版本和断言标签保存到忽略提交的 `.verify/report.json`。`node_modules`、浏览器缓存、临时日志与 profile 均不提交。

## 文件

- `src/search-controller.js`：注入 timer 的最小状态模块，可用于 Node 或浏览器。
- `src/bind-input.js`：原生 DOM 事件桥接，绑定 input、compositionstart/end、keydown，卸载时移除监听并销毁控制器。
- `src/fake-clock.js`：确定性的 timer 调度器；自动验证不依赖墙钟等待。
- `src/browser-fixture.js`、`index.html`：三种实现共用同一个输入框，只记录搜索词。
- `scripts/module-checks.mjs`、`scripts/verify.mjs`：确定性模块验证与 Playwright CLI 的真实 Chromium DOM 验证。

## 补充真实输入法验证

```bash
npm run serve
```

打开命令打印的 `/?clock=real` 页面，使用原生 300 ms timer。可以使用自己的系统输入法检查：组合中停顿超过 300 ms、此前已有英文任务、候选词确认、取消组合、Enter、粘贴、清空。记录操作系统、浏览器版本、输入法及复现动作，再确认具体事件轨迹与提交行为。

这个手动模式只是提供复测入口，本仓库没有记录任何真实输入法的执行结果。不同输入法、浏览器、受控框架组件、移动端键盘和表单默认提交仍需在目标环境验证。未覆盖异步请求竞态、取消远程请求、缓存、业务刷新逻辑与真实后端。
