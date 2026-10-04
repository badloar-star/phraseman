/*
 * Account Authority 2.0, S1c (TG-B76DEBF29EDF) — одно правило времени правки карточки.
 *
 * зачем: 8E (гидрация) и S1b (объединение страниц перед записью) решали «чья версия свежее»
 * по-разному: 8E — max(updatedAt, addedAt), только целые миллисекунды, запас по часам 1 час;
 * S1b — только updatedAt, любые конечные числа, точное сравнение (разница в 1 мс уже «новее»).
 * Теперь правило одно (app/card_edit_time.ts), и сторож ниже держит, что оба потребителя
 * на одной и той же паре версий решают одинаково.
 */
import { decideCardConflict } from '../app/accounts_v2_hydration_conflicts';
import { ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS } from '../app/accounts_v2_hydration_deletions';
import {
  CARD_EDIT_CLOCK_MARGIN_MS,
  cardEditTime,
  compareCardEditTimes,
  isCardEditTimeFromFuture,
} from '../app/card_edit_time';
import { pickCardVersion } from '../app/flashcard_pages_read_result';

const T = 1_800_000_000_000;
const H = 60 * 60 * 1000;
/** «Сейчас» для тестов: T лежит в будущем относительно настоящих часов — часы задаём явно. */
const NOW = T + 10 * H;

describe('S1c — время правки карточки', () => {
  test('запас по часам — тот же, что у удалений 7E и у 8E', () => {
    expect(CARD_EDIT_CLOCK_MARGIN_MS).toBe(ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS);
    expect(CARD_EDIT_CLOCK_MARGIN_MS).toBe(H);
  });

  test('время правки = max(updatedAt, addedAt)', () => {
    expect(cardEditTime({ updatedAt: T + 5, addedAt: T })).toBe(T + 5);
    expect(cardEditTime({ updatedAt: T, addedAt: T + 7 })).toBe(T + 7);
    expect(cardEditTime({ addedAt: T })).toBe(T);
    expect(cardEditTime({ updatedAt: T })).toBe(T);
  });

  test('не-время не считается: строки, ISO, NaN, Infinity, дробные, ноль, отрицательные', () => {
    for (const bad of ['1800000000000', '2027-01-15T08:00:00.000Z', Number.NaN, Number.POSITIVE_INFINITY, T + 0.5, 0, -T, null, true, {}]) {
      expect(cardEditTime({ updatedAt: bad })).toBeNull();
      expect(cardEditTime({ updatedAt: bad, addedAt: T })).toBe(T);
    }
    expect(cardEditTime({ updatedAt: Number.MAX_SAFE_INTEGER + 2 })).toBeNull();
  });

  test('не карточка → время неизвестно', () => {
    for (const notCard of [null, undefined, 'card', 42, []]) expect(cardEditTime(notCard)).toBeNull();
  });

  test('сравнение с запасом: разница < часа → в пределах запаса; ≥ часа → новее', () => {
    expect(compareCardEditTimes(T, T + H - 1, NOW)).toBe('within_clock_margin');
    expect(compareCardEditTimes(T, T + H, NOW)).toBe('remote_newer');
    expect(compareCardEditTimes(T + H - 1, T, NOW)).toBe('within_clock_margin');
    expect(compareCardEditTimes(T + H, T, NOW)).toBe('local_newer');
    expect(compareCardEditTimes(T, T, NOW)).toBe('within_clock_margin');
  });

  test('нет времени хотя бы у одной стороны → время неизвестно', () => {
    expect(compareCardEditTimes(null, T, NOW)).toBe('time_unknown');
    expect(compareCardEditTimes(T, null, NOW)).toBe('time_unknown');
    expect(compareCardEditTimes(null, null, NOW)).toBe('time_unknown');
  });
});

// зачем (S1d, TG-4AC6243A1836): часы устройства убежали вперёд больше чем на запас — такое время
// правки побеждало во всех конфликтах, пока остальные устройства не догонят. Время больше
// now + запас — «неизвестно» (time_unknown); ровно now + запас — ещё допустимо.
describe('S1d — время правки «из будущего»', () => {
  test('граница: ровно now + запас — время; на 1 мс больше — неизвестно (облако)', () => {
    expect(compareCardEditTimes(T, T + H, T)).toBe('remote_newer');
    expect(compareCardEditTimes(T, T + H + 1, T)).toBe('time_unknown');
  });

  test('граница: ровно now + запас — время; на 1 мс больше — неизвестно (локальная)', () => {
    expect(compareCardEditTimes(T + H, T, T)).toBe('local_newer');
    expect(compareCardEditTimes(T + H + 1, T, T)).toBe('time_unknown');
  });

  test('далёкое будущее у одной стороны или у обеих → неизвестно', () => {
    const far = T + 365 * 24 * H;
    expect(compareCardEditTimes(T, far, T)).toBe('time_unknown');
    expect(compareCardEditTimes(far, T, T)).toBe('time_unknown');
    expect(compareCardEditTimes(far, far + 2 * H, T)).toBe('time_unknown');
  });

  test('isCardEditTimeFromFuture: ровно now + запас — нет; на 1 мс больше — да; без часов / без времени — нет', () => {
    expect(isCardEditTimeFromFuture(T + H, T)).toBe(false);
    expect(isCardEditTimeFromFuture(T + H + 1, T)).toBe(true);
    expect(isCardEditTimeFromFuture(T + 100 * H, null)).toBe(false);
    expect(isCardEditTimeFromFuture(null, T)).toBe(false);
  });

  test('без часов (now = null / не число) отсечки нет — прежнее поведение', () => {
    const far = T + 365 * 24 * H;
    expect(compareCardEditTimes(T, far, null)).toBe('remote_newer');
    expect(compareCardEditTimes(far, T, Number.NaN)).toBe('local_newer');
  });
});

