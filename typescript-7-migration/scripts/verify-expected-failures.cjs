const { spawnSync } = require("node:child_process");

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error("Run this script through npm so npm_execpath is available");
}

const cases = [
  { script: "check:no-types", diagnostic: "TS2591" },
  { script: "check:legacy", diagnostic: "TS5108" },
  { script: "emit:default-root", diagnostic: "TS5011" }
];

for (const testCase of cases) {
  const result = spawnSync(process.execPath, [npmCli, "run", testCase.script], {
    encoding: "utf8"
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  process.stdout.write(output);

  if (result.error) {
    throw result.error;
  }

  if (result.status === 0) {
    throw new Error(`${testCase.script} unexpectedly succeeded`);
  }

  if (!output.includes(testCase.diagnostic)) {
    throw new Error(
      `${testCase.script} did not emit ${testCase.diagnostic}`
    );
  }
}

console.log("All expected-failure checks produced the intended diagnostics.");
