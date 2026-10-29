// ВЛАДЕЛЕЦ 29.10 ~09:30 (кнопка, через координатора): «Призрак друга» на ступени Пика — «Да, проба на 2 недели»; половина людей видит, половина нет.
// Проверяем: флаг «Пульта» ghost_friend_ab по умолчанию ВЫКЛ → призрака не видит никто (ступень как раньше); включён → корзина по стабильному хешу id,
// ~50/50, детерминирована; без id — не показываем; журнал spire:ghost:<shown|hidden>:<bucket> проходит белый список сервера и пишется только при идущей пробе;
// в реестре флагов и «Пульте» флаг заведён; включает его только владелец (в коде он false).
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';

const mockFlag = jest.fn((_key: string) => false);
jest.mock('../app/remote_flags', () => ({ getRemoteBool: (key: string) => mockFlag(key) }));
let mockStableId: string | null = 'uid-1';
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ phase: 'active', stableId: mockStableId, generation: 1 }) }));
const mockRecord = jest.fn(async (_event: unknown) => undefined);
jest.mock('../app/support_diagnostics', () => ({ recordSupportDiagnostic: (event: unknown) => mockRecord(event) }));

import { spireGhostBucket, spireGhostDecision, spireGhostEnabled, SPIRE_GHOST_ENABLED } from '../components/spire/spire_ghost_flag';
import { noteSpireGhostExperiment, resetSpireGhostAbLogForTests, spireGhostAbAction } from '../app/spire/spire_ghost_ab_log';
import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('проба «призрак друга» 29.10', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    mockFlag.mockReset().mockReturnValue(false);
    mockRecord.mockClear();
    mockStableId = 'uid-1';
    resetSpireGhostAbLogForTests();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => logSpy.mockRestore());

  it('по умолчанию выключено: константа false, флаг «Пульта» выкл → никто не видит, в журнал ничего', () => {
    expect(SPIRE_GHOST_ENABLED).toBe(false);
    expect(spireGhostEnabled()).toBe(false);
    const decision = spireGhostDecision('any-uid');
    expect(decision).toMatchObject({ shown: false, source: 'experiment_off', bucket: null, flagOn: false });
    noteSpireGhostExperiment(decision);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('корзина детерминирована и делит людей примерно пополам (10 000 id: 47–53 %)', () => {
    expect(spireGhostBucket('uid-1')).toBe(spireGhostBucket('uid-1'));
    expect(spireGhostBucket(null)).toBeNull();
    expect(spireGhostBucket('')).toBeNull();
    let a = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) if (spireGhostBucket(`user-${i}-${(i * 7919) % 100003}`) === 'a') a++;
    expect(a / N).toBeGreaterThan(0.47);
    expect(a / N).toBeLessThan(0.53);
  });

  it('флаг включён: «a» видит призрака, «b» — нет; решение называет корзину', () => {
    mockFlag.mockReturnValue(true);
    const ids = Array.from({ length: 40 }, (_v, i) => `check-${i}`);
    const a = ids.find((id) => spireGhostBucket(id) === 'a')!;
    const b = ids.find((id) => spireGhostBucket(id) === 'b')!;
    expect(spireGhostDecision(a)).toMatchObject({ shown: true, source: 'experiment', bucket: 'a', flagOn: true });
    expect(spireGhostDecision(b)).toMatchObject({ shown: false, source: 'experiment', bucket: 'b', flagOn: true });
    mockStableId = a;
    expect(spireGhostEnabled()).toBe(true); // id берётся из памяти аккаунта
    mockStableId = b;
    expect(spireGhostEnabled()).toBe(false);
  });

  it('флаг включён, но id аккаунта ещё нет → не показываем и в пробу не попадаем', () => {
    mockFlag.mockReturnValue(true);
    mockStableId = null;
    expect(spireGhostDecision()).toMatchObject({ shown: false, source: 'no_uid', bucket: null });
    noteSpireGhostExperiment(spireGhostDecision());
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('журнал: spire:ghost:<shown|hidden>:<bucket>, один раз на действие за процесс, проходит белый список сервера', () => {
    mockFlag.mockReturnValue(true);
    const ids = Array.from({ length: 40 }, (_v, i) => `log-${i}`);
    const a = ids.find((id) => spireGhostBucket(id) === 'a')!;
    const b = ids.find((id) => spireGhostBucket(id) === 'b')!;
    noteSpireGhostExperiment(spireGhostDecision(a));
    noteSpireGhostExperiment(spireGhostDecision(a));
    noteSpireGhostExperiment(spireGhostDecision(b));
    expect(mockRecord.mock.calls.map((c) => (c[0] as { action: string }).action)).toEqual(['spire:ghost:shown:a', 'spire:ghost:hidden:b']);
    expect(mockRecord.mock.calls[0]![0]).toMatchObject({ event: 'feature_action', screen: '/spire', result: 'info' });
    for (const decision of [{ shown: true, bucket: 'a' as const }, { shown: false, bucket: 'b' as const }]) {
      const action = spireGhostAbAction(decision)!;
      expect(action.length).toBeLessThanOrEqual(80);
      expect(/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(action)).toBe(true);
      expect(/(?:^|[:._-])[A-Za-z0-9]{20,}(?:$|[:._-])/.test(action)).toBe(false);
      expect(sanitizeSupportDiagnosticEvent({ atMs: Date.now(), event: 'feature_action', action, screen: '/spire' })?.action).toBe(action);
    }
    expect(spireGhostAbAction({ shown: true, bucket: null })).toBeNull();
  });

  it('флаг заведён везде: реестр (тип, дефолт false, список серверных ключей), «Пульт», снимок релиза; включает только владелец', () => {
    const flags = read('app/remote_flags.ts');
    expect(flags).toContain("  | 'ghost_friend_ab'\n");
    expect(flags).toContain('  ghost_friend_ab: false,');
    expect(flags).toContain("'spire_streak_heart', 'ghost_friend_ab', 'spire_gold'");
    const pult = read('admin/v2/legacy.html');
    expect(pult).toContain('id="cp-bool-ghost_friend_ab"');
    expect(pult).toContain("saveControlPanelBool('ghost_friend_ab', this.checked)");
    expect(pult).toContain("{ key: 'ghost_friend_ab',");
    expect(JSON.parse(read('docs/work/release/ota_flag_baseline_2026-10-25.json')).defaults.ghost_friend_ab).toBe(false);
  });

  it('ступень и итог читают одно решение; пробы нет без чтений сети', () => {
    const hook = read('app/spire/use_spire_ghost.ts');
    expect(hook).toContain('const decision = spireGhostDecision();');
    expect(hook).toContain('noteSpireGhostExperiment(decision);');
    expect(hook).toContain('if (!decision.shown) {');
    expect(read('components/spire/moments/SpireStepResultMoment.tsx')).toContain('if (!spireGhostEnabled()) return null;');
    const bucketModule = read('components/spire/spire_ghost_flag.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(bucketModule).not.toMatch(/firebase|firestore|getDoc|onSnapshot|httpsCallable|fetch\(/i);
  });
});
