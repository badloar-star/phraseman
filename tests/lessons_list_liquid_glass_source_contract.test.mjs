import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// зачем (владелец 2026-09-30): вкладка «Обучение» (список уроков) переносится «1 в 1» по
// learn.html A1–A9. На эмуляторе заголовок ломался по буквам, а карточки оставались
// оливково-зелёными градиентами с золотым Plus. Сторож держит вид 2.0 и прежнюю логику.

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const lessons = read('app/(tabs)/lessons.tsx');
const kit = read('components/lessons/LessonsListGlassKit.tsx');
const card = read('components/lessons/LessonsListGlassCard.tsx');
const examCards = read('components/lessons/LessonsListGlassExamCards.tsx');
const newBlocks = [kit, card, examCards];

function catalogHeaderBlock() {
  const start = lessons.indexOf('testID="legacy-lessons-catalog"');
  const end = lessons.indexOf('testID="legacy-lessons-level-rail"', start);
  assert.ok(start >= 0 && end > start, 'catalog header block is present');
  return lessons.slice(start, end);
}

test('new list blocks are built from the 13-theme Liquid Glass tokens only', () => {
  assert.match(kit, /import type \{ liquidGlassTokens \} from '..\/..\/constants\/liquidGlassThemePalette'/);
  // зачем (Тень 12.10): карточка урока — плашка (заливка + тень плашки) из токенов темы, без обводки: ни borderColor, ни borderWidth в lessonsGlassCardStyle.
  assert.match(kit, /backgroundColor: glass\.plateFillFrom/);
  assert.match(kit, /boxShadow: plateBoxShadow\(glass\)/);
  assert.doesNotMatch(kit, /borderColor|borderWidth|glassEdge/);
  for (const source of newBlocks) {
    assert.doesNotMatch(source, /OLIVE_|oliveShadow|GOLD_|GoldBevel|goldShadow|PlusBadge|bookPalette|darkenHex/, 'no olive/gold/book palette');
    assert.doesNotMatch(source, /adjustsFontSizeToFit/, 'font is never squeezed');
    assert.doesNotMatch(source, /#[0-9A-Fa-f]{6}['"]/, 'no hard-coded colors: tokens only');
    for (const match of source.matchAll(/borderWidth:\s*([\d.]+)/g)) {
      assert.ok(Number(match[1]) <= 1, `only a hairline edge is allowed, got borderWidth ${match[1]}`);
    }
  }
  assert.match(lessons, /const learnGlass = liquidGlassTokens\(liquidGlassThemeId\);/);
});

test('legacy catalog renders the glass card, level header, exam and attestation', () => {
  assert.match(lessons, /import \{ LessonsListGlassCard, type LessonsListCardState \} from "..\/..\/components\/lessons\/LessonsListGlassCard";/);
  assert.match(lessons, /<LessonsListGlassCard\b/);
  assert.match(lessons, /<LessonsListLevelHeader\b/);
  assert.match(lessons, /<LessonsListGlassExamCard\b/);
  assert.match(lessons, /<LessonsListGlassAttestationCard\b/);
  // Learning V2 page keeps its own card; only the legacy page switches to glass.
  assert.match(lessons, /if \(page !== "v2"\) \{[\s\S]*?<LessonsListGlassCard/);
  const renderItemStart = lessons.indexOf('renderItem={({ item, index: i }) => {');
  const renderItemEnd = lessons.indexOf('Legacy accordion renderer retained below', renderItemStart);
  const renderItem = lessons.slice(renderItemStart, renderItemEnd);
  assert.ok(renderItemStart >= 0 && renderItemEnd > renderItemStart, 'renderItem block is present');
  assert.doesNotMatch(renderItem, /goldCardGradient|GoldBevel|attestationAccent|item\.color/, 'old accent strip/gradient is gone');
});

test('lesson card shows only the mockup states and D36 stars', () => {
  assert.match(card, /\| \{ kind: 'done'; stars: 0 \| 1 \| 2 \| 3 \}/);
  assert.match(card, /\| \{ kind: 'progress'; pct: number \}/);
  assert.match(card, /\| \{ kind: 'open' \}/);
  assert.match(card, /\| \{ kind: 'plus' \}/);
  assert.match(card, /\| \{ kind: 'locked'; prevNum: number \}/);
  assert.doesNotMatch(card, /Куплено|pearl|жемчуг/i, 'no pearl price/purchase on the card');
  assert.match(card, /testID=\{`lessons-row-\$\{num\}`\}/);

  const start = kit.indexOf('export function lessonsListStarCount');
  const end = kit.indexOf('/** Короткие подписи', start);
  assert.ok(start >= 0 && end > start, 'star projection is independently testable');
  const compiled = ts.transpileModule(kit.slice(start, end), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  Function('module', 'exports', compiled)(mod, mod.exports);
  const stars = mod.exports.lessonsListStarCount;
  assert.equal(stars(2.95), 1, '59% → 1★');
  assert.equal(stars(3), 2, '60% → 2★');
  assert.equal(stars(4.2), 2, '84% → 2★');
  assert.equal(stars(4.25), 3, '85% → 3★');
  assert.equal(stars(0), 0, 'no score → no stars');
  assert.equal(stars(Number.NaN), 0, 'unknown score stays neutral');
});

test('header title stays on one line without squeezing; back button only outside the root tab', () => {
  const header = catalogHeaderBlock();
  const titleStart = header.indexOf('testID="legacy-lessons-title"');
  assert.ok(titleStart >= 0, 'title has a testID');
  const title = header.slice(titleStart, header.indexOf('</Text>', titleStart));
  assert.doesNotMatch(title, /numberOfLines|adjustsFontSizeToFit|flex: 1\b/, 'title is not squeezed by the HUD');
  assert.match(title, /flexShrink: 0/);
  // зачем (владелец 04.10, раунд 2 → «Обучение B»): заголовок 34, подзаголовок убран.
  assert.match(title, /fontSize: 34/);
  assert.match(header, /flexWrap: "wrap"/, 'the HUD wraps under the title when space runs out');
  // зачем (владелец 17.10): в корневой вкладке старый список открыт кнопкой с карты V2 — стрелка «назад» возвращает на карту; без карты (рубильник) стрелки нет, как раньше
  assert.match(header, /\{!isRetainedTab \|\| LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY \? \(\s*<PressableHybrid\s+testID="legacy-lessons-back-home"/, 'root tab shows back only when the new-lessons map exists');
  assert.doesNotMatch(header, /lessonsListCopy\.subtitle\(lang\)/);
  assert.doesNotMatch(lessons, /adjustsFontSizeToFit/);
});

test('real handlers, routes and testIDs stay wired', () => {
  const handlerStart = lessons.indexOf('const handleLegacyLessonPress = useCallback(');
  const handlerEnd = lessons.indexOf('const renderExamCard', handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'legacy lesson press handler is present');
  const handler = lessons.slice(handlerStart, handlerEnd);
  assert.match(handler, /hapticTap\(\);/);
  // зачем (05.10, 767dc8175): вход доступа собирается через applyDevAsFreeToLessonAccess({ … }) — решение то же.
  assert.match(handler, /applyDevAsFreeToLessonAccess\(\{/);
  assert.match(handler, /resolveLessonAccess\(accessInput\)/);
  assert.match(handler, /void prefetchLessonMenuCache\(num, studyTarget\);/);
  assert.match(handler, /router\.push\(\{ pathname: "\/lesson_menu", params: \{ id: num \} \}\)/);
  assert.match(handler, /openLessonPaywall\(num\)/);
  assert.match(handler, /setGateModal\(\{ kind: "lesson", prevNum: num - 1, lessonNum: num \}\)/);
  for (const id of ['legacy-lessons-search-toggle', 'legacy-lessons-level-combo', 'legacy-lessons-search-input', 'legacy-lessons-liquid-resource']) {
    assert.ok(lessons.includes(`testID="${id}"`), `${id} remains`);
  }
  assert.match(lessons, /onPress=\{openCombinedLesson\}/);
  assert.match(lessons, /router\.push\("\/diagnostic_test"\)/);
  assert.match(lessons, /router\.push\(\{ pathname: "\/level_exam", params: \{ level: lvl \} \}\)/);
});

test('every new list string is translated into nine languages', () => {
  const entries = [...kit.matchAll(/triLang\(lang, \{([\s\S]*?)\}\)/g)].map((m) => m[1]);
  assert.ok(entries.length >= 9, 'copy entries are present');
  for (const body of entries) {
    for (const key of ['ru:', 'uk:', 'en:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:']) {
      assert.ok(body.includes(key), `missing ${key} in ${body.slice(0, 40)}`);
    }
  }
});
