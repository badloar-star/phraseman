/**
 * cards-2.0 (E12): best-звёзды колод (fc_deck_best_stars_v1) + milestone-сундуки
 * 10/25/50★ (§4 «Долгосрочный хук»).
 * Покрытие: best = max за сессию, lastTrained освежается всегда, decay-флаг
 * «7 дней без тренировки» (мок Date), запись из awardSessionStars (по качеству
 * ДО дневного кэпа), milestone: выплата один раз, «переустановка не выплачивает
 * повторно» (пустой локальный стейт + one-time событие), повторный клейм не платит.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import {
  __resetDeckBestForTests,
  __resetStarsStateForTests,
  awardSessionStars,
  claimMilestone,
  FC_DECK_BEST_KEY,
  getDeckBestMap,
  getMilestonesState,
  isDeckFaded,
  milestoneOneTimeEventKey,
  parseDeckBestMap,
  recordDeckBest,
  sumDeckBestStars,
} from '../app/flashcards/stars_system';
import { MILESTONE_SHARD_REWARDS } from '../app/flashcards/stars_config';

jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), log: jest.fn() } }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => null),
  getAuthUserId: jest.fn(() => null),
}));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(async () => {}),
  bumpLifetimeShardsSpent: jest.fn(async () => {}),
}));

const storageMock = AsyncStorage as unknown as { __reset: () => void };

const DAY = 24 * 3600 * 1000;
/** Пн 2026-08-10 12:00 UTC. */
const NOW = Date.UTC(2026, 7, 10, 12, 0, 0);

let nowMs = NOW;
let dateNowSpy: jest.SpyInstance<number, []>;

const getBalance = async (): Promise<number> =>
  Number((await AsyncStorage.getItem('shards_balance')) ?? '0');

const getOneTimeEvents = async (): Promise<string[]> =>
  JSON.parse((await AsyncStorage.getItem('shards_one_time_events')) ?? '[]');

const seedDeckBest = async (map: Record<string, { best: number; lastTrainedISO: string }>) => {
  await AsyncStorage.setItem(FC_DECK_BEST_KEY, JSON.stringify(map));
};

beforeEach(async () => {
  jest.clearAllMocks();
  storageMock.__reset();
  __resetStarsStateForTests();
  __resetDeckBestForTests();
  nowMs = NOW;
  dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  await AsyncStorage.setItem('shards_balance', '100');
});

