import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { normalizeEol } from './helpers/read_source_esm.mjs';

// зачем (владелец 2026-09-29): меню урока (B1–B5) и интро урока (C1–C3) переносятся
// «1 в 1» по learn.html / spec_learn.md. Контракт фиксирует ВИД (нейтральные токены
// Liquid Glass, размеры макета) и то, что логика меню/интро не тронута.
const read = (p) => normalizeEol(readFileSync(new URL(p, import.meta.url), 'utf8'));
const menu = read('../app/lesson_menu.tsx');
const menuGlass = read('../components/lessons/LessonMenuGlass.tsx');
const intro = read('../app/lesson_intro_screens.tsx');
const introGlass = read('../components/lessons/LessonIntroGlass.tsx');

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('меню урока: презентационные части вынесены в components/lessons и не используют V2-палитру', () => {
  assert.ok(menu.includes("from '../components/lessons/LessonMenuGlass'"), 'меню подключает вынесенный стеклянный набор');
  for (const name of ['V2Row', 'V2InfoCard', 'V2ScreenHeader', 'V2IconButton']) {
    assert.ok(!menu.includes(name), `${name} больше не рисует меню урока`);
  }
  assert.ok(menuGlass.split('\n').length <= 400, 'файл набора ≤ 400 строк');
  // зачем (Тень 12.10): рамка glassEdge убрана — карточка меню это плашка (plateFillFrom + plateBoxShadow), кнопка — opaqueControl + nestedBoxShadow
  assert.ok(menuGlass.includes('glass.opaqueControl') && menuGlass.includes('glass.plateFillFrom') && menuGlass.includes('plateBoxShadow(glass)'), 'токены темы, а не свои цвета');
  assert.ok(!menuGlass.includes('glassEdge') && !/borderWidth/.test(menuGlass), 'меню урока без обводок');
  assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(stripComments(menuGlass)), 'в наборе меню нет собственных hex-цветов');
});

test('меню урока: размеры макета learn.html B1–B4', () => {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный через lh() — при шрифте 1.0 то же число, при крупном растёт.
  assert.ok(/fontSize: 30,\s*lineHeight: (?:lh\()?36\)?,\s*fontWeight: '700'/.test(menu), 'название урока 30/36 700');
  assert.ok(menuGlass.includes('ROW_MIN_HEIGHT = 76'), 'строка пункта min-height 76');
  assert.ok(menuGlass.includes('width: 46') && menuGlass.includes('borderRadius: 23'), 'круглая плашка значка 46');
  assert.ok(/fontSize: 16,\s*lineHeight: (?:lh\()?21\)?,\s*fontWeight: '700'/.test(menuGlass), 'заголовок пункта 16/21 700 (D145)');
  assert.ok(menuGlass.includes('width: 55') && menuGlass.includes('cardStyle(glass, 22)'), 'карточка совета: плитка 55, радиус 22');
  assert.ok(menuGlass.includes('height: 7'), 'трек прогресса 7');
  assert.ok(menuGlass.includes('size={22}'), 'крупные звёзды 22 (stars3 lg)');
  assert.ok(menuGlass.includes('minWidth: 44') && menuGlass.includes('minHeight: 44'), 'кнопки шапки ≥ 44');
});

test('меню урока: safe area стабильна, логика доступа и маршруты на месте', () => {
  assert.ok(menu.includes("useStableSafeAreaInsets } from './stable_safe_area_metrics'"), 'стабильные insets');
  assert.ok(!/useSafeAreaInsets\s*\}?\s*from 'react-native-safe-area-context'/.test(menu), 'сырой useSafeAreaInsets убран');
  assert.ok(menu.includes('if (progress <= 0 && !scoreKnown) return null'), 'условие показа сводки не менялось');
  assert.ok(menu.includes('menuItems.filter(item => !item.hidden).map'), 'пункты берутся из реальных menuItems');
  assert.ok(menu.includes('testID="lesson-menu-star-summary"'), 'сводка звёзд сохранила testID');
  assert.ok(menu.includes('testID="lesson-menu-settings"'), 'настройки сохранили testID');
});

test('интро урока: нейтральные токены темы вместо цветной полосы, акцентной рамки и зелёных примеров', () => {
  const code = stripComments(intro);
  assert.ok(!code.includes('styles.stripe') && !code.includes('stripeBg'), 'цветная вертикальная полоса удалена');
  assert.ok(!code.includes('${accent}28') && !code.includes('${accent}55') && !code.includes('${accent}33') && !code.includes('${accent}99'), 'полупрозрачные акцентные заливки/рамки убраны');
  assert.ok(!code.includes('color: t.correct'), 'английский пример не красится зелёным');
  assert.ok(!code.includes('textTransform: \'uppercase\'') || !/cardTitle:[^}]*uppercase/.test(code), 'заголовок блока без caps');
  assert.ok(intro.includes("from '../components/lessons/LessonIntroGlass'"), 'интро подключает вынесенные части');
  assert.ok(introGlass.split('\n').length <= 400, 'файл интро-набора ≤ 400 строк');
  assert.ok(!/#[0-9A-Fa-f]{3,8}\b/.test(stripComments(introGlass)), 'в интро-наборе нет собственных hex-цветов');
});

test('интро урока: размеры макета C1–C3 и сохранённая механика раскрытия', () => {
  assert.ok(/const cardRadius = 20/.test(intro), 'карточка радиус 20');
  assert.ok(/fontSize: 16,\s*lineHeight: 2[01],\s*fontWeight: '700'/.test(intro), 'заголовок блока 16/21 700 (D145)');
  assert.ok(intro.includes('width: 44') && intro.includes('borderRadius: 22'), 'круглая плашка значка 44');
  assert.ok(introGlass.includes('fontSize: 16') && introGlass.includes("fontWeight: '700'"), 'пример: en 16/700 (D145)');
  assert.ok(introGlass.includes('borderTopWidth: 1'), 'пример отделён тонкой линией сверху');
  assert.ok(intro.includes('setRevealedCount((n) => Math.min(n + 1, totalBlocks))'), 'тап-раскрытие не менялось');
  assert.ok(intro.includes('onComplete();'), 'старт урока не менялся');
  assert.ok(intro.includes('testID="lesson-intro-start"') && intro.includes('testID="lesson-intro-back"'), 'testID кнопок сохранены');
  assert.ok(intro.includes('const enableLiveBlur = Platform.OS !== \'android\';'), 'на Android живого размытия у карточек интро нет — dimezis давал ореол у текста (владелец 18.10)');
});
