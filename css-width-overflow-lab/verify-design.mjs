import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const design = await readFile(new URL('DESIGN.md', import.meta.url), 'utf8');
const css = await readFile(new URL('styles.css', import.meta.url), 'utf8');
const colors = design.match(/\ncolors:\n([\s\S]*?)\ntypography:/)?.[1];
assert.ok(colors, 'DESIGN.md 应包含已记录的颜色');
let checked = 0;
for (const [, name, value] of colors.matchAll(/^  ([\w-]+): "(#[0-9a-f]{6})"$/gm)) {
  const actual = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`))?.[1];
  assert.equal(actual, value, `颜色 token ${name} 应与运行时一致`);
  checked += 1;
}
assert.equal(checked, 9, '需要检查完整的九个已记录颜色');
console.log(`PASS ${checked} design color mappings`);
