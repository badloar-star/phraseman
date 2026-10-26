/**
 * [SPIRE-GOLD] «Золотое задание» Пика (владелец 25.10: ×2 монеты ступени за верный ответ, со звоном; координатор 25.10).
 * Сторож: правило телефона = правило сервера, потолок 3 в день, этаж и вершина не удваиваются, флаг по умолчанию ВЫКЛ,
 * повтор пачки не платит дважды, сервер без новых чтений.
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import * as client from '../modules/spire/golden_task';
import * as server from '../functions/src/spire_golden';
import { spireEvaluateBatch, spireWeekStartMsFromDate, type SpireEvaluateInput } from '../functions/src/spire_progress_contract';
import { SPIRE_CONFIG_DEFAULTS } from '../functions/src/spire_config_contract';
import { spireStepCoinOps } from '../functions/src/spire_coins';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));

const read = (rel: string) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));

describe('правило золотого задания: телефон = сервер', () => {
  it('одинаковый индекс на таблице stableId × неделя × ступень', () => {
    for (const id of ['u1', 'stable_abc', 'Zk9-QX', '0']) {
      for (const week of ['2026-W43', '2026-W44']) {
        for (let n = 1; n <= 160; n += 1) {
          expect(client.spireGoldenTaskIndex(id, week, n)).toBe(server.spireGoldenTaskIndex(id, week, n));
        }
      }
    }
    expect(client.SPIRE_GOLD_DAILY_CAP).toBe(server.SPIRE_GOLD_DAILY_CAP);
    expect(client.SPIRE_GOLD_RATE_PERCENT).toBe(server.SPIRE_GOLD_RATE_PERCENT);
    expect(client.spireGoldDayKey(Date.UTC(2026, 9, 25, 23, 59))).toBe(server.spireGoldDayKey(Date.UTC(2026, 9, 25, 23, 59)));
  });

  it('около 30 % ступеней, золотое — задание 3…9, плохой ввод — без золота', () => {
    let golden = 0;
    for (let n = 1; n <= 2000; n += 1) {
      const i = client.spireGoldenTaskIndex('rate_check', '2026-W43', n);
      if (i !== null) { golden += 1; expect(i).toBeGreaterThanOrEqual(2); expect(i).toBeLessThanOrEqual(8); }
    }
    expect(golden / 2000).toBeGreaterThan(0.25);
    expect(golden / 2000).toBeLessThan(0.35);
    expect(client.spireGoldenTaskIndex('', '2026-W43', 1)).toBeNull();
    expect(client.spireGoldenTaskIndex('u', '2026-W43', 0)).toBeNull();
  });
});

// ── сервер: приём пачки ──
const NOW = Date.UTC(2026, 8, 24, 20, 0, 0);
const WEEK = '2026-W39';
const HASH = 'pack_hash_abc123';
const MIN = SPIRE_CONFIG_DEFAULTS.integrity.minStepMs;
const report = (i: number, over: Record<string, unknown> = {}) => ({
  reportId: `r${i}`, weekKey: WEEK, tier: 1, outcome: 'passed', durationMs: MIN + 5_000,
  completedAtMs: NOW - 3 * 60 * 60_000 + i * 2 * 60_000, packHash: HASH, ...over,
});
const input = (reports: unknown[], over: Partial<SpireEvaluateInput> = {}): SpireEvaluateInput => ({
  lang: 'en', existing: null, reports, serverNowMs: NOW, serverWeekKey: WEEK, weekStartMs: spireWeekStartMsFromDate(new Date(NOW)),
  integrity: SPIRE_CONFIG_DEFAULTS.integrity, expectedPackHashByTier: { 1: HASH }, ...over,
});
/** Найти stableId, у которого нужные ступени золотые/нет. */
function idWhere(pred: (n: number) => boolean, steps: readonly number[]): string {
  for (let k = 0; k < 20000; k += 1) {
    const id = `gold_${k}`;
    if (steps.every((n) => pred(n) === (server.spireGoldenTaskIndex(id, WEEK, n) !== null))) return id;
  }
  throw new Error('no id');
}

