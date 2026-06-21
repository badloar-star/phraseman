/**
 * vipReconcileOrphanGrant — авто-перенос VIP, выданного в ОСИРОТЕВШИЙ stable-документ.
 *
 * ПРОБЛЕМА (аудит доставки 2026-06-21): админка (admin/index.html grantAdminPremiumChoice)
 * пишет vip_* напрямую в users/{doc.id}, НЕ резолвя canonical. Если у юзера после
 * слияния/переустановки активен другой stableId, а оператор выбрал старый/дублирующий
 * документ (identityHidden=true, canonicalStableId=<живой>), — VIP оседает в «мёртвом»
 * доке. Клиент читает users/{canonicalStableId}, где vip_* нет → «VIP не пришёл».
 *
 * РЕШЕНИЕ (без правки админки): триггер на запись users/{userId}. Если документ помечен
 * identityHidden + canonicalStableId, и в его progress появился АКТИВНЫЙ VIP — переносим
 * VIP-блок на canonical (берём более «сильный» по сроку), ставим vip_grant_at для
 * празднования, и гасим VIP в осиротевшем доке. Так VIP сам доезжает до живого аккаунта,
 * историю/будущие гранты чинит автоматически, админку трогать не нужно.
 *
 * Анти-цикл: после переноса в осиротевшем доке vip_active='false' (не активен → триггер
 * не сработает повторно), а canonical-док живой (нет identityHidden → ветка пропускается).
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';

const REGION = 'us-central1';
const USERS = 'users';

// Поля VIP, которые переносим целым блоком (как в auth_merge VIP_KEYS).
const VIP_KEYS = [
  'vip_active',
  'vip_plan',
  'vip_from',
  'vip_until',
  'vip_expiry',
  'vip_admin_override',
  'vip_admin_grant_at',
  'vip_grant_at',
  'vip_migrated_from_admin_grant_at',
  'vip_revoked_at',
] as const;

type ProgressMap = Record<string, unknown>;

function cleanStr(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
}

function isTruthyFlag(value: unknown): boolean {
  return cleanStr(value).toLowerCase() === 'true';
}

function isFalsyFlag(value: unknown): boolean {
  return cleanStr(value).toLowerCase() === 'false';
}

function parseMs(value: unknown): number {
  const n = Number(cleanStr(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Активен ли VIP в этом progress прямо сейчас. '0'/пустой vip_until = бессрочный.
 * Отозванный (vip_active='false' или vip_admin_override='false') не активен.
 */
function vipActiveNow(progress: ProgressMap, now: number): boolean {
  if (isFalsyFlag(progress.vip_active) || isFalsyFlag(progress.vip_admin_override)) return false;
  const activeFlag = isTruthyFlag(progress.vip_active) || isTruthyFlag(progress.vip_admin_override);
  const planMeaningful = cleanStr(progress.vip_plan).length > 0;
  if (!activeFlag && !planMeaningful) return false;
  const fromMs = parseMs(progress.vip_from);
  const untilMs = parseMs(progress.vip_until ?? progress.vip_expiry);
  const windowStarted = fromMs <= 0 || fromMs <= now;
  const windowOpen = untilMs <= 0 || untilMs > now;
  return windowStarted && windowOpen;
}

/** Срок VIP в мс; бессрочный (0/пусто) → MAX_SAFE_INTEGER, чтобы выигрывал у датированного. */
function vipExpiryMs(progress: ProgressMap): number {
  const untilMs = parseMs(progress.vip_until ?? progress.vip_expiry);
  return untilMs <= 0 ? Number.MAX_SAFE_INTEGER : untilMs;
}

export type VipReconcileDecision =
  | { kind: 'skip' } // переносить нечего / canonical уже не хуже без изменений
  | { kind: 'extinguish' } // у canonical VIP не хуже → только гасим осиротевший
  | { kind: 'transfer'; vipPatch: ProgressMap }; // переносим VIP-блок на canonical + гасим осиротевший

