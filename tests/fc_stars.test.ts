/**
 * cards-2.0 (E4): система звёзд (app/flashcards/stars_system.ts, §4 мастер-плана).
 * Покрытие: расчёт 0–3★ по качеству, дневные кэпы по режимам, недельный reset
 * ISO-week UTC, анти-фарм custom-колод, merge union/max двух устройств,
 * write-lock (параллельные начисления не теряются), «неделя free-юзера» = 21★.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import {
  __resetStarsStateForTests,
  applyDailyCap,
  awardSessionStars,
  canEarnToday,
  computeSessionStars,
  FC_STARS_KEY,
  getStarsState,
  getWeeklyProgress,
  isoWeekKeyUTC,
  mergeFcDeckBestStarsForRestore,
  mergeFcStarsForRestore,
  mergeFcStarsStates,
  normalizeStarsState,
  parseStarsStateRaw,
  utcDateKey,
  weeklyTargetForStreak,
} from '../app/flashcards/stars_system';

jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => null),
  getAuthUserId: jest.fn(() => null),
}));

const storageMock = AsyncStorage as unknown as { __reset: () => void };

/** Пн 2026-08-10 12:00 UTC — ISO-неделя 2026-W33 (текущая неделя мастер-плана). */
const MON_W33 = Date.UTC(2026, 7, 10, 12, 0, 0);
const DAY = 24 * 3600 * 1000;

let nowMs = MON_W33;
let dateNowSpy: jest.SpyInstance<number, []>;

beforeEach(() => {
  jest.clearAllMocks();
  storageMock.__reset();
  __resetStarsStateForTests();
  nowMs = MON_W33;
  dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
});

afterEach(() => {
  dateNowSpy.mockRestore();
});

