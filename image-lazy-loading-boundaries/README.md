# 图片全部 loading="lazy"，页面就更快了吗？

同一个静态商品列表，比较全部 eager、全部 lazy、首屏 eager / 其余 lazy。无第三方图片、用户数据、框架或 CDN。PNG 由固定种子的本地算法生成；每张卡片使用不同 URL，避免请求去重。

## 运行

```bash
npm ci
npx playwright install chromium
npm run verify
npm run bench
node plot.mjs
npm run dev
```

打开 http://127.0.0.1:4173/?mode=mixed ，可切换 `eager` / `lazy` / `mixed`。加 `&cssDelay=600` 可让样式表服务器响应额外等待 600ms。

`node plot.mjs` 从报告中的第 1 轮原始样本生成 `reports/hero-timeline.svg`，不是拼接中位数得到的虚构瀑布图。

环境：Node.js 25.8.2、npm 11.9.0、Playwright 1.62.1、Chromium 151.0.7922.34、Windows；CPU 和完整环境保存在报告中。支持 Node >=22。

## 实验控制

- 1 张 1000×320 主视觉 + 60 张 480×240 商品图；三列布局；1280×900 视口。
- 图片均有 width/height，均使用 fetchpriority="auto"；混合策略为主视觉和前 6 张商品图 eager，其余 lazy。这个索引仅适用于实验布局，不是通用业务组件规则。
- 每次创建全新浏览器上下文，缓存禁用；无 CPU 限速；本地 HTTP/1.1 服务。
- CDP 模拟网络：80ms latency、512000 bytes/s 下载与上传吞吐。模拟值不等同真实用户网络。
- 样式表额外延迟 0 / 600ms；每种组合测量 3 次，轮换执行顺序。所有原始样本保存在 reports/benchmark.json。
- 导航后约 5000ms 截取 LCP，断言该时刻主视觉已下载且确为 LCP 元素，然后直接跳到最后一张商品图。
- 记录跳转时图片是否完成、decode() 加两次 requestAnimationFrame 的等待时间。这是末尾跳转压力场景，不是匀速滚动测试，也不等同精确的屏幕呈现时间。

## 指标口径

`heroStartMs` 是 Resource Timing startTime（开始获取，包含后续排队），不是服务器收到请求的时刻。

`initialRequests` 是截止时间前 CDP 观察到的图片请求发起数量，包括尚未完成的请求。

`imageWireBytesAt5s` 是 Network.dataReceived.encodedDataLength 的图片响应体累计值，不含 HTTP 头，存在协议事件缓冲；不要当作精确运营流量账单。

`completedTransferBytesAt5s` 只累加已经完成的图片 Resource Timing transferSize，包含头部但漏掉在途请求；不能把它当成全部传输量。

`layoutShiftSum` 是无近期输入的布局偏移简单求和，仅用于诊断，未按会话窗口计算正式 CLS。

`verify` 检查 19 项行为：数量、尺寸、加载配置、远处图片延后、滚动触发与成功解码。没有把某个性能大小关系写成断言。`bench` 额外检查 LCP 元素和主视觉加载完成，性能数字自然会随机器变化。

## 限制

合成噪声图片只用于提供可复现字节负载，不代表真实照片编码效率。固定桌面视口、单一浏览器、三轮测量均不足以推断线上百分比收益。浏览器懒加载提前量可能变化，不能把观察到的请求数变成常量。未覆盖 HTTP/2/3、移动真机、CDN、SSR 框架图片组件、真实用户 RUM、自然连续滚动或单独的 fetchpriority/尺寸占位对照。

测量结论应结合报告阅读；尤其不要用请求数量代替传输字节，也不要用无布局偏移的受控页面承诺业务 CLS 为零。