describe('сервер: золото засчитывается по хешу и потолку', () => {
  it('заявка на золотой ступени → goldenSteps; на не-золотой → not_golden; без stableId → gold_off', () => {
    const id = idWhere((n) => n === 1, [1, 2]);
    const out = spireEvaluateBatch(input([report(1, { goldenHit: true }), report(2, { goldenHit: true })], { goldStableId: id }));
    expect(out.goldenSteps).toEqual([1]);
    expect(out.goldSkipped).toEqual([{ reportId: 'r2', step: 2, reason: 'not_golden' }]);
    expect(out.record.goldCount).toBe(1);
    const off = spireEvaluateBatch(input([report(1, { goldenHit: true })]));
    expect(off.goldenSteps).toEqual([]);
    expect(off.goldSkipped[0]?.reason).toBe('gold_off');
  });

  it('потолок 3 в день: четвёртое золото того же дня — daily_cap; провал золото не тратит', () => {
    const steps = [1, 2, 3, 4];
    const id = idWhere(() => true, steps);
    const reports = [report(1, { goldenHit: true }), report(2, { outcome: 'failed', goldenHit: true }), ...[2, 3, 4].map((n) => report(n + 1, { goldenHit: true }))];
    const out = spireEvaluateBatch(input(reports, { goldStableId: id }));
    expect(out.goldenSteps).toEqual([1, 2, 3]);
    expect(out.goldSkipped).toEqual([{ reportId: 'r5', step: 4, reason: 'daily_cap' }]);
  });

  it('монеты: золото = ещё одна ставка ступени со своим ключом; этаж и вершина не удваиваются; повтор не платит', () => {
    const coins = SPIRE_CONFIG_DEFAULTS.coins;
    const plain = spireStepCoinOps({ lang: 'en', weekKey: WEEK, fromSteps: 0, toSteps: 5, coins, earnedAtMs: 1 });
    const gold = spireStepCoinOps({ lang: 'en', weekKey: WEEK, fromSteps: 0, toSteps: 5, coins, earnedAtMs: 1, goldenSteps: [5] });
    const perStep = plain.ops.find((o) => o.opId.endsWith('_s5'))?.delta ?? 0;
    expect(gold.total - plain.total).toBe(perStep);
    expect(gold.ops.filter((o) => o.opId.startsWith('spire_gold:'))).toHaveLength(1);
    expect(gold.ops.find((o) => o.opId.startsWith('spire_gold:'))?.opId).toBe(`spire_gold:en_${WEEK}_s5`);
    const outside = spireStepCoinOps({ lang: 'en', weekKey: WEEK, fromSteps: 5, toSteps: 6, coins, earnedAtMs: 1, goldenSteps: [5] });
    expect(outside.ops.some((o) => o.opId.startsWith('spire_gold:'))).toBe(false);
  });

  it('сервер: правило берёт stableUid, новых чтений нет', () => {
    const progress = read('functions/src/spire_progress.ts');
    expect(progress).toContain('goldStableId: stableUid,');
    expect(progress).toContain('goldenSteps: evaluation.goldenSteps,');
    const gold = read('functions/src/spire_golden.ts');
    expect(gold).not.toMatch(/firestore|\.get\(|\.doc\(/i);
  });
});

describe('телефон: флаг, проводка, «Пульт»', () => {
  // зачем (владелец 26.10): «золото» ВКЛ по умолчанию в 2.0.3 (146) — spireReportSteps с goldRule выложен утром; выключатель
  // остаётся в «Пульте» (false в снимке выключает), а второй замок — goldRule от сервера.
  it('флаг spire_gold в реестре: по умолчанию ВКЛ, снимок false выключает', () => {
    jest.isolateModules(() => {
      const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
      expect(flags.getRemoteBool('spire_gold')).toBe(true);
      flags.applyRemoteConfigSnapshot({ bools: { spire_gold: false } });
      expect(flags.getRemoteBool('spire_gold')).toBe(false);
    });
  });

  it('раннер: ответ → gold.onAnswer, отчёт → gold.stamp; монеты сразу ×2 через spireStepCoinsNow', () => {
    const runner = read('app/spire/use_spire_step_runner.ts');
    expect(runner).toContain('gold.onAnswer(fb.taskIndex, fb.ok);');
    expect(runner).toContain('const report = gold.stamp(spireReportFromStepState(');
    expect(read('app/spire/use_spire_game.ts')).toContain("golden: finish.report.goldenHit === true });");
    const close = read('app/spire/spire_step_close.ts');
    expect(close).toContain('const gold = i.golden ? spireStepPendingCoins(i.coins, i.floorBefore, false) : 0;');
    const hook = read('app/spire/use_spire_gold.ts');
    expect(hook).toContain("getRemoteBool(SPIRE_GOLD_FLAG_KEY) === true");
    // ЗАМОК ВЛАДЕЛЬЦА 25.10: звука на верный ответ нет — и на золотом; вибрация остаётся
    expect(hook).not.toMatch(/tryPlayV2Event|coins_many/);
    expect(hook).toContain('void hapticSuccess();');
    expect(hook).toContain("if (report.outcome !== 'passed')");
  });

  it('«Пульт»: переключатель spire_gold, def: false; рамка без вечных циклов', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '..', 'admin/v2/legacy.html'), 'utf8');
    expect(html).toContain('id="cp-bool-spire_gold"');
    const list = html.slice(html.indexOf('const CP_FEATURE_TOGGLES = ['), html.indexOf('];', html.indexOf('const CP_FEATURE_TOGGLES = [')));
    expect(list).toMatch(/key: 'spire_gold',[^\n]*def: false/);
    const frame = read('components/spire/SpireGoldFrame.tsx');
    expect(frame).not.toMatch(/withRepeat/);
    expect(frame).toContain('useReducedMotion');
  });
});

