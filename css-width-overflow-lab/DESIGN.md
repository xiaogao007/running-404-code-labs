---
version: alpha
colors:
  ink: "#17333e"
  muted: "#486572"
  paper: "#edf5f7"
  surface: "#ffffff"
  line: "#c4d7de"
  accent: "#006e86"
  accent-soft: "#e1f4f7"
  warning: "#8c431c"
  warning-soft: "#fff2e8"
typography:
  body:
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    lineHeight: "1.65"
  display:
    fontFamily: '"Arial Narrow", "Microsoft YaHei", sans-serif'
  mono:
    fontFamily: 'Consolas, "Courier New", monospace'
rounded:
  panel: "10px"
  control: "6px"
spacing:
  page: "28px"
  panel: "26px"
  gap: "16px"
components:
  measurement:
    typography: "{typography.mono}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.surface}"
---

## Overview

中文教学实验，面向需要定位 CSS 溢出的前端开发者。单页工具，核心任务是切换条件并读到可信的几何差异。视觉参考是蓝青色布局测量仪：固定画布、刻度线、框线与读数构成主视觉。无账户、联网数据、持久化或业务写入。

早期方案比较过左右分栏控制台与上下排列工作台；选上下排列，使固定宽度画布在桌面可完整展示，窄屏只滚动画布。避免将全部内容做成独立统计卡片，读数共用一条测量带。

## Colors

样式所有权采用 Model B：`styles.css` 中 `:root` 运行时变量为唯一源，本文精确记录接受的值。`colors.*` 按同名映射到 `--*`。青色代表测量边界与操作，棕色只用于溢出诊断，并以文字补充状态。滚动条的 thumb / track / hover / active 变量由全局 CSS 所有。

## Typography

系统中文字体保持离线且没有字体交换；标题用 Arial Narrow / 中文回退，正文 Segoe UI / 微软雅黑，几何值与代码用 Consolas。分别对应 `--display-font`、`--body-font`、`--mono-font`。英文只是 CSS 关键字或样本标记，交互与诊断均为中文。

## Layout

页面最大宽 1100px，外边距自然滚动，不锁定视口高度。工作台固定画布 720px，侧栏 160px、gap 16px、main 可用 544px。画布是有标签的显式滚动区。720px 以下开关纵向、测量二列；320px 页面不得产生水平溢出。试验样本中的故意溢出不传播到外壳。

## Elevation & Depth

使用背景层次与实线边框，不使用阴影；实验 main 的 2px 青色边框是读数的可见边界。

## Shapes

面板 10px、操作 6px、小样本 4px 圆角。宽度标尺与盒模型虚线只用于表达测量范围。

## Components

原生 radio/checkbox 保留平台键盘操作和明确 label；按钮统一 44px 最小高度、有 hover、active、focus-visible。禁用 Grid 开关用 disabled 语义和文字说明。诊断固定最小高度、polite live region。所有滚动区域继承全局 scrollbar-color/width 与 WebKit fallback；强制颜色恢复系统值。

## Do's and Don'ts

- 保留故障，只限制它的实验边界，不以全局裁剪掩盖问题。
- 读数从 DOM 实测，说明 border-box / clientWidth / scrollWidth 的差别。
- URL 折行会参与 min-content；不得描述成完全独立变量。
- 无加载、错误网络请求、CRUD 或空数据状态；此工具没有相应异步业务。
- 只有轻微按压位移，减少动态效果时取消。
