/**
 * Контракт серверной части раздела «Турниры» в админке.
 *
 * зачем: эти callable пишут в боевой пул и включают режим для живых игроков.
 * Проверяем разбор входа (никакого доверия клиенту), гейт «нельзя включить
 * слоты при пустом пуле» и расчёт готовности раундов — ошибка здесь означает
 * комнаты, которые создаются и тут же отменяются, списывая билеты.
 */

import * as tournamentAdmin from './admin_tournament_tasks';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  isCompleteTournamentV11BundleForJob,
  isCompleteTournamentV11BundleRoot,
  tournamentV11BundlePublicationStatus,
} from './tournament_pool_v11_bundle';
import { createOnlyPublicationPlanSha256 } from './tournament_bundle_publication';

import {
  parseAiGenerateRequest,
  parseCuratedSetRequest,
  parseEditRequest,
  parseListRequest,
  parseMutateRequest,
  parseScheduleRequest,
  publicAdminTask,
  runTextGeneration,
  aiLifecycleAfterTournamentTaskEdit,
  canPublishTournamentTask,
  humanApprovalAfterTournamentTaskPublish,
  ROUND_DIFFICULTIES,
  ROUND_TASK_TARGET,
  TOURNAMENT_POOL_V11_VERSION,
  isHistoricalTournamentSemanticApproval,
  historicalTournamentSemanticApprovalSignature,
  parseAdminFillTournamentPoolRequest,
  publicationContinuationForStatus,
  semanticJobLeaseAuthorizesAttempt,
  semanticProviderAttemptIdFromError,
  runAdminFillTournamentPoolV11,
  type AdminTournamentV11Dependencies,
} from './admin_tournament_tasks';
import type { TournamentTask } from './tournament_core';

function expectRejected(run: () => unknown): void {
  expect(run).toThrow();
}

describe('старый текстовый генератор', () => {
  it('старый текстовый ИИ-генератор закрыт до трат и записей', async () => {
    await expect(runTextGeneration({
      level: 'A2', batches: 1, topicHint: '', dryRun: false, actor: 'test',
    })).rejects.toThrow('tournament_text_modes_retired');
  });

});

