import type { SpireTimerConfig } from '../../modules/spire/config_contract';
import { SPIRE_STEP_TASK_COUNT } from '../../modules/spire/step_machine';

// зачем (вынос из use_spire_game ≤ 400 строк, 13.10): до пакета точного бюджета нет (он зависит от видов заданий набора).
// Повтор того же этажа берёт последний настоящий бюджет из памяти процесса, иначе — среднее по видам × 10 заданий с тем же
// спадом по этажу.
const LOG = '[SPIRE]';
const lastBudgetByFloor = new Map<number, number>();

export function spireEstimateStepBudgetMs(timer: SpireTimerConfig, floor: number): number {
  const known = lastBudgetByFloor.get(floor);
  if (typeof known === 'number' && known > 0) return known;
  const bases = Object.values(timer.baseMsByKind).filter((n): n is number => typeof n === 'number' && n > 0);
  if (bases.length === 0) return 0;
  const avg = bases.reduce((a, b) => a + b, 0) / bases.length;
  const decay = Math.max(timer.floorMinRatio, 1 - timer.perFloorDecay * Math.max(0, floor - 1));
  return Math.round(avg * SPIRE_STEP_TASK_COUNT * decay);
}

/** Настоящий бюджет этажа из собранного плана — следующая оценка того же этажа возьмёт его. */
export function spireRememberStepBudget(floor: number, budgetMs: number): void {
  if (lastBudgetByFloor.get(floor) !== budgetMs) console.log(LOG, 'step budget remembered', JSON.stringify({ floor, budgetMs })); // guard-ok: один раз на этаж и бюджет
  lastBudgetByFloor.set(floor, budgetMs); // guard-ok: Map в памяти процесса, не Firestore
}

/** Только для тестов. */
export function __resetSpireBudgetEstimateForTests(): void {
  lastBudgetByFloor.clear();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
