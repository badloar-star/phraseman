import type { AppTier } from './app_tier';
import type { Decision, Department } from './decision';
import { buildDataHealthSnapshot, type DataHealthSnapshot } from './data_health_snapshot';
import { dedupeDecisions } from './severity';

/**
 * Один вызов, все департаменты, один тир на всех.
 *
 * зачем: владелец 2026-08-02 — одна кнопка «Проверить сейчас» запускает все
 * департаменты разом, результат в одном окне, не в трёх отдельных карточках.
 * Тир вычисляется РОВНО ОДИН РАЗ (Firebase-экономия — не тройной .count()),
 * департаменты работают параллельно и независимо: падение одного не должно
 * скрыть решения остальных двух.
 */

export interface DepartmentSnapshotLike {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

export interface BuildAllDepartmentsSnapshotInput {
  readonly resolveAppTier: () => Promise<AppTier>;
  readonly runQuality: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly runMoney: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly runGrowth: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly runContent: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly runPayments: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly runSafety: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly runSupport: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly runFactory: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly runRetention: (appTier: AppTier) => Promise<DepartmentSnapshotLike>;
  readonly nowMs: number;
}

export interface AllDepartmentsSnapshot {
  readonly generatedAtMs: number;
  readonly appTier: AppTier;
  readonly decisions: readonly Decision[];
  /** Aggregate-only health of the evidence used by the departments. */
  readonly dataHealth: DataHealthSnapshot;
  /** Департаменты, чей вызов упал целиком — не спрятано, видно владельцу. */
  readonly departmentErrors: readonly Department[];
}

const DEPARTMENT_RUNNERS: readonly [Department, keyof Pick<BuildAllDepartmentsSnapshotInput, 'runQuality' | 'runMoney' | 'runGrowth' | 'runContent' | 'runPayments' | 'runSafety' | 'runSupport' | 'runFactory' | 'runRetention'>][] = [
  ['quality', 'runQuality'],
  ['money', 'runMoney'],
  ['growth', 'runGrowth'],
  ['content', 'runContent'],
  ['payments', 'runPayments'],
  ['safety', 'runSafety'],
  ['support', 'runSupport'],
  ['factory', 'runFactory'],
  ['retention', 'runRetention'],
];

export async function buildAllDepartmentsSnapshot(input: BuildAllDepartmentsSnapshotInput): Promise<AllDepartmentsSnapshot> {
  const appTier = await input.resolveAppTier();

  const results = await Promise.all(DEPARTMENT_RUNNERS.map(async ([department, key]) => {
    try {
      const snapshot = await input[key](appTier);
      return { department, decisions: snapshot.decisions, failed: false };
    } catch {
      return { department, decisions: [] as readonly Decision[], failed: true };
    }
  }));

  // зачем dedupe здесь: один и тот же факт иногда возвращается дважды —
  // например источник посчитан и в "по кнопке", и повторным суточным
  // прогоном в рамках одного вызова. Склейка не должна прятать РАЗНЫЕ
  // находки одного департамента — только буквальные повторы текста.
  const decisions = dedupeDecisions(results.flatMap((r) => r.decisions));
  const dataHealth = buildDataHealthSnapshot({
    evidence: decisions.flatMap((decision) => decision.evidence),
    trigger: 'owner_request',
    nowMs: input.nowMs,
  });

  return Object.freeze({
    generatedAtMs: input.nowMs,
    appTier,
    decisions: Object.freeze(decisions),
    dataHealth,
    departmentErrors: Object.freeze(results.filter((r) => r.failed).map((r) => r.department)),
  });
}
