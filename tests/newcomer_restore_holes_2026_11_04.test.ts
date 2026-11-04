// Сквозной сценарий новичка / восстановления из облака (владелец 04.11): «новый» = аккаунт создан не раньше релиза гейтов; когорта и «показано» — на аккаунт.
// Три случая из поручения: (1) ветеран на втором устройстве (гонка с облаком) → не новый; (2) новый аккаунт после удаления старого → новый;
// (3) второй человек на том же телефоне → своё состояние. Плюс: неизвестное не фиксируется и не запирает.
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
let mockOwner: string | null = null;
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: mockOwner, phase: mockOwner ? 'active' : 'transitioning' }),
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
}));
let mockCreatedAt: number | null = null;
jest.mock('../app/account_created_at', () => ({ peekCurrentAccountCreatedAtMs: () => mockCreatedAt }));

import fs from 'node:fs';
import path from 'node:path';
import { readRankGateUserVerdict, rankGateCohortKey } from '../app/rank_gates_new_user';
// ключ приветствия считаем по тому же правилу без импорта компонента (тяжёлая цепочка контекстов): story_events_v1:welcome_b3:<uid>
const welcomeB3ShownKey = (owner: string): string => `story_events_v1:welcome_b3:${owner}`;

const SINCE = 5_000; // момент релиза гейтов
const NOW = 20_000;
const OLD_ACCOUNT = 1_000; // создан до релиза
const NEW_ACCOUNT = 15_000; // создан после релиза

const onboardedNow = () => store.set('onboarding_completed_at_ms_v1', String(NOW - 10));

beforeEach(() => {
  store.clear();
  mockOwner = null;
  mockCreatedAt = null;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('(1) ветеран на втором устройстве', () => {
  it('входит в СТАРЫЙ аккаунт, прогресс из облака ещё не пришёл (гонка) → не новый, фиксируется «старый», ничего не показывается', async () => {
    mockOwner = 'veteran-uid';
    mockCreatedAt = OLD_ACCOUNT;
    onboardedNow(); // на новом устройстве онбординг пройден только что
    // локальных streak_count / user_total_xp ещё нет — облако не вернуло прогресс
    const verdict = await readRankGateUserVerdict(NOW, SINCE);
    expect(verdict).toEqual({ isNew: false, reason: 'old_account' });
    expect(store.get(rankGateCohortKey('veteran-uid'))).toBe('old');
    // позже прогресс пришёл — всё равно «старый» (липкая отметка)
    store.set('streak_count', '40'); store.set('user_total_xp', '9000');
    expect((await readRankGateUserVerdict(NOW, SINCE)).isNew).toBe(false);
  });
});

describe('(2) новый аккаунт после удаления старого', () => {
  it('другой uid, аккаунт создан после релиза → новый, даже если прошлый на этом телефоне был «старым»', async () => {
    store.set(rankGateCohortKey('deleted-uid'), 'old');
    store.set(welcomeB3ShownKey('deleted-uid'), '123');
    mockOwner = 'fresh-uid';
    mockCreatedAt = NEW_ACCOUNT;
    onboardedNow();
    expect(await readRankGateUserVerdict(NOW, SINCE)).toEqual({ isNew: true, reason: 'new' });
    expect(store.get(rankGateCohortKey('fresh-uid'))).toBe('new');
    expect(store.get(welcomeB3ShownKey('fresh-uid'))).toBeUndefined(); // приветствие этому аккаунту ещё не показывалось
  });
});

describe('(3) второй человек на том же телефоне', () => {
  it('у каждого аккаунта своё состояние: A остаётся «старым», B — «новым»', async () => {
    mockOwner = 'person-A';
    mockCreatedAt = OLD_ACCOUNT;
    onboardedNow();
    expect((await readRankGateUserVerdict(NOW, SINCE)).reason).toBe('old_account');
    mockOwner = 'person-B';
    mockCreatedAt = NEW_ACCOUNT;
    expect(await readRankGateUserVerdict(NOW, SINCE)).toEqual({ isNew: true, reason: 'new' });
    mockOwner = 'person-A';
    mockCreatedAt = OLD_ACCOUNT;
    expect((await readRankGateUserVerdict(NOW, SINCE)).reason).toBe('sticky_old');
  });
});

describe('неизвестное = не новый и не фиксируется', () => {
  it('нет времени создания аккаунта (Auth ещё не загружен) → не новый, отметка не пишется', async () => {
    mockOwner = 'uid-x';
    mockCreatedAt = null;
    onboardedNow();
    expect(await readRankGateUserVerdict(NOW, SINCE)).toEqual({ isNew: false, reason: 'account_age_unknown' });
    expect(store.has(rankGateCohortKey('uid-x'))).toBe(false);
  });
  it('нет активного аккаунта → не новый, ничего не пишется', async () => {
    mockOwner = null;
    mockCreatedAt = NEW_ACCOUNT;
    onboardedNow();
    expect(await readRankGateUserVerdict(NOW, SINCE)).toEqual({ isNew: false, reason: 'no_owner' });
    expect([...store.keys()].some((key) => key.startsWith('story_events_v1:'))).toBe(false);
  });
  it('заглушка релиза (максимум): никто не новый, даже свежий аккаунт', async () => {
    mockOwner = 'uid-y';
    mockCreatedAt = NEW_ACCOUNT;
    onboardedNow();
    expect((await readRankGateUserVerdict(NOW)).isNew).toBe(false);
  });
});

describe('ключи принадлежат аккаунту и лежат в стираемом семействе', () => {
  it('когорта и приветствие — story_events_v1:…:<uid>', () => {
    expect(rankGateCohortKey('u1')).toBe('story_events_v1:rank_cohort:u1');
    const gateSource = fs.readFileSync(path.join(__dirname, '..', 'components/onboarding/WelcomeGate.tsx'), 'utf8');
    expect(gateSource).toContain("export const WELCOME_B3_KEY_PREFIX = 'story_events_v1:welcome_b3';");
    expect(gateSource).toContain('export const welcomeB3ShownKey = (owner: string): string => `${WELCOME_B3_KEY_PREFIX}:${owner}`;');
    const sync = fs.readFileSync(path.join(__dirname, '..', 'app/cloud_sync.ts'), 'utf8');
    expect(sync).toContain("const STORY_EVENTS_PREFIX = 'story_events_v1';");
  });
  it('кэш вердикта сбрасывается при смене аккаунта, а хост окон и шлюз следят за владельцем', () => {
    const rank = fs.readFileSync(path.join(__dirname, '..', 'hooks/use_rank_access.ts'), 'utf8');
    expect(rank).toContain('subscribeAccountGeneration(');
    expect(rank).toMatch(/verdictCache = null;\s*verdictPromise = null;/);
    const host = fs.readFileSync(path.join(__dirname, '..', 'modules/section_openings/use_section_opening_host.ts'), 'utf8');
    expect(host).toContain('useActiveAccountOwner()');
    const gate = fs.readFileSync(path.join(__dirname, '..', 'components/onboarding/WelcomeGate.tsx'), 'utf8');
    expect(gate).toContain('useActiveAccountOwner()');
    expect(gate).not.toContain('welcome_b3_shown_v1');
  });
});
