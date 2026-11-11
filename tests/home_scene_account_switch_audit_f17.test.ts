// F17, аудит похожих мест (владелец 11.11): особые сцены Главной после смены аккаунта A → B.
// Снимок счётчиков и место в Пике хранились без владельца: A {уроков 4} против B {уроков 7} давал B ложный «рубеж»,
// место A 2 против места B 10 — ложное «тебя обогнали». Сработал — чини логику, а не сторожа.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

let mockOwner: string | null = 'a';
const mockOwnerResets: Record<string, () => void> = {};
jest.mock('../hooks/use_active_account_owner', () => ({ useActiveAccountOwner: () => mockOwner }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: mockOwner, phase: 'active' }),
  isCurrentAccountGeneration: (token: { stableId: string | null }) => token.stableId === mockOwner,
}));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: (name: string, reset: () => void) => { mockOwnerResets[name] = reset; } }));
let mockStatsGate: Promise<unknown> = Promise.resolve();
jest.mock('../app/lifetime_profile_stats', () => ({ readLifetimeProfileStatsCache: async () => { await mockStatsGate; return null; } }));
jest.mock('../app/daily_phrase_system', () => ({ getTodayPhraseSyncForTarget: () => ({ english: 'Hello', literal: 'Привет', literal_uk: 'Привіт' }) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));

import { ACCOUNT_SWITCH_LEAK_KEYS } from '../app/account_switch_leak_keys';
import {
  homeSceneDayKeyOf,
  homeSceneOwnedBy,
  homeSceneOwnerTag,
  homeSceneWeekKeyOf,
  markHomeScenePhraseSeen,
  useHomeSceneMoreFacts,
} from '../components/home/v2/scene/use_home_scene_more_facts';
import {
  __resetHomeSceneSpecialJournalForTests,
  noteHomeSceneSpecialShown,
  peekHomeSceneSpecialJournal,
} from '../components/home/v2/scene/home_scene_special_journal';

type Props = { lessons: number; coinRank: number | null; peakPlace: number | null };
const mount = (initial: Props) => renderHook(
  (p: Props) => useHomeSceneMoreFacts({ enabled: true, ready: true, studyTarget: 'en', lang: 'ru', streakDays: 3, lessons: p.lessons, phrasesLearned: null, coinRank: p.coinRank, peakPlace: p.peakPlace }),
  { initialProps: initial },
);
const flush = async () => { for (let n = 0; n < 6; n += 1) await act(async () => { await new Promise((resolve) => setImmediate(resolve)); }); };

describe('F17 · особые сцены Главной при смене аккаунта', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockOwner = 'a';
    mockStatsGate = Promise.resolve();
    mockOwnerResets.home_scene_phrase_seen?.();
    __resetHomeSceneSpecialJournalForTests();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('память записана с владельцем; чужая и старая (без владельца) запись — «памяти нет»', () => {
    expect(homeSceneOwnedBy({ lessons: 4, phrases: null, rank: 1, owner: 'a' }, homeSceneOwnerTag('a'))).not.toBeNull();
    expect(homeSceneOwnedBy({ lessons: 4, phrases: null, rank: 1, owner: 'a' }, homeSceneOwnerTag('b'))).toBeNull();
    expect(homeSceneOwnedBy({ lessons: 4, phrases: null, rank: 1 }, homeSceneOwnerTag('b'))).toBeNull();
    expect(homeSceneOwnedBy({ lessons: 4, phrases: null, rank: 1, owner: 'a' }, homeSceneOwnerTag(null))).toBeNull();
  });

  it('A (4 урока, ранг 1) → B (7 уроков, ранг 4): ложного рубежа нет', async () => {
    const hook = await mount({ lessons: 4, coinRank: 1, peakPlace: null });
    await flush();
    mockOwner = 'b';
    await act(async () => { hook.rerender({ lessons: 7, coinRank: 4, peakPlace: null }); });
    await flush();
    expect(hook.result.current.milestone).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem('home_scene_milestone_snapshot_v1'))!)).toMatchObject({ lessons: 7, owner: 'b' });
  });

  it('тот же игрок перешёл порог — рубеж по-прежнему показывается', async () => {
    const hook = await mount({ lessons: 4, coinRank: 1, peakPlace: null });
    await flush();
    await act(async () => { hook.rerender({ lessons: 5, coinRank: 1, peakPlace: null }); });
    await flush();
    expect(hook.result.current.milestone).toEqual({ key: 'lessons_5', n: 5 });
  });

  it('место A в Пике (2) не становится базой для B (10): ложного «тебя обогнали» нет', async () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    // память A: место 2, записано вчера на этой же неделе (если вчера — прошлая неделя, базы нет и у старого кода; тогда тест проверяет только метку)
    await AsyncStorage.setItem('home_scene_peak_place_v1', JSON.stringify({ week: homeSceneWeekKeyOf(now), place: 2, day: homeSceneDayKeyOf(yesterday), basePlace: null, baseDay: homeSceneDayKeyOf(yesterday), owner: 'a' }));
    mockOwner = 'b';
    const hook = await mount({ lessons: 7, coinRank: 4, peakPlace: 10 });
    await flush();
    expect(hook.result.current.peakOvertaken).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem('home_scene_peak_place_v1'))!)).toMatchObject({ place: 10, owner: 'b' });
  });

  it('факты A не отдаются B ни на кадр: сразу после смены владельца — пусто', async () => {
    const hook = await mount({ lessons: 4, coinRank: 1, peakPlace: null });
    await flush();
    expect(hook.result.current.phrase).not.toBeNull();
    // чтение для B ещё идёт (диск не ответил) — в это время на экране не должно быть фактов A
    let open: () => void = () => {};
    mockStatsGate = new Promise<void>((resolve) => { open = resolve; });
    mockOwner = 'b';
    await act(async () => { hook.rerender({ lessons: 4, coinRank: 1, peakPlace: null }); });
    expect(hook.result.current.phrase).toBeNull();
    open();
    await flush();
    expect(hook.result.current.phrase).not.toBeNull();
  });

  it('«фраза дня показана» у A не считается показанной для B', async () => {
    markHomeScenePhraseSeen();
    await flush();
    await AsyncStorage.removeItem('home_scene_phrase_seen_v1'); // диск чистит выход из аккаунта (ключ в списке ниже)
    mockOwnerResets.home_scene_phrase_seen!();
    mockOwner = 'b';
    const hook = await mount({ lessons: 7, coinRank: 4, peakPlace: null });
    await flush();
    expect(hook.result.current.phraseSeen).toBe(false);
  });

  it('журнал показов особых сцен в памяти сбрасывается при смене владельца', () => {
    noteHomeSceneSpecialShown('words_due', null, new Date(2026, 10, 11, 12));
    expect(peekHomeSceneSpecialJournal()).not.toBeNull();
    mockOwnerResets.home_scene_special_journal!();
    expect(peekHomeSceneSpecialJournal()).toBeNull();
  });

  it('ключи без владельца в имени стираются при выходе и смене аккаунта', () => {
    for (const key of [
      'home_scene_milestone_snapshot_v1', 'home_scene_peak_place_v1', 'home_scene_phrase_seen_v1', 'home_scene_special_journal_v1',
      'referral_access_last_until_ms_v1', 'referral_access_ended_seen_for_v1',
    ]) expect(ACCOUNT_SWITCH_LEAK_KEYS).toContain(key);
  });
});