describe('adminFillTournamentPool v11 router', () => {
  const batch = {
    jobId: `tsj_${'a'.repeat(64)}`,
    poolVersion: 'tpool_20260808_v11',
    state: 'running' as const,
    revision: 2,
    cursor: 1,
    totalCandidates: 12,
    processed: 1,
    approved: 1,
    rejected: 0,
    quarantined: 0,
    cacheHits: 0,
    providerAttempts: 2,
    transientRetries: 0,
    continuation: true,
    shortage: false,
  };

  function dependencies(): AdminTournamentV11Dependencies & {
    calls: string[];
  } {
    const calls: string[] = [];
    return {
      calls,
      async dryRun(input) {
        calls.push(`dry:${input.poolVersion}`);
        return {
          poolVersion: input.poolVersion,
          sourceCandidates: 20,
          hardGateRejections: 1,
          duplicateRejections: 2,
          historicalExclusions: 3,
          eligibleCandidates: 14,
          cachePasses: 4,
          cacheRejects: 1,
          projectedPrimaryRequests: 9,
          projectedAdversarialRequests: 9,
          transientRetryUpperBound: 36,
          diversityFeasible: false,
          diversityShortages: ['fill_gap:1'],
          cells: { 'fill_gap:1': { available: 14, required: 160 } },
        };
      },
      async runBatch(input) {
        calls.push(`run:${input.poolVersion}:${input.jobId ?? 'new'}:${input.maxCandidates}`);
        return { ...batch, jobId: input.jobId ?? batch.jobId };
      },
      async status(input) {
        calls.push(`status:${input.poolVersion}:${input.jobId}`);
        return {
          ...batch,
          jobId: input.jobId,
          cells: { 'guess_phrase:1': { processed: 1, approved: 1 } },
          shortages: [],
        };
      },
    };
  }

  it('maps legacy dryRun:true to a zero-write v11 feasibility response', async () => {
    const deps = dependencies();
    const retiredGenerator = jest.spyOn(tournamentAdmin, 'runTextGeneration');
    const result = await runAdminFillTournamentPoolV11({ dryRun: true }, deps);

    expect(deps.calls).toEqual([`dry:${TOURNAMENT_POOL_V11_VERSION}`]);
    expect(retiredGenerator).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      action: 'dry_run',
      poolVersion: TOURNAMENT_POOL_V11_VERSION,
      jobId: null,
      state: 'blocked',
      continuation: false,
      paused: false,
      blocked: true,
      shortage: true,
      cursor: 0,
      totalCandidates: 20,
      approved: 0,
      rejected: 0,
      quarantined: 0,
      cacheHits: 0,
      providerAttempts: 0,
      transientRetries: 0,
      cells: { 'fill_gap:1': { available: 14, required: 160 } },
      shortages: ['fill_gap:1'],
      modes: ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'],
    }));
    retiredGenerator.mockRestore();
  });

  it('never reports a feasible dry-run or an incomplete publication as ready', async () => {
    const deps = dependencies();
    deps.dryRun = async (input) => ({
      poolVersion: input.poolVersion,
      sourceCandidates: 4_000, hardGateRejections: 0, duplicateRejections: 0,
      historicalExclusions: 0, eligibleCandidates: 4_000, cachePasses: 4_000,
      cacheRejects: 0, projectedPrimaryRequests: 0, projectedAdversarialRequests: 0,
      transientRetryUpperBound: 0, diversityFeasible: true, diversityShortages: [], cells: {},
    });
    await expect(runAdminFillTournamentPoolV11({ dryRun: true }, deps)).resolves.toMatchObject({
      action: 'dry_run', state: 'preflight', continuation: false, blocked: false,
    });
    deps.runBatch = async () => ({ ...batch, state: 'ready', continuation: true });
    await expect(runAdminFillTournamentPoolV11({ action: 'run_batch' }, deps)).resolves.toMatchObject({
      action: 'run_batch', state: 'running', continuation: true,
    });
  });

  it('maps a real legacy click to one bounded resumable v11 batch', async () => {
    const deps = dependencies();
    const first = await runAdminFillTournamentPoolV11({ level: 'A2', maxTasks: 30 }, deps);
    const resumed = await runAdminFillTournamentPoolV11({
      action: 'run_batch', jobId: batch.jobId, maxCandidates: 6,
    }, deps);

    expect(deps.calls).toEqual([
      `run:${TOURNAMENT_POOL_V11_VERSION}:new:4`,
      `run:${TOURNAMENT_POOL_V11_VERSION}:${batch.jobId}:6`,
    ]);
    expect(first).toEqual(expect.objectContaining({
      action: 'run_batch', jobId: batch.jobId, state: 'running', continuation: true,
      paused: false, blocked: false, cursor: 1, totalCandidates: 12,
    }));
    expect(resumed.jobId).toBe(batch.jobId);
  });

  it('returns persisted progress through status without starting a batch', async () => {
    const deps = dependencies();
    const result = await runAdminFillTournamentPoolV11({ action: 'status', jobId: batch.jobId }, deps);

    expect(deps.calls).toEqual([`status:${TOURNAMENT_POOL_V11_VERSION}:${batch.jobId}`]);
    expect(result).toEqual(expect.objectContaining({
      action: 'status', jobId: batch.jobId, state: 'running', continuation: true,
      cells: { 'guess_phrase:1': { processed: 1, approved: 1 } }, shortages: [],
    }));
  });

  it('fails closed on invalid actions, identities, versions, batch sizes and extra keys', () => {
    expectRejected(() => parseAdminFillTournamentPoolRequest({ action: 'delete' }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ action: 'status' }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ action: 'status', jobId: 'job-1' }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ poolVersion: 'tpool_other_v11' }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ maxCandidates: 0 }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ maxCandidates: 7 }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ maxCandidates: 1.5 }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ dryRun: true, action: 'run_batch' }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ dryRun: 'true' }));
    expectRejected(() => parseAdminFillTournamentPoolRequest({ extra: true }));
  });

  it('preserves the exported callable permission/App Check boundary and never routes through legacy text generation', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_tournament_tasks.ts'), 'utf8');
    const start = source.indexOf('export const adminFillTournamentPool = onCall(');
    const end = source.indexOf('// ── Проценты распределения типов по раундам', start);
    const callable = source.slice(start, end);
    const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(callable).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(callable).toContain("requirePermission(request, 'content.draft.write');");
    expect(callable).toContain('runAdminFillTournamentPoolV11(');
    expect(callable).not.toContain('runTextGeneration(');
    expect(indexSource).toContain('adminFillTournamentPool,');
  });

  it('keeps current-job approvals resumable and reports unfinished bundle publication', () => {
    const contract = {
      reviewContractVersion: 'review-v1',
      promptSetSha256: 'a'.repeat(64),
      primaryModel: 'primary-model',
      adversarialModel: 'adversarial-model',
    };
    const receipt = { decision: 'PASS', generationJobId: batch.jobId, ...contract };

    expect(isHistoricalTournamentSemanticApproval(receipt, contract, batch.jobId)).toBe(false);
    expect(isHistoricalTournamentSemanticApproval(receipt, contract, undefined)).toBe(true);
    expect(publicationContinuationForStatus('ready', false, undefined)).toBe(true);
    expect(publicationContinuationForStatus('ready', false, 'verifying')).toBe(true);
    expect(publicationContinuationForStatus('ready', true, 'ready')).toBe(false);
    expect(publicationContinuationForStatus('running', false, undefined)).toBe(true);
    expect(historicalTournamentSemanticApprovalSignature({
      ...receipt,
      semanticSignature: 'b'.repeat(64),
      contentSha256: 'c'.repeat(64),
    }, contract, undefined)).toBe('b'.repeat(64));
    expect(historicalTournamentSemanticApprovalSignature({
      ...receipt,
      semanticSignature: 'not-a-hash',
    }, contract, undefined)).toBeNull();
  });

  it('reports ready only for an exact canonically pinned runtime-audit root', () => {
    const canonical = (value: unknown): string => {
      if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
      if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
      if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined).sort(([left], [right]) => left.localeCompare(right));
      return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
    };
    const hash = (value: unknown) => createHash('sha256').update(canonical(value), 'utf8').digest('hex');
    const pin = 'a'.repeat(64);
    const auditBody = {
      kind: 'tournament_pool_v11_runtime_audit_v1', poolVersion: 'tpool_20260808_v11',
      days: 730, roomSeries: 2, roomsSimulated: 1_460, tasksPerRoom: 16, taskCount: 4_000,
      bucketCount: 102, maxAdjacentTaskOverlap: 0, maxAdjacentProvenanceOverlap: 0,
      provenanceCollisions: 0, fullTaskCoverage: true, fullBucketCoverage: true,
      speedBoardsChecked: 1, speedBoardsWithSixProvenance: 1,
      taskIdsSha256: pin, bucketIdsSha256: pin, manifestSha256: pin, bundleSha256: pin,
      receiptLedgerSha256: pin, exposureLayoutHash: pin,
    } as const;
    const root = {
      kind: 'tournament_pool_v11_bundle_v1', poolVersion: 'tpool_20260808_v11', taskCount: 4_000,
      jobId: `tsj_${'b'.repeat(64)}`, queueSha256: 'c'.repeat(64),
      reviewContractVersion: 'tournament-semantic-review-v2', promptSetSha256: 'd'.repeat(64),
      primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
      publicationPlanSha256: 'e'.repeat(64), publicationEntriesSha256: '1'.repeat(64),
      exposureBucketCounts: { guess_phrase: 38, fill_gap: 13, find_oddity: 8, translate_build: 38, speed_match: 5 },
      exposureLayoutHash: pin, manifestSha256: pin, bundleSha256: pin, receiptLedgerSha256: pin,
      runtimeAudit: { ...auditBody, auditSha256: hash(auditBody) },
    };
    expect(isCompleteTournamentV11BundleRoot(root)).toBe(true);
    expect(isCompleteTournamentV11BundleRoot({
      ...root, runtimeAudit: { ...root.runtimeAudit, auditSha256: 'b'.repeat(64) },
    })).toBe(false);
    expect(isCompleteTournamentV11BundleRoot({ ...root, unexpected: true })).toBe(false);
    const checkpointBinding = {
        jobId: root.jobId, queueSha256: root.queueSha256,
        reviewContractVersion: root.reviewContractVersion, promptSetSha256: root.promptSetSha256,
        primaryModel: root.primaryModel, adversarialModel: root.adversarialModel,
        manifestSha256: root.manifestSha256, bundleSha256: root.bundleSha256,
        receiptLedgerSha256: root.receiptLedgerSha256, exposureLayoutHash: root.exposureLayoutHash,
        runtimeAuditSha256: root.runtimeAudit.auditSha256,
        publicationPlanSha256: root.publicationPlanSha256,
        publicationEntriesSha256: root.publicationEntriesSha256,
    };
    const checkpoint = {
      kind: 'create_only_publication_checkpoint_v1',
      publicationId: `${TOURNAMENT_POOL_V11_VERSION}_${root.publicationPlanSha256}`,
      planSha256: createOnlyPublicationPlanSha256({
        publicationId: `${TOURNAMENT_POOL_V11_VERSION}_${root.publicationPlanSha256}`,
        checkpointPath: `tournament_pool_v11_bundles/${TOURNAMENT_POOL_V11_VERSION}/internal/publication_checkpoint`,
        entriesSha256: root.publicationEntriesSha256,
        root: { path: `tournament_pool_v11_bundles/${TOURNAMENT_POOL_V11_VERSION}`, value: root },
        binding: checkpointBinding,
      }),
      binding: checkpointBinding,
      revision: 3, phase: 'ready', writeCursor: 4_000, verifyCursor: 4_000,
    };
    const jobBinding = {
      jobId: root.jobId, queueSha256: root.queueSha256,
      reviewContractVersion: root.reviewContractVersion, promptSetSha256: root.promptSetSha256,
      primaryModel: root.primaryModel, adversarialModel: root.adversarialModel,
    };
    const roomSeriesAuditBody = { ...auditBody, roomSeries: 1 };
    const bucketCountAuditBody = { ...auditBody, bucketCount: 1 };
    expect({
      roomSeries: isCompleteTournamentV11BundleRoot({
        ...root,
        runtimeAudit: { ...roomSeriesAuditBody, auditSha256: hash(roomSeriesAuditBody) },
      }),
      bucketCount: isCompleteTournamentV11BundleRoot({
        ...root,
        runtimeAudit: { ...bucketCountAuditBody, auditSha256: hash(bucketCountAuditBody) },
      }),
      checkpointPlan: isCompleteTournamentV11BundleForJob(root, {
        ...checkpoint, planSha256: 'f'.repeat(64),
      }, jobBinding),
    }).toEqual({ roomSeries: false, bucketCount: false, checkpointPlan: false });
    expect(isCompleteTournamentV11BundleForJob(root, checkpoint, jobBinding)).toBe(true);
    expect(tournamentV11BundlePublicationStatus(root, checkpoint, jobBinding)).toBe('ready');
    expect(tournamentV11BundlePublicationStatus(null, {
      ...checkpoint, phase: 'writing', writeCursor: 20, verifyCursor: 0,
    }, jobBinding)).toBe('writing');
    expect(isCompleteTournamentV11BundleForJob(root, checkpoint, {
      ...jobBinding, queueSha256: 'f'.repeat(64),
    })).toBe(false);
    expect(isCompleteTournamentV11BundleForJob(root, {
      ...checkpoint, binding: { ...checkpoint.binding, primaryModel: 'gpt-4.1-nano' },
    }, jobBinding)).toBe(false);
    expect(tournamentV11BundlePublicationStatus(root, {
      ...checkpoint, binding: { ...checkpoint.binding, primaryModel: 'gpt-4.1-nano' },
    }, jobBinding)).toBe('conflict');
  });

  it('fences paid attempts to the current lease and preserves failed-call audit identity', () => {
    expect(semanticJobLeaseAuthorizesAttempt({
      lifecycle: 'running', lease: { token: 'lease-1', expiresAtMs: 200 },
    }, 'lease-1', 199)).toBe(true);
    expect(semanticJobLeaseAuthorizesAttempt({
      lifecycle: 'running', lease: { token: 'lease-1', expiresAtMs: 200 },
    }, 'lease-2', 199)).toBe(false);
    expect(semanticJobLeaseAuthorizesAttempt({
      lifecycle: 'running', lease: { token: 'lease-1', expiresAtMs: 200 },
    }, 'lease-1', 200)).toBe(false);
    expect(semanticProviderAttemptIdFromError({ semanticAttemptId: `tsa_${'b'.repeat(64)}` }))
      .toBe(`tsa_${'b'.repeat(64)}`);
    expect(semanticProviderAttemptIdFromError({ semanticAttemptId: '../bad' })).toBeNull();

    const source = fs.readFileSync(path.join(__dirname, 'admin_tournament_tasks.ts'), 'utf8');
    expect(source).toContain('finalizeTournamentV11TaskPool({ selection, receipts })');
    expect(source).toContain('auditTournamentV11RuntimePool(finalized)');
    expect(source).toContain("jobSnapshot.get('semanticGlobalAttemptOrdinal')");
    expect(source).toContain('semanticGlobalAttemptOrdinal: allocated.ordinal');
    expect(source).toContain('semanticAttemptPassOrdinal');
    const providerStart = source.indexOf('async function callSemanticProvider(');
    const providerEnd = source.indexOf('async function reviewCandidateForJob(', providerStart);
    const providerPath = source.slice(providerStart, providerEnd);
    expect(providerPath).toContain('resumeSemanticAttempt(latest, active.leaseToken)');
    expect(providerPath).toContain('const jobSnapshot = await tx.get(jobRef);');
    expect(providerPath.indexOf("kind: 'returned'")).toBeLessThan(providerPath.indexOf('const billingRef'));
    const returnedPersistence = providerPath.slice(
      providerPath.indexOf('const returned ='),
      providerPath.indexOf('const billingRef'),
    );
    expect(returnedPersistence).toContain('const jobSnapshot = await tx.get(jobRef);');
    expect(returnedPersistence).toContain('semanticJobLeaseAuthorizesAttempt(jobSnapshot.data()');
    expect(returnedPersistence).toContain("latest.get('leaseToken') !== prepared.attempt.leaseToken");
    const billingPersistence = providerPath.slice(providerPath.indexOf('const billingRef'));
    expect(billingPersistence).toContain('semanticJobLeaseAuthorizesAttempt(jobSnapshot.data()');
    expect(providerPath).not.toContain('await attemptRef.set(calling)');
    expect(source).toContain('assertSemanticJobReviewIdentity(state, semanticJobReviewIdentity(cfg))');
  });
});

