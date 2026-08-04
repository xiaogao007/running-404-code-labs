# TencentDB Agent Memory 2.0 SDK Contract Lab

这组实验为《腾讯把 Agent 记忆做成了团队资产：拆解 TencentDB Agent Memory 2.0》提供读者可复现的代码验证。

它不需要腾讯云账号、Docker、真实 LLM 或 API Key。测试会在本机启动一个临时 HTTP Mock Server，观察已发布 TypeScript SDK 实际发出的请求。

## 验证内容

- v3 `MemoryClient` 在构造时拒绝空的 `teamId`、`agentId`、`userId`。
- 写入、查询和原子记忆搜索分别使用 `/v3/conversation/add`、`/v3/conversation/query`、`/v3/atomic/search`。
- 请求体携带 `team_id`、`agent_id`、`user_id`，并按配置携带 `session_id`、`task_id`。
- 请求头包含 Bearer 鉴权与 `x-tdai-service-id`。
- 已发布 beta.2 不会在客户端阻止“无 `session_id` 写入”或“无 `message_ids`/`session_id` 删除”；实验把这一版本风险固定为可观察断言。

## 环境

- 已验证：Node.js 25.8.2
- 已验证：npm 11.9.0
- 最低要求：Node.js 20
- SDK：`@tencentdb-agent-memory/memory-sdk-ts-v2@1.0.0-beta.2`

## 运行

```bash
npm ci
npm run verify
```

预期结果：3 个测试全部通过，命令退出码为 0。

## 文件

- `test/sdk-contract.test.mjs`：启动 Mock Server，并验证 SDK 的运行时校验和 HTTP 契约。
- `package.json` / `package-lock.json`：固定实验依赖与聚合验证命令。

## 验证边界

本实验只验证已发布 SDK 的客户端行为，不会启动完整的 MemoryCore、Memory Hub、MemoryKnowledge 或 MemoryProxy，也不验证：

- L0 到 L3 的异步记忆抽取、聚合和召回质量。
- Skill、Wiki、CodeGraph 的构建与权限治理闭环。
- 腾讯官方 PersonaMem、WideSearch、SWE-bench 基准结果。
- 腾讯云托管产品的可用性、性能、安全或生产部署能力。

SDK 当前仍为 beta，实验固定到 `1.0.0-beta.2`。未来版本若修改请求路径、字段或运行时校验，测试可能需要同步更新。

截至上游提交 `0aff21a2d9f2b8a0354aaa80a2e586aab4054562`，仓库里的后续源码已经增加“对话写入必须有 `session_id`”和“删除必须指定目标”的保护，但 npm 上的 beta.2 尚未包含这些保护。本文与实验以读者能够安装到的发布包行为为准。

## 上游来源

- [TencentDB Agent Memory 仓库](https://github.com/TencentCloud/TencentDB-Agent-Memory)
- [TypeScript SDK 源码](https://github.com/TencentCloud/TencentDB-Agent-Memory/tree/feat/server_team/sdk/memory-core/typescript)
- [v2.0.0 Release](https://github.com/TencentCloud/TencentDB-Agent-Memory/releases/tag/v2.0.0)

## 许可证

[MIT](../LICENSE)
