// Липкая когорта «новый/старый» (владелец 30.10): новичок после первого занятия не становится «старым» на следующем запуске.
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

import { readRankGateUserVerdict, RANK_GATE_COHORT_KEY } from '../app/rank_gates_new_user';
import * as mod from '../app/rank_gates_new_user';

describe('когорта липкая', () => {
  beforeEach(() => store.clear());
  it('залипший «новый» остаётся новым после появления прогресса', async () => {
    store.set(RANK_GATE_COHORT_KEY, 'new');
    store.set('streak_count', '3'); store.set('user_total_xp', '120');
    expect(await readRankGateUserVerdict(10_000)).toEqual({ isNew: true, reason: 'sticky_new' });
  });
  it('залипший «старый» остаётся старым', async () => {
    store.set(RANK_GATE_COHORT_KEY, 'old');
    store.set('onboarding_completed_at_ms_v1', '9000');
    expect((await readRankGateUserVerdict(10_000)).isNew).toBe(false);
  });
  it('без метки онбординга решение не фиксируется', async () => {
    expect((await readRankGateUserVerdict(10_000)).reason).toBe('no_timestamp');
    expect(store.has(RANK_GATE_COHORT_KEY)).toBe(false);
  });
  it('до выхода релиза (заглушка-максимум) пользователь фиксируется как старый', async () => {
    store.set('onboarding_completed_at_ms_v1', '9000');
    expect((await readRankGateUserVerdict(10_000)).reason).toBe('before_release');
    expect(store.get(RANK_GATE_COHORT_KEY)).toBe('old');
    expect(mod.RANK_GATES_NEW_USERS_SINCE_MS).toBe(Number.MAX_SAFE_INTEGER);
  });
});