describe('разбор запроса списка', () => {
  it('дефолты разумны и ограничены', () => {
    const parsed = parseListRequest(undefined);
    expect(parsed.limit).toBe(25);
    expect(parsed.status).toBe('');
  });

  it('отклоняет запредельный limit и мусорный курсор', () => {
    expectRejected(() => parseListRequest({ limit: 5_000 }));
    expectRejected(() => parseListRequest({ cursor: 'плохой курсор с пробелами' }));
    expectRejected(() => parseListRequest({ status: 'всё' }));
    expectRejected(() => parseListRequest({ difficulty: 9 }));
  });

  it('принимает валидные фильтры', () => {
    const parsed = parseListRequest({ limit: 50, status: 'draft', difficulty: 2 });
    expect(parsed).toMatchObject({ limit: 50, status: 'draft', difficulty: 2 });
  });
});

describe('разбор запроса публикации', () => {
  it('требует непустой список id и известное действие', () => {
    expectRejected(() => parseMutateRequest({ taskIds: [], action: 'publish' }));
    expectRejected(() => parseMutateRequest({ taskIds: ['a'], action: 'drop_database' }));
    expectRejected(() => parseMutateRequest({ taskIds: ['../escape'], action: 'publish' }));
  });

  it('дедуплицирует id — двойная публикация одного задания не нужна', () => {
    const parsed = parseMutateRequest({ taskIds: ['a', 'a', 'b'], action: 'publish' });
    expect(parsed.taskIds).toEqual(['a', 'b']);
  });
});

