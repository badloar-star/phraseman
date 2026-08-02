import type { AppTier } from './app_tier';
import type { Decision, Department } from './decision';

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
  readonly nowMs: number;
}

export interface AllDepartmentsSnapshot {
  readonly generatedAtMs: number;
  readonly appTier: AppTier;
  readonly decisions: readonly Decision[];
  /** Департаменты, чей вызов упал целиком — не спрятано, видно владельцу. */
  readonly departmentErrors: readonly Department[];
}

const DEPARTMENT_RUNNERS: readonly [Department, keyof Pick<BuildAllDepartmentsSnapshotInput, 'runQuality' | 'runMoney' | 'runGrowth' | 'runContent' | 'runPayments' | 'runSafety' | 'runSupport' | 'runFactory'>][] = [
  ['quality', 'runQuality'],
  ['money', 'runMoney'],
  ['growth', 'runGrowth'],
  ['content', 'runContent'],
  ['payments', 'runPayments'],
  ['safety', 'runSafety'],
  ['support', 'runSupport'],
  ['factory', 'runFactory'],
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

  return Object.freeze({
    generatedAtMs: input.nowMs,
    appTier,
    decisions: Object.freeze(results.flatMap((r) => r.decisions)),
    departmentErrors: Object.freeze(results.filter((r) => r.failed).map((r) => r.department)),
  });
}
