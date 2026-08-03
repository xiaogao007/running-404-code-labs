import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
)
const installedNext = JSON.parse(
  await readFile(
    new URL('../node_modules/next/package.json', import.meta.url),
    'utf8',
  ),
)

assert.equal(packageJson.dependencies.next, '16.3.0-preview.10')
assert.equal(installedNext.version, '16.3.0-preview.10')

console.log('Verified Next.js 16.3.0-preview.10 is installed.')