describe('разбор расписания', () => {
  const slot = (over = {}) => ({
    slotId: 'daily_1200', localTime: '12:00', timezone: 'Europe/Moscow',
    ticketsRequired: 1, enabled: false, ...over,
  });

  it('принимает слоты в формате, который читает планировщик комнат', () => {
    const parsed = parseScheduleRequest({
      slots: [slot(), slot({ slotId: 'daily_1900', localTime: '19:00', enabled: true })],
      timezone: 'Europe/Moscow',
    });
    expect(parsed.slots).toHaveLength(2);
    expect(parsed.slots[0].localTime).toBe('12:00');
    expect(parsed.slots[1].enabled).toBe(true);
    expect(parsed.slots[0].timezone).toBe('Europe/Moscow');
    expect(parsed.slots[0].ticketsRequired).toBe(1);
    expect(parsed.testingEnabled).toBe(false);
    expect(parseScheduleRequest({ slots: [slot()], testingEnabled: true }).testingEnabled).toBe(true);
  });

  it('принимает явный режим «активно весь день» и не включает его по умолчанию', () => {
    expect(parseScheduleRequest({ slots: [slot()], allDayEnabled: true }).allDayEnabled).toBe(true);
    expect(parseScheduleRequest({ slots: [slot()] }).allDayEnabled).toBe(false);
    expectRejected(() => parseScheduleRequest({ slots: [slot()], allDayEnabled: 'true' }));
  });

  it('требует localTime в формате ЧЧ:ММ — hour/minute сервер не понимает', () => {
    // Регрессия: первая версия админки слала hour+minute, сервер молча
    // отбрасывал такие слоты и расписание не запускало ни одного турнира.
    expectRejected(() => parseScheduleRequest({ slots: [{ slotId: 'a', hour: 12, minute: 0 }] }));
    expectRejected(() => parseScheduleRequest({ slots: [slot({ localTime: '' })] }));
    expectRejected(() => parseScheduleRequest({ slots: [slot({ localTime: '9:00' })] }));
    expectRejected(() => parseScheduleRequest({ slots: [slot({ localTime: '25:00' })] }));
    expectRejected(() => parseScheduleRequest({ slots: [slot({ localTime: '12:61' })] }));
  });

  it('отклоняет мусорную таймзону — её же проверяет сервер комнат', () => {
    expectRejected(() => parseScheduleRequest({ slots: [slot()], timezone: 'НеТаймзона' }));
    expectRejected(() => parseScheduleRequest({ slots: [slot({ timezone: 'Nowhere/Nope' })] }));
  });

  it('отклоняет дубли слотов — иначе комнаты создадутся дважды', () => {
    expectRejected(() => parseScheduleRequest({
      slots: [slot(), slot({ localTime: '19:00' })],
    }));
  });

  it('enabled по умолчанию false — слот не включается молча', () => {
    const parsed = parseScheduleRequest({ slots: [{
      slotId: 'daily_1200', localTime: '12:00', timezone: 'Europe/Moscow',
    }] });
    expect(parsed.slots[0].enabled).toBe(false);
    expect(parsed.slots[0].ticketsRequired).toBe(1);
  });

  it('стоимость входа ограничена разумными пределами', () => {
    expectRejected(() => parseScheduleRequest({ slots: [slot({ ticketsRequired: 0 })] }));
    expectRejected(() => parseScheduleRequest({ slots: [slot({ ticketsRequired: 9999 })] }));
    expect(parseScheduleRequest({ slots: [slot({ ticketsRequired: 5 })] }).slots[0].ticketsRequired).toBe(5);
  });
});

