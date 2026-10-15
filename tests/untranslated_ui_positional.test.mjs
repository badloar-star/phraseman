// зачем (координатор 12.10, EN_READINESS): сторож непереведённого текста признаёт tl(…)/showToast(…) переводом ТОЛЬКО при
// непустом английском строковом аргументе; пустой/нестроковый/отсутствующий en — по-прежнему находка (сторож не ослаблен).
// Плюс имя переводчика — только целое слово: 't(' больше не срабатывает внутри showToast(/alert(.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isNonEmptyEnglishLiteral,
  localLogHelperCall,
  maskMultilineLogCalls,
  maskToastEntriesWithEnglishInSameObject,
  maskPositionalTranslatorCalls,
  splitCallArgs,
} from '../scripts/untranslated_ui_positional.mjs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const hasCyrillic = (s) => /[а-яА-ЯёЁ]/.test(s);

test('tl с непустым en — маскируется (перевод есть)', () => {
  const src = "const a = tl('Текущий ранг', 'Поточний ранг', 'Current rank', 'Rango actual');";
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls(src)), false);
});

test('tl с пустым en или без en — остаётся находкой', () => {
  for (const src of [
    "const a = tl('Текущий ранг', 'Поточний ранг', '', 'Rango actual');",
    "const a = tl('Текущий ранг', 'Поточний ранг', '   ', 'x');",
    "const a = tl('Текущий ранг', 'Поточний ранг');",
    "const a = tl('Текущий ранг', 'Поточний ранг', enVar, 'x');",
    "const a = tl('Текущий ранг', 'Поточний ранг', 'Текущий ранг', 'x');",
    "const a = tl('Ранг', 'Ранг', `rank ${n}`, 'x');",
  ]) {
    assert.equal(hasCyrillic(maskPositionalTranslatorCalls(src)), true, src);
  }
});

test('showToast: 3 и 4 аргумента с непустым en — маскируются; пустой en — находка', () => {
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("showToast('info', 'Ранг', 'Rank');")), false);
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("showToast('info', 'Ранг', 'Ранг укр', 'Rank');")), false);
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("showToast('info', 'Ранг', '');")), true);
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("showToast('info', 'Ранг');")), true);
});

test('имя только целиком: mytl(…) и fooshowToast(…) не помощники', () => {
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("mytl('Ранг', 'Ранг', 'Rank', 'x');")), true);
  assert.equal(hasCyrillic(maskPositionalTranslatorCalls("fooshowToast('i', 'Ранг', 'Rank');")), true);
});

test('разбор аргументов учитывает вложенные скобки и запятые в строках', () => {
  const src = "tl(fn('a, b'), 'x, y', 'Rank (top)', obj[1])";
  const parsed = splitCallArgs(src, src.indexOf('('));
  assert.deepEqual(parsed.args, ["fn('a, b')", "'x, y'", "'Rank (top)'", 'obj[1]']);
  assert.equal(isNonEmptyEnglishLiteral("'Rank (top)'"), true);
});

test('сторож: переводчик по целому имени, помощники подключены', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const scanner = normalizeEol(fs.readFileSync(path.join(root, 'scripts/scan_untranslated_ui.mjs'), 'utf8'));
  assert.match(scanner, /import \{ localLogHelperCall, maskMultilineLogCalls, maskPositionalTranslatorCalls, maskToastEntriesWithEnglishInSameObject \} from '\.\/untranslated_ui_positional\.mjs';/);
  assert.match(scanner, /return maskMultilineLogCalls\(maskLocaleKeyedEntries\(src, source\), source, DIAGNOSTIC_LOG_CALL\);/);
  // полный проход и проверка добавленных строк трактуют помощники журнала одинаково
  assert.match(scanner, /if \(logHelperCall\?\.test\(line\)\) continue;/);
  assert.match(scanner, /logHelperCall = localLogHelperCall\(stagedSource\);/);
  assert.match(scanner, /&& !logHelperCall\?\.test\(added\)\) \{/);
  assert.match(scanner, /const lines = maskToastEntriesWithEnglishInSameObject\(source, original\)\.split\('\\n'\);/);
  assert.match(scanner, /src = maskPositionalTranslatorCalls\(src\);/);
  assert.match(scanner, /\/\[A-Za-z0-9_\$\]\/\.test\(src\[found - 1\]\)/);
});

test('журналы, а не экран: logSpireLayout / logSpireDock / bootMark в явном списке помощников логов', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const scanner = normalizeEol(fs.readFileSync(path.join(root, 'scripts/scan_untranslated_ui.mjs'), 'utf8'));
  const line = scanner.split('\n').find((l) => l.startsWith('const DIAGNOSTIC_LOG_CALL ='));
  assert.ok(line, 'DIAGNOSTIC_LOG_CALL на месте');
  const re = new Function(`${line.replace('const DIAGNOSTIC_LOG_CALL =', 'return')}`)();
  for (const call of ["logSpireLayout('scroll-req', { a: 1 })", "logSpireDock('х', {})", "bootMark('сплеш отпущен')", "traceThumbMissing('х')"]) {
    assert.ok(re.test(call), call);
  }
  // похожие имена — не журналы: имя явное, не маска
  for (const call of ["showSpireLayout('Текст')", "bootMarker('Текст')", "Alert.alert('Ошибка')"]) {
    assert.equal(re.test(call), false, call);
  }
});

