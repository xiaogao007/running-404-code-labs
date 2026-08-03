import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const waivers = JSON.parse(await readFile("audit-waivers.json", "utf8"));
const inputPath = readOption("--input");
const asOf = readOption("--as-of");
const report = inputPath
  ? JSON.parse(await readFile(inputPath, "utf8"))
  : runLiveAudit();

if (report.error) {
  throw new Error(`npm audit failed: ${report.error.summary ?? "unknown error"}`);
}

const findings = collectHighFindings(report);
const failures = [];
const usedWaivers = new Set();
const today = asOf ?? new Date().toISOString().slice(0, 10);

if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  throw new Error(`Invalid --as-of date: ${today}`);
}

for (const finding of findings) {
  const waiver = waivers.find(
    (candidate) =>
      candidate.id === finding.id && candidate.package === finding.package,
  );

  if (!waiver) {
    failures.push(
      `${finding.package} ${finding.id} (${finding.severity}) has no reviewed waiver`,
    );
    continue;
  }

  usedWaivers.add(`${waiver.package}:${waiver.id}`);
  if (waiver.expires < today) {
    failures.push(
      `${finding.package} ${finding.id} waiver expired on ${waiver.expires}`,
    );
  }
}

for (const waiver of waivers) {
  const key = `${waiver.package}:${waiver.id}`;
  if (!usedWaivers.has(key)) {
    failures.push(`${key} waiver is stale and must be removed or reviewed`);
  }
}

if (failures.length > 0) {
  console.error("Production dependency audit gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else if (findings.length === 0) {
  console.log("npm audit found no high-or-higher production advisories.");
} else {
  console.log(
    `npm audit returned ${findings.length} reviewed high-or-higher advisories.`,
  );
  for (const finding of findings) {
    const waiver = waivers.find(
      (candidate) =>
        candidate.id === finding.id && candidate.package === finding.package,
    );
    console.log(
      `- ${finding.package} ${finding.id}: waived until ${waiver.expires}`,
    );
  }
}

function collectHighFindings(report) {
  const findings = [];
  const levels = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via === "string" || levels[via.severity] < levels.high) {
        continue;
      }

      findings.push({
        id: via.url.split("/").at(-1),
        package: vulnerability.name,
        severity: via.severity,
      });
    }
  }

  return findings;
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function runLiveAudit() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error("Run the live gate through npm run audit:live");
  }

  const audit = spawnSync(
    process.execPath,
    [
      npmCli,
      "audit",
      "--omit=dev",
      "--audit-level=high",
      "--json",
      "--registry=https://registry.npmjs.org",
    ],
    { encoding: "utf8" },
  );

  if (audit.error) {
    throw audit.error;
  }

  try {
    return JSON.parse(audit.stdout);
  } catch {
    console.error(audit.stderr || audit.stdout);
    throw new Error("npm audit did not return a JSON report");
  }
}