describe('карточка задания для ревью', () => {
  const task: TournamentTask = {
    taskId: 'choice_mitap_1_p1',
    mode: 'guess_phrase',
    isVoice: false,
    difficulty: 1,
    payload: { phrase: 'I am here', options: ['Я здесь', 'Как дела', 'Спасибо', 'Пока'], correctIndex: 0 },
    tags: ['plan:mitap'],
    verified: false,
  };

  it('показывает правильный ответ — ревьюер обязан видеть, что проверяет', () => {
    const card = publicAdminTask(task.taskId, task);
    expect(card.payload).toEqual(task.payload);
    expect(card.valid).toBe(true);
    expect(card.verified).toBe(false);
  });

  it('помечает битое задание как невалидное, а не скрывает', () => {
    const broken = { ...task, payload: { phrase: 'x', options: ['a'], correctIndex: 0 } };
    expect(publicAdminTask('broken', broken as TournamentTask).valid).toBe(false);
  });
});

describe('готовность раундов', () => {
  it('сложности раундов совпадают с serverside selectRoundTasks', () => {
    // Зеркало tournament_core.selectRoundTasks: раунд 1 → [1], 4 → [2,3].
    expect(ROUND_DIFFICULTIES[1]).toEqual([1]);
    expect(ROUND_DIFFICULTIES[2]).toEqual([1, 2]);
    expect(ROUND_DIFFICULTIES[3]).toEqual([2]);
    expect(ROUND_DIFFICULTIES[4]).toEqual([2, 3]);
  });

  it('порог набора заданий на раунд разумно больше 5 вопросов', () => {
    // 5 вопросов в батче; порог должен давать запас, иначе игроки увидят
    // одни и те же задания в соседних турнирах.
    expect(ROUND_TASK_TARGET).toBeGreaterThanOrEqual(25);
  });
});

