const page = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Deno Desktop Minimal</title>
    <style>
      body { font: 16px/1.6 system-ui; max-width: 680px; margin: 64px auto; padding: 0 24px; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Deno Desktop Minimal</h1>
    <p>这个页面由 <code>Deno.serve()</code> 提供，并由桌面 WebView 渲染。</p>
  </body>
</html>`;

export function handler(): Response {
  return new Response(page, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
