/**
 * Сторож: progress НИКОГДА не пишется целой вложенной картой через set(merge).
 *
 * зачем (владелец 2026-09-02): прогресс не сохранялся в облако с 01.09 —
 * `users/{stableId}` отклонял запись с permission-denied. Разбор боевых логов
 * [SYNC-DENY] показал `blockedKeys: []` при КАЖДОМ отказе: виноваты были не
 * отправленные ключи, а ПОТЕРЯННЫЕ.
 *
 * Механика. `set(..., { merge: true })` мержит только ВЕРХНИЙ уровень —
 * вложенная карта `progress` заменяется целиком. Для Firestore Rules
 * `affectedKeys()` = addedKeys ∪ removedKeys ∪ changedKeys, поэтому любой ключ,
 * лежащий в облаке, но отсутствующий в патче, попадает в removedKeys() и
 * считается «затронутым». В боевых документах внутри progress лежат
 * chain_shield, gift_xp_multiplier, club_gift_free_boost_v1, user_total_xp,
 * streak_count — все они в блок-листах правил. Клиент их (правильно) не шлёт,
 * из-за чего hasNoServerGiftPerkWrites и progressHasNoPremiumWrites видели
 * «удаление» server-owned полей и рубили ВЕСЬ set вместе с XP и аватаром.
 *
 * Ловушка для будущих правок: чем СТРОЖЕ фильтровать исходящий патч, тем
 * ВЕРОЯТНЕЕ отказ — вычищенный ключ выглядит как удалённый. Интуиция здесь
 * работает наоборот, поэтому нужен сторож, а не комментарий.
 *
 * Правильный способ — точечное обновление по dot-notation (`progress.<key>`
 * через FieldPath): правило видит только реально меняемые ключи.
 *
 * Сработал — вернуть точечное обновление, а не ослаблять проверку.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const SOURCE_PATH = join(__dirname, '..', 'app', 'cloud_sync.ts');

/** Убирает комментарии — примеры внутри них не должны валить сторожа. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('cloud_sync: запись вложенной карты progress', () => {
  const source = stripComments(readFileSync(SOURCE_PATH, 'utf8'));

  it('нигде не передаёт progress целой картой в запись документа', () => {
    // Ищем `progress: <что-то>` в литерале, уходящем в Firestore. Именно такая
    // форма заменяет карту целиком и роняет запись правилами.
    const offenders = source
      .split('\n')
      .map((line, index) => ({ line: line.trim(), no: index + 1 }))
      .filter(({ line }) => /^\.{0,3}\s*progress:\s*\w/.test(line))
      // Легальные исключения: чтение облачных данных и сборка локальных структур,
      // где `progress` — поле разбираемого ответа, а не исходящая запись.
      .filter(({ line }) => !/^progress:\s*(cloudProgress|parsed|root|snap)/.test(line));
    expect(offenders.map((o) => `${o.no}: ${o.line}`)).toEqual([]);
  });

  it('использует общий помощник точечной записи', () => {
    expect(source).toContain('writeUserDocWithNestedProgress');
    // Помощник обязан ходить через update, а не через set вложенной карты.
    const helperStart = source.indexOf('async function writeUserDocWithNestedProgress');
    expect(helperStart).toBeGreaterThan(-1);
    const helperBody = source.slice(helperStart, helperStart + 3000);
    expect(helperBody).toContain('progress.');
    expect(helperBody).toMatch(/update/);
  });

  it('оба писателя документа users идут через помощник', () => {
    // doSyncToCloud (обычный такт) и forceSyncToCloud (перенос при смене
    // устройства) — оба роняли запись одинаково. Второй ещё и молчал в релизе.
    const calls = source.match(/writeUserDocWithNestedProgress\(/g) ?? [];
    // Одно определение + два вызова.
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it('отказ force-синка логируется вне __DEV__', () => {
    // Раньше провал переноса прогресса при смене устройства был не виден в
    // сторовой сборке вообще: `if (__DEV__) console.warn(...)`.
    expect(source).toContain('cloud_sync:force_sync_failed');
    expect(source).not.toMatch(/if \(__DEV__\) console\.warn\('\[cloud_sync\] forceSyncToCloud failed'/);
  });
});