describe('разбор запроса ИИ-генерации', () => {
  it('принимает уровень CEFR, нормализуя регистр, и режет подсказку темы', () => {
    const parsed = parseAiGenerateRequest({ level: 'b1', topicHint: ` аэропорт ${'x'.repeat(200)}`, batches: 2 });
    expect(parsed.level).toBe('B1');
    expect(parsed.topicHint.length).toBeLessThanOrEqual(120);
    expect(parsed.batches).toBe(2);
    expect(parsed.dryRun).toBe(false);
  });

  it('отклоняет неизвестный уровень, лишние ключи и завышенные батчи', () => {
    expectRejected(() => parseAiGenerateRequest({ level: 'D1' }));
    expectRejected(() => parseAiGenerateRequest({ level: 'A2', extra: true }));
    expectRejected(() => parseAiGenerateRequest({ level: 'A2', batches: 99 }));
    expectRejected(() => parseAiGenerateRequest({ level: 'A2', batches: 0 }));
  });
});

describe('разбор запроса правки задания', () => {
  it('принимает валидную правку payload', () => {
    const parsed = parseEditRequest({
      taskId: 'ai_choice_abc',
      payload: { phrase: 'Hello there', options: ['а', 'б', 'в', 'г'], correctIndex: 1 },
      difficulty: 2,
    });
    expect(parsed.taskId).toBe('ai_choice_abc');
    expect(parsed.difficulty).toBe(2);
  });

  it('отклоняет пустой payload, кривой id и сложность вне 0-3', () => {
    expectRejected(() => parseEditRequest({ taskId: 'ok', payload: {} }));
    expectRejected(() => parseEditRequest({ taskId: 'плохой id!', payload: { a: 1 } }));
    expectRejected(() => parseEditRequest({ taskId: 'ok', payload: { a: 1 }, difficulty: 9 }));
  });

  it('manual AI edits invalidate the old judge approval instead of self-approving', () => {
    expect(aiLifecycleAfterTournamentTaskEdit({ source: 'ai' })).toEqual({
      verified: false,
      lifecycle: 'generated',
      aiVerdict: 'pending',
      aiReason: 'Manual edit requires AI validation before approval.',
      aiCheckedAtMs: null,
    });
    expect(aiLifecycleAfterTournamentTaskEdit({ source: 'legacy' })).toEqual({});
  });
});

