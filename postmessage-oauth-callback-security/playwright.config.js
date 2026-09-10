import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
