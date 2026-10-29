// зачем (ТЗ spire-engagement-2026-10-25.md §3а, владелец 25.10): «призрак друга» — под флагом, по умолчанию ВЫКЛ; без новых чтений Firestore;
// имя не склоняется; журнал [SPIRE-GHOST]; строка в итоге и полоска на ступени подключены, но при выключенном флаге экран как в 2.0.2.
import * as fs from 'fs';
import * as path from 'path';
import type { SpireRoomSnapshot } from '../modules/spire/room_rows';

const mockPeekRoom = jest.fn();
const mockPeekFriends = jest.fn();
jest.mock('../app/spire/spire_room_client', () => ({ peekSpireRoom: (...a: unknown[]) => mockPeekRoom(...a) }));
jest.mock('../app/friends_tab_swr_warm', () => ({ peekFriendsTabSwrWarm: () => mockPeekFriends() }));

import { SPIRE_GHOST_ENABLED, setDevSpireGhostOverride, spireGhostEnabled } from '../components/spire/spire_ghost_flag';
import { spireGhostShortName, spireGhostText } from '../components/spire/spire_ghost_strings';
import { __resetSpireGhostMemoryForTests, peekSpireGhostFor } from '../app/spire/spire_ghost_memory';
import { spireBuildGhostView } from '../app/spire/use_spire_ghost';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const CTX = { lang: 'en', weekKey: '2026-W44', tier: 0, floor: 1, stepInFloor: 2 } as const; // третья ступень недели

function snapshot(weekId = '2026-W44'): SpireRoomSnapshot {
  return {
    schema: 'spire-room-cache.v1', uid: 'me', lang: 'en', weekId, groupId: 'g', tier: 0, cohortDay: 1, weekStartMs: 0, roster: [], fetchedAtMs: 0,
    members: [
      { uid: 'me', name: 'Me', steps: 2, reachedAtMs: 1, totalMs: 200_000 },
      { uid: 'anya-uid', name: 'Аня', steps: 6, reachedAtMs: 1, totalMs: 6 * 130_000 },
    ],
  };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  mockPeekRoom.mockReset(); mockPeekFriends.mockReset(); __resetSpireGhostMemoryForTests();
});
afterEach(() => { jest.restoreAllMocks(); setDevSpireGhostOverride(null); });

describe('флаг', () => {
  const g = globalThis as { __DEV__?: boolean };
  const devBefore = g.__DEV__;
  beforeEach(() => { g.__DEV__ = true; });
  afterEach(() => { g.__DEV__ = devBefore; });
  it('по умолчанию выключен: константа false и spireGhostEnabled() false', () => {
    expect(SPIRE_GHOST_ENABLED).toBe(false);
    expect(spireGhostEnabled()).toBe(false);
  });
  it('dev-переключатель (dev_state?spireGhost=on|off) включает и снимается', () => {
    expect(setDevSpireGhostOverride(true)).toBe(true);
    expect(spireGhostEnabled()).toBe(true);
    expect(setDevSpireGhostOverride(false)).toBe(true);
    expect(spireGhostEnabled()).toBe(false);
    setDevSpireGhostOverride(null);
    expect(spireGhostEnabled()).toBe(SPIRE_GHOST_ENABLED);
  });
});

