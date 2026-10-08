# Source Map 已经上传，线上报错为什么还是 app.js:1？

这份实验验证浏览器实际运行的 JavaScript、错误事件里的 Debug ID，以及本地 source map 如何对应。它使用 Vite + TypeScript + Sentry 浏览器 SDK，在真实 Chromium 中触发异常，事件发往 `127.0.0.1` 的 mock collector；随后用 `@jridgewell/trace-mapping` 在本地解码原始位置。

**验证范围：本地构建、浏览器 SDK 事件和 source map 解码。没有上传 Sentry 云端，没有验证 Sentry 服务端符号化。** `requireMatchingMap` 是实验用的本地匹配检查，不是 Sentry 服务端实现。

## 环境

2026-10-08 在 Windows 11 验证：

| 项目 | 版本 |
| --- | --- |
| Node.js | 25.8.2 |
| npm | 11.9.0 |
| Vite | 8.3.4 |
| TypeScript | 7.0.2 |
| `@sentry/browser` | 11.6.0 |
| `@sentry/cli` | 3.8.0 |
| `@jridgewell/trace-mapping` | 0.3.31 |
| `@playwright/cli` | 0.1.22 |
| CLI 锁定的 Playwright | 1.64.0-alpha-1790635538000 |
| Chromium | 155.0.8059.12 |

使用 Node.js 22.12.0 或更高版本。依赖与浏览器版本均由锁文件中的 Playwright 版本决定，首次安装浏览器需要网络。

## 安装与运行

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/sourcemap-debug-id-verification
npm ci
npx playwright install chromium --no-shell
npm run verify
```

不需要 DSN、Sentry 账号或上传 token。实验自动选择可用的本机端口，使用隔离的临时浏览器 profile。`@sentry/cli` 只执行离线的 `sourcemaps inject`；传给子进程的环境会移除继承的 `SENTRY_*` 环境变量。

## 工程与执行步骤

- `src/main.ts`：初始化 Sentry 浏览器 SDK，点击按钮后抛出一个可定位的 `Error`。
- `vite.config.ts`：设置 `build.sourcemap: 'hidden'`，生成 map，但不给 JS 添加 `sourceMappingURL`。
- `scripts/verify.mjs`：聚合验证。先检查 TypeScript，构建内容不同的 A、B 两份产物，分别注入 Debug ID；再启动本地静态服务与 collector，使用 Playwright CLI 的 snapshot 和 click 操作真实浏览器。
- `dist-a/`、`dist-b/`：运行时生成并忽略的构建产物。
- `.verify/report.json`：运行时生成并忽略的结果，包括两个构建的文件名与 Debug ID、Event ID、压缩栈位置、原始位置、实际 Chromium 版本。

map 在构建目录中可供本地验证读取，静态服务器对任何 `.map` 请求返回 `404`。map 的访问限制由服务器实现，`hidden` 本身只是省略引用注释。

## 预期结果

一键命令退出码为 `0`，打印 `Verification passed: 16 assertions + TypeScript type check.`，包含：

| 检查 | 预期 |
| --- | --- |
| A、B 每份 JS 与其 map | 注入同一个 Debug ID |
| A、B 两份构建 | 内容不同，Debug ID 不同 |
| 两份 hidden map 构建的 JS | 都没有 `sourceMappingURL` |
| 浏览器错误事件 | 捕获 `source-map-lab-a`，栈有构建 A 的文件名、行、列 |
| 事件的 `debug_meta.images` | `code_file` 等于目标栈帧 `filename`，`debug_id` 等于 A 的 map Debug ID |
| 选择正确的 A map | 还原到 `src/main.ts` 中 `Error` 构造器的准确行、列 |
| 原 map 的 `sourcesContent` | 与实际 TypeScript 文件全文相同，忽略平台换行差异 |
| 缺少 map | 实验脚本断言 `MAP_NOT_FOUND`，属于预期失败 |
| 给 A 事件选择 B map | 实验脚本断言 `DEBUG_ID_MISMATCH`，属于预期失败 |
| 从正确 map 删去 `sourcesContent` | 仍能还原原始文件、行、列，但本地无法取得源码上下文 |
| 浏览器实际加载的 JS | 字节内容等于注入后的 A 构建产物 |
| 从静态服务请求 map | 返回 `404` |

本次实际 map 使用 `debugId` 字段；验证脚本同时兼容读取 `debug_id`。事件的字段仍是 `debug_meta.images[].debug_id`。

本次压缩位置是 `index-DgZ_CsQh.js:17:30163`，还原到 `../../src/main.ts` 第 14 行、零基列 12，即编辑器中第 13 列的 `Error` 标识符。文件名和压缩位置取决于构建环境，请以自己的 `.verify/report.json` 为准。

浏览器 SDK 栈帧中的列号从 1 开始，source map API 的列号从 0 开始。因此脚本映射时使用 `frame.colno - 1`，展示到编辑器时再加 1。

## 验证边界

以下行为没有在本实验中验证：

- Sentry 云端上传、artifact bundle、服务端符号化和源码上下文展示。
- 上传晚于事件后，旧事件是否重处理；这属于服务端行为，应按官方文档检查并触发新 Event ID。
- CDN 缓存、Service Worker、灰度发布、浏览器扩展及中间构建工具损坏映射的情况。
- Safari、Firefox、异步栈及不同 SDK 版本的事件格式。
- 通过 release、dist 与 URL 匹配的旧式上传链路。

本实验的缺 map、错 map 检查证明本地无法选择一份可信的映射，**不等于亲测 Sentry 云端的失败界面**。缺 `sourcesContent` 也不等于丢失所有映射；生产环境还可能从另一个来源获得源码内容。

## 官方资料

- [Sentry Debug IDs](https://docs.sentry.io/platforms/javascript/sourcemaps/troubleshooting_js/debug-ids/)
- [Sentry CLI 上传 source maps](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/cli/)
- [Vite build.sourcemap](https://vite.dev/config/build-options#build-sourcemap)
- [Playwright CLI](https://github.com/microsoft/playwright-cli)
