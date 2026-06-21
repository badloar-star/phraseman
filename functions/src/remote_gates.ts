// ═══════════════════════════════════════════════════════════════════════════
// remote_gates.ts — серверное чтение feature-флагов из remote_config/app.bools.
//
// ОДИН источник правды клиент↔сервер: тот же документ, что читает клиент
// (app/remote_flags.ts) и пишет «Пульт» (admin/index.html → remote_config/app).
// Нужно, чтобы серверный гейтинг (напр. бесплатные ИИ-диалоги) не расходился с
// клиентским: если админ перевёл фичу в «Фри» (флаг=false), сервер должен это
// учитывать, а не держать свой жёсткий free-кап.
//
// НИКОГДА не бросает: при ошибке/отсутствии → переданный дефолт (как клиент,
// где дефолт каждого gate-флага = true = «фича за премиумом»).
// ═══════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';

const REMOTE_CONFIG_COLLECTION = 'remote_config';
const REMOTE_CONFIG_DOC = 'app';

function coerceBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

/**
 * Читает один bool-флаг из remote_config/app.bools.
 * @param fallback значение по умолчанию (= хардкод-дефолт клиента, обычно true для gate_*).
 */
export async function resolveRemoteBool(
  db: FirebaseFirestore.Firestore,
  key: string,
  fallback: boolean,
): Promise<boolean> {
  try {
    const snap = await db.collection(REMOTE_CONFIG_COLLECTION).doc(REMOTE_CONFIG_DOC).get();
    const bools = (snap.data() as { bools?: Record<string, unknown> } | undefined)?.bools;
    const coerced = coerceBool(bools?.[key]);
    return coerced ?? fallback;
  } catch (e) {
    console.warn('resolveRemoteBool failed, using fallback', key, e);
    return fallback;
  }
}

/** Чистая функция для тестов: извлекает bool-флаг из объекта bools. */
export function pickRemoteBool(
  bools: Record<string, unknown> | undefined,
  key: string,
  fallback: boolean,
): boolean {
  return coerceBool(bools?.[key]) ?? fallback;
}
