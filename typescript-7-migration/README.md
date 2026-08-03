# TypeScript 7 迁移验证

配套文章：TypeScript 7 正式版迁移指南。

本实验验证 TypeScript 7 的配置变化、TypeScript 6/7 双版本共存，以及默认包入口的编译器 API 边界。它不承担大型项目性能基准。

## 环境

- Windows
- Node.js 25.8.2
- npm 11.9.0
- TypeScript 7.0.2
- TypeScript 6 兼容 CLI：实际报告 6.0.3
- `@types/node` 26.1.2

其他操作系统和较新的 Node.js/npm 版本也可以尝试，但结果应以本机实际输出为准。

## 安装

```bash
npm ci
```

## 一键验证

```bash
npm run verify
```

该命令执行两组检查：

1. TypeScript 6/7 的成功路径和默认 API 检查。
2. `types`、`rootDir`、`target: ES5` 三个预期失败用例。

全部行为符合预期时，命令退出码为 `0`。

## 单独运行

```bash
npm run check:ts7
npm run check:ts6
npm run inspect:ts7-api
npm run inspect:ts6-api
npm run emit:explicit-root
```

预期失败用例：

```bash
npm run check:no-types
npm run check:legacy
npm run emit:default-root
```

这些命令直接运行时会返回非零退出码，分别对应：

| 命令 | 预期诊断 |
| --- | --- |
| `check:no-types` | `TS2591`：未显式声明 Node.js 全局类型 |
| `check:legacy` | `TS5108`：`target: ES5` 已移除 |
| `emit:default-root` | `TS5011`：需要显式设置 `rootDir` |

## API 验证

`inspect:ts7-api` 验证 TypeScript 7 默认包入口没有稳定的 `createProgram`；`inspect:ts6-api` 验证兼容包仍提供 TypeScript 6 编译器 API。

TypeScript 7 包中的 `unstable/*` 子路径不在本实验的支持范围内。

## 限制

- 未运行大型仓库性能基准。
- 未验证 Vue、Svelte、Astro、MDX 或 Angular 编辑器插件链路。
- 依赖版本变化后，错误编号和诊断文本可能变化。
