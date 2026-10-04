import type { Firestore } from 'firebase-admin/firestore';
import {
  accountAuthorityLogInfo,
  accountAuthorityLogWarn,
  accountAuthorityServerElapsedMs,
  accountAuthorityServerErrorCode,
  accountAuthorityServerErrorKind,
} from './account_authority_log';
import {
  clearAccountDeleteWorkFailures,
  listDueAccountDeleteExpirySweeps,
  listDueAccountDeletePendingWork,
  recordAccountDeleteWorkFailure,
  type AccountDeletePendingWork,
} from './account_delete_store';
import {
  runBoundedDeletePurge,
  runIdentityReleaseAttempt,
  sweepExpiredAccountDeleteJob,
  type AccountDeleteAttemptResult,
} from './delete_contract';
import {
  createFirebaseAccountDeleteWorkerPorts,
  type FirebaseAccountDeleteWorkerPorts,
  type FirebaseLeasePortsOverrides,
} from './firebase_lease_callable';

/*
 * Account Authority 2.0, этап S4a, пункт 2: фоновый обработчик удаления.
 *
 * Что делает один проход:
 *   1) задачи, ждущие шага (`pendingWorkAtMs <= now`):
 *      - `identity_release_pending` → повтор освобождения учётки Auth
 *        (`runIdentityReleaseAttempt`; сырой uid — только из задачи, S3);
 *        после успеха сразу продолжает purge этой же задачи;
 *      - `purge_queued` → ограниченные проходы purge (`runBoundedDeletePurge`);
 *   2) просроченные квитанции (`expirySweepAtMs <= now`) → `sweepExpiredAccountDeleteJob`.
 *
 * зачем так (Firebase-экономия): каждый список — ОДИН запрос where + limit
 * по одному числовому полю (автоматический индекс), без выкачивания коллекций;
 * проходов purge на задачу и задач на проход — потолки ниже; каждый проход
 * purge сам ограничен 450 удалениями одной пачкой (контракт S3).
 *
 * Ограничения раскатки: функция НЕ экспортируется из functions/src/index.ts и
 * не имеет расписания. Подключение планировщика — S10, только по команде
 * координатора вместе с rollout (rolloutEnabled остаётся false везде).
 */

export const ACCOUNT_DELETE_WORKER_MAX_JOBS_PER_RUN = 20;
export const ACCOUNT_DELETE_WORKER_MAX_PURGE_PASSES_PER_JOB = 4;
export const ACCOUNT_DELETE_WORKER_MAX_SWEEPS_PER_RUN = 50;

export type AccountDeleteWorkerSummary = Readonly<{
  pendingListed: number;
  identityReleased: number;
  identityRetryScheduled: number;
  purgePasses: number;
  purged: number;
  busy: number;
  failed: number;
  /** S4a раунд 2: задач, отодвинутых паузой после сбоя. */
  backedOff: number;
  /** S4a раунд 2: задач, снятых с очереди («требует внимания»). */
  quarantined: number;
  /** S4a раунд 3: сбой не записан — задача уже ушла вперёд (M-A1). */
  staleFailures: number;
  expiredListed: number;
  expired: number;
}>;

type MutableSummary = { -readonly [K in keyof AccountDeleteWorkerSummary]: number };

export type AccountDeleteWorkerDependencies = Readonly<{
  db: Firestore;
  nowMs?: () => number;
  /** Подмена портов — тесты; по умолчанию порты адаптера (Firestore + Auth). */
  ports?: FirebaseAccountDeleteWorkerPorts;
  overrides?: FirebaseLeasePortsOverrides;
  maxJobs?: number;
  maxPurgePassesPerJob?: number;
  maxSweeps?: number;
}>;

function boundedCount(value: number | undefined, fallback: number, ceiling: number): number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 1) return fallback;
  return Math.min(value, ceiling);
}