/**
 * Чистое решение о переносе VIP с осиротевшего дока на canonical. Без Firestore I/O,
 * чтобы покрыть тестами все денежные ветки. now — текущее время в мс.
 *
 * Возвращает:
 *  - 'skip'        — у осиротевшего нет активного VIP (ничего не делаем),
 *  - 'extinguish'  — у canonical VIP уже не хуже по сроку (гасим осиротевший, canonical не трогаем),
 *  - 'transfer'    — переносим VIP-блок на canonical (+ vip_grant_at для празднования) и гасим осиротевший.
 */
export function decideVipReconcile(
  orphanProgress: ProgressMap,
  canonicalProgress: ProgressMap,
  now: number,
  orphanStableId: string,
): VipReconcileDecision {
  if (!vipActiveNow(orphanProgress, now)) return { kind: 'skip' };

  const orphanExpiry = vipExpiryMs(orphanProgress);
  const canonicalActive = vipActiveNow(canonicalProgress, now);
  const canonicalExpiry = canonicalActive ? vipExpiryMs(canonicalProgress) : 0;
  if (canonicalActive && canonicalExpiry >= orphanExpiry) {
    return { kind: 'extinguish' };
  }

  const vipPatch: ProgressMap = {};
  for (const k of VIP_KEYS) {
    if (orphanProgress[k] !== undefined) vipPatch[k] = orphanProgress[k];
  }
  vipPatch.vip_grant_at = String(now);
  vipPatch.vip_reconciled_from = orphanStableId;
  return { kind: 'transfer', vipPatch };
}

/** Патч, гасящий VIP в осиротевшем доке (помечаем куда перенесли). */
function extinguishPatch(canonicalStableId: string, now: number): ProgressMap {
  return {
    vip_active: 'false',
    vip_admin_override: 'false',
    vip_reconciled_to: canonicalStableId,
    vip_reconciled_at: String(now),
  };
}

export const vipReconcileOrphanGrant = functions.firestore.onDocumentWritten(
  { document: `${USERS}/{userId}`, region: REGION },
  async (event) => {
    const after = event.data?.after.exists ? event.data?.after.data() : undefined;
    if (!after) return;

    // Срабатываем ТОЛЬКО на осиротевшем документе с указанием живого canonical.
    if (after.identityHidden !== true) return;
    const userId = event.params.userId as string;
    const canonicalStableId = cleanStr(after.canonicalStableId);
    if (!canonicalStableId || canonicalStableId === userId) return;

    const now = Date.now();
    const orphanProgress = (after.progress as ProgressMap) || {};
    if (!vipActiveNow(orphanProgress, now)) return; // нет активного VIP для переноса

    // Дёшево выходим, если VIP не изменился между before/after (не новый грант).
    const before = event.data?.before.exists ? event.data?.before.data() : undefined;
    const beforeProgress = (before?.progress as ProgressMap) || {};
    const vipUnchanged = VIP_KEYS.every((k) => orphanProgress[k] === beforeProgress[k]);
    if (vipUnchanged) return;

    const db = admin.firestore();
    const canonicalRef = db.collection(USERS).doc(canonicalStableId);
    const orphanRef = db.collection(USERS).doc(userId);

    await db.runTransaction(async (tx) => {
      const canonicalSnap = await tx.get(canonicalRef);
      if (!canonicalSnap.exists) return; // живого дока нет — не создаём, ждём первого синка
      const canonicalData = canonicalSnap.data() || {};
      // Защита: если canonical сам помечен hidden (цепочка дублей) — не переносим,
      // пусть сначала identity_cleanup схлопнет цепочку.
      if (canonicalData.identityHidden === true) return;

      const canonicalProgress = (canonicalData.progress as ProgressMap) || {};
      const decision = decideVipReconcile(orphanProgress, canonicalProgress, now, userId);
      if (decision.kind === 'skip') return;

      if (decision.kind === 'transfer') {
        // Копируем VIP-блок на canonical (vip_grant_at → празднование у клиента).
        tx.set(canonicalRef, { progress: decision.vipPatch, updatedAt: now }, { merge: true });
      }
      // И в transfer, и в extinguish гасим VIP в осиротевшем доке (анти-цикл + анти-дубль).
      tx.set(orphanRef, { progress: extinguishPatch(canonicalStableId, now) }, { merge: true });
    });
  });
