const ts = require("typescript");

if (typeof ts.createProgram !== "function") {
  throw new Error("TypeScript 6 compiler API is unavailable");
}

console.log(`TypeScript API version: ${ts.version}`);
