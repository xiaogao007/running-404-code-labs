# Deno Desktop 最小验证

本文实验验证 Deno 2.9.6 能否把一个由 `Deno.serve()` 提供页面的 TypeScript 项目打包为桌面应用。

## 环境

- Deno 2.9.6
- Windows 11 x64
- 默认 `webview` 后端

## 安装与验证

```bash
deno task verify
```

`verify` 会依次执行格式检查、Lint、类型检查、单元测试和 `deno desktop` 打包。所有步骤成功后退出码为
0，并删除临时构建产物。

## 手动构建

```bash
deno desktop --output DenoDesktopMinimal.exe main.ts
```

运行生成的程序后，会打开一个原生窗口；页面由 `Deno.serve()` 提供，并由系统 WebView 渲染。

## 预期结果

- 单元测试确认入口返回 HTML 页面与正确的 `content-type`。
- `deno desktop` 生成 Windows 桌面应用。
- 本实验不引入 Electron、Tauri 或额外前端框架。

## 限制

- `deno desktop` 在 Deno 2.9 中仍为实验功能。
- 自动验证只覆盖 Windows x64 的默认 `webview` 后端，不覆盖
  CEF、raw、代码签名、安装器、自动更新和跨平台产物。
- 打包成功不等于已经验证长期运行、升级回滚或生产环境兼容性。