describe('AI publication lifecycle gate', () => {
  const task = {
    taskId: 'ai-situation-1',
    mode: 'guess_phrase',
    isVoice: false,
    difficulty: 1,
    payload: {
      phrase: 'Ты встретил друга после работы. Что скажешь?',
      options: ['How was work?', 'Blue is a colour.', 'I eat at midnight.', 'The bus has wings.'],
      correctIndex: 0,
    },
    explanation: {
      ruleNote: 'Фраза спрашивает, как прошла работа.',
      example: 'How was work today? — Как прошла работа сегодня?',
      wrongOptionReasons: ['', 'Цвет не отвечает на вопрос о работе.', 'Еда не относится к вопросу.', 'Автобусы не летают и не отвечают на вопрос.'],
    },
    tags: ['source:ai'],
    verified: false,
    source: 'ai',
  } as TournamentTask & { source: string; lifecycle?: string; aiVerdict?: string };

  it('allows AI publication only after validation and approval', () => {
    expect(canPublishTournamentTask({ ...task, lifecycle: 'awaiting_approval', aiVerdict: 'approved' })).toBe(true);
    expect(canPublishTournamentTask({ ...task, lifecycle: 'generated', aiVerdict: 'approved' })).toBe(false);
    expect(canPublishTournamentTask({ ...task, lifecycle: 'awaiting_approval', aiVerdict: 'pending' })).toBe(false);
  });

  it('records explicit human approval separately from the automatic validator receipt', () => {
    expect(humanApprovalAfterTournamentTaskPublish('owner@example.com', 1_234)).toEqual({
      verified: true,
      lifecycle: 'published',
      publishedAtMs: 1_234,
      humanApprovedAtMs: 1_234,
      humanApprovedBy: 'owner@example.com',
    });
  });

  it('rejects retired audio and voice modes even when their legacy schema is valid', () => {
    const approved = { ...task, lifecycle: 'awaiting_approval', aiVerdict: 'approved' };
    expect(canPublishTournamentTask({
      ...approved,
      taskId: 'voice-legacy',
      mode: 'voice',
      isVoice: true,
      payload: { phrase: 'Speak', reference: 'legacy/reference' },
    })).toBe(false);
    const legacyChoice = {
      ...approved,
      payload: {
        phrase: 'I am here',
        options: ['Я здесь', 'Я дома', 'Я готов', 'Я занят'],
        correctIndex: 0,
      },
    };
    for (const mode of ['listen_choose', 'sound_contrast', 'listen_build']) {
      expect(canPublishTournamentTask({ ...legacyChoice, mode })).toBe(false);
    }
    expect(canPublishTournamentTask({
      ...approved,
      mode: 'translate_build',
      // зачем 2026-08-03: строгий контракт translate_build (tournament_core)
      // требует correctTokenCount И ровно ОДНУ ловушку в wordBank — клиент
      // обязан знать число плиток ответа, а лишнее слово делает задание
      // осмысленным. Фикстура писалась до этого правила (wordBank совпадал с
      // ответом = ноль ловушек); боевой пул контракту соответствует —
      // проверено 200/200 заданий, у всех ровно 1 ловушка.
      payload: {
        phrase: 'Я здесь',
        wordBank: ['I', 'am', 'here', 'there'],
        correctTokens: ['I', 'am', 'here'],
        correctTokenCount: 3,
      },
      explanation: {
        ruleNote: 'Здесь нужна связка I am и наречие here.',
        example: 'I am here now. — Я сейчас здесь.',
        wrongOptionReasons: [],
      },
    })).toBe(true);
    expect(canPublishTournamentTask({
      ...approved,
      mode: 'speed_match',
      payload: {
        prompt: 'Соедини пары',
        items: [
          { prompt: 'one', options: ['один', 'два'], correctIndex: 0 },
          { prompt: 'two', options: ['один', 'два'], correctIndex: 1 },
        ],
      },
    })).toBe(false);
  });
});

