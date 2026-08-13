import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import {
  ARENA_CONFIG_DOC_ID,
  ARENA_CONFIG_EXPANSION_FLAGS,
  ARENA_CONFIG_FLAGS,
  arenaBuildConfigDoc,
  arenaConfigStatus,
  type ArenaConfigExpansionFlag,
  type ArenaConfigFlag,
} from './arena_config_contract';
import { ARENA_V2_COLLECTIONS } from './arena_v2_core';

/**
 * Управление конфигом Арены из админки.
 *
 * Владелец: «в админке нет ни одного экрана управления этим конфигом, а она
 * должна быть написана».
 *
 * Это не удобство, а корневая причина того, что Арена не работает: бэкенд
 * закрыт по умолчанию и без `arena_v2_config/current` каждый вызов падает с
 * `arena_config_missing`. Документ до сих пор можно было создать только руками
 * из консоли Firestore, а опечатка в шестидесятизначном хеше давала отказ,
 * неотличимый от «документа нет».
 *
 * Поэтому админ здесь выбирает ТОЛЬКО переключатели и минимальную версию
 * клиента. Версии схемы и хеши содержимого подставляет сборка — руками их
 * вводить больше нельзя.
 */

type Row = Record<string, unknown>;

function requireArenaConfigWriter(request: { auth?: { uid?: string; token?: Row } | null }): {
  actorUid: string;
  role: AdminRole;
} {
  const actorUid = String(request.auth?.uid ?? '').trim();
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin role required');
  }
  // Роли в проекте никем не проставляются, поэтому флага admin достаточно —
  // такой админ считается владельцем; явная роль, если есть, всё ещё сужает.
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'Role cannot use application.config.write');
  }
  return { actorUid, role };
}

function configRef(): admin.firestore.DocumentReference {
  return admin.firestore().collection(ARENA_V2_COLLECTIONS.config).doc(ARENA_CONFIG_DOC_ID);
}

/**
 * Состояние конфига. Только чтение — можно звать сколько угодно, в том числе
 * чтобы просто посмотреть, почему Арена молчит.
 */
export const adminArenaConfigGet = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    requireArenaConfigWriter(request as { auth?: { uid?: string; token?: Row } });
    const snap = await configRef().get();
    return { ok: true, status: arenaConfigStatus(snap.exists ? snap.data() : null) };
  },
);

function pickFlags(raw: unknown): Partial<Record<ArenaConfigFlag, boolean>> {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Row;
  const flags: Partial<Record<ArenaConfigFlag, boolean>> = {};
  for (const flag of ARENA_CONFIG_FLAGS) flags[flag] = row[flag] === true;
  return flags;
}

function pickExpansionFlags(raw: unknown): Partial<Record<ArenaConfigExpansionFlag, boolean>> {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Row;
  const flags: Partial<Record<ArenaConfigExpansionFlag, boolean>> = {};
  for (const flag of ARENA_CONFIG_EXPANSION_FLAGS) flags[flag] = row[flag] === true;
  return flags;
}

/**
 * Записывает конфиг целиком.
 *
 * Именно целиком, а не слиянием: конфиг, собранный по кусочкам из нескольких
 * заходов, — это документ, которого никто не видел целиком, а он решает,
 * работает ли Арена вообще. Полная запись всегда даёт документ, прошедший
 * договор.
 */
export const adminArenaConfigSet = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireArenaConfigWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const reason = String(data.reason ?? '').trim().slice(0, 400);
    if (!reason) throw new HttpsError('invalid-argument', 'reason_required');

    const next = arenaBuildConfigDoc({
      flags: pickFlags(data.flags),
      expansionFlags: pickExpansionFlags(data.expansionFlags),
      minClientVersion: typeof data.minClientVersion === 'string' ? data.minClientVersion : undefined,
    });

    const db = admin.firestore();
    const ref = configRef();
    const auditRef = db.collection('admin_log').doc();
    const nowMs = Date.now();
    const before = await ref.get();
    const beforeStatus = arenaConfigStatus(before.exists ? before.data() : null);

    await db.runTransaction(async (tx) => {
      tx.set(ref, { ...next, updatedAtMs: nowMs, updatedByUid: actor.actorUid });
      tx.set(auditRef, createAuditRecord({
        action: 'arena_config_write',
        actorUid: actor.actorUid,
        role: actor.role,
        entity: { collection: ARENA_V2_COLLECTIONS.config, id: ARENA_CONFIG_DOC_ID },
        reason,
        before: { liveForPlayers: beforeStatus.liveForPlayers, ...beforeStatus.flags },
        after: { liveForPlayers: arenaConfigStatus(next).liveForPlayers, ...pickFlags(next) },
        requestId: auditRef.id,
        timestamp: new Date(nowMs).toISOString(),
      }));
    });

    // Кеш конфига на бэкенде живёт пятнадцать секунд, поэтому изменение
    // доезжает до игроков не мгновенно. Говорим об этом честно, иначе админ
    // решит, что кнопка не сработала, и нажмёт ещё раз.
    return {
      ok: true,
      status: arenaConfigStatus(next),
      propagationDelayMs: 15_000,
    };
  },
);
