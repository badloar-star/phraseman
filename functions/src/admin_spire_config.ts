import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import {
  SPIRE_CONFIG_COLLECTION,
  SPIRE_CONFIG_DOC_ID,
  spireBuildConfigDoc,
  spireConfigStatus,
} from './spire_config_contract';

/**
 * Управление конфигом Шпиля из админки (PM-283).
 *
 * зачем: владелец (T8, T35, T37) — таймер, монеты, высота и поведение ботов
 * меняются БЕЗ релиза. Тот же принцип и та же защита, что у
 * admin_arena_config.ts: App Check для админки ЗАПЛОМБИРОВАН
 * (ENFORCE_APP_CHECK_ADMIN=false навсегда, пока владелец сам не разрешит —
 * см. callable_options.ts), поэтому здесь используются готовые
 * ADMIN_SENSITIVE_WRITE_OPTIONS/requireAdminAppCheck без изменений; защита —
 * custom claim admin:true плюс permission application.config.write.
 *
 * Запись — только целиком (spireBuildConfigDoc), не слиянием: частично
 * собранный документ из нескольких заходов решал бы, сколько энергии и монет
 * получает каждый игрок, и это должен быть документ, который кто-то видел
 * целиком перед сохранением.
 */

type Row = Record<string, unknown>;

function requireSpireConfigWriter(request: { auth?: { uid?: string; token?: Row } | null }): {
  actorUid: string;
  role: AdminRole;
} {
  const actorUid = String(request.auth?.uid ?? '').trim();
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin role required');
  }
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'Role cannot use application.config.write');
  }
  return { actorUid, role };
}

function configRef(): admin.firestore.DocumentReference {
  return admin.firestore().collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC_ID);
}

/** Только чтение — можно звать сколько угодно, чтобы посмотреть текущее состояние. */
export const adminSpireConfigGet = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    requireSpireConfigWriter(request as { auth?: { uid?: string; token?: Row } });
    const snap = await configRef().get();
    return { ok: true, status: spireConfigStatus(snap.exists ? snap.data() : null) };
  },
);

export const adminSpireConfigSet = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireSpireConfigWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const reason = String(data.reason ?? '').trim().slice(0, 400);
    if (!reason) throw new HttpsError('invalid-argument', 'reason_required');

    const db = admin.firestore();
    const ref = configRef();
    const auditRef = db.collection('admin_log').doc(); // guard-ok: .doc() без id — новый документ, не листинг коллекции
    const nowMs = Date.now();
    const result = await db.runTransaction(async (tx) => {
      const before = await tx.get(ref);
      const beforeStatus = spireConfigStatus(before.exists ? before.data() : null);
      const next = spireBuildConfigDoc({
        enabled: data.enabled === true,
        timer: data.timer,
        coins: data.coins,
        residents: data.residents,
        integrity: data.integrity,
        // зачем (D162, Ядро 13.10): документ пишется целиком (tx.set) — без переноса рубильник rankBy и потолок недели
        // стирались бы любым переключением «Включить/Выключить Пик» в админке. Не прислали — оставляем прежние.
        rankBy: data.rankBy ?? beforeStatus.config.rankBy,
        weekCoinsCap: data.weekCoinsCap ?? beforeStatus.config.weekCoinsCap,
      });
      tx.set(ref, { ...next, updatedAtMs: nowMs, updatedByUid: actor.actorUid });
      tx.set(auditRef, createAuditRecord({
        action: 'spire_config_write',
        actorUid: actor.actorUid,
        role: actor.role,
        entity: { collection: SPIRE_CONFIG_COLLECTION, id: SPIRE_CONFIG_DOC_ID },
        reason,
        before: { enabled: beforeStatus.config.enabled, rankBy: beforeStatus.config.rankBy, weekCoinsCap: beforeStatus.config.weekCoinsCap },
        after: { enabled: next.enabled, rankBy: next.rankBy, weekCoinsCap: next.weekCoinsCap },
        requestId: auditRef.id,
        timestamp: new Date(nowMs).toISOString(),
      }));
      return { next };
    });

    return { ok: true, status: spireConfigStatus(result.next) };
  },
);
