// зачем (координатор 29.10): сторож ключей языков в triLang. Ключ `pt:` вместо `'pt-BR':` (DailyPhraseFriendsRow, bb52ebd23) молча
// отдавал бразильцу английский — ни типы, ни сторож непереведённого текста этого не видели.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { KNOWN_LANG_KEYS, findTriLangKeyIssues, interfaceLangs, isTriLangGuardSkipped, topLevelKeys } from '../scripts/trilang_key_guard.mjs';

test('языки берутся из app/source_locales.ts + en (тип Lang), а не из списка в скрипте', () => {
  assert.deepEqual([...interfaceLangs()].sort(), ['en', 'es', 'id', 'pl', 'pt-BR', 'ru', 'tr', 'uk', 'vi']);
  assert.ok(KNOWN_LANG_KEYS.includes('fr') && KNOWN_LANG_KEYS.includes('de'));
});

const NINE = "ru: 'а', uk: 'б', en: 'c', es: 'd', 'pt-BR': 'e', vi: 'f', id: 'g', tr: 'h', pl: 'i'";

test('подложенный ключ pt: — ошибка, pt-BR назван пропущенным', () => {
  const src = "const a = triLang(lang, { ru: 'а', uk: 'б', en: 'c', es: 'd', pt: 'e', vi: 'f', id: 'g', tr: 'h', pl: 'i' });";
  const [issue] = findTriLangKeyIssues(src);
  assert.deepEqual(issue.bad, ['pt']);
  assert.ok(issue.missing.includes('pt-BR'));
});

test('ptBr и pt_BR — тоже неверные ключи', () => {
  for (const k of ['ptBr', 'pt_BR']) {
    const src = `triLang(lang, { ru: 'а', uk: 'б', en: 'c', es: 'd', ${k}: 'e', vi: 'f', id: 'g', tr: 'h', pl: 'i' })`;
    assert.deepEqual(findTriLangKeyIssues(src)[0].bad, [k]);
  }
});

test('полный словарь на 9 языков — чисто', () => {
  assert.deepEqual(findTriLangKeyIssues(`triLang(lang, { ${NINE} })`), []);
});

test('тернарник в значении не принимается за ключ', () => {
  const src = "triLang(lang, { ru: '', uk: '', en: n === 1 ? 'goal' : 'goals', es: n === 1 ? 'objetivo' : 'objetivos', 'pt-BR': 'meta', vi: '', id: '', tr: '', pl: '' })";
  assert.deepEqual(findTriLangKeyIssues(src), []);
});

test('комментарий между ключами не сбивает разбор', () => {
  const src = "triLang(lang, {\n  ru: 'а',\n  uk: 'б',\n  // зачем: пояснение с двоеточием: тут\n  en: 'c', es: 'd', 'pt-BR': 'e', vi: 'f', id: 'g', tr: 'h', pl: 'i',\n})";
  assert.deepEqual(findTriLangKeyIssues(src), []);
});

test('словарь только ru/uk/es/en — «слабый» (нет pt-BR, vi, id, tr, pl)', () => {
  const [issue] = findTriLangKeyIssues("triLang(lang, { ru: 'а', uk: 'б', es: 'd', en: 'c' })");
  assert.equal(issue.weak, true);
  assert.deepEqual(issue.bad, []);
});

test('словарь без en — «слабый»', () => {
  const [issue] = findTriLangKeyIssues("triLang(lang, { ru: 'а', uk: 'б', es: 'd', 'pt-BR': 'e', vi: 'f', id: 'g', tr: 'h', pl: 'i' })");
  assert.equal(issue.weak, true);
  assert.deepEqual(issue.missing, ['en']);
});

test('словарь со spread не оценивается (ключи не видны статически)', () => {
  assert.deepEqual(findTriLangKeyIssues("triLang(lang, { ru: 'а', uk: 'б', ...extra })"), []);
});

test('ключи верхнего уровня: вложенный объект не путается с языками', () => {
  assert.deepEqual(topLevelKeys(" ru: { a: 1, b: 2 }, uk: fn({ x: 1 }), 'pt-BR': `t ${y}` "), ['ru', 'uk', 'pt-BR']);
});

test('исключения: тесты, дев-превью и намеренные ru/uk-файлы', () => {
  assert.ok(isTriLangGuardSkipped('tests/foo.test.ts'));
  assert.ok(isTriLangGuardSkipped('app/dev_community_scene_preview.tsx'));
  assert.ok(isTriLangGuardSkipped('components/lesson_help_theory_data.tsx'));
  assert.ok(isTriLangGuardSkipped('app/exam_target_gate.ts'));
  assert.ok(!isTriLangGuardSkipped('components/DailyPhraseFriendsRow.tsx'));
});
