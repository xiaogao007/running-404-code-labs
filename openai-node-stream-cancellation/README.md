# OpenAI Node SDK 7.7 流式取消实验

对应文章：OpenAI Node SDK 7.7：流式请求取消，不只是加一个 `AbortController`

## 环境

- Node.js 25.8.2
- npm 11.9.0
- `openai` 7.7.0

## 运行

```bash
npm ci
npm run verify
```

实验启动本地 HTTP SSE 假服务，用真实 `openai@7.7.0` 客户端请求 `/responses`，依次验证：

1. 传入 `AbortSignal` 后主动中止；
2. 提前跳出 `for await`；
3. `responses.stream()` 调用 `abort()`。

预期输出中 `closed` 为 3、`completed` 为 0，表示三次客户端取消都在收到完成事件前关闭了本地 HTTP 响应。

## 限制

- 假服务不调用 OpenAI API，不验证真实模型生成、供应商侧排队或计费结算。
- HTTP 连接关闭证明的是客户端到服务端的传输终止，不等于已经生成的 token 被撤回。
- 不覆盖浏览器代理、Serverless 平台和第三方网关对断开连接的额外行为。
