import { expect, test } from "@playwright/test";

test("runs a directional React Transition update and changes the displayed card", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("release-card")).toContainText("把状态变化说清楚");

  await page.getByRole("button", { name: "下一张" }).click();

  await expect(page.getByTestId("release-card")).toContainText("让方向成为语义");
  await expect(page.getByTestId("transition-count")).toHaveText("已执行 1 次 Transition 更新");
  await expect(page.getByTestId("view-transition-support")).toContainText("浏览器 View Transition API：可用");
});

test("attaches a click listener and focus operation to an explicit Fragment ref", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "打开预览" }).click();
  await expect(page.getByTestId("fragment-status")).toHaveText("分组捕获到：预览");

  await page.getByRole("button", { name: "聚焦这组控件" }).click();
  await expect(page.getByRole("button", { name: "保存草稿" })).toBeFocused();
});
