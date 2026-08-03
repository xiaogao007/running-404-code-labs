const ts = require("@typescript/native");

console.log(`TypeScript version: ${ts.version}`);
console.log(`createProgram type: ${typeof ts.createProgram}`);

if (typeof ts.createProgram !== "undefined") {
  throw new Error("TypeScript 7 unexpectedly exposed createProgram");
}