describe('S1c — 8E и S1b решают одинаково на одной паре версий', () => {
  // 8E: decideCardConflict(server, local) → apply_server / send_local / keep_local.
  // S1b: pickCardVersion(local, remote, 'active') → remote / local (8E тоже «активное» правило).
  const FUTURE = NOW + 10 * 365 * 24 * H;
  const cases: ReadonlyArray<readonly [string, Record<string, unknown>, Record<string, unknown>]> = [
    ['облако новее на час', { updatedAt: T }, { updatedAt: T + H }],
    ['облако новее на минуту', { updatedAt: T }, { updatedAt: T + 60_000 }],
    ['локальная новее на час', { updatedAt: T + H }, { updatedAt: T }],
    ['равные', { updatedAt: T }, { updatedAt: T }],
    ['нет времени у облака', { updatedAt: T }, {}],
    ['нет времени у локальной', {}, { updatedAt: T + H }],
    ['ISO-строка у облака', { updatedAt: T }, { updatedAt: '2030-01-01T00:00:00.000Z' }],
    ['дробное у облака', { updatedAt: T }, { updatedAt: T + H + 0.5 }],
    ['NaN у локальной', { updatedAt: Number.NaN }, { updatedAt: T + H }],
    ['только addedAt у локальной, новее', { addedAt: T + 2 * H }, { updatedAt: T }],
    // S1d: время из будущего (> now + запас) — неизвестно в обоих потребителях.
    ['время облака из будущего', { updatedAt: T }, { updatedAt: FUTURE }],
    ['время локальной из будущего', { updatedAt: FUTURE }, { updatedAt: T }],
    ['обе стороны из будущего', { updatedAt: FUTURE + 2 * H }, { updatedAt: FUTURE }],
    ['облако ровно на границе now + запас', { updatedAt: T }, { updatedAt: NOW + H }],
    ['облако на 1 мс за границей', { updatedAt: T }, { updatedAt: NOW + H + 1 }],
  ];

  test.each(cases)('%s', (_name, localTime, remoteTime) => {
    const local = { id: 'a', en: 'mine', ...localTime };
    const remote = { id: 'a', en: 'theirs', ...remoteTime };
    const verdict = decideCardConflict('en', 'saved', remote, local, NOW);
    const pick = pickCardVersion(local, remote, 'active', NOW);
    expect(pick.winner).toBe(verdict.decision === 'apply_server' ? 'remote' : 'local');
    const expectedReason = verdict.decision === 'apply_server' ? 'remote_newer' : verdict.decision === 'send_local' ? 'local_newer' : verdict.reason;
    expect(pick.reason).toBe(expectedReason);
  });
});

describe('S1d — оба потребителя: время «из будущего» = неизвестно', () => {
  const far = NOW + 365 * 24 * H;
  test('8E: будущее у облака / у локальной / у обеих → keep_local time_unknown', () => {
    for (const [serverTime, localTime] of [[far, T], [T, far], [far, far + 2 * H]]) {
      expect(decideCardConflict('en', 'saved', { id: 'a', en: 'x', updatedAt: serverTime }, { id: 'a', en: 'y', updatedAt: localTime }, NOW))
        .toEqual({ decision: 'keep_local', reason: 'time_unknown' });
    }
  });

  test('S1b active → локальная, restore → облачная (причина time_unknown)', () => {
    for (const [localTime, remoteTime] of [[T, far], [far, T], [far, far + 2 * H]]) {
      const local = { id: 'a', updatedAt: localTime };
      const remote = { id: 'a', updatedAt: remoteTime };
      expect(pickCardVersion(local, remote, 'active', NOW)).toEqual({ winner: 'local', reason: 'time_unknown' });
      expect(pickCardVersion(local, remote, 'restore', NOW)).toEqual({ winner: 'remote', reason: 'time_unknown' });
    }
  });
});
