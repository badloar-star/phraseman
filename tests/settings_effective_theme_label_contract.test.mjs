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
  // зачем (Авторизация, предпроверка 16.10): constants/i18n тянет app/dev_ui_lang, а тот — './config' (с react-native, esbuild его не берёт). Подменяем оба пути на лёгкий конфиг;
  // боевой код не меняется.
  if (request === '../app/config' || (request === './config' && parent?.filename?.endsWith('dev_ui_lang.ts'))) {
    return { ENGLISH_UI_LOCALE_ENABLED: true, SPANISH_UI_LOCALE_ENABLED: true, IS_STORE_RELEASE: false };
  }
  return originalModuleLoad.call(this, request, parent, isMain);
};
require('tsx/cjs');
const { themeDisplayName } = require('../app/theme_display_names.ts');
Module._load = originalModuleLoad;

// зачем (владелец 2026-09-30): имена тем — набор «Небо и природа», ключи прежние.
const ENGLISH_LIQUID_GLASS_NAMES = {
  graphite: 'Eclipse',
  polar: 'Frost',
  slate: 'Storm',
  ink: 'Twilight',
  // зачем (10.10): выбор владельца 04.10 (a6a9ee295) — «Сирень»/«Орхидея» → «Туманность»/«Комета».
  lavender: 'Nebula',
  iris: 'Comet',
  rose: 'Dawn',
  terracotta: 'Sunset',
  taupe: 'Dune',
  olive: 'Savanna',
  sage: 'Mint',
  eucalyptus: 'Lagoon',
  marine: 'Ocean',
};
const RUSSIAN_LIQUID_GLASS_NAMES = {
  graphite: 'Затмение', polar: 'Иней', slate: 'Шторм', ink: 'Сумерки', lavender: 'Туманность',
  iris: 'Комета', rose: 'Рассвет', terracotta: 'Закат', taupe: 'Дюна', olive: 'Саванна',
  sage: 'Мята', eucalyptus: 'Лагуна', marine: 'Океан',
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

test('themeDisplayName uses the owner-approved «Небо и природа» names in all nine locales', () => {
  for (const [id, name] of Object.entries(RUSSIAN_LIQUID_GLASS_NAMES)) {
    assert.equal(themeDisplayName(id, 'ru'), name);
    for (const lang of ['uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      assert.ok(themeDisplayName(id, lang).length > 0, `${id}/${lang}`);
    }
  }
});