/** Проходы purge одной задачи до `purged`/терминала/занятости — не больше потолка. */
async function runPurgePasses(
  ports: FirebaseAccountDeleteWorkerPorts,
  work: Pick<AccountDeletePendingWork, 'accountId' | 'tenantId' | 'jobId'>,
  maxPasses: number,
  summary: MutableSummary,
): Promise<void> {
  for (let pass = 1; pass <= maxPasses; pass += 1) {
    const result: AccountDeleteAttemptResult = await runBoundedDeletePurge(ports, ports.purge, work);
    summary.purgePasses += 1;
    accountAuthorityLogInfo('[AA-S4] delete_worker purge_pass', {
      stage: 'delete_worker', pass, type: result.type, status: result.job.status,
    });
    if (result.job.status === 'purged') {
      summary.purged += 1;
      return;
    }
    if (result.type === 'busy') {
      summary.busy += 1;
      accountAuthorityLogInfo('[AA-S4] delete_worker purge_stop', { stage: 'delete_worker', reason: 'busy' });
      return;
    }
    if (result.type !== 'progressed') {
      accountAuthorityLogInfo('[AA-S4] delete_worker purge_stop', { stage: 'delete_worker', reason: result.type });
      return;
    }
  }
  accountAuthorityLogInfo('[AA-S4] delete_worker purge_stop', { stage: 'delete_worker', reason: 'pass_budget' });
}

async function runPendingWork(
  ports: FirebaseAccountDeleteWorkerPorts,
  work: AccountDeletePendingWork,
  maxPurgePasses: number,
  summary: MutableSummary,
): Promise<void> {
  const request = { accountId: work.accountId, tenantId: work.tenantId, jobId: work.jobId };
  accountAuthorityLogInfo('[AA-S4] delete_worker job_start', { stage: 'delete_worker', status: work.status });
  if (work.status === 'identity_release_pending') {
    const released = await runIdentityReleaseAttempt(ports, request);
    accountAuthorityLogInfo('[AA-S4] delete_worker identity_attempt', {
      stage: 'delete_worker', type: released.type, status: released.job.status,
    });
    if (released.type === 'busy') {
      summary.busy += 1;
      return;
    }
    if (released.type === 'retry_scheduled') {
      summary.identityRetryScheduled += 1;
      return;
    }
    if (released.job.status !== 'purge_queued') {
      // Терминал (identity_release_failed/expired) или уже дальше — шаг не нужен.
      accountAuthorityLogInfo('[AA-S4] delete_worker job_stop', { stage: 'delete_worker', reason: released.job.status });
      return;
    }
    summary.identityReleased += 1;
  }
  await runPurgePasses(ports, request, maxPurgePasses, summary);
}

async function recordWorkFailure(
  db: Firestore,
  work: AccountDeletePendingWork,
  nowMs: number,
  code: string,
  summary: MutableSummary,
): Promise<void> {
  try {
    // S4a раунд 3 (M-A1): запись сбоя сверяет то, что видела выборка.
    const recorded = await recordAccountDeleteWorkFailure(db, work.accountId, {
      jobId: work.jobId, status: work.status, pendingWorkAtMs: work.observedPendingWorkAtMs,
    }, nowMs, code);
    if (recorded.outcome === 'quarantined') summary.quarantined += 1;
    else if (recorded.outcome === 'backoff') summary.backedOff += 1;
    else summary.staleFailures += 1;
  } catch (error) {
    // Служебная запись не прошла — задача останется должной; следующий проход повторит.
    accountAuthorityLogWarn('[AA-S4] delete_worker failure_record_failed', {
      stage: 'delete_worker', causeCode: accountAuthorityServerErrorCode(error),
    });
  }
}

/**
 * Один проход фонового обработчика. Сбой одной задачи не останавливает
 * остальные (лог с кодом); контракт повторит её на следующем проходе.
 */
