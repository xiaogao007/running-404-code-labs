import { expect, test } from "@playwright/test";

async function openCallback(page) {
  const popupPromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "打开预期回调页" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  return popup;
}

test("accepts only a complete callback from the expected origin and popup", async ({ page }) => {
  await page.goto("/");
  const popup = await openCallback(page);

  await popup.getByRole("button", { name: "发送合法回调" }).click();

  await expect(page.getByTestId("callback-status")).toHaveText(
    "已接收：回调通过 origin、source、schema 和 state 校验",
  );
});

test("rejects a message with missing required fields", async ({ page }) => {
  await page.goto("/");
  const popup = await openCallback(page);

  await popup.getByRole("button", { name: "发送缺字段消息" }).click();

  await expect(page.getByTestId("callback-status")).toHaveText(
    "已拒绝：message schema has missing or unexpected fields",
  );
});

test("rejects a lookalike message after the expected popup navigates to another origin", async ({ page }) => {
  await page.goto("/");
  const popup = await openCallback(page);
  await popup.goto("http://127.0.0.1:4176/attacker.html?targetOrigin=http%3A%2F%2F127.0.0.1%3A4174&state=demo-state-71c9");

  await popup.getByRole("button", { name: "发送伪造回调" }).click();

  await expect(page.getByTestId("callback-status")).toHaveText(
    "已拒绝：origin 不匹配（http://127.0.0.1:4176）",
  );
});