describe('разбор кураторского набора', () => {
  const base = { slotId: 'daily_1900', timezone: 'Europe/Moscow', dateKey: '2026-07-26' };

  it('принимает валидные раунды и пустой набор (снятие)', () => {
    const parsed = parseCuratedSetRequest({
      ...base,
      rounds: [{ roundNo: 1, taskIds: ['t1', 't2', 't3'] }],
    });
    expect(parsed.rounds).toHaveLength(1);
    expect(parsed.rounds[0].taskIds).toEqual(['t1', 't2', 't3']);
    expect(parseCuratedSetRequest({ ...base, rounds: [] }).rounds).toEqual([]);
  });

  it('отклоняет кривую дату/таймзону, дубли раундов и переполненный раунд', () => {
    expectRejected(() => parseCuratedSetRequest({ ...base, dateKey: '26.07.2026', rounds: [] }));
    expectRejected(() => parseCuratedSetRequest({ ...base, timezone: 'Nowhere/Nope', rounds: [] }));
    expectRejected(() => parseCuratedSetRequest({
      ...base,
      rounds: [{ roundNo: 1, taskIds: ['a'] }, { roundNo: 1, taskIds: ['b'] }],
    }));
    expectRejected(() => parseCuratedSetRequest({
      ...base,
      rounds: [{ roundNo: 2, taskIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }],
    }));
  });
});

describe('фильтр источника пула', () => {
  it('принимает ai и отклоняет прочее', () => {
    expect(parseListRequest({ source: 'ai' }).source).toBe('ai');
    expect(parseListRequest({}).source).toBe('');
    expectRejected(() => parseListRequest({ source: 'unknown' }));
  });
});
