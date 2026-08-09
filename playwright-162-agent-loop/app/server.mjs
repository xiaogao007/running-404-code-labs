import { createServer } from 'node:http';

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Agent Task Board</title>
    <style>
      :root { color-scheme: light; font: 16px/1.5 system-ui, sans-serif; }
      body { margin: 0; background: #f5f7fb; color: #172033; }
      main { width: min(680px, calc(100% - 32px)); margin: 48px auto; }
      section { background: #fff; border: 1px solid #dce2ef; border-radius: 12px; padding: 24px; box-shadow: 0 8px 24px rgb(23 32 51 / 6%); }
      form { display: flex; gap: 8px; }
      input { flex: 1; min-width: 0; padding: 10px 12px; border: 1px solid #b9c3d6; border-radius: 6px; font: inherit; }
      button { border: 0; border-radius: 6px; padding: 10px 14px; background: #2457d6; color: #fff; font: inherit; cursor: pointer; }
      button.secondary { background: #e9eefb; color: #21439b; }
      ul { display: grid; gap: 8px; padding: 0; list-style: none; }
      li { display: flex; align-items: center; gap: 10px; padding: 10px; background: #f7f9fd; border-radius: 6px; }
      li.completed span { color: #647089; text-decoration: line-through; }
      [role="status"] { min-height: 24px; margin-top: 16px; color: #40506e; }
    </style>
  </head>
  <body>
    <main>
      <section aria-labelledby="title">
        <h1 id="title">Agent Task Board</h1>
        <p>一个可被自动化工具可靠操作的最小页面。</p>
        <form aria-label="Add task form">
          <label for="task-input" hidden>Task</label>
          <input id="task-input" name="task" placeholder="输入任务" autocomplete="off">
          <button type="submit">Add task</button>
        </form>
        <ul id="task-list" aria-label="Task list"></ul>
        <div role="status" aria-live="polite"></div>
      </section>
    </main>
    <script>
      const form = document.querySelector('form');
      const input = document.querySelector('#task-input');
      const list = document.querySelector('#task-list');
      const status = document.querySelector('[role="status"]');
      let taskId = 0;

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const title = input.value.trim();
        if (!title) {
          status.textContent = '请输入任务';
          return;
        }
        taskId += 1;
        const item = document.createElement('li');
        item.dataset.taskId = String(taskId);
        item.innerHTML = '<input type="checkbox" aria-label="完成任务">' +
          '<span></span><button type="button" class="secondary" aria-label="删除任务">Delete</button>';
        item.querySelector('span').textContent = title;
        item.querySelector('input').addEventListener('change', (e) => {
          item.classList.toggle('completed', e.target.checked);
          status.textContent = e.target.checked ? '任务已完成' : '任务已恢复';
        });
        item.querySelector('button').addEventListener('click', () => {
          item.remove();
          status.textContent = '任务已删除';
        });
        list.append(item);
        input.value = '';
        status.textContent = '任务已添加';
      });
    </script>
  </body>
</html>`;

const server = createServer((request, response) => {
  if (request.url === '/' || request.url === '/index.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
    return;
  }
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

server.listen(4173, '127.0.0.1', () => {
  console.log('Agent Task Board listening on http://127.0.0.1:4173');
});
