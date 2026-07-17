import { createHash } from 'node:crypto';
import { contentStageReviewFingerprint } from './review_fingerprint';

export const SHADOW_JUDGE_CONFIG_PATH = 'content_factory_config/shadow_judge';
export const SHADOW_JUDGE_BUDGET_COLLECTION = 'content_factory_shadow_judge_daily_budget';
export const SHADOW_JUDGE_RESERVATION_COLLECTION = 'content_factory_shadow_judge_reservations';
const ALLOWED_MODELS = Object.freeze(['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini']);

export interface ShadowJudgeConfig { readonly enabled: boolean; readonly model: string; readonly dailyCap: number; readonly configError: string | null }
export function parseShadowJudgeConfig(value: unknown): ShadowJudgeConfig {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const requestedModel = String(data.model ?? ''); const modelValid = !requestedModel || ALLOWED_MODELS.includes(requestedModel); const model = modelValid && requestedModel ? requestedModel : 'gpt-4.1-mini'; const rawCap = Number(data.dailyCap ?? 0); const dailyCap = Number.isFinite(rawCap) ? Math.max(0, Math.min(1000, Math.floor(rawCap))) : 0; const configError = data.enabled === true && !modelValid ? 'shadow_judge_model_not_allowed' : null;
  return Object.freeze({ enabled: data.enabled === true && dailyCap > 0 && configError === null, model, dailyCap, configError });
}

export async function loadShadowJudgeConfig(db: FirebaseFirestore.Firestore): Promise<ShadowJudgeConfig> {
  try { return parseShadowJudgeConfig((await db.doc(SHADOW_JUDGE_CONFIG_PATH).get()).data()); } catch { return parseShadowJudgeConfig(null); }
}

export function shadowJudgeReservationId(unitId: string, nowMs: number): string { return `${new Date(nowMs).toISOString().slice(0, 10)}_${createHash('sha256').update(unitId).digest('hex').slice(0, 48)}`; }
export async function reserveShadowJudgeBudget(db: FirebaseFirestore.Firestore, unitId: string, cap: number, nowMs = Date.now()) {
  if (!/^[A-Za-z0-9._:-]{1,500}$/.test(unitId)) throw new Error('shadow_judge_budget_unit_invalid'); if (!Number.isSafeInteger(cap) || cap < 1 || cap > 1000) throw new Error('shadow_judge_budget_cap_invalid');
  const day = new Date(nowMs).toISOString().slice(0, 10); const counterRef = db.collection(SHADOW_JUDGE_BUDGET_COLLECTION).doc(day); const reservationRef = db.collection(SHADOW_JUDGE_RESERVATION_COLLECTION).doc(shadowJudgeReservationId(unitId, nowMs));
  return db.runTransaction(async (tx) => { const reservation = await tx.get(reservationRef); if (reservation.exists) return Object.freeze({ reserved: true, replayed: true }); const counter = await tx.get(counterRef); const used = Number(counter.data()?.requestCount ?? 0); if (!Number.isSafeInteger(used) || used < 0) throw new Error('shadow_judge_budget_counter_invalid'); if (used >= cap) return Object.freeze({ reserved: false, replayed: false }); tx.set(counterRef, { requestCount: used + 1, cap, updatedAtMs: nowMs }, { merge: true }); tx.create(reservationRef, { unitId, day, reservedAtMs: nowMs }); return Object.freeze({ reserved: true, replayed: false }); });
}

export async function commitShadowJudgeReceipt(db: FirebaseFirestore.Firestore, input: { stageId: string; contentHash: string; expectedRevision: number; expectedReviewFingerprint: string; receipt: Readonly<Record<string, unknown>>; updatedAt: unknown }) {
  const ref = db.collection('content_factory_stages').doc(input.stageId); return db.runTransaction(async (tx) => { const snapshot = await tx.get(ref); const stage = snapshot.data() ?? {}; if (!snapshot.exists || stage.state !== 'needs_review' || stage.contentHash !== input.contentHash || stage.revision !== input.expectedRevision || contentStageReviewFingerprint(input.stageId, stage) !== input.expectedReviewFingerprint) return false; tx.update(ref, { judgeReceipt: input.receipt, judgeUpdatedAt: input.updatedAt, updatedAt: input.updatedAt }); return true; });
}
