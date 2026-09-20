/**
 * Сторож: экран поиска соперника НЕ дублирует проверку доступности хаба.
 *
 * Повод (владелец 2026-09-20, «теперь арена вообще не работает, написано
 * данные пока недоступны этот режим сейчас выключен»): в экран поиска попал
 * блок `targetGate` с собственным вызовом `arenaV2Home`. Доступность Арены
 * уже решает хаб (`ArenaHubSurface`, ветка `availability.enabled`), и мимо
 * него на этот экран не попасть. Вторая проверка стала лишней точкой отказа:
 * моргнувшая сеть или неготовый конфиг языка валили экран в «Этот режим
 * сейчас выключен» — Арена переставала работать целиком.
 *
 * Сработал — убирать гейт с экрана поиска, а не сторожа.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCREEN = join(__dirname, '..', 'app', 'arena_matchmaking.tsx');

function screenSource(): string {
  // CRLF при checkout на Windows не должен влиять на поиск подстрок.
  return readFileSync(SCREEN, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Исходник БЕЗ комментариев.
 *
 * зачем: первая версия сторожа падала на собственном объяснении — в
 * комментарии «доступность решает хаб» встречается слово `availability`.
 * Сторож обязан проверять КОД, а не текст рядом с ним, иначе он запрещает
 * объяснять, почему гейта здесь нет, — то есть ровно ту запись, которая
 * помешает следующему вернуть гейт обратно.
 */
function screenCode(): string {
  return screenSource()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('экран поиска соперника: без дублирующего гейта доступности', () => {
  test('не вызывает arenaV2Home', () => {
    expect(screenCode()).not.toContain('arenaV2Home');
  });

  test('не читает availability', () => {
    expect(screenCode()).not.toContain('availability');
  });

  test('не рендерит состояние «режим выключен»', () => {
    const code = screenCode();
    expect(code).not.toContain('ArenaStateCard');
    expect(code).not.toContain("'modeOff'");
  });

  /**
   * Позитивная половина: экран обязан остаться зрителем фонового поиска.
   * Без этого сторож можно было бы «выполнить», удалив экран целиком.
   */
  test('остаётся зрителем фонового поиска и умеет его останавливать', () => {
    const source = screenCode();
    expect(source).toContain('useArenaBackgroundSearchState');
    expect(source).toContain('arenaBackgroundSearch.start');
    expect(source).toContain("arenaBackgroundSearch.stop('cancelled')");
  });
});
