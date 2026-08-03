const { spawnSync } = require("node:child_process");

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error("Run this script through npm so npm_execpath is available");
}

const scripts = [
  "check:ts7",
  "check:ts6",
  "inspect:ts7-api",
  "inspect:ts6-api",
  "emit:explicit-root"
];

for (const script of scripts) {
  const result = spawnSync(process.execPath, [npmCli, "run", script], {
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
