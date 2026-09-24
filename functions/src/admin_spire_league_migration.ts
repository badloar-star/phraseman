// ═══════════════════════════════════════════════════════════════════════════
// admin_spire_league_migration.ts — выключатель и ОТКАТ переноса мест лиги в
// шпили (PM-278). Только админка (custom claim admin + application.config.write),
// каждое действие пишет аудит в admin_log.
//
// зачем (задача PM-278, гейт MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE):
// миграция одноразовая и касается места человека в соревновании — должен быть
// способ (1) немедленно остановить её, (2) вернуть всё как было по одному
// человеку или по всем. Сама миграция лигу не трогает, поэтому «вернуть в
// старую лигу» = снять шпили: leagueId и комнаты лиги остались нетронутыми.
//
// Откат по умолчанию — dryRun: сначала показать, что изменится, потом делать.
// Массовый откат разрешён только на паузе, иначе следующий вход человека в
// Шпиль тут же перенёс бы место заново.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { requireAdminLeagueActor } from './admin_league_controls';
import { ADMIN_SENSITIVE_WRITE_OPTIONS } from './callable_options';
import {
  SPIRE_LEAGUE_MIGRATION_BACKUP_COLLECTION,
  SPIRE_LEAGUE_MIGRATION_SWITCH_DOC,
  buildRollbackPlan,
  spireMigrationModeFrom,
  type SpireRollbackPlan,
} from './spire_league_migration_contract';

type Row = Record<string, unknown>;
const LOG = '[SPIRE-MIGRATION-ADMIN]';
const UID_RE = /^[A-Za-z0-9._:-]{2,180}$/;
const BULK_PAGE_MAX = 200;

function reasonFrom(data: Row): string {
  const reason = String(data.reason ?? '').trim().slice(0, 400);
  if (!reason) throw new HttpsError('invalid-argument', 'reason_required');
  return reason;
}

function switchRef(db: admin.firestore.Firestore): admin.firestore.DocumentReference {
  return db.collection('config').doc(SPIRE_LEAGUE_MIGRATION_SWITCH_DOC); // guard-ok: один документ по id
}

/** Пауза / включение переноса. Нет документа = 'on' (см. spireMigrationModeFrom). */
export const adminSpireLeagueMigrationSetMode = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  const { actorUid, role } = requireAdminLeagueActor(request);
  const data = (request.data ?? {}) as Row;
  const mode = data.mode === 'paused' ? 'paused' : data.mode === 'on' ? 'on' : null;
  if (!mode) throw new HttpsError('invalid-argument', 'mode_must_be_on_or_paused');
  const reason = reasonFrom(data);
  const db = admin.firestore();
  const auditRef = db.collection('admin_log').doc(); // guard-ok: .doc() без id — новый документ
  const nowMs = Date.now();
  const before = await db.runTransaction(async (tx) => {
    const snap = await tx.get(switchRef(db));
    const prev = spireMigrationModeFrom(snap.data());
    tx.set(switchRef(db), { mode, updatedAtMs: nowMs, updatedByUid: actorUid, reason });
    tx.set(auditRef, createAuditRecord({
      action: 'spire.league_migration.mode',
      actorUid,
      role,
      entity: { collection: 'config', id: SPIRE_LEAGUE_MIGRATION_SWITCH_DOC },
      reason,
      before: { mode: prev },
      after: { mode },
      requestId: auditRef.id,
      timestamp: new Date(nowMs).toISOString(),
    }));
    return prev;
  });
  console.log(LOG, JSON.stringify({ event: 'mode_set', before, after: mode }));
  return { ok: true, before, mode };
});

type RollbackOne =
  | Readonly<{ uid: string; status: 'not_found' | 'already_rolled_back' }>
  | Readonly<{ uid: string; status: 'planned' | 'rolled_back'; plan: SpireRollbackPlan }>;

