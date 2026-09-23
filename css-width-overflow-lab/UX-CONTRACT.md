# 单页实验交互约定

范围来自 README 的教学任务；风格与 tokens 见 DESIGN.md。相邻参考是仓库内 responsive-iframe-chrome154 的原生静态实验，沿用 npm 验证/本地预览模式；它没有可复用的应用 UI 组件。这一页不承担账户、权限、财务、个人数据、删除或远端写入。

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | index.html 原生 radio/checkbox + app.js update | 本文 | 布局、样本、可逆开关 | verify.mjs 键盘及状态断言 |
| Scrollbar | styles.css 全局基线 | DESIGN.md | 画布滚动、局部内容滚动、盒模型滚动 | verify.mjs 计算样式及方向键 |
| Status | app.js measure + #diagnosis | README 几何定义 | 盒子过宽、内容仍越界、全部收住 | verify.mjs 几何与诊断一致 |

交互立即本地完成，不产生 loading、异步失败或空结果。切换样本和布局保留可适用开关；Flex 禁用 Grid 专用开关，切回恢复选择。“复现溢出”关闭三种修复，保留布局和样本；“应用完整修复”打开 main 收缩与内容处置。刷新恢复默认 Grid / 代码 / 未修复；不持久化，因为它是可重置演示而非读者草稿。

画布、内容区和盒模型对照可聚焦并原生滚动。table 仅固定 3 条演示数据，不支持排序、选择或分页。无自定义 select、对话框和 toast。输出真实测量，诊断的 live region 不转移焦点。

语言 zh-CN，单一浅色主题；强制颜色和减少动态效果有系统适配。验证码、上传、搜索、业务校验以及服务器业务错误均不适用。本地静态资源缺失返回 404，不伪装业务页面。
