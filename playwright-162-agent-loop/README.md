# Playwright 1.62 Agent Loop

Playwright 1.62 的配套实验：用一个最小任务板验证 Agent 可依赖稳定语义操作页面，并用 Playwright CLI 和测试断言完成确定性回归。

## 环境

- Node.js 25.8.2
- npm 11.9.0
- `playwright` 1.62.1
- Chromium（由 Playwright 安装）

## 安装与验证

```bash
npm ci
npx playwright install chromium
npm run verify
```

`npm run verify` 会依次检查 Playwright 版本、MCP CLI 是否可用，并运行全部浏览器测试。测试包含：

- 使用 ARIA role 和 label 添加、完成、删除任务；
- 使用 `AbortSignal` 取消一条长时间等待的断言；
- 页面不依赖脆弱的 CSS 定位器。

也可以单独查看 MCP 命令：

```bash
npm run mcp:help
```

## 预期结果

验证命令最终输出 3 个测试通过，并显示 `verify: ... passed.`。

## 限制

- 这是本地静态页面，不包含真实 Agent、模型调用或 MCP 客户端编排；它验证的是浏览器操作层和确定性回归层。
- `npx playwright mcp --help` 只验证 MCP server 命令可启动，不代表已连接到外部 Agent。
- 示例使用 Chromium；Firefox 和 WebKit 的跨浏览器覆盖不在本实验范围内。
