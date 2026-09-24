import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import {
  SPIRE_TASK_FLAGS_COLLECTION,
  isSpireFlaggableStudyTarget,
  parseSpireTaskFlagsDoc,
  spireFlaggedTaskIds,
  spireTaskFlagAdd,
  spireTaskFlagRemove,
  spireTaskFlagsDocId,
} from './spire_task_flag_contract';

/** Языки, для которых T41 разрешил публикацию без проверки носителем (en остаётся в Арене). */
type SpireFlaggableLang = 'es' | 'de' | 'fr';

/**
 * Быстрое снятие задания Шпиля из админки (PM-287-A2, T41).
 *
 * зачем: владелец принял риск публикации es/de/fr без проверки носителем
 * (T41, D55) — значит ошибки в заданиях увидят игроки первыми. Оператор
 * должен уметь снять конкретное задание за один вызов, без отката всего
 * пула и без релиза. Тот же принцип защиты, что у admin_spire_config.ts и
 * admin_arena_publication.ts: App Check ЗАПЛОМБИРОВАН навсегда
 * (ENFORCE_APP_CHECK_ADMIN=false, callable_options.ts) — защита держится на
 * custom claim admin:true + permission application.config.write.
 *
 * PM-272 (сборщик недельного пакета) должен читать `spireFlaggedTaskIds()`
 * при сборке и исключать эти id — эта функция только пишет документ,
 * сборка пакета вне объёма PM-287 (см. docs/work/tasks/
 * 2026-09-24_pm287_spire_task_flag.md, PM-272 всё ещё "planned").
 */

type Row = Record<string, unknown>;

function requireSpireTaskFlagWriter(request: { auth?: { uid?: string; token?: Row } | null }): {
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

function requireLang(data: Row): SpireFlaggableLang {
  const lang = data.lang;
  if (!isSpireFlaggableStudyTarget(lang)) throw new HttpsError('invalid-argument', 'spire_task_flag_lang_invalid');
  return lang;
}

function flagsRef(lang: SpireFlaggableLang): admin.firestore.DocumentReference {
  return admin.firestore().collection(SPIRE_TASK_FLAGS_COLLECTION).doc(spireTaskFlagsDocId(lang));
}

/** Список текущих флагов языка — для экрана админки (карточки «снятые задания»). */
export const adminSpireTaskFlagList = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    requireSpireTaskFlagWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const lang = requireLang(data);
    const snap = await flagsRef(lang).get();
    const doc = parseSpireTaskFlagsDoc(snap.exists ? snap.data() : null, lang);
    return { ok: true, lang, flaggedTaskIds: spireFlaggedTaskIds(doc), flagged: doc.flagged };
  },
);

export const adminSpireTaskFlagAdd = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireSpireTaskFlagWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const lang = requireLang(data);
    const taskId = String(data.taskId ?? '').trim();
    const reason = String(data.reason ?? '').trim();
    if (!taskId) throw new HttpsError('invalid-argument', 'spire_task_flag_task_id_required');
    if (!reason) throw new HttpsError('invalid-argument', 'spire_task_flag_reason_required');

    const db = admin.firestore();
    const ref = flagsRef(lang);
    const auditRef = db.collection('admin_log').doc(); // guard-ok: .doc() без id — новый документ, не листинг коллекции
    const nowMs = Date.now();
    try {
      const result = await db.runTransaction(async (tx) => {
        const before = await tx.get(ref);
        const beforeDoc = parseSpireTaskFlagsDoc(before.exists ? before.data() : null, lang);
        const nextDoc = spireTaskFlagAdd(beforeDoc, {
          taskId, reason, flaggedAtMs: nowMs, flaggedByUid: actor.actorUid,
        });
        tx.set(ref, nextDoc);
        tx.set(auditRef, createAuditRecord({
          action: 'spire_task_flag_add',
          actorUid: actor.actorUid,
          role: actor.role,
          entity: { collection: SPIRE_TASK_FLAGS_COLLECTION, id: spireTaskFlagsDocId(lang) },
          reason,
          before: { flaggedCount: spireFlaggedTaskIds(beforeDoc).length },
          after: { flaggedCount: spireFlaggedTaskIds(nextDoc).length, taskId },
          requestId: auditRef.id,
          timestamp: new Date(nowMs).toISOString(),
        }));
        return nextDoc;
      });
      return { ok: true, lang, flaggedTaskIds: spireFlaggedTaskIds(result) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'spire_task_flag_add_failed';
      throw new HttpsError('failed-precondition', message);
    }
  },
);

export const adminSpireTaskFlagRemove = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireSpireTaskFlagWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const lang = requireLang(data);
    const taskId = String(data.taskId ?? '').trim();
    const reason = String(data.reason ?? '').trim().slice(0, 400) || 'unflag';
    if (!taskId) throw new HttpsError('invalid-argument', 'spire_task_flag_task_id_required');

    const db = admin.firestore();
    const ref = flagsRef(lang);
    const auditRef = db.collection('admin_log').doc(); // guard-ok: .doc() без id — новый документ, не листинг коллекции
    const nowMs = Date.now();
    const result = await db.runTransaction(async (tx) => {
      const before = await tx.get(ref);
      const beforeDoc = parseSpireTaskFlagsDoc(before.exists ? before.data() : null, lang);
      const nextDoc = spireTaskFlagRemove(beforeDoc, taskId);
      if (nextDoc !== beforeDoc) {
        tx.set(ref, nextDoc);
        tx.set(auditRef, createAuditRecord({
          action: 'spire_task_flag_remove',
          actorUid: actor.actorUid,
          role: actor.role,
          entity: { collection: SPIRE_TASK_FLAGS_COLLECTION, id: spireTaskFlagsDocId(lang) },
          reason,
          before: { flaggedCount: spireFlaggedTaskIds(beforeDoc).length, taskId },
          after: { flaggedCount: spireFlaggedTaskIds(nextDoc).length },
          requestId: auditRef.id,
          timestamp: new Date(nowMs).toISOString(),
        }));
      }
      return nextDoc;
    });
    return { ok: true, lang, flaggedTaskIds: spireFlaggedTaskIds(result) };
  },
);
