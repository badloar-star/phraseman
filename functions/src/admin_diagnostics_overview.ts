import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { CRON_HEARTBEATS } from './cron_heartbeat';
import { ACCOUNT_DELETE_DIAGNOSTICS } from './account_delete';

/*
 * Панель «Диагностика» в админке — последний хвост аудита 2026-08-29.
 *
 * зачем: аудит построил три новых источника наблюдаемости (пульс кронов,
 * стадийная диагностика удалений, critical-поток клиентов + обезличенная
 * экономика), но смотреть их можно было только запросом из консоли. Коллекции
 * cron_heartbeats и account_deletion_diagnostics закрыты правилами наглухо
 * (allow read: if false) — браузеру их не отдать даже с admin-claim, поэтому
 * данные собирает эта callable через Admin SDK.
 *
 * Firebase-экономия: ОДИН вызов = вся панель (4 параллельных чтения,
 * ~60 документов). Никаких слушателей и таймеров — админка запрашивает по
 * кнопке/заходу в раздел, как и остальные её разделы.
 */

const REGION = 'us-central1';
type Row = Record<string, unknown>;

const HEARTBEATS_LIMIT = 60;
const DELETION_RUNS_LIMIT = 20;
const APP_ERRORS_LIMIT = 120;
const ECONOMY_DAYS_LIMIT = 7;

/**
 * Кроны, для которых сутки тишины — норма.
 *
 * зачем список здесь, а не в heartbeat-документе: интервал знает только
 * определение onSchedule, и дублировать его в каждом прогоне — лишняя запись.
 * Недельных кронов единицы, и их состав меняется реже, чем расписания.
 */
const WEEKLY_CRON_NAMES = new Set(['leagueFinalizeCron']);

/** Порог «крон молчит» для обычных (не недельных) расписаний. */
const SILENT_AFTER_MS = 26 * 60 * 60 * 1000;
const WEEKLY_SILENT_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

function requireDiagnosticsPermission(
  request: { auth?: { uid?: string; token?: Row } | null },
): void {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const claimedRole = request.auth.token.adminRole;
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'admin';
  const permission: AdminPermission = 'diagnostics.read';
  if (!hasPermission(role, permission)) {
    throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  }
}

function ms(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export const adminGetDiagnosticsOverview = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '256MiB' },
  async (request) => {
    requireDiagnosticsPermission(request as { auth?: { uid?: string; token?: Row } });
    const db = admin.firestore();
    const nowMs = Date.now();

    const [heartbeatsSnap, deletionsSnap, errorsSnap, economySnap] = await Promise.all([
      db.collection(CRON_HEARTBEATS).limit(HEARTBEATS_LIMIT).get(),
      db.collection(ACCOUNT_DELETE_DIAGNOSTICS)
        .orderBy('startedAtMs', 'desc').limit(DELETION_RUNS_LIMIT).get(),
      db.collection('app_errors')
        .orderBy('createdAt', 'desc').limit(APP_ERRORS_LIMIT).get(),
      db.collection('economy_daily_stats')
        .orderBy('createdAtMs', 'desc').limit(ECONOMY_DAYS_LIMIT).get(),
    ]);

    // ── Пульс кронов: сервер сам решает, кто «молчит», чтобы у эвристики
    // был один дом, а не копия в каждой админ-вкладке. ──────────────────────
    const crons = heartbeatsSnap.docs.map((doc) => {
      const data = doc.data() as Row;
      const lastRunAtMs = ms(data.lastRunAtMs);
      const silentAfter = WEEKLY_CRON_NAMES.has(doc.id) ? WEEKLY_SILENT_AFTER_MS : SILENT_AFTER_MS;
      const silent = lastRunAtMs > 0 && nowMs - lastRunAtMs > silentAfter;
      return {
        name: doc.id,
        lastRunAtMs,
        durationMs: ms(data.durationMs),
        ok: data.ok === true,
        silent,
        lastError: text(data.lastError, 300) || null,
        lastErrorAtMs: ms(data.lastErrorAtMs) || null,
        extra: (data.extra && typeof data.extra === 'object') ? data.extra : null,
      };
    }).sort((left, right) => {
      // Проблемные первыми: упавшие, затем молчащие, затем по свежести.
      const leftBad = (left.ok ? 0 : 2) + (left.silent ? 1 : 0);
      const rightBad = (right.ok ? 0 : 2) + (right.silent ? 1 : 0);
      if (leftBad !== rightBad) return rightBad - leftBad;
      return right.lastRunAtMs - left.lastRunAtMs;
    });

    const deletionRuns = deletionsSnap.docs.map((doc) => {
      const data = doc.data() as Row;
      return {
        runId: text(data.runId, 60) || doc.id,
        outcome: data.outcome === 'completed' ? 'completed' : 'failed',
        startedAtMs: ms(data.startedAtMs),
        totalMs: ms(data.totalMs),
        docsDeleted: ms(data.docsDeleted),
        queriesRun: ms(data.queriesRun),
        stages: Array.isArray(data.stages) ? data.stages.slice(0, 20) : [],
        failedStage: text(data.failedStage, 80) || null,
        failedMessage: text(data.failedMessage, 200) || null,
      };
    });

    // ── Ошибки клиентов: свод по context + свежие строки. PII не выносим —
    // uid превращаем в короткий тег, полный uid панели не нужен. ────────────
    const byContext = new Map<string, { count: number; uids: Set<string>; lastAtMs: number; lastMessage: string }>();
    const recentErrors: Row[] = [];
    for (const doc of errorsSnap.docs) {
      const data = doc.data() as Row;
      const context = text(data.context, 80) || 'unknown';
      const createdAtMs = ms(data.createdAtMs)
        || (data.createdAt && typeof (data.createdAt as { toMillis?: () => number }).toMillis === 'function'
          ? (data.createdAt as { toMillis: () => number }).toMillis()
          : 0);
      const entry = byContext.get(context) ?? { count: 0, uids: new Set<string>(), lastAtMs: 0, lastMessage: '' };
      entry.count += 1;
      const uid = text(data.uid, 60);
      if (uid) entry.uids.add(uid);
      if (createdAtMs > entry.lastAtMs) {
        entry.lastAtMs = createdAtMs;
        entry.lastMessage = text(data.message, 160);
      }
      byContext.set(context, entry);
      if (recentErrors.length < 30) {
        recentErrors.push({
          context,
          createdAtMs,
          message: text(data.message, 160),
          appVersion: text(data.appVersion, 20),
          platform: text(data.platform, 12),
          severity: text(data.severity, 12),
          uidTag: uid ? uid.slice(0, 8) : null,
        });
      }
    }
    const errorGroups = [...byContext.entries()]
      .map(([context, entry]) => ({
        context,
        count: entry.count,
        uidCount: entry.uids.size,
        lastAtMs: entry.lastAtMs,
        lastMessage: entry.lastMessage,
      }))
      .sort((left, right) => right.count - left.count);

    const economyDays = economySnap.docs.map((doc) => {
      const data = doc.data() as Row;
      return {
        day: text(data.day, 10) || doc.id,
        ops: ms(data.ops),
        grants: ms(data.grants),
        spends: ms(data.spends),
        amountGranted: ms(data.amountGranted),
        amountSpent: ms(data.amountSpent),
        invalidOps: ms(data.invalidOps),
        revisionGaps: ms(data.revisionGaps),
        balanceGaps: ms(data.balanceGaps),
      };
    });

    return {
      generatedAtMs: nowMs,
      crons,
      deletionRuns,
      errorGroups,
      recentErrors,
      economyDays,
    };
  },
);
