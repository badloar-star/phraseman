import type { Decision } from './decision';
import { decisionTopicKey } from './decision_topic';
import { judgePlanOutcome } from './plan_outcome';
import {
  buildPlanFromDecision,
  JARVIS_PLANS_COLLECTION,
  OWNER_DECIDED_STATUSES,
  type JarvisPlan,
  type JarvisPlanLifecycleStatus,
} from './jarvis_plans';

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
  // зачем адрес по теме, а не по contentHash: см. buildPlanFromDecision —
  // contentHash сдвигается вместе с любым числом в тексте, и вместо обновления
  // плана заводился новый документ каждое утро.
  const ref = input.db.collection(JARVIS_PLANS_COLLECTION).doc(decisionTopicKey(input.decision));
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

export interface RecordPlanOwnerDecisionInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly approvalDecisionHash: string;
  readonly action: 'approve' | 'reject';
  readonly nowMs: number;
}

/**
 * Делает Telegram-кнопку частью lifecycle плана, а не одноразовым тостом.
 * По хэшу ожидается ровно одна версия; при неоднозначности fail-closed —
 * лучше сохранить audit без изменения плана, чем обновить не ту задачу.
 */
export async function recordPlanOwnerDecision(input: RecordPlanOwnerDecisionInput): Promise<boolean> {
  const snapshot = await input.db.collection(JARVIS_PLANS_COLLECTION)
    .where('approvalDecisionHash', '==', input.approvalDecisionHash)
    .limit(2)
    .get();
  if (snapshot.docs.length !== 1) return false;
  await snapshot.docs[0].ref.set({
    ownerDecision: {
      action: input.action,
      decidedAtMs: input.nowMs,
      source: 'telegram',
    },
    // зачем 'accepted', а не 'open' (владелец 2026-08-15, «говорит, а не
    // делает»): раньше согласие оставляло план открытым навсегда — владелец
    // жал «принять», а назавтра находка снова в открытых. Единственный
    // доступный ему орган управления не управлял ничем. Теперь согласие
    // уводит находку из открытых и ставит её в очередь на проверку результата.
    status: input.action === 'reject' ? 'archived' : 'accepted',
    ...(input.action === 'approve' ? { acceptedAtMs: input.nowMs } : {}),
    updatedAtMs: input.nowMs,
  }, { merge: true });
  return true;
}

export interface ReviewAcceptedPlansInput {
  readonly db: FirebaseFirestore.Firestore;
  /** Темы, наблюдаемые в свежем снимке данных. */
  readonly seenTopicKeys: readonly string[];
  readonly nowMs: number;
}

export interface ReviewAcceptedPlansResult {
  readonly worked: number;
  readonly didNotWork: number;
}

/**
 * Проверяет, сработали ли принятые советы, и записывает вердикт.
 *
 * зачем (владелец 2026-08-15, «не учится»): без этой проверки у системы нет
 * ни одного сигнала, отличающего полезный совет от бесполезного. Здесь
 * появляется первый настоящий факт о собственной работе: проблема после
 * согласия ушла или осталась.
 *
 * Решение о вердикте принимает чистый `judgePlanOutcome`, здесь только I/O.
 */
export async function reviewAcceptedPlans(
  input: ReviewAcceptedPlansInput,
): Promise<ReviewAcceptedPlansResult> {
  const seen = new Set(input.seenTopicKeys);
  // guard-ok (limit): только принятые планы, их единицы — это не скан коллекции.
  const snap = await input.db.collection(JARVIS_PLANS_COLLECTION)
    .where('status', '==', 'accepted')
    .limit(LIST_PLANS_LIMIT)
    .get();

  let worked = 0;
  let didNotWork = 0;
  for (const doc of snap.docs) {
    const plan = doc.data() as JarvisPlan;
    const outcome = judgePlanOutcome({
      plan,
      stillObserved: seen.has(plan.topicKey ?? plan.id),
      nowMs: input.nowMs,
    });
    if (outcome.nextStatus === null) continue;
    await doc.ref.set({
      status: outcome.nextStatus,
      outcome: {
        verdict: outcome.verdict,
        checkedAtMs: input.nowMs,
      },
      updatedAtMs: input.nowMs,
    }, { merge: true });
    if (outcome.verdict === 'worked') worked += 1;
    if (outcome.verdict === 'did_not_work') didNotWork += 1;
  }
  return Object.freeze({ worked, didNotWork });
}

export interface CloseVanishedPlansInput {
  readonly db: FirebaseFirestore.Firestore;
  /** Темы, которые сегодняшний прогон увидел в данных. */
  readonly seenTopicKeys: readonly string[];
  readonly nowMs: number;
}

/**
 * Закрывает планы, чья проблема перестала наблюдаться в данных.
 *
 * зачем (владелец 2026-08-15): без автозакрытия список открытых находок рос
 * вечно. Проблема давно ушла, а план висел — и владелец переставал верить
 * этому списку целиком. Закрытие «само» так же важно, как появление.
 *
 * зачем не трогать решённое владельцем: он уже вынес вердикт (принял,
 * отклонил, подтвердил результат) — автомат не имеет права его перебивать.
 *
 * @returns сколько планов закрыто
 */
export async function closeVanishedPlans(input: CloseVanishedPlansInput): Promise<number> {
  const seen = new Set(input.seenTopicKeys);
  // guard-ok (limit): выборка ограничена LIST_PLANS_LIMIT и берёт только
  // открытые планы — коллекция растёт на единицы записей в сутки.
  const snap = await input.db.collection(JARVIS_PLANS_COLLECTION)
    .where('status', '==', 'open')
    .limit(LIST_PLANS_LIMIT)
    .get();

  let closed = 0;
  for (const doc of snap.docs) {
    const plan = doc.data() as JarvisPlan;
    if (OWNER_DECIDED_STATUSES.includes(plan.status)) continue;
    const key = plan.topicKey ?? plan.id;
    if (seen.has(key)) continue;
    await doc.ref.set({
      status: 'vanished' satisfies JarvisPlanLifecycleStatus,
      vanishedAtMs: input.nowMs,
      updatedAtMs: input.nowMs,
    }, { merge: true });
    closed += 1;
  }
  return closed;
}
