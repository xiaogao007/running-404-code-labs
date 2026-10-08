# 404 Code Labs

“404星球的猫”技术文章配套验证代码。每篇文章使用独立目录，保留可复现源码、依赖锁文件、运行命令、预期结果和验证边界。

## 实验索引

| 目录 | 主题 | 运行时 | 状态 |
| --- | --- | --- | --- |
| [`sourcemap-debug-id-verification`](./sourcemap-debug-id-verification/) | Source Map、Debug ID 与浏览器错误事件的产物匹配验证 | Node.js 25.8.2、Chromium 155.0.8059.12 | 16 项断言与 TypeScript 检查；仅本地验证 |
| [`ticket-workflow-vs-agent`](./ticket-workflow-vs-agent/) | 工单固定流程、条件流程与 Agent 循环对比 | Node.js 25.8.2 | 11 项测试；42 次模型尝试，41 次结构化通过、1 次执行异常；含文案反例 |
| [`image-lazy-loading-boundaries`](./image-lazy-loading-boundaries/) | 全部正常、全部懒加载与混合策略的图片加载边界 | Node.js 25.8.2、Chromium 151 | 19 项行为检查；两种样式延迟、每组 3 轮测量 |
| [`content-visibility-vs-virtual-list`](./content-visibility-vs-virtual-list/) | 长页面的普通渲染、CSS 跳过渲染与已知高度窗口化对比 | Node.js 25.8.2、Chromium 151 | 32 项断言与五轮测量 |
| [`ai-app-testing-layers`](./ai-app-testing-layers/) | AI 应用的状态测试、工具契约与真实模型冒烟评估 | Node.js 25.8.2、npm 11.9.0 | 16 项确定性测试通过；真实模型 10 次窄任务通过 |
| [`typescript-7-migration`](./typescript-7-migration/) | TypeScript 7 迁移与 6/7 双版本验证 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`webmcp-agent-tools`](./webmcp-agent-tools/) | WebMCP 结构化工具的类型与应用层行为 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`nextjs-security-patch-ci`](./nextjs-security-patch-ci/) | Next.js 安全版本、锁文件与依赖审计门禁 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`nextjs-16-3-instant-navigation`](./nextjs-16-3-instant-navigation/) | Next.js 16.3 即时导航与 App Shell | Node.js 25.8.2、npm 11.9.0、Chromium | 已验证 |
| [`tencentdb-agent-memory-v2`](./tencentdb-agent-memory-v2/) | TencentDB Agent Memory v3 TypeScript SDK 请求契约 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`playwright-162-agent-loop`](./playwright-162-agent-loop/) | Playwright 1.62 MCP、CLI 与 AbortSignal 测试闭环 | Node.js 25.8.2、npm 11.9.0、Chromium | 已验证 |
| [`agent-plugins-1-frontend-quality`](./agent-plugins-1-frontend-quality/) | Agent Plugins 1.0 团队质量门禁、Schema 与路径安全 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`mcp-permission-lab`](./mcp-permission-lab/) | MCP 工具风险分级、审批、幂等、超时与审计 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`nextjs-agent-approval-idempotency`](./nextjs-agent-approval-idempotency/) | Agent 工具审批、拒绝与幂等状态机 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`feature-flag-configuration-governance`](./feature-flag-configuration-governance/) | Feature Flag 灰度、回滚与前端配置治理 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`spec-coding-workflow`](./spec-coding-workflow/) | Spec Coding 规格、任务与状态机追踪 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`openai-node-stream-cancellation`](./openai-node-stream-cancellation/) | OpenAI Node SDK 7.7 Responses 流式取消与 SSE 连接关闭 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`react-19-3-view-transition-fragment-ref`](./react-19-3-view-transition-fragment-ref/) | React 19.3 ViewTransition 与 Fragment ref | Node.js 25.8.2、npm 11.9.0、Chromium | 已验证 |
| [`postmessage-oauth-callback-security`](./postmessage-oauth-callback-security/) | OAuth popup 回调的 postMessage 安全契约 | Node.js 25.8.2、npm 11.9.0、Chromium | 已验证 |
| [`ui-contract-generative-ui`](./ui-contract-generative-ui/) | 生成式 UI 的 Schema、设计令牌与静态降级契约 | Node.js 25.8.2、npm 11.9.0 | 已验证 |
| [`deno-desktop-minimal`](./deno-desktop-minimal/) | Deno Desktop 最小页面、测试与 Windows 打包 | Deno 2.9.6、Windows 11 x64 | 已验证 |
| [`responsive-iframe-chrome154`](./responsive-iframe-chrome154/) | Chrome 154 响应式 iframe、跨源双向授权与动态内容降级 | Node.js 25.8.2、Chrome 154 Beta | 已验证 |
| [`css-width-overflow-lab`](./css-width-overflow-lab/) | width: 100%、Flex/Grid 最小尺寸与局部溢出处理 | Node.js 25.8.2、Chromium 151 | 已验证 |

## 使用方式

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/<实验目录>
npm ci
npm run verify
```

个别实验还有浏览器安装或实时安全检查等附加命令，请先阅读对应目录的 `README.md`。

## 目录约定

每个实验目录必须包含：

- 独立的 `README.md`，说明文章主题、环境、命令、预期结果和限制。
- 可直接安装的依赖清单与锁文件。
- 最小但完整的源码与验证脚本。
- 一个聚合验证命令，例如 `npm run verify`。

不提交 `node_modules`、构建产物、缓存、密钥、账号数据或无法公开的数据集。失败用例必须明确标注为预期失败，不能让读者误以为仓库已损坏。

## 许可证

[MIT](./LICENSE)
