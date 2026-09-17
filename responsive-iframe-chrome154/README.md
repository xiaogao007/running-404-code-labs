# Chrome 154 响应式 iframe 实验

验证 `frame-sizing: content-height` 与 `<meta name="responsive-embedded-sizing">` 的跨源双向授权，以及加载后的动态内容为什么仍需 `ResizeObserver + postMessage`。

## 运行

```bash
npm ci
npm run verify
npm start
```

浏览器打开 `http://127.0.0.1:4173`。父页面在 4173、子页面在 4174，因此属于跨源嵌入。

## 预期结果

- Chrome 154 Beta 中，原生 iframe 初始高度约为 420px。
- 1 秒后子页增加 260px 内容，原生 iframe 高度不再变化，内部出现溢出。
- 降级 iframe 会从约 420px 增长到约 680px。

`npm run verify` 只检查源码契约；上述浏览器行为需在支持该实验特性的浏览器中观察。

## 边界

- 当前设计只在子文档 `load` 时计算一次尺寸。
- 父子页面必须分别通过 CSS 和 meta 显式授权；跨源示例还在 meta 中声明了 `allow-origins=*`，生产环境应缩小允许范围。
- 示例严格校验 `message` 的来源，生产代码还应设计消息 schema、限频与异常上限。