async function rollbackOne(
  db: admin.firestore.Firestore,
  uid: string,
  opts: Readonly<{ dryRun: boolean; actorUid: string; role: unknown; reason: string; nowMs: number }>,
): Promise<RollbackOne> {
  const backupRef = db.collection(SPIRE_LEAGUE_MIGRATION_BACKUP_COLLECTION).doc(uid); // guard-ok: один документ по id
  const lbRef = db.collection('leaderboard').doc(uid); // guard-ok: один документ по id
  return db.runTransaction(async (tx): Promise<RollbackOne> => {
    const [backupSnap, lbSnap] = await Promise.all([tx.get(backupRef), tx.get(lbRef)]);
    const backup = backupSnap.data();
    if (!backupSnap.exists || !backup) {
      console.warn(LOG, JSON.stringify({ event: 'rollback_skip', reason: 'not_found', uid }));
      return { uid, status: 'not_found' };
    }
    if (backup.rolledBackAtMs != null) {
      console.log(LOG, JSON.stringify({ event: 'rollback_skip', reason: 'already_rolled_back', uid }));
      return { uid, status: 'already_rolled_back' };
    }
    const plan = buildRollbackPlan(backup, lbSnap.data());
    if (!plan) {
      console.error(LOG, JSON.stringify({ event: 'rollback_skip', reason: 'bad_backup_schema', uid, schema: backup.schema ?? null }));
      return { uid, status: 'not_found' };
    }
    if (opts.dryRun) {
      console.log(LOG, JSON.stringify({ event: 'rollback_planned', uid, plan }));
      return { uid, status: 'planned', plan };
    }
    if (lbSnap.exists) {
      // update, а не set(merge): карту spireTiers надо ЗАМЕНИТЬ целиком
      // (merge оставил бы языки, добавленные миграцией).
      tx.update(lbRef, { // guard-ok: внутри runTransaction, копия «как было» остаётся в spire_league_migration
        spireTiers: plan.deleteSpireTiers ? admin.firestore.FieldValue.delete() : plan.spireTiers,
        spireMigration: admin.firestore.FieldValue.delete(),
      });
    } else {
      console.warn(LOG, JSON.stringify({ event: 'rollback_no_leaderboard', uid }));
    }
    // Копию не удаляем — только помечаем: по ней видно, что было и кто откатил.
    tx.update(backupRef, {
      rolledBackAtMs: opts.nowMs,
      rolledBackByUid: opts.actorUid,
      rollbackReason: opts.reason,
      rollbackPlan: plan,
    });
    const auditRef = db.collection('admin_log').doc(); // guard-ok: .doc() без id — новый документ
    tx.set(auditRef, createAuditRecord({
      action: 'spire.league_migration.rollback',
      actorUid: opts.actorUid,
      role: opts.role,
      entity: { collection: SPIRE_LEAGUE_MIGRATION_BACKUP_COLLECTION, id: uid },
      reason: opts.reason,
      before: { tiersAfterMigration: backup.tiersAfter ?? null },
      after: { spireTiers: plan.deleteSpireTiers ? null : plan.spireTiers, changedSinceMigration: plan.changedSinceMigration },
      rollbackReference: uid,
      requestId: auditRef.id,
      timestamp: new Date(opts.nowMs).toISOString(),
    }));
    console.log(LOG, JSON.stringify({ event: 'rolled_back', uid, plan }));
    return { uid, status: 'rolled_back', plan };
  });
}

/**
 * Откат переноса.
 *   { uid, dryRun?, reason }               — один человек (можно при mode='on':
 *                                            при следующем входе перенос пройдёт
 *                                            заново — так чинится неверный язык);
 *   { all: true, dryRun?, limit?, reason } — страница из ≤200 ещё не откаченных;
 *                                            только при mode='paused'. Звать,
 *                                            пока hasMore=true.
 * dryRun по умолчанию true — запись только при явном dryRun:false.
 */
export const adminSpireLeagueMigrationRollback = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  const { actorUid, role } = requireAdminLeagueActor(request);
  const data = (request.data ?? {}) as Row;
  const reason = reasonFrom(data);
  const dryRun = data.dryRun !== false;
  const db = admin.firestore();
  const nowMs = Date.now();
  const opts = { dryRun, actorUid, role, reason, nowMs };
  console.log(LOG, JSON.stringify({ event: 'rollback_enter', all: data.all === true, dryRun, uid: data.uid ?? null }));

  if (data.all !== true) {
    const uid = String(data.uid ?? '').trim();
    if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', 'uid_required');
    const result = await rollbackOne(db, uid, opts);
    return { ok: true, dryRun, results: [result], failed: 0, hasMore: false };
  }

  const mode = spireMigrationModeFrom((await switchRef(db).get()).data());
  if (mode !== 'paused') {
    console.warn(LOG, JSON.stringify({ event: 'rollback_reject', reason: 'pause_first', mode }));
    throw new HttpsError('failed-precondition', 'pause_migration_first');
  }
  const limit = Math.max(1, Math.min(BULK_PAGE_MAX, Math.trunc(Number(data.limit)) || BULK_PAGE_MAX));
  // Только ещё не откаченные: при dryRun та же страница вернётся снова — это
  // и нужно, чтобы посмотреть и потом выполнить её же.
  const page = await db.collection(SPIRE_LEAGUE_MIGRATION_BACKUP_COLLECTION)
    .where('rolledBackAtMs', '==', null)
    .limit(limit)
    .get();
  const results: RollbackOne[] = [];
  for (const doc of page.docs) {
    // По одному в своей транзакции: сбой одного не отменяет остальных.
    try {
      results.push(await rollbackOne(db, doc.id, opts));
    } catch (error) {
      console.error(LOG, JSON.stringify({ event: 'rollback_failed', uid: doc.id, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  const failed = page.size - results.length;
  console.log(LOG, JSON.stringify({ event: 'rollback_page_done', dryRun, scanned: page.size, done: results.length, failed }));
  return { ok: true, dryRun, results, failed, hasMore: !dryRun && page.size === limit };
});
