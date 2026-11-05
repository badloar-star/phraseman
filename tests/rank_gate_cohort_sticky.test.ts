// Липкая когорта «новый/старый» (владелец 30.10): новичок после первого занятия не становится «старым» на следующем запуске.
// Владелец 04.11: когорта принадлежит АККАУНТУ (ключ по stableId в стираемом семействе story_events_v1:), а «новый» требует и время создания аккаунта ≥ релиз.
const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => { store.set(k, v); },
    multiGet: async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null]),
  },
}));
jest.mock('../app/fresh_install_gate', () => ({ ONBOARDING_COMPLETED_AT_KEY: 'onboarding_completed_at_ms_v1' }));
let mockOwner: string | null = 'uid-A';
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: mockOwner, phase: mockOwner ? 'active' : 'transitioning' }),
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
}));
let mockCreatedAt: number | null = 9_000;
jest.mock('../app/account_created_at', () => ({ peekCurrentAccountCreatedAtMs: () => mockCreatedAt }));

import { readRankGateUserVerdict, rankGateCohortKey } from '../app/rank_gates_new_user';
import * as mod from '../app/rank_gates_new_user';

const SINCE = 5_000;
const NOW = 10_000;

describe('когорта липкая и принадлежит аккаунту', () => {
  beforeEach(() => {
    store.clear();
    mockOwner = 'uid-A';
    mockCreatedAt = 9_000;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('залипший «новый» остаётся новым после появления прогресса', async () => {
    store.set(rankGateCohortKey('uid-A'), 'new');
    store.set('streak_count', '3'); store.set('user_total_xp', '120');
    expect(await readRankGateUserVerdict(NOW, SINCE)).toEqual({ isNew: true, reason: 'sticky_new' });
  });
  it('залипший «старый» у СТАРОГО аккаунта (создан до среза) остаётся старым', async () => {
    mockCreatedAt = SINCE - 1;
    store.set(rankGateCohortKey('uid-A'), 'old');
    store.set('onboarding_completed_at_ms_v1', '9000');
    expect((await readRankGateUserVerdict(NOW, SINCE)).reason).toBe('sticky_old');
  });
  // зачем (🔴 P0 05.11, Pixel_8_fresh: чистый новичок видел ВСЁ открытым; лог reason=prior_progress): серия первого дня (streak_count=1) не делает НОВЫЙ аккаунт «старым»
  it('новый аккаунт (создан после среза) с серией/опытом первого дня — «новый», замки включены; отметка сохраняется', async () => {
    store.set('onboarding_completed_at_ms_v1', '9000');
    store.set('streak_count', '1');
    store.set('user_total_xp', '5');
    const verdict = await readRankGateUserVerdict(NOW, SINCE);
    expect(verdict).toEqual({ isNew: true, reason: 'new' });
    expect(store.get(rankGateCohortKey('uid-A'))).toBe('new');
  });
  it('ошибочное липкое «старый» у молодого аккаунта пересчитывается в «новый» (самолечение после бага prior_progress)', async () => {
    store.set(rankGateCohortKey('uid-A'), 'old');
    store.set('onboarding_completed_at_ms_v1', '9000');
    store.set('streak_count', '1');
    expect(await readRankGateUserVerdict(NOW, SINCE)).toEqual({ isNew: true, reason: 'new' });
    expect(store.get(rankGateCohortKey('uid-A'))).toBe('new');
  });
  it('старый аккаунт с прогрессом остаётся «старым» (прежний прогресс считается, когда аккаунт не молодой)', async () => {
    mockCreatedAt = SINCE - 1;
    store.set('onboarding_completed_at_ms_v1', '9000');
    store.set('streak_count', '3');
    expect((await readRankGateUserVerdict(NOW, SINCE)).isNew).toBe(false);
  });
  it('без метки онбординга решение не фиксируется', async () => {
    expect((await readRankGateUserVerdict(NOW, SINCE)).reason).toBe('no_timestamp');
    expect(store.has(rankGateCohortKey('uid-A'))).toBe(false);
  });
  it('до выхода релиза (заглушка-максимум) пользователь фиксируется как старый', async () => {
    store.set('onboarding_completed_at_ms_v1', '9000');
    expect((await readRankGateUserVerdict(NOW)).reason).toBe('before_release');
    expect(store.get(rankGateCohortKey('uid-A'))).toBe('old');
    // зачем (срез 2.1.0, 05.11): метка релиза подставлена вместо заглушки MAX_SAFE_INTEGER — тест проверяет только, что метка позже момента онбординга теста (9000)
    expect(mod.RANK_GATES_NEW_USERS_SINCE_MS).toBeGreaterThan(9000);
  });
  it('ключ когорты — в стираемом семействе story_events_v1: и содержит владельца', () => {
    expect(rankGateCohortKey('uid-A')).toBe('story_events_v1:rank_cohort:uid-A');
  });
});