describe('сборка призрака для ступени (кэш комнаты + снимок друзей, без сети)', () => {
  it('друг из снимка → призрак, метка на кольце от бюджета, запомнен для итога', () => {
    mockPeekRoom.mockReturnValue(snapshot());
    mockPeekFriends.mockReturnValue({ canonicalUid: 'me', friends: [{ uid: 'anya-uid' }], requests: [], profiles: {} });
    const view = spireBuildGhostView({ uid: 'me', ctx: CTX, budgetMs: 240_000 });
    expect(view?.ghost).toMatchObject({ uid: 'anya-uid', ordinal: 1, letter: 'А', avgMs: 130_000 });
    expect(view?.markFrac).toBeCloseTo(110 / 240, 5);
    expect(peekSpireGhostFor('2026-W44', 1)?.uid).toBe('anya-uid');
    expect(peekSpireGhostFor('2026-W44', 2)).toBeNull(); // другой этаж — не наш итог
    expect(mockPeekRoom).toHaveBeenCalledWith('me', 'en');
  });

  it('снимок друзей чужого аккаунта не используется — друзей нет, чужой участник призраком не становится (приватность)', () => {
    mockPeekRoom.mockReturnValue(snapshot());
    mockPeekFriends.mockReturnValue({ canonicalUid: 'someone-else', friends: [{ uid: 'anya-uid' }], requests: [], profiles: {} });
    expect(spireBuildGhostView({ uid: 'me', ctx: CTX, budgetMs: 240_000 })).toBeNull();
    expect(peekSpireGhostFor('2026-W44', 1)).toBeNull();
  });

  it('комнаты нет в кэше или она из другой недели — призрака нет, пусто и без прыжков (null)', () => {
    mockPeekFriends.mockReturnValue(null);
    mockPeekRoom.mockReturnValue(null);
    expect(spireBuildGhostView({ uid: 'me', ctx: CTX, budgetMs: 240_000 })).toBeNull();
    mockPeekRoom.mockReturnValue(snapshot('2026-W43'));
    expect(spireBuildGhostView({ uid: 'me', ctx: CTX, budgetMs: 240_000 })).toBeNull();
    expect(peekSpireGhostFor('2026-W44', 1)).toBeNull(); // прежний призрак забыт: итог не возьмёт чужого
  });

  it('друг медленнее бюджета: полоска есть, метки на кольце нет', () => {
    mockPeekRoom.mockReturnValue(snapshot());
    mockPeekFriends.mockReturnValue({ canonicalUid: 'me', friends: [{ uid: 'anya-uid' }], requests: [], profiles: {} });
    const view = spireBuildGhostView({ uid: 'me', ctx: CTX, budgetMs: 120_000 });
    expect(view?.ghost.uid).toBe('anya-uid');
    expect(view?.markFrac).toBeNull();
  });

  it('журнал [SPIRE-GHOST] пишет кандидата или причину', () => {
    const log = console.log as jest.Mock;
    mockPeekFriends.mockReturnValue(null);
    mockPeekRoom.mockReturnValue(null);
    spireBuildGhostView({ uid: 'me', ctx: CTX, budgetMs: 240_000 });
    expect(log.mock.calls.some((c) => c[0] === '[SPIRE]' && c[1] === '[SPIRE-GHOST]' && String(c[2]).includes('нет призрака: причина=no_room'))).toBe(true);
    mockPeekRoom.mockReturnValue(snapshot());
    mockPeekFriends.mockReturnValue({ canonicalUid: 'me', friends: [{ uid: 'anya-uid' }], requests: [], profiles: {} });
    spireBuildGhostView({ uid: 'me', ctx: CTX, budgetMs: 240_000 });
    expect(log.mock.calls.some((c) => c[0] === '[SPIRE]' && c[1] === '[SPIRE-GHOST]' && String(c[2]).includes('друг #1') && !String(c[2]).includes('anya'))).toBe(true);
  });
});

describe('тексты', () => {
  const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  it('9 языков: имя и время подставлены, фигурных скобок не осталось, имя не склоняется', () => {
    for (const lang of langs) {
      const avg = spireGhostText(lang, 'average', { name: 'Аня', t: '2:10' });
      const faster = spireGhostText(lang, 'faster', { name: 'Аня', t: '0:14', avg: '2:10' });
      expect(avg).toContain('Аня'); expect(avg).toContain('2:10'); expect(avg).not.toMatch(/[{}]/);
      expect(faster).toContain('Аня'); expect(faster).toContain('0:14'); expect(faster).toContain('2:10'); expect(faster).not.toMatch(/[{}]/);
      expect(spireGhostText(lang, 'ahead').length).toBeGreaterThan(3);
    }
    expect(spireGhostText('ru', 'average', { name: 'Аня', t: '2:10' })).toBe('Аня в среднем за 2:10');
  });
  it('длинный ник режется до 14 знаков с многоточием, эмодзи не рвётся', () => {
    expect(spireGhostShortName('Anastasia_Longname_123')).toBe('Anastasia_Lon…');
    expect(spireGhostShortName('Аня')).toBe('Аня');
    expect(Array.from(spireGhostShortName('😀'.repeat(20))).length).toBe(14);
  });
});

describe('подключение и бюджет затрат', () => {
  it('ни одного обращения к Firestore/сети в файлах призрака — только кэши в памяти', () => {
    for (const rel of ['modules/spire/ghost.ts', 'app/spire/use_spire_ghost.ts', 'app/spire/spire_ghost_memory.ts', 'components/spire/SpireGhostLayer.tsx']) {
      const src = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); // зачем: слова в пояснениях («Новых чтений Firestore нет») не считаются обращением
      expect(src).not.toMatch(/firebase|firestore|getDoc|getDocs|onSnapshot|spireCall|httpsCallable|fetch\(/i);
    }
  });
  it('итог ступени берёт призрака только при включённом флаге; экран ступени подключает слой за тем же флагом', () => {
    const result = read('components/spire/moments/SpireStepResultMoment.tsx');
    expect(result).toContain('if (!spireGhostEnabled()) return null;');
    expect(result).toContain('peekSpireGhostFor(outcome.report.weekKey, outcome.floorBefore)');
    const hook = read('app/spire/use_spire_ghost.ts');
    // проба 29.10: хук берёт решение с причиной (флаг «Пульта» + корзина), итог ступени по-прежнему спрашивает spireGhostEnabled()
    expect(hook).toContain('const decision = spireGhostDecision();');
    expect(hook).toContain('if (!decision.shown) {');
    const screen = read('components/spire/SpireStepScreen.tsx');
    expect(screen).toContain('useSpireGhost(');
    expect(screen).toContain('SpireGhostLayer');
  });
  it('тишина: ни звука, ни вибрации у призрака', () => {
    expect(read('components/spire/SpireGhostLayer.tsx')).not.toMatch(/haptic|playEvent|playUnlessRecentlyPlayed|Vibration/);
  });
});
