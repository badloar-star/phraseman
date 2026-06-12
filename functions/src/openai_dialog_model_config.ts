import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const CONFIG_COLLECTION = 'admin_runtime_config';
const CONFIG_DOC = 'openai_dialog_model';
const MODEL_DEFAULT = 'gpt-4.1-nano';

export const ALLOWED_DIALOG_MODELS = [
  'gpt-4.1-nano',
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-4o-mini',
] as const;

type DialogModel = typeof ALLOWED_DIALOG_MODELS[number];

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
