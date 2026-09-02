# MCP Apps: sandbox, state, and consent

这是《MCP Apps：工具开始返回交互式 UI，前端如何设计沙箱、状态同步与用户确认？》的最小实验。

## 环境

- Node.js 18+
- npm 9+
- `@modelcontextprotocol/ext-apps` 1.7.5
- `@modelcontextprotocol/sdk` 1.30.0
- React 19.1.1 + Vite 6.3.5

## 安装与验证

```bash
npm ci
npm run verify
```

验证会检查：

- UI 已被 Vite 打包为单文件 HTML；
- MCP Tool 声明了 `ui://` Resource；
- UI 使用 `app.connect()`、`ontoolresult` 和 `callServerTool()`；
- 写操作同时携带 `requestId` 与 `idempotencyKey`；
- Server 拒绝两者不一致的请求。

## 本地运行

```bash
npm run build
npx tsx src/server.mts
```

要在真实宿主中渲染，需要使用支持 MCP Apps 的 Host，或使用 `modelcontextprotocol/ext-apps` 仓库中的 `examples/basic-host`。

## 限制

- Feature Flag 修改是模拟返回，不连接数据库、部署平台或生产环境。
- `requestId`/`idempotencyKey` 校验用于演示控制流，不是生产认证方案。
- 沙箱由 Host 创建；此仓库只展示 App 侧和 Server 侧的契约，未实现完整 Host。