// ════════════════════════════════════════════════════════════════════════════
describe('isoWeekKeyUTC / utcDateKey', () => {
  it('считает ISO-неделю по UTC', () => {
    expect(isoWeekKeyUTC(Date.UTC(2026, 7, 10, 0, 0, 0))).toBe('2026-W33'); // Пн
    expect(isoWeekKeyUTC(Date.UTC(2026, 7, 12, 12, 0, 0))).toBe('2026-W33'); // Ср
    expect(isoWeekKeyUTC(Date.UTC(2026, 7, 16, 23, 59, 59))).toBe('2026-W33'); // Вс 23:59
    expect(isoWeekKeyUTC(Date.UTC(2026, 7, 17, 0, 0, 0))).toBe('2026-W34'); // Пн 00:00
  });

  it('граница недели ровно на Пн 00:00 UTC (не «понедельник локали»)', () => {
    expect(isoWeekKeyUTC(Date.UTC(2026, 7, 9, 23, 59, 59, 999))).toBe('2026-W32');
    expect(isoWeekKeyUTC(Date.UTC(2026, 7, 10, 0, 0, 0, 0))).toBe('2026-W33');
  });

  it('границы ISO-года: 29.12.2025 (Пн) уже 2026-W01', () => {
    expect(isoWeekKeyUTC(Date.UTC(2025, 11, 29))).toBe('2026-W01');
    expect(isoWeekKeyUTC(Date.UTC(2026, 0, 1))).toBe('2026-W01'); // Чт
    expect(isoWeekKeyUTC(Date.UTC(2025, 11, 28))).toBe('2025-W52'); // Вс
  });

  it('utcDateKey — день по UTC', () => {
    expect(utcDateKey(Date.UTC(2026, 7, 10, 0, 30))).toBe('2026-08-10');
    expect(utcDateKey(Date.UTC(2026, 7, 10, 23, 59))).toBe('2026-08-10');
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('computeSessionStars — качество сессии (§4)', () => {
  it('пороги точности: ≥70% → 1★, ≥90% → 2★, <70% → 0★', () => {
    expect(computeSessionStars('trainer', { correct: 6, total: 10 })).toBe(0);
    expect(computeSessionStars('trainer', { correct: 7, total: 10 })).toBe(1);
    expect(computeSessionStars('trainer', { correct: 8, total: 10 })).toBe(1);
    expect(computeSessionStars('trainer', { correct: 9, total: 10 })).toBe(2);
    expect(computeSessionStars('review', { correct: 0, total: 0 })).toBe(0);
  });

  it('3★ = 100% + среднее время ≤ порога пер-режимно (5с/12с/10с)', () => {
    expect(
      computeSessionStars('trainer', { correct: 10, total: 10, avgAnswerSec: 4.9, inputKind: 'choice' }),
    ).toBe(3);
    expect(
      computeSessionStars('trainer', { correct: 10, total: 10, avgAnswerSec: 5.1, inputKind: 'choice' }),
    ).toBe(2);
    expect(
      computeSessionStars('review', { correct: 10, total: 10, avgAnswerSec: 11.9, inputKind: 'typed' }),
    ).toBe(3);
    expect(
      computeSessionStars('review', { correct: 10, total: 10, avgAnswerSec: 12.1, inputKind: 'typed' }),
    ).toBe(2);
    expect(
      computeSessionStars('blitz', { correct: 10, total: 10, avgAnswerSec: 9.5, inputKind: 'fill_gap' }),
    ).toBe(3);
    expect(
      computeSessionStars('blitz', { correct: 10, total: 10, avgAnswerSec: 10.5, inputKind: 'fill_gap' }),
    ).toBe(2);
  });

  it('100% без данных о времени → 2★ (3★ недостижимы)', () => {
    expect(computeSessionStars('trainer', { correct: 10, total: 10 })).toBe(2);
  });

  it('слушание: фикс 1★ за сессию ≥10 карточек, качество не оценивается', () => {
    expect(computeSessionStars('listening', { correct: 0, total: 10 })).toBe(1);
    expect(computeSessionStars('listening', { correct: 0, total: 9 })).toBe(0);
    expect(computeSessionStars('listening', { correct: 12, total: 12 })).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('дневные кэпы по режимам (таблица §4)', () => {
  it('applyDailyCap — чистая математика остатка', () => {
    expect(applyDailyCap({}, 'review', 3)).toEqual({ granted: 3, remainingBefore: 6, remainingAfter: 3 });
    expect(applyDailyCap({ review: 5 }, 'review', 3)).toEqual({ granted: 1, remainingBefore: 1, remainingAfter: 0 });
    expect(applyDailyCap({ trainer: 3 }, 'trainer', 2)).toEqual({ granted: 0, remainingBefore: 0, remainingAfter: 0 });
  });

  it('review: 6★/день, дальше — capped/0', async () => {
    const r1 = await awardSessionStars('review', { correct: 9, total: 10 }); // 2★
    const r2 = await awardSessionStars('review', { correct: 10, total: 10, avgAnswerSec: 3, inputKind: 'choice' }); // 3★
    const r3 = await awardSessionStars('review', { correct: 9, total: 10 }); // 2★ → влезает 1
    const r4 = await awardSessionStars('review', { correct: 9, total: 10 }); // кэп
    expect(r1.awarded).toBe(2);
    expect(r2.awarded).toBe(3);
    expect(r3).toMatchObject({ awarded: 1, capped: true });
    expect(r4).toMatchObject({ awarded: 0, capped: true });
    expect(r4.breakdown.reason).toBe('daily_cap');
    const state = await getStarsState();
    expect(state.stars).toBe(6);
    expect(state.dailyCaps.byMode.review).toBe(6);
    await expect(canEarnToday('review')).resolves.toEqual({ allowed: false, remaining: 0, cap: 6 });
  });

  it('trainer и custom_deck делят один кэп 3★', async () => {
    await awardSessionStars('trainer', { correct: 9, total: 10 }); // 2★ trainer
    const ids = Array.from({ length: 10 }, (_, i) => `c${i}`);
    const r = await awardSessionStars('custom_deck', {
      correct: 10,
      total: 10,
      avgAnswerSec: 3,
      inputKind: 'choice',
      cardIds: ids,
    });
    expect(r.breakdown.sessionStars).toBe(3);
    expect(r.awarded).toBe(1); // общий кэп trainer: 3 − 2 = 1
    expect(r.capped).toBe(true);
    await expect(canEarnToday('trainer')).resolves.toMatchObject({ allowed: false });
    await expect(canEarnToday('custom_deck')).resolves.toMatchObject({ allowed: false });
  });

  it('слушание: кэп 2★/день', async () => {
    const r1 = await awardSessionStars('listening', { correct: 0, total: 12 });
    const r2 = await awardSessionStars('listening', { correct: 0, total: 10 });
    const r3 = await awardSessionStars('listening', { correct: 0, total: 15 });
    expect([r1.awarded, r2.awarded, r3.awarded]).toEqual([1, 1, 0]);
    expect(r3.breakdown.reason).toBe('daily_cap');
  });

  it('кэпы сбрасываются на новый UTC-день, недельный счёт остаётся', async () => {
    await awardSessionStars('review', { correct: 10, total: 10, avgAnswerSec: 3, inputKind: 'choice' }); // 3★
    nowMs += DAY; // Вт той же недели
    await expect(canEarnToday('review')).resolves.toMatchObject({ allowed: true, remaining: 6 });
    const state = await getStarsState();
    expect(state.stars).toBe(3); // неделя та же
    expect(state.dailyCaps.byMode.review).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('недельный reset — ISO-week UTC', () => {
  it('переход Вс→Пн UTC обнуляет неделю, lifetime сохраняется', async () => {
    nowMs = Date.UTC(2026, 7, 16, 20, 0, 0); // Вс W33
    await awardSessionStars('review', { correct: 9, total: 10 }); // 2★
    let state = await getStarsState();
    expect(state).toMatchObject({ weekKey: '2026-W33', stars: 2 });

    nowMs = Date.UTC(2026, 7, 17, 0, 0, 1); // Пн W34 00:00:01 UTC
    state = await getStarsState();
    expect(state.weekKey).toBe('2026-W34');
    expect(state.stars).toBe(0);
    expect(state.checkpointsClaimed).toEqual([]);
    expect(state.lifetime.stars).toBe(2);
    const weekly = await getWeeklyProgress();
    expect(weekly).toMatchObject({ weekKey: '2026-W34', earned: 0, target: 21 });
  });

  it('reset переживает «протухший» AsyncStorage (state читается с диска)', async () => {
    await AsyncStorage.setItem(
      FC_STARS_KEY,
      JSON.stringify({
        weekKey: '2026-W32',
        stars: 21,
        checkpointsClaimed: [7, 14, 21],
        lifetime: { stars: 40, sessions: 30, perfectSessions: 5 },
      }),
    );
    const state = await getStarsState(); // сейчас W33
    expect(state).toMatchObject({ weekKey: '2026-W33', stars: 0, checkpointsClaimed: [] });
    expect(state.lifetime.stars).toBe(40);
  });

  it('стрик ≥7 дней снижает порог недели до 18★', async () => {
    expect(weeklyTargetForStreak(6)).toBe(21);
    expect(weeklyTargetForStreak(7)).toBe(18);
    await AsyncStorage.setItem('streak_count', '9');
    const weekly = await getWeeklyProgress();
    expect(weekly.target).toBe(18);
    expect(weekly.checkpoints).toEqual([7, 14, 18]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('анти-фарм кастомных колод (§4, п.13)', () => {
  const ids = Array.from({ length: 10 }, (_, i) => `card_${i}`);
  const perfect = { correct: 10, total: 10, avgAnswerSec: 3, inputKind: 'choice' as const };

  it('первая сессия дня по 10 уникальным даёт звёзды, повтор тех же id — нет', async () => {
    const r1 = await awardSessionStars('custom_deck', { ...perfect, cardIds: ids });
    expect(r1.awarded).toBe(3);
    const r2 = await awardSessionStars('custom_deck', { ...perfect, cardIds: ids });
    expect(r2.awarded).toBe(0);
    expect(r2.breakdown.reason).toBe('anti_farm');
  });

  it('колода «a→a»×10 (id повторяются) не фармится вовсе', async () => {
    const r = await awardSessionStars('custom_deck', {
      ...perfect,
      cardIds: Array.from({ length: 10 }, () => 'same_id'),
    });
    expect(r.awarded).toBe(0);
    expect(r.breakdown.reason).toBe('anti_farm');
  });

  it('сессия <10 карточек звёзд не даёт (too_few_cards)', async () => {
    const r = await awardSessionStars('custom_deck', {
      correct: 5,
      total: 5,
      avgAnswerSec: 3,
      inputKind: 'choice',
      cardIds: ids.slice(0, 5),
    });
    expect(r.awarded).toBe(0);
    expect(r.breakdown.reason).toBe('too_few_cards');
  });

  it('новый UTC-день очищает customTrainedToday — колода снова даёт звёзды', async () => {
    await awardSessionStars('custom_deck', { ...perfect, cardIds: ids });
    nowMs += DAY;
    const r = await awardSessionStars('custom_deck', { ...perfect, cardIds: ids });
    expect(r.awarded).toBe(3);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('merge двух устройств: union по claimed / max по stars', () => {
  const base = () => normalizeStarsState(null, MON_W33);

  it('одна неделя: stars = max, checkpointsClaimed = union', () => {
    const a = { ...base(), stars: 5, checkpointsClaimed: [7] };
    const b = { ...base(), stars: 9, checkpointsClaimed: [7, 14] };
    const m = mergeFcStarsStates(a, b);
    expect(m.stars).toBe(9);
    expect(m.checkpointsClaimed).toEqual([7, 14]);
  });

  it('разные недели: побеждает больший weekKey (свежая неделя), без утечки клеймов', () => {
    const oldWeek = { ...base(), weekKey: '2026-W32', stars: 21, checkpointsClaimed: [7, 14, 21] };
    const newWeek = { ...base(), weekKey: '2026-W33', stars: 3, checkpointsClaimed: [] };
    const m = mergeFcStarsStates(oldWeek, newWeek);
    expect(m).toMatchObject({ weekKey: '2026-W33', stars: 3, checkpointsClaimed: [] });
  });

  it('lifetime/xpBoostUntil = max; дневные кэпы — max по свежему дню', () => {
    const a = {
      ...base(),
      dailyCaps: { dateKey: '2026-08-10', byMode: { review: 4 } },
      lifetime: { stars: 30, sessions: 20, perfectSessions: 2 },
      xpBoostUntil: 100,
    };
    const b = {
      ...base(),
      dailyCaps: { dateKey: '2026-08-10', byMode: { review: 2, trainer: 3 } },
      lifetime: { stars: 25, sessions: 26, perfectSessions: 4 },
      xpBoostUntil: 200,
    };
    const m = mergeFcStarsStates(a, b);
    expect(m.dailyCaps.byMode).toEqual({ review: 4, trainer: 3 });
    expect(m.lifetime).toEqual({ stars: 30, sessions: 26, perfectSessions: 4 });
    expect(m.xpBoostUntil).toBe(200);
  });

  it('customTrainedToday: union id за свежий день', () => {
    const a = { ...base(), customTrainedToday: { dateKey: '2026-08-10', cardIds: ['a', 'b'] } };
    const b = { ...base(), customTrainedToday: { dateKey: '2026-08-10', cardIds: ['b', 'c'] } };
    const m = mergeFcStarsStates(a, b);
    expect([...m.customTrainedToday.cardIds].sort()).toEqual(['a', 'b', 'c']);
  });

  it('mergeFcStarsForRestore: пустой/битый local → облако; и наоборот', () => {
    const cloud = JSON.stringify({ ...base(), stars: 4 });
    expect(JSON.parse(mergeFcStarsForRestore(null, cloud)).stars).toBe(4);
    expect(JSON.parse(mergeFcStarsForRestore('{broken', cloud)).stars).toBe(4);
    const local = JSON.stringify({ ...base(), stars: 6 });
    expect(JSON.parse(mergeFcStarsForRestore(local, '')).stars).toBe(6);
    const merged = JSON.parse(mergeFcStarsForRestore(local, cloud));
    expect(merged.stars).toBe(6);
  });

  it('parseStarsStateRaw не делает ролловер (для merge снапшотов)', () => {
    const raw = JSON.stringify({ weekKey: '2026-W30', stars: 12 });
    expect(parseStarsStateRaw(raw)).toMatchObject({ weekKey: '2026-W30', stars: 12 });
  });

  it('fc_deck_best_stars_v1: best = max по колоде, union колод', () => {
    const local = JSON.stringify({
      d1: { best: 3, lastTrainedISO: '2026-08-01T00:00:00Z' },
      d2: { best: 1, lastTrainedISO: '2026-08-09T00:00:00Z' },
    });
    const cloud = JSON.stringify({
      d1: { best: 2, lastTrainedISO: '2026-08-05T00:00:00Z' },
      d3: { best: 2, lastTrainedISO: '2026-08-02T00:00:00Z' },
    });
    const m = JSON.parse(mergeFcDeckBestStarsForRestore(local, cloud));
    expect(m.d1).toEqual({ best: 3, lastTrainedISO: '2026-08-05T00:00:00Z' });
    expect(m.d2.best).toBe(1);
    expect(m.d3.best).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('write-lock: параллельные начисления не теряются', () => {
  it('5 параллельных review-сессий по 2★ упираются ровно в кэп 6', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => awardSessionStars('review', { correct: 9, total: 10 })),
    );
    const sum = results.reduce((acc, r) => acc + r.awarded, 0);
    expect(sum).toBe(6); // 2+2+2, потом кэп — ни одна выдача не потеряна и не задвоена
    const state = await getStarsState();
    expect(state.stars).toBe(6);
    expect(state.lifetime.sessions).toBe(5);
    expect(JSON.parse((await AsyncStorage.getItem(FC_STARS_KEY)) as string).stars).toBe(6);
  });

  it('оптимистик-событие fc_stars_earned летит при каждой ненулевой выдаче', async () => {
    await awardSessionStars('review', { correct: 9, total: 10 });
    expect(emitAppEvent).toHaveBeenCalledWith('fc_stars_earned', {
      awarded: 2,
      weeklyEarned: 2,
      mode: 'review',
    });
    (emitAppEvent as jest.Mock).mockClear();
    await awardSessionStars('review', { correct: 3, total: 10 }); // 0★
    expect(emitAppEvent).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('сквозной сценарий: неделя free-юзера = 21★ (§4)', () => {
  it('review (2★) + слушание (1★) каждый день недели → ровно 21★, лимит тренера не нужен', async () => {
    for (let day = 0; day < 7; day++) {
      nowMs = MON_W33 + day * DAY;
      // free: review безлимитен (core loop) — сессия на 90% = 2★
      const rev = await awardSessionStars('review', { correct: 9, total: 10 });
      expect(rev.awarded).toBe(2);
      // free: слушание безлимитно — сессия ≥10 карточек = 1★
      const lis = await awardSessionStars('listening', { correct: 0, total: 12 });
      expect(lis.awarded).toBe(1);
    }
    const weekly = await getWeeklyProgress();
    expect(weekly).toMatchObject({ weekKey: '2026-W33', earned: 21, target: 21 });

    // Понедельник следующей недели — трек обнулён.
    nowMs = MON_W33 + 7 * DAY;
    const next = await getWeeklyProgress();
    expect(next).toMatchObject({ weekKey: '2026-W34', earned: 0 });
    const state = await getStarsState();
    expect(state.lifetime.stars).toBe(21);
  });
});
