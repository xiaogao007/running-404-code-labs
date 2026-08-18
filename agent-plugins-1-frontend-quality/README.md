# Agent Plugins 1.0 Frontend Quality Gate

一个面向团队落地的最小 Agent Plugins 1.0 包，同时包含可移植 Skill 与只读 MCP 工具。

## 环境

- Node.js 25.8.2
- npm 11.9.0
- Agent Plugins specification 1.0.0
- `@modelcontextprotocol/sdk` 1.30.0

## 目录

```text
.
|-- plugin.json
|-- mcp.json
|-- skills/frontend-quality/SKILL.md
|-- server/index.mjs
|-- schemas/
|-- fixtures/
`-- scripts/verify.mjs
```

`plugin.json` 是包的唯一可移植清单。`skills/` 与根目录 `mcp.json` 是 1.0 规范定义的两个固定组件位置。示例 MCP 工具只返回静态检查清单，不读取项目文件、不执行 shell 命令，也不接触凭据。

## 安装与验证

```bash
npm ci
npm run verify
```

验证命令会检查：

- `plugin.json` 是否符合官方 1.0.0 schema 快照；
- 非法插件名与未知顶层字段是否被拒绝；
- `mcp.json` 是否符合官方 1.0.0 schema 快照；
- Skill 目录名与 `SKILL.md` frontmatter 名称是否一致；
- 插件相对路径是否留在插件根目录内；
- MCP stdio server 能否完成握手并返回只读质量门禁。

成功时输出：

```text
verify: plugin schema, MCP schema, skill discovery, path containment, and MCP tool passed.
```

## 团队使用建议

1. 把团队稳定规则写入 Skill，把需要结构化输入输出的能力放进 MCP。
2. 插件版本使用 Semantic Versioning，并让升级经过代码评审与回归验证。
3. 在组织层维护可信 marketplace 与插件 allowlist；MCP server 再单独做命令、网络、凭据和数据范围审查。
4. 客户端支持存在差异时，只把 `skills/` 和 `mcp.json` 视为 1.0 的可移植核心。

## 限制

- 本实验验证包结构、schema、路径语义和 MCP 协议调用，没有替代 VS Code、Copilot CLI 或其他客户端的实际安装验收。
- `schemas/` 保存 2026-08-18 核验的官方 1.0.0 schema 快照；规范正文在冲突时优先。
- 示例没有提供部署、写文件、网络请求或任意命令执行工具，不能据此推断高权限 MCP server 的安全性。

## 一手资料

- https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md
- https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
