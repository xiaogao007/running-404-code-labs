import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const parent = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');
const child = await readFile(new URL('./public/child.html', import.meta.url), 'utf8');
const fallback = await readFile(new URL('./public/fallback.html', import.meta.url), 'utf8');

assert.match(parent, /frame-sizing:\s*content-height/);
assert.match(parent, /127\.0\.0\.1:4174\/child\.html/);
assert.match(child, /meta name="responsive-embedded-sizing" content="allow-origins=\*"/);
assert.match(child, /setTimeout/);
assert.match(fallback, /ResizeObserver/);
assert.match(fallback, /postMessage/);
console.log('Static contracts verified: native opt-in, cross-origin URL, async mutation and fallback.');
