// зачем (владелец 11.10: «Шпиль — наша задача», обязательный пункт релиза): экраны Шпиля держат дизайн-слой проекта.
// components/spire/* и жалоба на задание: шкала шрифтов 16/13 без мелкого и внешкального текста, межстрочный ≥ 1.25×, ни одного
// adjustsFontSizeToFit и рамок толще 1 pt; цвета только из токенов темы (литералы — лишь в иллюстрации башни с пометкой theme-exempt);
// нажатие — кит (V2Pressable), без TouchableOpacity; затухание под нижней кнопкой — в цвет низа градиента темы, без плоского bg.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSource } from './helpers/typography_store_surface.mjs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILES = [
  ...readdirSync(join(ROOT, 'components', 'spire')).filter((f) => /\.tsx?$/.test(f)).map((f) => `components/spire/${f}`),
  'modules/spire/SpireTaskReportButton.tsx',
];
const read = (file) => normalizeEol(readFileSync(join(ROOT, file), 'utf8'));
const BS = String.fromCharCode(92);
const NL = String.fromCharCode(10);

test('spire screens: type scale, line-height, borders', () => {
  const bad = [];
  for (const file of FILES) {
    const found = scanSource(read(file));
    for (const category of Object.keys(found)) for (const x of found[category]) bad.push(`${category} ${file}:${x.line} ${x.text}`);
  }
  assert.deepEqual(bad, []);
});

test('spire screens: no colour literals outside theme-exempt, no correctText', () => {
  const literal = new RegExp(`#[0-9a-fA-F]{3,8}${BS}b|rgba?${BS}(`);
  // иллюстрация башни и точки друзей — рисунок, не интерфейс: у них свои литералы, исключения помечены или перечислены здесь
  const ART = /(SpireTowerSvg|SpireTower|SpireFriendsRow)/;
  const bad = [];
  for (const file of FILES) {
    read(file).split(NL).forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line) || /theme-exempt/.test(line)) return;
      if (literal.test(line) && !ART.test(file)) bad.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
      // тема: t.correctText / theme.correctText / p.correctText; поле ответа fb.correctText — текст правильного ответа, не цвет
      if (/(?:t|theme|p|g)\.correctText/.test(line)) bad.push(`${file}:${i + 1}: correctText`);
    });
  }
  assert.deepEqual(bad, []);
});

test('spire screens: kit press only, report button label is localised', () => {
  for (const file of FILES) assert.ok(!/TouchableOpacity|TouchableHighlight/.test(read(file)), `${file}: TouchableOpacity`);
  const report = read('modules/spire/SpireTaskReportButton.tsx');
  assert.ok(report.includes('triLang(lang'), 'подпись жалобы через triLang');
  assert.ok(!/accessibilityLabel="[^"]*[А-Яа-я]/.test(report), 'нет русской подписи без перевода');
});

test('spire home: dock scrim fades to the bottom colour of the theme gradient and is solid under the button', () => {
  const home = read('components/spire/SpireHomeScreen.tsx');
  assert.match(home, /useSpireBgBottom/);
  assert.ok(home.includes('${bgBottom}FF'), 'сплошной цвет под кнопкой');
  assert.ok(!home.includes('lv2Alpha(p.bg, 0.96)'), 'плоский bg под кнопкой убран');
});
