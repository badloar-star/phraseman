// ════════════════════════════════════════════════════════════════════════════
//  Контракт: «Твоё место N» в модалке итогов недели и N-я строка списка —
//  это один и тот же человек.
//
//  Баг (репорт владельца 2026-08-13): модалка печатала место из серверного
//  поля myRank (авторитетный итог недели, посчитанный по реальным финальным
//  очкам всех участников), а список рисовала по индексам локального снимка
//  комнаты. Снимок мог отстать — и на «твоём» месте стоял чужой ник.
//
//  Здесь фиксируем поведение помощника orderGroupForResultDisplay, через
//  который проходят обе стороны: и запись pending-результата в league_engine,
//  и рендер списка в LeagueResultModal.
// ════════════════════════════════════════════════════════════════════════════

jest.mock('../app/firestore_leagues', () => ({
  getOrCreateLeagueGroup: jest.fn(async () => null),
  updateMyGroupPoints: jest.fn(async () => undefined),
}));

jest.mock('../app/hall_of_fame_utils', () => ({
  loadWeekLeaderboard: jest.fn(async () => []),
  getLastWeekFinalPoints: jest.fn(async () => null),
}));

import {
  calculateResult,
  orderGroupForResultDisplay,
  type GroupMember,
  type LeagueState,
} from '../app/league_engine';

const member = (
  name: string,
  points: number,
  isMe = false,
): GroupMember => ({ uid: name, name, points, isMe });

/** Место, на котором пользователь реально стоит в показанном списке. */
const placeOfMe = (group: GroupMember[]): number =>
  group.findIndex(m => m.isMe) + 1;

describe('orderGroupForResultDisplay', () => {
  it('сортирует группу по очкам, когда снимок пришёл в произвольном порядке', () => {
    const group = [
      member('IronBirch', 7443),
      member('stonepetal', 9092),
      member('DuskWillow', 8737),
    ];

    const ordered = orderGroupForResultDisplay(group, 1);

    expect(ordered.map(m => m.name)).toEqual(['stonepetal', 'DuskWillow', 'IronBirch']);
  });

  it('ставит мою строку ровно на авторитетное место, если снимок отстал', () => {
    // Серверный итог: я второй. Снимок ещё не получил мои финальные очки,
    // поэтому по очкам я оказался бы только пятым.
    const group = [
      member('stonepetal', 9092),
      member('DuskWillow', 8737),
      member('IronBirch', 7443),
      member('QuietFern', 6100),
      member('QA Monday', 900, true),
    ];

    const ordered = orderGroupForResultDisplay(group, 2);

    expect(placeOfMe(ordered)).toBe(2);
    expect(ordered.map(m => m.name)).toEqual([
      'stonepetal', 'QA Monday', 'DuskWillow', 'IronBirch', 'QuietFern',
    ]);
    // Никого не потеряли и не задвоили.
    expect(ordered).toHaveLength(group.length);
    expect(new Set(ordered.map(m => m.name)).size).toBe(group.length);
  });

  it('не трогает порядок, когда снимок и серверное место уже согласованы', () => {
    const group = [
      member('stonepetal', 9092),
      member('QA Monday', 8800, true),
      member('IronBirch', 7443),
    ];

    expect(orderGroupForResultDisplay(group, 2).map(m => m.name))
      .toEqual(['stonepetal', 'QA Monday', 'IronBirch']);
  });

  it('прижимает место к границам списка при некорректном myRank', () => {
    const group = [
      member('stonepetal', 9092),
      member('DuskWillow', 8737),
      member('QA Monday', 500, true),
    ];

    expect(placeOfMe(orderGroupForResultDisplay(group, 0))).toBe(1);
    expect(placeOfMe(orderGroupForResultDisplay(group, -5))).toBe(1);
    expect(placeOfMe(orderGroupForResultDisplay(group, 999))).toBe(group.length);
    expect(placeOfMe(orderGroupForResultDisplay(group, Number.NaN))).toBe(3);
  });

  it('не падает на пустой и на невалидной группе', () => {
    expect(orderGroupForResultDisplay([], 1)).toEqual([]);
    expect(orderGroupForResultDisplay(null, 1)).toEqual([]);
    expect(orderGroupForResultDisplay(undefined, 3)).toEqual([]);
  });

  it('даёт стабильный порядок при равных очках', () => {
    const group = [member('Zoe', 700), member('Ava', 700), member('Mia', 700)];

    const first = orderGroupForResultDisplay(group, 1).map(m => m.name);
    const second = orderGroupForResultDisplay([...group].reverse(), 1).map(m => m.name);

    expect(first).toEqual(second);
  });
});

describe('calculateResult отдаёт согласованную пару «место ↔ список»', () => {
  const stateWith = (group: GroupMember[]): LeagueState => ({
    leagueId: 1,
    weekId: '2026-W33',
    group,
  });

  it('локальный расчёт: моя строка стоит на своём же месте', () => {
    const group = [
      member('stonepetal', 9092),
      member('DuskWillow', 8737),
      member('QA Monday', 0, true),
      member('IronBirch', 7443),
    ];

    const result = calculateResult(stateWith(group), 8800);

    expect(placeOfMe(result.group)).toBe(result.myRank);
  });

  it('при равных очках место из competition ranking совпадает со строкой', () => {
    // Трое с одинаковыми очками: competition ranking даёт всем место 1.
    const group = [
      member('Ava', 500),
      member('Mia', 500),
      member('QA Monday', 0, true),
    ];

    const result = calculateResult(stateWith(group), 500);

    expect(result.myRank).toBe(1);
    expect(placeOfMe(result.group)).toBe(1);
  });
});
