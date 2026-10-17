import type { SpireTimerConfig } from '../../modules/spire/config_contract';
import { SPIRE_STEP_TASK_COUNT } from '../../modules/spire/step_machine';
import { spireTimerKindOf, type SpirePackTask } from '../../modules/spire/pack_plan';
import { SPIRE_COMFORT_BASE_MS, spireFloorTimeFactor, spireLeagueTimeMultiplier, spireTaskBudgetMs } from '../../modules/spire/step_budget_scale';

// зачем (вынос из use_spire_game ≤ 400 строк, 13.10): до пакета точного бюджета нет (он зависит от видов заданий набора).
// Повтор того же этажа берёт последний настоящий бюджет из памяти процесса, иначе — среднее по видам × 10 заданий с тем же
// спадом по этажу.
const LOG = '[SPIRE]';
const lastBudgetByFloor = new Map<number, number>();

export function spireEstimateStepBudgetMs(timer: SpireTimerConfig, floor: number, tier: number | null = null): number {
  const known = lastBudgetByFloor.get(floor);
  if (typeof known === 'number' && known > 0) return known;
  if (tier !== null) {
    // зачем (шкала владельца 17.10): оценка до пакета — та же шкала, что у настоящей ступени (среднее «комфортно» × лига × этаж)
    const comfort = Object.values(SPIRE_COMFORT_BASE_MS);
    const avg = comfort.reduce((a, b) => a + b, 0) / comfort.length;
    return Math.round(avg * SPIRE_STEP_TASK_COUNT * spireLeagueTimeMultiplier(tier) * spireFloorTimeFactor(floor));
  }
  const bases = Object.values(timer.baseMsByKind).filter((n): n is number => typeof n === 'number' && n > 0);
  if (bases.length === 0) return 0;
  const avg = bases.reduce((a, b) => a + b, 0) / bases.length;
  const decay = Math.max(timer.floorMinRatio, 1 - timer.perFloorDecay * Math.max(0, floor - 1));
  return Math.round(avg * SPIRE_STEP_TASK_COUNT * decay);
}

/** Настоящий бюджет этажа из собранного плана — следующая оценка того же этажа возьмёт его. С detail — строка [SPIRE-TIME]. */
export function spireRememberStepBudget(floor: number, budgetMs: number, detail?: Readonly<{ tier: number | null; tasks: readonly SpirePackTask[] }>): void {
  if (detail) {
    // зачем (координатор 17.10): на старте ступени видно, сколько секунд дали и почему — лига, этаж, множители и секунды на каждое задание
    const kinds = detail.tasks.map(spireTimerKindOf);
    const tier = detail.tier;
    console.log('[SPIRE-TIME]', JSON.stringify({ league: tier === null ? null : tier + 1, tier, floor, leagueM: tier === null ? null : spireLeagueTimeMultiplier(tier), floorF: spireFloorTimeFactor(floor), budgetMs, tasks: kinds.map((kind) => `${kind}:${tier === null ? '-' : Math.round(spireTaskBudgetMs(kind, tier, floor) / 100) / 10}s`) })); // guard-ok: строка на старт ступени
  }
  if (lastBudgetByFloor.get(floor) !== budgetMs) console.log(LOG, 'step budget remembered', JSON.stringify({ floor, budgetMs })); // guard-ok: один раз на этаж и бюджет
  lastBudgetByFloor.set(floor, budgetMs); // guard-ok: Map в памяти процесса, не Firestore
}

/** Только для тестов. */
export function __resetSpireBudgetEstimateForTests(): void {
  lastBudgetByFloor.clear();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