export async function runAccountDeleteWorkerPass(
  dependencies: AccountDeleteWorkerDependencies,
): Promise<AccountDeleteWorkerSummary> {
  const startedAt = Date.now();
  const nowMs = dependencies.nowMs ?? (() => Date.now());
  const maxJobs = boundedCount(dependencies.maxJobs, ACCOUNT_DELETE_WORKER_MAX_JOBS_PER_RUN, 100);
  const maxPurgePasses = boundedCount(
    dependencies.maxPurgePassesPerJob, ACCOUNT_DELETE_WORKER_MAX_PURGE_PASSES_PER_JOB, 16,
  );
  const maxSweeps = boundedCount(dependencies.maxSweeps, ACCOUNT_DELETE_WORKER_MAX_SWEEPS_PER_RUN, 100);
  const ports = dependencies.ports ?? createFirebaseAccountDeleteWorkerPorts(dependencies.db, dependencies.overrides);
  accountAuthorityLogInfo('[AA-S4] delete_worker start', {
    stage: 'delete_worker', maxJobs, maxPurgePasses, maxSweeps, reason: dependencies.ports === undefined ? 'adapter' : 'override',
  });
  const summary: MutableSummary = {
    pendingListed: 0, identityReleased: 0, identityRetryScheduled: 0, purgePasses: 0, purged: 0,
    busy: 0, failed: 0, backedOff: 0, quarantined: 0, staleFailures: 0, expiredListed: 0, expired: 0,
  };

  const pending = await listDueAccountDeletePendingWork(dependencies.db, nowMs(), maxJobs);
  summary.pendingListed = pending.length;
  for (const work of pending) {
    try {
      await runPendingWork(ports, work, maxPurgePasses, summary);
    } catch (error) {
      summary.failed += 1;
      accountAuthorityLogWarn('[AA-S4] delete_worker job_failed', {
        stage: 'delete_worker',
        status: work.status,
        failures: work.workFailures,
        causeKind: accountAuthorityServerErrorKind(error),
        causeCode: accountAuthorityServerErrorCode(error),
      });
      // зачем (S4a раунд 2, M-S4a-1): задача, падающая ДО записи контракта,
      // иначе выбиралась бы первой каждый проход и закрыла бы очередь.
      await recordWorkFailure(dependencies.db, work, nowMs(), accountAuthorityServerErrorCode(error), summary);
      continue;
    }
    if (work.workFailures > 0) {
      try {
        await clearAccountDeleteWorkFailures(dependencies.db, work.accountId);
      } catch (error) {
        accountAuthorityLogWarn('[AA-S4] delete_worker failures_clear_failed', {
          stage: 'delete_worker', causeCode: accountAuthorityServerErrorCode(error),
        });
      }
    }
  }

  const expiredDue = await listDueAccountDeleteExpirySweeps(dependencies.db, nowMs(), maxSweeps);
  summary.expiredListed = expiredDue.length;
  for (const due of expiredDue) {
    try {
      const job = await sweepExpiredAccountDeleteJob(ports, due);
      if (job.status === 'expired') summary.expired += 1;
      accountAuthorityLogInfo('[AA-S4] delete_worker sweep', { stage: 'delete_worker', status: job.status });
    } catch (error) {
      summary.failed += 1;
      accountAuthorityLogWarn('[AA-S4] delete_worker sweep_failed', {
        stage: 'delete_worker',
        causeKind: accountAuthorityServerErrorKind(error),
        causeCode: accountAuthorityServerErrorCode(error),
      });
    }
  }
  const frozen = Object.freeze({ ...summary });
  accountAuthorityLogInfo('[AA-S4] delete_worker done', {
    stage: 'delete_worker',
    pendingListed: frozen.pendingListed,
    identityReleased: frozen.identityReleased,
    identityRetryScheduled: frozen.identityRetryScheduled,
    purgePasses: frozen.purgePasses,
    purged: frozen.purged,
    busy: frozen.busy,
    failed: frozen.failed,
    backedOff: frozen.backedOff,
    quarantined: frozen.quarantined,
    staleFailures: frozen.staleFailures,
    expired: frozen.expired,
    durationMs: accountAuthorityServerElapsedMs(startedAt),
  });
  return frozen;
}
