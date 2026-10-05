import { cases, run, grade } from "./lab.mjs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
if (!process.env.OPENAI_API_KEY || !process.env.AI_EVAL_MODEL) {
  console.error(
    "Configure OPENAI_API_KEY, AI_EVAL_MODEL and optionally AI_EVAL_BASE_URL for the same provider.",
  );
  process.exit(2);
}
const model = process.env.AI_EVAL_MODEL,
  base = (process.env.AI_EVAL_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
let report = {
  recordedAt: new Date().toISOString(),
  node: process.version,
  model,
  temperature: 0,
  trials: 2,
  rows: [],
};
if (process.env.EVAL_RESUME === '1') {
  report = JSON.parse(await readFile('reports/live.json', 'utf8'));
  if (report.model !== model) throw new Error('resume-model-mismatch');
}
let failed = false;
evaluation: for (let trial = 0; trial < 2; trial++)
  for (const sample of cases)
    for (const mode of trial === 0
      ? ["fixed", "conditional", "agent"]
      : ["agent", "conditional", "fixed"]) {
      if (report.rows.some(r => r.trial === trial && r.caseId === sample.id && r.mode === mode)) continue;
      const start = performance.now();
      const deadline = AbortSignal.timeout(180000);
      try {
        const result = await run(
          mode,
          sample,
          async (messages, tools, forced) => {
            const response = await fetch(base + "/chat/completions", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + process.env.OPENAI_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages,
                tools,
                tool_choice: "auto",
                parallel_tool_calls: false,
                temperature: 0,
                max_tokens: 800,
              }),
              signal: AbortSignal.any([deadline, AbortSignal.timeout(45000)]),
            });
            if (!response.ok) throw new Error("http-" + response.status);
            const data = await response.json();
            return {
              message: data.choices[0].message,
              usage: data.usage,
              responseModel: data.model,
            };
          },
        );
        const verdict = grade(sample, result);
        report.rows.push({
          trial,
          caseId: sample.id,
          mode,
          latencyMs: performance.now() - start,
          ...result,
          verdict,
        });
        console.log(
          sample.id,
          trial,
          mode,
          verdict.passed ? "PASS" : "FAIL",
          result.calls.length,
          result.trace.length,
        );
      } catch (e) {
        report.rows.push({
          trial,
          caseId: sample.id,
          mode,
          latencyMs: performance.now() - start,
          error:
            /^(http-\d+|tool-budget|model-budget|expected-one-tool|invalid-plan|invalid-final|unknown-tool)$/.test(
              e.message,
            )
              ? e.message
              : e.name,
        });
        console.log(sample.id, trial, mode, "ERROR");
        failed = true;
      }
      await mkdir("reports", { recursive: true });
      await writeFile(
        "reports/live.json",
        JSON.stringify(report, null, 2) + "\n",
      );
      if (failed) {
        process.exitCode = 2;
        break evaluation;
      }
    }
console.log(
  JSON.stringify({
    rows: report.rows.length,
    passed: report.rows.filter((r) => r.verdict?.passed).length,
  }),
);
