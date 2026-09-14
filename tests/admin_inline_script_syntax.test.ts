const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

test('every inline script in the live admin surface has valid JavaScript syntax', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'admin/v2/legacy.html'), 'utf8');
  let scriptIndex = 0;

  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    scriptIndex += 1;
    const [, attributes, source] = match;
    if (/\bsrc\s*=/.test(attributes)) continue;
    expect(() => acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: /type=["']module/.test(attributes) ? 'module' : 'script',
    })).not.toThrow();
  }

  expect(scriptIndex).toBeGreaterThan(0);
});
