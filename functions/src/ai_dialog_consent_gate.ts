import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';

/**
 * Серверный шлюз согласия на ИИ-диалоги: user_consents/{stableUid}.aiDialogConsent === 'granted'.
 *
 * зачем (Ревизор 22.10, 🔴; координатор — план (2)+(3), «да»): ИИ-диалоги отправляют текст человека в OpenAI, а сервер
 * согласие не проверял — шлюз был только на телефоне. Замер 22.10: у 0 из 62 активных за неделю согласие на сервере не
 * записано, потому что запись согласия два месяца отвечала 401 (нет права вызова; восстановлено 19:20Z). Поэтому отказ
 * включается ТОЛЬКО выключателем remote_config/app.bools.ai_dialog_consent_enforced. До включения шлюз пишет в журнал
 * «would_refuse» и пропускает — так видно покрытие, прежде чем отрезать живых людей. Включаем по замеру и когда телефон
 * (5 · ВХОД) на ai_consent_required показывает окно согласия.
 * Firebase-экономия: «granted» и выключатель держим в памяти экземпляра 60 с — ходы диалога идут подряд, без чтения на каждый.
 */

const LOG = '[AI-CONSENT]';
const CACHE_TTL_MS = 60_000;
export const AI_DIALOG_CONSENT_REQUIRED = 'ai_consent_required';

type ConsentState = 'granted' | 'denied' | 'unset' | 'missing' | 'read_failed';
const grantedUntil = new Map<string, number>();
let enforcedCache: { value: boolean; expiresAtMs: number } | null = null;

export function __resetAiDialogConsentCacheForTests(): void {
  grantedUntil.clear();
  enforcedCache = null;
}

async function readConsentState(db: admin.firestore.Firestore, stableUid: string, nowMs: number): Promise<{ state: ConsentState; source: 'cache' | 'firestore' }> {
  const cachedUntil = grantedUntil.get(stableUid);
  if (cachedUntil !== undefined && cachedUntil > nowMs) return { state: 'granted', source: 'cache' };
  let snap: admin.firestore.DocumentSnapshot;
  try {
    snap = await db.collection('user_consents').doc(stableUid).get();
  } catch (error) {
    // зачем (Ревизор a6e2545b4 🟡): сбой Firestore (таймаут, квота) не должен ронять ход ИИ — «не смогли проверить» ≠ «нет согласия»
    console.warn(`${LOG} consent_read_failed ${JSON.stringify({ uid: stableUid.slice(0, 6), reason: String(error instanceof Error ? error.message : error).slice(0, 120) })}`);
    return { state: 'read_failed', source: 'firestore' };
  }
  const raw = snap.exists ? snap.get('aiDialogConsent') : undefined;
  const state: ConsentState = raw === 'granted' || raw === 'denied' || raw === 'unset' ? raw : 'missing';
  if (state === 'granted') grantedUntil.set(stableUid, nowMs + CACHE_TTL_MS);
  else grantedUntil.delete(stableUid);
  return { state, source: 'firestore' };
}

async function consentEnforced(db: admin.firestore.Firestore, nowMs: number): Promise<boolean> {
  if (enforcedCache && enforcedCache.expiresAtMs > nowMs) return enforcedCache.value;
  try {
    const data = (await db.collection('remote_config').doc('app').get()).data() as { bools?: Record<string, unknown> } | undefined;
    enforcedCache = { value: data?.bools?.ai_dialog_consent_enforced === true, expiresAtMs: nowMs + CACHE_TTL_MS };
  } catch (error) {
    // зачем: не смогли прочитать выключатель — НЕ отрезаем людей (режим журнала), причину пишем
    console.warn(`${LOG} switch_read_failed ${String(error instanceof Error ? error.message : error).slice(0, 120)} → режим журнала`);
    enforcedCache = { value: false, expiresAtMs: nowMs + CACHE_TTL_MS };
  }
  return enforcedCache.value;
}

/**
 * Проверка перед обращением к ИИ. Нет согласия и выключатель включён → HttpsError failed-precondition ai_consent_required.
 * Выключатель выключен → журнал would_refuse и пропуск. Согласие есть → тихо (журнал только при чтении из базы).
 */
export async function checkAiDialogConsent(input: Readonly<{
  db: admin.firestore.Firestore;
  stableUid: string;
  callable: string;
  nowMs?: number;
}>): Promise<void> {
  const nowMs = input.nowMs ?? Date.now();
  const uidTag = input.stableUid.slice(0, 6);
  const { state, source } = await readConsentState(input.db, input.stableUid, nowMs);
  if (state === 'granted') {
    if (source === 'firestore') console.log(`${LOG} ok ${JSON.stringify({ callable: input.callable, uid: uidTag, source })}`);
    return;
  }
  if (state === 'read_failed') {
    // зачем (Ревизор 24.10): не смогли прочитать согласие — пропускаем и при включённом выключателе; причина уже в журнале
    console.warn(`${LOG} pass_unverified ${JSON.stringify({ callable: input.callable, uid: uidTag })}`);
    return;
  }
  const enforced = await consentEnforced(input.db, nowMs);
  if (!enforced) {
    console.warn(`${LOG} would_refuse ${JSON.stringify({ callable: input.callable, uid: uidTag, state, enforced })}`);
    return;
  }
  console.warn(`${LOG} refused ${JSON.stringify({ callable: input.callable, uid: uidTag, state, enforced })}`);
  throw new HttpsError('failed-precondition', AI_DIALOG_CONSENT_REQUIRED);
}

/** Обёртка onCall-обработчика: личность из auth → stableUid → проверка согласия → обработчик. */
export function withAiDialogConsent<Req extends { readonly auth?: { readonly uid?: unknown } | null }, Res>(
  callableName: string,
  handler: (request: Req) => Promise<Res>,
): (request: Req) => Promise<Res> {
  return async (request: Req) => {
    const rawUid = request.auth?.uid;
    const authUid = typeof rawUid === 'string' ? rawUid : '';
    // нет входа — пусть обработчик ответит своим «unauthenticated», как раньше
    if (!authUid) return handler(request);
    const db = admin.firestore();
    let stableUid: string;
    try {
      stableUid = await resolveStableUidForAuth(db, authUid, undefined, { requireKnownIdentity: true, repairLinks: false });
    } catch (error) {
      // зачем: личность не нашлась — решает обработчик (у него свой понятный отказ), шлюз причину пишет
      console.warn(`${LOG} identity_unresolved ${JSON.stringify({ callable: callableName, reason: String(error instanceof Error ? error.message : error).slice(0, 80) })}`);
      return handler(request);
    }
    await checkAiDialogConsent({ db, stableUid, callable: callableName });
    return handler(request);
  };
}
