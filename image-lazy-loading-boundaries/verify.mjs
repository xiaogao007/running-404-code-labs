import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createLabServer } from "./server.mjs";
const server = createLabServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let checks = 0;
const check = (x, message) => {
  assert.ok(x, message);
  checks++;
};
try {
  for (const mode of ["eager", "lazy", "mixed"]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const requested = new Set();
    page.on("request", (r) => {
      if (r.url().includes("/img/")) requested.add(new URL(r.url()).pathname);
    });
    await page.goto(`${origin}/?mode=${mode}`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#hero").evaluate((i) => i.decode());
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => ({
      count: document.images.length,
      loading: [...document.images].map((i) => i.loading),
      dims: [...document.images].every((i) => i.width > 0 && i.height > 0),
      visible: [...document.images]
        .filter((i) => i.getBoundingClientRect().top < innerHeight)
        .map((i) => i.loading),
    }));
    check(state.count === 61, mode + " image count");
    check(state.dims, mode + " dimensions");
    check(
      state.loading[0] === (mode === "lazy" ? "lazy" : "eager"),
      mode + " hero policy",
    );
    if (mode === "eager")
      check(requested.size === 61, "all eager images requested");
    else check(!requested.has("/img/59.png"), "distant lazy image deferred");
    if (mode === "mixed")
      check(
        state.visible.every((v) => v === "eager"),
        "visible images eager in desktop layout",
      );
    await page.locator("#p59").scrollIntoViewIfNeeded();
    await page.locator("#p59").evaluate((i) => i.decode());
    check(requested.has("/img/59.png"), mode + " scroll request");
    check(
      await page.locator("#p59").evaluate((i) => i.naturalWidth === 480),
      mode + " decoded",
    );
    await page.close();
  }
  console.log(
    JSON.stringify({ checks, browser: browser.version(), status: "passed" }),
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
