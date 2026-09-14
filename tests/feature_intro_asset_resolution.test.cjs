const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const manifestPath = path.join(root, 'app', 'feature_intro_assets.ts');

test('every static feature intro require resolves to an existing asset', () => {
  const source = fs.readFileSync(manifestPath, 'utf8');
  const requiredAssets = [...source.matchAll(/require\((['"])([^'"]+)\1\)/gu)]
    .map((match) => match[2]);
  const missingAssets = requiredAssets.filter((relativePath) =>
    !fs.existsSync(path.resolve(path.dirname(manifestPath), relativePath)));

  assert.ok(requiredAssets.length > 0, 'feature intro manifest has no static assets');
  assert.equal(requiredAssets.length, 126, 'every one of 14 scenes must have an asset in each of 9 live themes');
  assert.equal(new Set(requiredAssets).size, 126, 'theme scenes must not silently alias another theme asset');
  assert.deepEqual(missingAssets, []);
});
