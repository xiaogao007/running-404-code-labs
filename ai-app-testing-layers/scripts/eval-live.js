import { generateText, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { makeTools } from '../src/orders.js';
import { cases, system, promptVersion, grade } from '../src/evaluation.js';

if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY is required; no evaluation ran.'); process.exit(2); }
const modelId = process.env.AI_EVAL_MODEL || 'gpt-4.1-mini-2025-04-14';
const model = createOpenAI({ apiKey: process.env.OPENAI_API_KEY, ...(process.env.AI_EVAL_BASE_URL ? { baseURL: process.env.AI_EVAL_BASE_URL } : {}) }).chat(modelId);
const report = { recordedAt: new Date().toISOString(), modelId, promptVersion, promptSha256: createHash('sha256').update(system).digest('hex'), temperature: 0, trialsPerCase: 2, node: process.version, rows: [] };
let unavailable = false;
for (const sample of cases) {
  for (let trial = 1; trial <= report.trialsPerCase; trial++) {
    const trace = []; const start = Date.now();
    try {
      const result = await generateText({ model, system, prompt: sample.prompt, tools: makeTools('alpha', { fail: sample.fail }, trace), stopWhen: stepCountIs(3), temperature: 0, maxOutputTokens: 300, maxRetries: 0, abortSignal: AbortSignal.timeout(45000) });
      const verdict = grade(sample, result.text, trace);
      report.rows.push({ caseId: sample.id, trial, text: result.text, trace, verdict, latencyMs: Date.now() - start, usage: result.totalUsage, responseModel: result.response.modelId });
      console.log(`${sample.id} trial ${trial}: ${verdict.passed ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      // Never save provider response bodies, headers, credentials, or raw errors.
      report.rows.push({ caseId: sample.id, trial, infrastructureError: { name: error?.name, statusCode: error?.statusCode ?? null }, latencyMs: Date.now() - start });
      console.log(`${sample.id} trial ${trial}: INFRASTRUCTURE_ERROR`);
      const detail = String(error?.data?.error?.message ?? '').replaceAll(process.env.OPENAI_API_KEY, '[REDACTED]').slice(0, 400);
      if (detail) console.error(detail);
      unavailable = true; break;
    }
  }
  if (unavailable) break;
}
report.completed = report.rows.filter(r => r.verdict).length;
report.passed = report.rows.filter(r => r.verdict?.passed).length;
report.infrastructureBlocked = unavailable;
await mkdir('reports', { recursive: true });
await writeFile('reports/live-latest.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ completed: report.completed, passed: report.passed, infrastructureBlocked: unavailable }));
if (unavailable) process.exitCode = 2;
else if (report.passed !== cases.length * report.trialsPerCase) process.exitCode = 1;
