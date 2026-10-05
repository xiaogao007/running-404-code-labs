import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import assert from "node:assert/strict";
import { createLabServer, assetSizes } from "./server.mjs";
const server = createLabServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`,
  browser = await chromium.launch();
const samples = [],
  modes = ["eager", "lazy", "mixed"];
try {
  for (const cssDelay of [0, 600])
    for (let round = 0; round < 3; round++)
      for (const mode of [...modes.slice(round), ...modes.slice(0, round)]) {
        const context = await browser.newContext({
            viewport: { width: 1280, height: 900 },
          }),
          page = await context.newPage(),
          cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 80,
          downloadThroughput: 512000,
          uploadThroughput: 512000,
          connectionType: "cellular4g",
        });
        const requests = new Map();
        let imageWireBytes = 0;
        cdp.on("Network.requestWillBeSent", (e) => {
          if (e.request.url.includes("/img/"))
            requests.set(e.requestId, {
              url: new URL(e.request.url).pathname,
              timestamp: e.timestamp,
            });
        });
        cdp.on("Network.dataReceived", (e) => {
          if (requests.has(e.requestId)) imageWireBytes += e.encodedDataLength;
        });
        await page.goto(`${origin}/?mode=${mode}&cssDelay=${cssDelay}`, {
          waitUntil: "commit",
        });
        await page.waitForFunction(() => performance.now() >= 5000, null, {
          polling: 100,
          timeout: 20000,
        });
        const at5s = await page.evaluate(() => ({
          time: performance.now(),
          lcp: lab.lcp.at(-1),
          shifts: lab.shifts.reduce((a, b) => a + b, 0),
          resources: performance
            .getEntriesByType("resource")
            .filter((e) => e.initiatorType === "img")
            .map((e) => ({
              url: new URL(e.name).pathname,
              start: e.startTime,
              end: e.responseEnd,
              bytes: e.transferSize,
            })),
          heroReady:
            document.getElementById("hero").complete &&
            document.getElementById("hero").naturalWidth > 0,
        }));
        assert.ok(at5s.heroReady, "hero must finish before sample");
        assert.equal(at5s.lcp?.id, "hero", "hero must be LCP at cutoff");
        const initialCount = requests.size,
          wireAt5s = imageWireBytes;
        const scroll = await page.evaluate(async () => {
          const target = document.getElementById("p59"),
            alreadyDecoded = target.complete && target.naturalWidth > 0,
            t = performance.now();
          const loaded = alreadyDecoded
            ? Promise.resolve()
            : new Promise((resolve, reject) => {
                target.addEventListener("load", resolve, { once: true });
                target.addEventListener(
                  "error",
                  () => reject(new Error("target image failed")),
                  { once: true },
                );
              });
          target.scrollIntoView();
          await loaded;
          await target.decode();
          await new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          );
          return { alreadyDecoded, readyMs: performance.now() - t };
        });
        samples.push({
          mode,
          cssDelay,
          round,
          cutoffMs: at5s.time,
          lcpMs: at5s.lcp.time,
          lcpId: at5s.lcp.id,
          heroStartMs: at5s.resources.find((r) => r.url === "/img/hero.png")
            .start,
          initialRequests: initialCount,
          imageWireBytesAt5s: wireAt5s,
          completedTransferBytesAt5s: at5s.resources.reduce(
            (a, b) => a + b.bytes,
            0,
          ),
          layoutShiftSum: at5s.shifts,
          scroll,
          resources: at5s.resources,
        });
        console.log(
          JSON.stringify({
            mode,
            cssDelay,
            round,
            lcpMs: at5s.lcp.time,
            initialCount,
            scroll,
          }),
        );
        await context.close();
      }
  const median = (a) => [...a].sort((a, b) => a - b)[Math.floor(a.length / 2)];
  const summary = [];
  for (const cssDelay of [0, 600])
    for (const mode of modes) {
      const rows = samples.filter(
          (r) => r.mode === mode && r.cssDelay === cssDelay,
        ),
        out = { mode, cssDelay };
      for (const k of [
        "lcpMs",
        "heroStartMs",
        "initialRequests",
        "imageWireBytesAt5s",
        "completedTransferBytesAt5s",
        "layoutShiftSum",
      ])
        out[k] = median(rows.map((r) => r[k]));
      out.jumpReadyMs = median(rows.map((r) => r.scroll.readyMs));
      summary.push(out);
    }
  await mkdir("reports", { recursive: true });
  await writeFile(
    "reports/benchmark.json",
    JSON.stringify(
      {
        environment: {
          node: process.version,
          browser: browser.version(),
          os: `${os.platform()} ${os.release()}`,
          cpu: os.cpus()[0].model,
          viewport: "1280x900",
          network: { latencyMs: 80, downloadBytesPerSecond: 512000 },
          assetSizes,
        },
        method:
          "3 cold contexts per mode per CSS delay; rotated order; no CPU throttle; 5s cutoff from navigation; LCP sampled before scroll; jump to last card then decode + two rAF; synthetic PNGs, localhost HTTP/1.1; Network.dataReceived encoded bytes excludes headers and may have protocol buffering; resource transferSize includes only completed requests; shift sum is diagnostic, not session-window CLS",
        summary,
        samples,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
