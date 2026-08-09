import { test, expect } from '@playwright/test';

test('agent can add and complete a task through stable semantics', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Task' }).fill('Review MCP permissions');
  await page.getByRole('button', { name: 'Add task' }).click();

  const task = page.getByRole('listitem').filter({ hasText: 'Review MCP permissions' });
  await expect(task).toBeVisible();
  await task.getByRole('checkbox', { name: '完成任务' }).check();
  await expect(task).toHaveClass(/completed/);
  await expect(page.getByRole('status')).toHaveText('任务已完成');
});

test('agent can remove a task without relying on CSS selectors', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Task' }).fill('Delete me');
  await page.getByRole('button', { name: 'Add task' }).click();

  const task = page.getByRole('listitem').filter({ hasText: 'Delete me' });
  await task.getByRole('button', { name: '删除任务' }).click();
  await expect(task).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('任务已删除');
});

test('AbortSignal cancels a long-running assertion', async ({ page }) => {
  await page.goto('/');
  const controller = new AbortController();
  const started = Date.now();
  setTimeout(() => controller.abort(), 80);

  let cancelled = false;
  try {
    await expect(page.getByRole('status')).toHaveText('永远不会出现', {
      timeout: 5_000,
      signal: controller.signal,
    });
  } catch {
    cancelled = controller.signal.aborted;
  }

  expect(cancelled).toBe(true);
  expect(Date.now() - started).toBeLessThan(1_000);
});
