import type { Decision } from './decision';
import { buildPlanFromDecision, JARVIS_PLANS_COLLECTION, type JarvisPlan, type JarvisPlanLifecycleStatus } from './jarvis_plans';

export { JARVIS_PLANS_COLLECTION };

/**
 * Firestore-обёртка над jarvis_plans.ts. Документ адресуется по id ===
 * contentHash решения — .doc() по конкретному id, не запрос коллекции,
 * поэтому limit()/where() здесь неприменимы к самой записи/чтению одного плана.
 */

export interface UpsertPlanInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly decision: Decision;
  readonly nowMs: number;
  readonly followUpTasksEnabled?: boolean;
}

/**
 * Пишет/обновляет план по решению. Читает существующий документ, чтобы не
 * потерять owner-статус (resolved/archived) при повторном суточном прогоне
 * с той же самой находкой — вся эта защита уже в buildPlanFromDecision,
 * здесь только I/O.
 */
export async function upsertPlan(input: UpsertPlanInput): Promise<JarvisPlan> {
  const ref = input.db.collection(JARVIS_PLANS_COLLECTION).doc(input.decision.contentHash);
  const snap = await ref.get();
  const existing = snap.exists ? (snap.data() as JarvisPlan) : null;
  const plan = buildPlanFromDecision(input.decision, existing, input.nowMs, {
    followUpTasksEnabled: input.followUpTasksEnabled,
  });
  // guard-ok (merge): план пишется ЦЕЛИКОМ — buildPlanFromDecision уже
  // перенёс всё нужное из existing (status/createdAtMs/narrative), merge
  // здесь означал бы риск оставить устаревшее поле от предыдущей схемы.
  await ref.set({ ...plan });
  return plan;
}

export interface ReadPlanInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly id: string;
}

export async function readPlan(input: ReadPlanInput): Promise<JarvisPlan | null> {
  const ref = input.db.collection(JARVIS_PLANS_COLLECTION).doc(input.id);
  const snap = await ref.get();
  return snap.exists ? (snap.data() as JarvisPlan) : null;
}

/** Разумный потолок: даже год работы (9 департаментов × 1 находка/сутки) даёт ~3300 записей. */
export const LIST_PLANS_LIMIT = 2_000;

export interface ListPlansInput {
  readonly db: FirebaseFirestore.Firestore;
}

/**
 * Все планы разом, с потолком. Коллекция растёт медленно (несколько находок
 * в сутки на 9 департаментов), но без limit() чтение оставалось бы дорогим
 * навсегда по мере роста истории — подстраховка на годы вперёд, не на сейчас.
 */
export async function listPlans(input: ListPlansInput): Promise<readonly JarvisPlan[]> {
  const snap = await input.db.collection(JARVIS_PLANS_COLLECTION).limit(LIST_PLANS_LIMIT).get();
  return Object.freeze(snap.docs.map((doc) => doc.data() as JarvisPlan));
}

export interface SetPlanStatusInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly id: string;
  readonly status: JarvisPlanLifecycleStatus;
  readonly nowMs: number;
}

/** Владелец меняет статус вручную из админки — resolved/archived/open. */
export async function setPlanStatus(input: SetPlanStatusInput): Promise<void> {
  const ref = input.db.collection(JARVIS_PLANS_COLLECTION).doc(input.id);
  await ref.set({ status: input.status, updatedAtMs: input.nowMs }, { merge: true });
}

export interface DeletePlanInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly id: string;
}

export async function deletePlan(input: DeletePlanInput): Promise<void> {
  await input.db.collection(JARVIS_PLANS_COLLECTION).doc(input.id).delete();
}
