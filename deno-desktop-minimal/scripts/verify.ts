const outputDir = ".verify-output";
const output = Deno.build.os === "windows"
  ? `${outputDir}/DenoDesktopMinimal.exe`
  : `${outputDir}/DenoDesktopMinimal`;

async function run(args: string[]): Promise<void> {
  const command = new Deno.Command(Deno.execPath(), {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });
  const result = await command.output();
  if (!result.success) Deno.exit(result.code);
}

await Deno.remove(outputDir, { recursive: true }).catch((error) => {
  if (!(error instanceof Deno.errors.NotFound)) throw error;
});

await run(["fmt", "--check"]);
await run(["lint"]);
await run(["check", "main.ts", "app_test.ts"]);
await run(["test", "app_test.ts"]);
await run(["desktop", "--output", output, "main.ts"]);

const artifacts = [];
for await (const entry of Deno.readDir(outputDir)) {
  if (entry.isFile) {
    const stat = await Deno.stat(`${outputDir}/${entry.name}`);
    artifacts.push(`${entry.name}: ${stat.size} bytes`);
  }
}

console.log(`Packaged artifacts: ${artifacts.join(", ")}`);
await Deno.remove(outputDir, { recursive: true });
console.log("Verification complete: format, lint, type-check, test, and desktop packaging passed.");
