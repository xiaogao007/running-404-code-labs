import { readFile } from "node:fs/promises";
import { validateProject } from "../lib/policy.mjs";

const [manifest, lockfile, policy] = await Promise.all([
  readJson("package.json"),
  readJson("package-lock.json"),
  readJson("security-policy.json"),
]);

const errors = validateProject({ manifest, lockfile, policy });

if (errors.length > 0) {
  console.error("Next.js security policy failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  const version = manifest.dependencies.next;
  console.log(`Next.js ${version} matches the reviewed security policy.`);
  console.log(`Policy checked: ${policy.checkedAt}`);
  console.log(`Release source: ${policy.releaseSource}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
