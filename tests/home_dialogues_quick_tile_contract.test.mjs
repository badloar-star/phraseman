import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'app', '(tabs)', 'home.tsx'), 'utf8');
const orbResolver = fs.readFileSync(path.join(root, 'app', 'max_home_orb_assets.ts'), 'utf8');
const themes = ['indigo', 'sagePorcelain', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'dark', 'gold'];
const layers = ['shell', 'field', 'glints'];

test('home keeps three quick tiles and reuses the themed MAX orb for Dialogues', () => {
  const quickItems = source.slice(
    source.indexOf('const quickItems = ['),
    source.indexOf('const visibleQuickItems'),
  );

  assert.ok(quickItems.includes("key: 'lesson'"));
  assert.ok(quickItems.includes("key: 'dialogs'"));
  assert.ok(quickItems.includes("key: 'flashcards'"));
  assert.ok(quickItems.indexOf("key: 'lesson'") < quickItems.indexOf("key: 'dialogs'"));
  assert.ok(quickItems.indexOf("key: 'dialogs'") < quickItems.indexOf("key: 'flashcards'"));
  assert.ok(quickItems.includes("ru: 'Диалоги'"));
  assert.ok(quickItems.includes("nav.push('/ai_dialog_home' as never)"));
  assert.ok(source.includes('const maxOrbLayers = getMaxHomeOrbLayers(themeMode)'));
  assert.ok(source.includes("item.key === 'dialogs'"));
  assert.ok(source.includes('<MaxHomeOrb'));
});

test('the reused MAX orb keeps all three original layers for every interface theme', () => {
  for (const theme of themes) {
    for (const layer of layers) {
      const relative = `../assets/images/home_menu/max/${theme}/${layer}.webp`;
      assert.ok(orbResolver.includes(`require('${relative}')`), `${theme}/${layer} is wired`);
      assert.ok(
        fs.existsSync(path.join(root, relative.replace('../', ''))),
        `${theme}/${layer} exists`,
      );
    }
  }
});
