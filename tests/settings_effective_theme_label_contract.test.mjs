import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(
  path.join(process.cwd(), 'app', '(tabs)', 'settings.tsx'),
  'utf8',
);
const require = createRequire(import.meta.url);
const originalModuleLoad = Module._load;
Module._load = function loadWithInterfaceConfig(request, parent, isMain) {
  if (request === '../app/config') {
    return { ENGLISH_UI_LOCALE_ENABLED: true, SPANISH_UI_LOCALE_ENABLED: true };
  }
  return originalModuleLoad.call(this, request, parent, isMain);
};
require('tsx/cjs');
const { themeDisplayName } = require('../app/theme_display_names.ts');
Module._load = originalModuleLoad;

const ENGLISH_LIQUID_GLASS_NAMES = {
  graphite: 'Graphite',
  polar: 'Polar',
  slate: 'Slate',
  ink: 'Ink',
  lavender: 'Lavender',
  iris: 'Iris',
  rose: 'Dusty Rose',
  terracotta: 'Soft Terracotta',
  taupe: 'Taupe',
  olive: 'Olive',
  sage: 'Sage',
  eucalyptus: 'Eucalyptus',
  marine: 'Marine',
};

test('Settings theme row names the effective Liquid Glass theme', () => {
  assert.match(source, /import \{ themeDisplayName \} from '\.\.\/theme_display_names';/);
  assert.match(source, /const \{[^}]*liquidGlassThemeId[^}]*\} = useTheme\(\);/s);
  assert.match(source, /const currentThemeLabel = themeDisplayName\(liquidGlassThemeId, lang\);/);
});

test('Settings theme row has no legacy Forest fallback', () => {
  const labelStart = source.indexOf('const currentThemeLabel');
  const labelEnd = source.indexOf('const refreshSupplementalAccessState', labelStart);
  const labelSource = source.slice(labelStart, labelEnd);

  assert.ok(labelStart >= 0 && labelEnd > labelStart);
  assert.doesNotMatch(labelSource, /names\[themeMode\]/);
  assert.doesNotMatch(labelSource, /Форест|Forest|Bosque|Floresta/);
});

test('themeDisplayName has an explicit English label for every approved Liquid Glass theme', () => {
  for (const [id, englishName] of Object.entries(ENGLISH_LIQUID_GLASS_NAMES)) {
    assert.equal(themeDisplayName(id, 'en'), englishName);
  }
});