describe('координатор 25.10: защита «сервер старый» и полёт монет', () => {
  it('сервер называет версию правила; клиент понимает ту же', () => {
    expect(read('functions/src/spire_progress.ts')).toContain('goldRule: SPIRE_GOLD_RULE_VERSION,');
    const { SPIRE_GOLD_CLIENT_RULE } = require('../app/spire/spire_gold_server') as typeof import('../app/spire/spire_gold_server');
    expect(SPIRE_GOLD_CLIENT_RULE).toBe(server.SPIRE_GOLD_RULE_VERSION);
    expect(read('app/spire_report_client.ts')).toContain("if (res.data?.ok === true) void import('./spire/spire_gold_server').then((m) => m.noteSpireGoldServerRule(res.data?.goldRule))");
  });

  it('нет поля в ответе → сервер старый, золото не показываем; версия 1 → можно', async () => {
    const m = require('../app/spire/spire_gold_server') as typeof import('../app/spire/spire_gold_server');
    m.__resetSpireGoldServerForTests();
    expect((await m.readSpireGoldServerOk()).ok).toBe(false);
    m.noteSpireGoldServerRule(undefined);
    expect((await m.readSpireGoldServerOk()).ok).toBe(false);
    m.noteSpireGoldServerRule(1);
    expect((await m.readSpireGoldServerOk()).ok).toBe(true);
    const hook = read('app/spire/use_spire_gold.ts');
    expect(hook).toContain('gate reason=server_too_old');
    expect(hook).toMatch(/Promise\.all\(\[readSpireGoldServerOk\(\), readDay\(stableId\)\]\)[\s\S]{0,400}if \(!server\.ok\)/);
  });

  it('полёт монет: только transform/opacity, без вечных циклов, «Уменьшить движение» — без полёта', () => {
    const reward = read('components/spire/SpireGoldReward.tsx');
    expect(reward).not.toMatch(/withRepeat/);
    expect(reward).toContain('if (reduce) {');
    expect(reward).not.toMatch(/useAnimatedStyle\(\(\) => \(\{[^}]*(left|top|width|height):/);
    expect(reward).not.toMatch(/haptic/i);
    expect(read('components/spire/SpireStepScreen.tsx')).toContain('onLaunch={onGoldLaunch}');
  });
});