afterEach(() => {
  dateNowSpy.mockRestore();
  jest.restoreAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════
describe('recordDeckBest — best = max, lastTrained освежается всегда', () => {
  it('первая запись создаёт строку; лучший результат апгрейдит, худший — нет', async () => {
    await recordDeckBest('custom', 2);
    expect((await getDeckBestMap()).custom).toEqual({
      best: 2,
      lastTrainedISO: new Date(NOW).toISOString(),
    });

    nowMs = NOW + DAY;
    await recordDeckBest('custom', 1); // хуже — best не падает, дата свежая
    expect((await getDeckBestMap()).custom).toEqual({
      best: 2,
      lastTrainedISO: new Date(NOW + DAY).toISOString(),
    });

    await recordDeckBest('custom', 3);
    expect((await getDeckBestMap()).custom!.best).toBe(3);
    // и на диске то же (переживает перезапуск)
    __resetDeckBestForTests();
    expect((await getDeckBestMap()).custom!.best).toBe(3);
  });

  it('звёзды клампятся в 0–3, ключи независимы (saved/custom/pack:<id>)', async () => {
    await recordDeckBest('saved', 99 as number);
    await recordDeckBest('pack:idioms', -5 as number);
    const map = await getDeckBestMap();
    expect(map.saved!.best).toBe(3);
    expect(map['pack:idioms']!.best).toBe(0);
    expect(sumDeckBestStars(map)).toBe(3);
  });

  it('parseDeckBestMap толерантен к мусору', () => {
    expect(parseDeckBestMap(null)).toEqual({});
    expect(parseDeckBestMap('not json')).toEqual({});
    expect(parseDeckBestMap('[1,2]')).toEqual({});
    expect(parseDeckBestMap('{"a":{"best":"2","lastTrainedISO":5},"b":null}')).toEqual({
      a: { best: 2, lastTrainedISO: '' },
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('isDeckFaded — «тускнение» через 7 дней без тренировки (мок Date)', () => {
  it('свежая тренировка — не faded; ровно 7 дней и старше — faded', () => {
    const trained = new Date(NOW).toISOString();
    expect(isDeckFaded(trained, NOW)).toBe(false);
    expect(isDeckFaded(trained, NOW + 6 * DAY + 23 * 3600 * 1000)).toBe(false);
    expect(isDeckFaded(trained, NOW + 7 * DAY)).toBe(true);
    expect(isDeckFaded(trained, NOW + 30 * DAY)).toBe(true);
  });

  it('нет даты / битая дата → faded (не рисуем «свежесть» без данных)', () => {
    expect(isDeckFaded(undefined, NOW)).toBe(true);
    expect(isDeckFaded('', NOW)).toBe(true);
    expect(isDeckFaded('yesterday', NOW)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('awardSessionStars + deckKey — best пишется по качеству ДО кэпа', () => {
  it('блиц 100% быстро → 3★ в кэп и best=3 колоды', async () => {
    const outcome = await awardSessionStars('blitz', {
      correct: 10,
      total: 10,
      avgAnswerSec: 2,
      inputKind: 'choice',
      deckKey: 'saved',
    });
    expect(outcome.awarded).toBe(3);
    expect((await getDeckBestMap()).saved).toMatchObject({ best: 3 });
  });

  it('дневной кэп съел выдачу — best всё равно фиксирует качество сессии', async () => {
    await awardSessionStars('blitz', {
      correct: 10, total: 10, avgAnswerSec: 2, inputKind: 'choice', deckKey: 'saved',
    });
    // кэп блица (3★/день) исчерпан; вторая сессия по другой колоде
    const second = await awardSessionStars('blitz', {
      correct: 10, total: 10, avgAnswerSec: 2, inputKind: 'choice', deckKey: 'pack:idioms',
    });
    expect(second.awarded).toBe(0);
    expect(second.breakdown.reason).toBe('daily_cap');
    expect((await getDeckBestMap())['pack:idioms']).toMatchObject({ best: 3 });
  });

  it('анти-фарм custom_deck обнуляет и звёзды, и best (но освежает lastTrained)', async () => {
    nowMs = NOW + DAY;
    const outcome = await awardSessionStars('custom_deck', {
      correct: 5,
      total: 5, // < 10 карточек — too_few_cards
      avgAnswerSec: 2,
      inputKind: 'choice',
      cardIds: ['a', 'b', 'c', 'd', 'e'],
      deckKey: 'custom',
    });
    expect(outcome.awarded).toBe(0);
    const row = (await getDeckBestMap()).custom!;
    expect(row.best).toBe(0);
    expect(row.lastTrainedISO).toBe(new Date(NOW + DAY).toISOString());
  });

  it('без deckKey (смешанный блиц по умолчанию) карта колод не трогается', async () => {
    await awardSessionStars('blitz', { correct: 10, total: 10, avgAnswerSec: 2, inputKind: 'choice' });
    expect(await getDeckBestMap()).toEqual({});
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe('milestone-сундуки 10/25/50★ — выплата строго один раз', () => {
  const trained = new Date(NOW).toISOString();

  it('достигнутый milestone платит и регистрирует fc_milestone_10', async () => {
    await seedDeckBest({
      saved: { best: 3, lastTrainedISO: trained },
      custom: { best: 3, lastTrainedISO: trained },
      'pack:a': { best: 3, lastTrainedISO: trained },
      'pack:b': { best: 3, lastTrainedISO: trained },
    });
    const state = await getMilestonesState();
    expect(state.totalBest).toBe(12);
    expect(state.milestones).toEqual([
      { milestone: 10, reward: 50, reached: true, claimed: false },
      { milestone: 25, reward: 150, reached: false, claimed: false },
      { milestone: 50, reward: 400, reached: false, claimed: false },
    ]);

    const outcome = await claimMilestone(10);
    expect(outcome).toEqual({ ok: true, milestone: 10, amount: MILESTONE_SHARD_REWARDS[10] });
    expect(await getBalance()).toBe(150);
    expect(await getOneTimeEvents()).toContain('fc_milestone_10');
    expect(emitAppEvent).toHaveBeenCalledWith('fc_milestone_claimed', { milestone: 10, amount: 50 });
  });

  it('повторный клейм не платит; недостигнутый/неизвестный отклоняются', async () => {
    await seedDeckBest({
      saved: { best: 3, lastTrainedISO: trained },
      custom: { best: 3, lastTrainedISO: trained },
      'pack:a': { best: 3, lastTrainedISO: trained },
      'pack:b': { best: 3, lastTrainedISO: trained },
    });
    await claimMilestone(10);
    (emitAppEvent as jest.Mock).mockClear();

    expect(await claimMilestone(10)).toEqual({ ok: false, reason: 'already_claimed' });
    expect(await getBalance()).toBe(150); // не выросло
    expect(emitAppEvent).not.toHaveBeenCalledWith('fc_milestone_claimed', expect.anything());

    expect(await claimMilestone(25)).toEqual({ ok: false, reason: 'not_reached' });
    expect(await claimMilestone(11)).toEqual({ ok: false, reason: 'unknown_milestone' });
  });

  it('«переустановка не выплачивает повторно»: локальный стейт пуст, но one-time событие есть → сундук отображается заклеймленным', async () => {
    // Синк восстановил shards_one_time_events, а fc_deck_best_stars_v1 потерян
    await AsyncStorage.setItem('shards_one_time_events', JSON.stringify([milestoneOneTimeEventKey(10)]));

    const state = await getMilestonesState();
    expect(state.totalBest).toBe(0);
    expect(state.milestones[0]).toEqual({ milestone: 10, reward: 50, reached: false, claimed: true });

    // Даже когда best-звёзды заново набраны — повторной эмиссии нет
    await seedDeckBest({
      saved: { best: 3, lastTrainedISO: trained },
      custom: { best: 3, lastTrainedISO: trained },
      'pack:a': { best: 3, lastTrainedISO: trained },
      'pack:b': { best: 3, lastTrainedISO: trained },
    });
    __resetDeckBestForTests();
    const outcome = await claimMilestone(10);
    expect(outcome).toEqual({ ok: false, reason: 'already_claimed' });
    expect(await getBalance()).toBe(100);
    expect(emitAppEvent).not.toHaveBeenCalledWith('fc_milestone_claimed', expect.anything());
  });

  it('ключи one-time — fc_milestone_10|25|50', () => {
    expect(milestoneOneTimeEventKey(10)).toBe('fc_milestone_10');
    expect(milestoneOneTimeEventKey(25)).toBe('fc_milestone_25');
    expect(milestoneOneTimeEventKey(50)).toBe('fc_milestone_50');
  });
});
