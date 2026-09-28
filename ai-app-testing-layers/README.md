# AI 应用自动化测试：三层最小实验

主题：AI 每次回答都不一样，前端自动化测试到底测什么？

本目录是框架无关的订单助手测试实验，不含网页 UI。数据全部为合成数据。

## 环境与复现

2026-09-28 实际验证：Windows、Node.js 25.8.2、npm 11.9.0。
固定依赖：ai 7.0.118、@ai-sdk/openai 4.0.78、zod 4.6.5。
依赖要求 Node.js >=22；未宣称已验证其他运行时。

```bash
git clone https://github.com/xiaogao007/running-404-code-labs.git
cd running-404-code-labs/ai-app-testing-layers
npm ci
npm run verify
```

预期：16 项确定性测试通过，不需要模型密钥，不发起模型请求。
无效参数、跨租户访问、错误结果等反例被测试断言捕获，不会导致 verify 失败。

## 文件与职责

- src/controller.js：等待、流式、空输出、失败及请求归属；没有 DOM 渲染。
- src/orders.js：严格输入、服务端可信租户、结果结构和受控工具。
- test/layers.test.js：AI SDK Mock 集成、状态逻辑、工具契约与评分器反例。
- src/evaluation.js：固定提示词、5 个合成任务与规则评分器。
- scripts/eval-live.js：独立真实模型评估；每任务 2 次；最多 3 步；每步输出上限 300 tokens；每任务尝试 45 秒超时；自动重试关闭。
- reports/live-latest.json：真实运行的脱敏文本、工具轨迹、模型标识、耗时与 token 用量。无密钥、请求头或真实订单。

## 真实模型评估（会调用付费 API）

使用你自己的账号和凭据配置 OPENAI_API_KEY；脚本不读取 .env，也不提供任何密钥。
默认模型为 gpt-4.1-mini-2025-04-14，默认采用 OpenAI 接口。
兼容服务需设置 AI_EVAL_MODEL，以及该服务所需的 AI_EVAL_BASE_URL；凭据必须属于你配置的服务，不要跨服务复用密钥。

```bash
npm run eval:live
```

退出码：0 表示全部规则通过；1 表示模型结果未通过规则；2 表示配置或接口错误。
没有密钥时明确退出，不会伪装为评估通过。

本次环境提供的兼容接入拒绝默认 GPT 模型（HTTP 400），随后明确选择接入支持的 deepseek-flash。
公开记录的请求模型与响应模型均为 deepseek-flash，并非 GPT 的评估结果。
实际运行命令（PowerShell；凭据已经在环境中）：

```powershell
$env:AI_EVAL_MODEL = 'deepseek-flash'
npm run eval:live
```

本次 5 个场景（存在、不存在、跨租户请求、服务不可用、缺少订单 ID），各 2 次，共 10/10 通过。
temperature=0 不保证未来输出完全一致。deepseek-flash 是本次接入返回的标识，不宣称为不可变模型快照。
读者模型、接入和运行时间不同，结果可能不同。请保留原始报告后再运行，脚本会更新 live-latest.json。

## 断言与边界

第一层运行真实 SDK Mock 流并检查应用状态；慢首段与乱序使用手动释放的 Promise，不靠固定 sleep。
第二层运行真实 lookupOrder 和 Schema；租户来源于受信服务端参数，模型无法通过输入切换。
跨租户与不存在统一返回 not_found，避免泄露记录存在性。
第三层同时检查最终 JSON 的字段、状态、金额和工具轨迹；无 ID 时应返回 clarify 且不调用工具。

评分器故意采用窄格式：它验证这个助手的结构化输出契约，不能用于评价任意自然语言回答。
工具 trace 只记录成功进入 execute 的调用；不完整地记录模型尝试过的所有无效调用。
本实验未验证 DOM、键盘操作、布局、无障碍、真实网络断流、取消请求、超时恢复、多轮对话、真实鉴权中间件或数据库。
controller 仅演示文本结果，纯工具卡片需要单独定义完成状态。
10 次试验是冒烟检查，不能推出线上可靠率、安全保证或模型排名。没有进行模型裁判或人工语义评分。
