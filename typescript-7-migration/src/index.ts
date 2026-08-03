export function readMode(): string {
  return process.env.NODE_ENV ?? "development";
}

console.log(readMode());
