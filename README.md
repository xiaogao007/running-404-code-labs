# 404 Code Labs

“404星球的猫”技术文章配套验证代码。每篇文章使用独立目录，保留可复现源码、依赖锁文件、运行命令、预期结果和验证边界。

## 实验索引

| 目录 | 主题 | 运行时 | 状态 |
| --- | --- | --- | --- |
| [`typescript-7-migration`](./typescript-7-migration/) | TypeScript 7 迁移与 6/7 双版本验证 | Node.js 25.8.2、npm 11.9.0 | 已验证 |

## 使用方式

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/typescript-7-migration
npm ci
npm run verify
```

## 目录约定

每个实验目录必须包含：

- 独立的 `README.md`，说明文章主题、环境、命令、预期结果和限制。
- 可直接安装的依赖清单与锁文件。
- 最小但完整的源码与验证脚本。
- 一个聚合验证命令，例如 `npm run verify`。

不提交 `node_modules`、构建产物、缓存、密钥、账号数据或无法公开的数据集。失败用例必须明确标注为预期失败，不能让读者误以为仓库已损坏。

## 许可证

[MIT](./LICENSE)
