# MCP Permission Lab

一个可运行的 MCP 权限治理实验，模拟前端团队常见的四类工具：公开只读、内部只读、业务写入，以及发布/破坏性操作。

## 环境

- Node.js 25.8.2
- npm 11.9.0
- `@modelcontextprotocol/sdk` 1.30.0
- `zod` 4.4.3

## 工具分级

| 等级 | 工具 | 默认策略 |
| --- | --- | --- |
| L0 | `get_project_status` | 允许自动执行 |
| L1 | `search_internal_docs` | 租户隔离与身份校验 |
| L2 | `update_feature_flag` | 角色、确认令牌、幂等键 |
| L3 | `deploy_preview` / `delete_preview` | release-manager、确认令牌、幂等键 |

这是团队治理模型，不是 MCP 规范内置的四级权限标准。

## 安装与验证

```bash
npm ci
npm run verify
```

验证命令会检查：

- L0 只读调用可以通过；
- L1 跨租户读取被拒绝；
- L2 缺少确认令牌被拒绝，带确认与幂等键才通过；
- L3 普通 writer 无法部署；
- 工具超时会失败；
- 真实 stdio MCP server 能列出工具并完成拒绝、批准和部署模拟调用。

成功输出：

```text
verify: four-level policy, tenant isolation, approval, idempotency, timeout, and MCP calls passed.
```

## 边界

- `server/index.mjs` 只返回模拟结果，不执行部署、删除、shell 或网络请求。
- 策略判断与 MCP 协议调用都在本地验证；没有替代企业身份系统、审批系统和审计平台。
- `readOnlyHint`、`destructiveHint` 等工具注解用于帮助客户端理解行为，不能替代 Server 端访问控制。
- 演示用确认令牌不是生产认证方案。生产环境应接入真实用户确认、短时授权和服务端策略。
