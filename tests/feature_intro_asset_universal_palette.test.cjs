const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const THEMES = ['dark', 'gold', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'indigo', 'sagePorcelain'];

test('every theme uses the same universal feature-intro artwork', () => {
  const root = path.join(process.cwd(), 'assets', 'images', 'feature_intros');
  const masterFiles = fs.readdirSync(path.join(root, 'dark')).filter((file) => file.endsWith('.webp') && !file.includes('legacy-lessons')).sort();
  assert.equal(masterFiles.length, 13);

  for (const file of masterFiles) {
    const master = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dark', file))).digest('hex');
    for (const theme of THEMES.slice(1)) {
      const themedFile = file.replace('-dark-', `-${theme}-`);
      const themedPath = path.join(root, theme, themedFile);
      assert.ok(fs.existsSync(themedPath), `${theme}/${themedFile} is missing`);
      const themed = crypto.createHash('sha256').update(fs.readFileSync(themedPath)).digest('hex');
      assert.equal(themed, master, `${theme}/${themedFile} must keep the universal palette`);
    }
  }
});