// зачем (координатор 12.10, английский в R1): тост переведён, только если `messageEn` стоит В ТОМ ЖЕ объекте и непустой.
// Окно ±строк засчитывало английский соседнего тоста; `messageEn: ''` показал бы английскому интерфейсу пустоту.
test('тост: messageEn в том же объекте — перевод; в соседнем объекте рядом — находка; пустой en — находка', () => {
  const sameObject = [
    'showActionToast({',
    "  messageRu: 'Не удалось сохранить',",
    "  messageEn: \"Couldn't save\",",
    '});',
  ].join('\n');
  assert.equal(hasCyrillic(maskToastEntriesWithEnglishInSameObject(sameObject)), false);

  const neighbourObject = [
    'showActionToast({',
    "  messageRu: 'Не удалось сохранить',",
    "  messageEs: 'No se pudo guardar',",
    '});',
    'showActionToast({',
    "  messageRu: 'Сохранено',",
    "  messageEn: 'Saved',",
    '});',
  ].join('\n');
  const masked = maskToastEntriesWithEnglishInSameObject(neighbourObject);
  assert.equal(masked.includes('Не удалось сохранить'), true);
  assert.equal(masked.includes('Сохранено'), false);

  for (const en of ["''", "'   '", 'enVar', "'Не удалось'"]) {
    const src = `showActionToast({\n  messageRu: 'Не удалось сохранить',\n  messageEn: ${en},\n});`;
    assert.equal(hasCyrillic(maskToastEntriesWithEnglishInSameObject(src).split('\n')[1]), true, en);
  }
});

test('тост: labelRu ищет только labelEn, а messageEn вложенного объекта не засчитывается', () => {
  const kindMismatch = "show({\n  labelRu: 'Повторить',\n  messageEn: 'Retry',\n});";
  assert.equal(maskToastEntriesWithEnglishInSameObject(kindMismatch).includes('Повторить'), true);
  const nested = "show({\n  messageRu: 'Ошибка',\n  extra: { messageEn: 'Error' },\n});";
  assert.equal(maskToastEntriesWithEnglishInSameObject(nested).includes('Ошибка'), true);
});

test('тост: шаблон с подстановкой — перевод, если у него есть свой английский текст; голая подстановка — находка', () => {
  const withText = 'show({\n  messageRu: `Позвал ${name}`,\n  messageEn: `You called ${name}`,\n});';
  assert.equal(maskToastEntriesWithEnglishInSameObject(withText).includes('Позвал'), false);
  const bare = 'show({\n  messageRu: `Позвал ${name}`,\n  messageEn: `${name}`,\n});';
  assert.equal(maskToastEntriesWithEnglishInSameObject(bare).includes('Позвал'), true);
});

test('тост: объект определяется по исходнику, даже если маски сканера разрезали строку посреди литерала', () => {
  const original = "L('a)'); show({\n  messageRu: 'Ошибка',\n  messageEn: \"Couldn't save\",\n});";
  const cut = original.replace("L('a)", '     ');
  assert.equal(cut.length, original.length);
  assert.equal(maskToastEntriesWithEnglishInSameObject(cut, original).includes('Ошибка'), false);
});

// зачем (координатор 12.10, английский в R1): обёртка над логгером в этом же файле — журнал; признаётся по телу, а не по имени.
test('помощник журнала: тело — один вызов логгера → журнал; иначе (или чужое имя) — находка остаётся', () => {
  const src = [
    'function trace(message: string, data?: Record<string, unknown>): void {',
    '  DebugLogger.info(LOG, data ? `${message} ${JSON.stringify(data)}` : message);',
    '}',
    'function logTide(message: string): void {',
    '  console.log(`[SURVEY-TIDE] ${message}`); // guard-ok: журнал',
    '}',
    'function title(text: string): string {',
    '  console.log(text);',
    '  return text;',
    '}',
  ].join('\n');
  const call = localLogHelperCall(src);
  assert.equal(call.test("trace('старт');"), true);
  assert.equal(call.test('  logTide(`выбран вариант`);'), true);
  assert.equal(call.test("title('Заголовок');"), false);
  assert.equal(call.test("subtrace('x');"), false);
  assert.equal(call.test("obj.trace('x');"), false);
  assert.equal(localLogHelperCall("const a = trace('x');"), null);
});

// зачем (координатор 12.10; Ядро: SpireHomeScreen, premium_modal, _layout): вызов журнала маскируется целиком, с аргументами на следующих строках.
test('журнал: многострочный вызов и псевдоним логгера маскируются целиком; экранный текст рядом остаётся находкой', () => {
  const FIX = /\b(DebugLogger|console)\s*\.\s*(log|info|warn|error|debug)\s*\(|\b(logSpireDock)\s*\(/;
  const src = [
    "logSpireDock('home', {",
    "  source: preview ? 'DEV-превью (моки)' : 'живые данные',",
    '});',
    'console.warn(',
    '  `[SWITCH-QUARANTINE] -> вход продолжается, стены нет`,',
    ');',
    "const log = decision === 'dismiss' ? console.warn : console.log;",
    "log('[PAYWALL-OPEN] решение окна', JSON.stringify({ decision }));",
    "const title = pick('Заголовок экрана');",
    "obj.log('Подпись');",
  ].join('\n');
  const out = maskMultilineLogCalls(src, src, FIX);
  for (const gone of ['DEV-превью', 'живые данные', 'стены нет', 'решение окна']) assert.equal(out.includes(gone), false, gone);
  assert.equal(out.includes('Заголовок экрана'), true);
  assert.equal(out.includes('Подпись'), true);
  assert.equal(out.split('\n').length, src.split('\n').length);
  assert.equal(out.length, src.length);
});
