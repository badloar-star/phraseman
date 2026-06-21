import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const CONFIG_COLLECTION = 'admin_runtime_config';
const CONFIG_DOC = 'openai_dialog_model';
const QUOTA_CONFIG_DOC = 'openai_dialog_quota';
const MODEL_DEFAULT = 'gpt-4.1-nano';
export const DIALOG_FREE_DAILY_REPLIES_DEFAULT = 3;
export const DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT = 100;
const DIALOG_DAILY_REPLIES_MAX = 10000;

export const ALLOWED_DIALOG_MODELS = [
  'gpt-4.1-nano',
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-4o-mini',
] as const;

type DialogModel = typeof ALLOWED_DIALOG_MODELS[number];

/**
 * Какие диалоговые модели надёжно поддерживают `response_format: json_object`.
 * Нужно для «диалога как игры»: он просит модель вернуть строгий JSON-конверт.
 * Дефолтная `gpt-4.1-nano` — самая урезанная, JSON mode на ней ненадёжен →
 * НЕ включаем для неё игровой режим (упал бы HTTP 400, см. аудит C1). Для таких
 * моделей диалог идёт обычным текстом без игровой механики (мягкая деградация).
 *
 * Источник истины: остальные json_object-функции проекта (stats_insights,
 * weekly_review, explain_choice) намеренно работают на gpt-4o-mini.
 */
const JSON_OBJECT_SUPPORTED_MODELS: Readonly<Record<DialogModel, boolean>> = {
  'gpt-4o-mini': true,
  'gpt-4.1': true,
  'gpt-4.1-mini': true,
  'gpt-4.1-nano': false,
};

/** true — модель надёжно поддерживает response_format json_object. */
export function modelSupportsJsonObject(model: string): boolean {
  return JSON_OBJECT_SUPPORTED_MODELS[model as DialogModel] === true;
}

export interface DialogQuotaConfig {
  freeDailyReplies: number;
  premiumDailyReplies: number;
}

function text(value: unknown, max = 120): string {
  return String(value ?? '').trim().slice(0, max);
}

function isAllowedDialogModel(model: string): model is DialogModel {
  return (ALLOWED_DIALOG_MODELS as readonly string[]).includes(model);
}

function normalizeDialogModel(value: unknown): DialogModel | null {
  const model = text(value, 80);
  return isAllowedDialogModel(model) ? model : null;
}

function normalizeDailyReplies(value: unknown): number | null {
  const raw = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  const n = typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return null;
  const clean = Math.floor(n);
  if (clean < 0 || clean > DIALOG_DAILY_REPLIES_MAX) return null;
  return clean;
}

function quotaFromData(data: FirebaseFirestore.DocumentData | undefined): DialogQuotaConfig {
  return {
    freeDailyReplies:
      normalizeDailyReplies(data?.freeDailyReplies) ?? DIALOG_FREE_DAILY_REPLIES_DEFAULT,
    premiumDailyReplies:
      normalizeDailyReplies(data?.premiumDailyReplies) ?? DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT,
  };
}

export async function resolveConfiguredDialogModel(
  db: FirebaseFirestore.Firestore,
  envModel: unknown,
): Promise<DialogModel> {
  try {
    const snap = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
    const configured = normalizeDialogModel(snap.data()?.model);
    if (configured) return configured;
  } catch (e) {
    console.warn('resolveConfiguredDialogModel failed, using fallback', e);
  }
  return normalizeDialogModel(envModel) || MODEL_DEFAULT;
}

export async function resolveConfiguredDialogQuota(
  db: FirebaseFirestore.Firestore,
): Promise<DialogQuotaConfig> {
  try {
    const snap = await db.collection(CONFIG_COLLECTION).doc(QUOTA_CONFIG_DOC).get();
    return quotaFromData(snap.data());
  } catch (e) {
    console.warn('resolveConfiguredDialogQuota failed, using fallback', e);
    return quotaFromData(undefined);
  }
}

export const openAiDialogModelConfig = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }

  const db = admin.firestore();
  const ref = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC);
  const action = text(request.data?.action, 20) || 'get';

  if (action === 'set') {
    const model = normalizeDialogModel(request.data?.model);
    if (!model) {
      throw new HttpsError('invalid-argument', 'unsupported_dialog_model');
    }
    await ref.set({
      model,
      allowedModels: ALLOWED_DIALOG_MODELS,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
      updatedBy: text(request.auth?.token?.email, 200) || 'admin',
    }, { merge: true });
  } else if (action !== 'get') {
    throw new HttpsError('invalid-argument', 'unsupported_action');
  }

  const snap = await ref.get();
  const configured = normalizeDialogModel(snap.data()?.model);
  const activeModel = configured || normalizeDialogModel(process.env.OPENAI_DIALOG_MODEL) || MODEL_DEFAULT;

  return {
    ok: true,
    activeModel,
    configuredModel: configured,
    defaultModel: MODEL_DEFAULT,
    allowedModels: ALLOWED_DIALOG_MODELS,
    updatedAtMs: Number(snap.data()?.updatedAtMs || 0),
  };
});

export const openAiDialogQuotaConfig = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }

  const db = admin.firestore();
  const ref = db.collection(CONFIG_COLLECTION).doc(QUOTA_CONFIG_DOC);
  const action = text(request.data?.action, 20) || 'get';

  if (action === 'set') {
    const current = quotaFromData((await ref.get()).data());
    const freeDailyReplies = request.data?.freeDailyReplies == null
      ? current.freeDailyReplies
      : normalizeDailyReplies(request.data.freeDailyReplies);
    const premiumDailyReplies = request.data?.premiumDailyReplies == null
      ? current.premiumDailyReplies
      : normalizeDailyReplies(request.data.premiumDailyReplies);

    if (freeDailyReplies == null || premiumDailyReplies == null) {
      throw new HttpsError('invalid-argument', 'unsupported_dialog_quota');
    }

    await ref.set({
      freeDailyReplies,
      premiumDailyReplies,
      defaultFreeDailyReplies: DIALOG_FREE_DAILY_REPLIES_DEFAULT,
      defaultPremiumDailyReplies: DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT,
      maxDailyReplies: DIALOG_DAILY_REPLIES_MAX,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
      updatedBy: text(request.auth?.token?.email, 200) || 'admin',
    }, { merge: true });
  } else if (action !== 'get') {
    throw new HttpsError('invalid-argument', 'unsupported_action');
  }

  const snap = await ref.get();
  const activeQuota = quotaFromData(snap.data());

  return {
    ok: true,
    ...activeQuota,
    defaultFreeDailyReplies: DIALOG_FREE_DAILY_REPLIES_DEFAULT,
    defaultPremiumDailyReplies: DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT,
    maxDailyReplies: DIALOG_DAILY_REPLIES_MAX,
    updatedAtMs: Number(snap.data()?.updatedAtMs || 0),
  };
});
