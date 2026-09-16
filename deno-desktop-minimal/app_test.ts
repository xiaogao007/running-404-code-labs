import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { handler } from "./app.ts";

Deno.test("desktop page returns HTML with the expected content", async () => {
  const response = handler();

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("content-type"), "text/html; charset=utf-8");
  assertStringIncludes(await response.text(), "Deno Desktop Minimal");
});
