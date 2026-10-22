// ЗАМОК ВЛАДЕЛЬЦА 22.10: «16 — всё, это потолок, дальше нету никаких этажей, они заняли топ-1, на неделе они молодцы» — после Стража-15
// на этой неделе нигде нет предложения подняться: док «Ты на вершине недели» без кнопки, старт забега не идёт (энергия не тратится),
// окна позиций не зовут «Играть», 15-й этаж показан пройденным. Ослабить сторож — только по новому слову владельца (реестр
// docs/work/OWNER_LOCKS.md и KNOWN_GUARDS в tests/owner_locks_registry.test.cjs).
import { spireApplyStepReport, spireCreateWeekLocal, spireSummitBlocksStart, spireSummitReached, type SpireStepReport, type SpireWeekLocal } from '../modules/spire/report_queue';
import { spireSummitView } from '../components/spire/use_spire_summit';
import { spireCurrentWeekKey } from '../components/spire/spire_tower_model';
import { readSource } from './helpers/read_source';

/** Код без комментариев: пометки замков и история не должны ни ломать, ни подкармливать сторож. */
const code = (rel: string): string => readSource(rel).split(/\r?\n/).filter((line) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)).join('\n');

describe('ЗАМОК ВЛАДЕЛЬЦА 22.10 — вершина Пика: 16 — потолок', () => {
  it('после 135 ступеней (этажи 1–15) вершина взята; до неё — нет; прошлая неделя на 16-м — не вершина', () => {
    const weekKey = spireCurrentWeekKey(Date.now());
    let local: SpireWeekLocal = spireCreateWeekLocal({ lang: 'ru' as never, weekKey, tier: 3, packHash: 'h' });
    for (let i = 1; i <= 135; i += 1) {
      expect(spireSummitReached(local)).toBe(false);
      const report = { reportId: `r${i}`, weekKey, tier: 3, outcome: 'passed', durationMs: 1, completedAtMs: i, packHash: 'h', floor: local.floor, stepInFloor: local.stepInFloor, failReason: null };
      local = spireApplyStepReport(local, report as unknown as SpireStepReport).local;
    }
    expect(local.floor).toBe(16);
    expect(spireSummitReached(local)).toBe(true);
    expect(spireSummitView(local, Date.now())).toEqual({ summit: true, stepInFloor: 10 });
    expect(spireSummitView({ ...local, weekKey: '2001-W01' }, Date.now()).summit).toBe(false);
    expect(spireSummitReached({ floor: 15 })).toBe(false);
    expect(spireSummitReached(null)).toBe(false);
    expect(spireSummitBlocksStart(local, weekKey)).toBe(true);
    expect(spireSummitBlocksStart(local, '2001-W01')).toBe(false);
    expect(spireSummitBlocksStart(null, weekKey)).toBe(false);
  });

  it('старт забега на вершине не идёт — ранний выход с причиной раньше «стартую» (энергия не тратится)', () => {
    const game = code('app/spire/use_spire_game.ts');
    const start = game.slice(game.indexOf('const startStep = useCallback('));
    const guard = start.indexOf('spireSummitBlocksStart(weekRef.current, spireCurrentWeekKey(Date.now()))) return;');
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(start.indexOf('startingRef.current = true;'));
  });

  it('док на вершине — «Ты на вершине недели» без кнопки подъёма, раньше ветки «нет энергии»', () => {
    const dock = code('components/spire/SpireClimbDock.tsx');
    const at = dock.indexOf('if (summit) {');
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(dock.indexOf('if (noEnergy) {'));
    const branch = dock.slice(at, dock.indexOf('if (noEnergy) {'));
    expect(branch).toContain("spireGameText(lang, 'summitDock')");
    expect(branch).not.toMatch(/onClimb|onPress|V2Pressable/);
  });

  it('экран Пика передаёт вершину доку и окнам позиций, а 15-й этаж показывает пройденным', () => {
    const home = code('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('summit={summit}');
    expect(home).toContain('climbClosed={summit}');
    expect(home).toContain('useSpireSummit(week, myFloor,');
    expect(home).not.toContain('stepInFloor={week ? week.stepInFloor : null}');
    expect(home).not.toContain('stepInFloor: week ? week.stepInFloor : null');
    const layer = code('components/spire/moments/SpireMomentsLayer.tsx');
    expect(layer).toMatch(/const blocked = [^;]*climbClosed/);
  });
});
