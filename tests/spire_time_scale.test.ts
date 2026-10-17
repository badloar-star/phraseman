// зачем (владелец 17.10, аудит spire-timing-audit-2026-10-17.md вариант (б)): шкала времени Пика — щедро внизу, жёстко только 12-я лига и 15-й этаж;
// клиент и сервер считают одинаково.
import * as client from '../modules/spire/step_budget_scale';
import * as server from '../functions/src/spire_config_contract';
import { SPIRE_CONFIG_DEFAULTS, spireStepBudgetMs, type SpireTaskTimerKind } from '../modules/spire/config_contract';

const KINDS: readonly SpireTaskTimerKind[] = ['choice', 'translate', 'timeattack', 'voice', 'listen', 'dictate', 'match'];
const TEN_CHOICE: readonly SpireTaskTimerKind[] = Array(10).fill('choice');

describe('шкала времени Пика', () => {
  it('лига 1, этаж 1: выбор 19,8 с (было 9) — щедро; лига 12, этаж 15: выбор 9,35 с — жёстко', () => {
    expect(client.spireTaskBudgetMs('choice', 0, 1)).toBe(19_800);
    expect(client.spireTaskBudgetMs('choice', 11, 15)).toBe(9_350);
    expect(client.spireTaskBudgetMs('match', 0, 1)).toBe(36_000);
    expect(client.spireTaskBudgetMs('match', 11, 15)).toBe(17_000);
  });

  it('время только уменьшается вверх по лигам и этажам', () => {
    for (let tier = 1; tier < 12; tier++) expect(client.spireLeagueTimeMultiplier(tier)).toBeLessThan(client.spireLeagueTimeMultiplier(tier - 1));
    for (let floor = 2; floor <= 15; floor++) expect(client.spireFloorTimeFactor(floor)).toBeLessThan(client.spireFloorTimeFactor(floor - 1));
    expect(client.spireFloorTimeFactor(14)).toBeCloseTo(0.9, 6);
  });

  it('битые лига/этаж не дают бесконечного времени', () => {
    expect(client.spireLeagueTimeMultiplier(-5)).toBe(1.8);
    expect(client.spireLeagueTimeMultiplier(99)).toBe(1.0);
    expect(client.spireLeagueTimeMultiplier(Number.NaN)).toBe(1.8);
  });

  it('клиент и сервер считают одинаково для всех лиг, этажей и видов', () => {
    for (let tier = 0; tier < 12; tier++) for (let floor = 1; floor <= 15; floor++) for (const kind of KINDS) {
      expect([tier, floor, kind, client.spireTaskBudgetMs(kind, tier, floor)]).toEqual([tier, floor, kind, server.spireTaskBudgetMs(kind, tier, floor)]);
    }
  });

  it('spireStepBudgetMs: с лигой — новая шкала, без лиги — прежний расчёт', () => {
    expect(spireStepBudgetMs(SPIRE_CONFIG_DEFAULTS.timer, 1, TEN_CHOICE, 0)).toBe(198_000);
    expect(spireStepBudgetMs(SPIRE_CONFIG_DEFAULTS.timer, 1, TEN_CHOICE)).toBe(90_000);
  });
});
