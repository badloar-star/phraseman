// @ts-nocheck -- this is a pure CommonJS migration harness; runtime assertions are the contract.
import path from 'node:path';

const apply = require(path.resolve(__dirname, '..', 'scripts', 'apply-tournament-pool-v11.cjs'));
const rollback = require(path.resolve(__dirname, '..', 'scripts', 'rollback-tournament-pool-v11.cjs'));

type Row = { id: string; data: Record<string, unknown> };

const choiceExplanation = {
  ruleNote: 'r', example: 'e', wrongOptionReasons: ['', 'x', 'x', 'x'],
};

function runtimeProjection(mode: string, _seed: string): any {
  if (mode === 'translate_build') return {
    payload: {
      phrase: 'p', wordBank: ['a', 'b'], correctTokens: ['a'], correctTokenCount: 1, correctAnswer: 'a',
    },
    explanation: { ...choiceExplanation, wrongOptionReasons: [] },
  };
  if (mode === 'speed_match') {
    const prompts = Array.from({ length: 6 }, (_, index) => `w${index}`);
    const options = Array.from({ length: 6 }, (_, index) => `o${index}`);
    return {
      payload: {
        prompt: 'Соедини пары', rightOptions: options,
        items: prompts.map((prompt, correctIndex) => ({
          prompt, options, correctIndex,
          explanation: {
            ruleNote: 'r', example: 'e', wrongOptionReasons: options.map((_, index) => index === correctIndex ? '' : 'x'),
          },
        })),
      },
      explanation: { ...choiceExplanation, wrongOptionReasons: [] },
    };
  }
  return {
    payload: { phrase: 'p', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
    explanation: choiceExplanation,
  };
}

const projectionTemplates: Readonly<Record<string, any>> = Object.freeze(Object.fromEntries(
  ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match']
    .map((mode) => [mode, runtimeProjection(mode, 'x')]),
));

function sourceBarrier() {
  return {
    kind: 'tournament_task_pool_barrier_v1', state: 'ready',
    generation: 'operator-read-current-generation', revision: 27,
    exposureBucketCounts: {
      guess_phrase: 30, fill_gap: 13, find_oddity: 10, translate_build: 38, speed_match: 5,
    },
    exposureLayoutHash: 'b'.repeat(64),
  };
}

function targetFixture(): any {
  const modes = [
    ...Array.from({ length: 1_500 }, () => 'guess_phrase'),
    ...Array.from({ length: 500 }, () => 'fill_gap'),
    ...Array.from({ length: 300 }, () => 'find_oddity'),
    ...Array.from({ length: 1_500 }, () => 'translate_build'),
    ...Array.from({ length: 200 }, () => 'speed_match'),
  ];
  const modeOrdinals = new Map<string, number>();
  const rows: Row[] = Array.from({ length: 4_000 }, (_, index): Row => {
    const contentSha256 = apply.canonicalSha256(`content-${index}`);
    const taskId = apply.tournamentV11TaskId(contentSha256);
    const mode = modes[index];
    const modeOrdinal = modeOrdinals.get(mode) ?? 0;
    modeOrdinals.set(mode, modeOrdinal + 1);
    return {
      id: taskId,
      data: {
        taskId, mode,
        difficulty: (index % 3) + 1, isVoice: false, verified: true, source: 'ai', lifecycle: 'published',
        poolVersion: apply.TARGET_VERSION,
        exposureBucket: `${apply.TARGET_VERSION}:${mode}:${String(modeOrdinal % apply.TARGET_BUCKET_COUNTS[mode]).padStart(3, '0')}`,
        contentSha256,
        semanticSignature: apply.canonicalSha256(`signature-${index}`),
        semanticReceiptId: apply.canonicalSha256(`receipt-id-${index}`),
        semanticReceiptSha256: apply.canonicalSha256(`receipt-${index}`),
        reviewContractVersion: 'tournament-semantic-review-v2', promptSetSha256: 'a'.repeat(64),
        provenanceKeys: mode === 'speed_match'
          ? Array.from({ length: 6 }, (_, item) => `fixture:${index * 10 + item}:phrase-${index}-${item}`)
          : [`fixture:${index}:phrase-${index}`],
        tags: [`pool:${apply.TARGET_VERSION}`, `provenance-parity:${index % 2}`], ...projectionTemplates[mode],
      },
    };
  });
  const manifestSha256 = apply.canonicalSha256('manifest-fixture');
  const exposureLayoutHash = apply.exposureLayoutSha256(rows);
  const receiptIndex = rows.map(({ id, data }) => ({
    taskId: id,
    semanticReceiptId: data.semanticReceiptId,
    semanticReceiptSha256: data.semanticReceiptSha256,
  }));
  const receiptLedgerSha256 = apply.receiptLedgerSha256(receiptIndex);
  const bundleSha256 = apply.bundleSha256(rows, manifestSha256);
  const taskIdsSha256 = apply.taskIdsSha256(rows.map(({ id }) => id));
  const taskRowsSha256 = apply.canonicalSha256([...rows].sort((left, right) => left.id.localeCompare(right.id)));
  const basePins: any = {
    manifestSha256, bundleSha256, receiptLedgerSha256, exposureLayoutHash,
    taskIdsSha256, taskRowsSha256,
  };
  const finalizedPoolSha256 = apply.finalizedPoolSha256(rows, basePins);
  const auditBody: any = {
    kind: 'tournament_pool_v11_runtime_audit_v1', poolVersion: apply.TARGET_VERSION,
    days: 730, roomSeries: 2, roomsSimulated: 1_460, tasksPerRoom: 16, taskCount: 4_000,
    bucketCount: 102, maxAdjacentTaskOverlap: 0, maxAdjacentProvenanceOverlap: 0,
    provenanceCollisions: 0, fullTaskCoverage: true, fullBucketCoverage: true,
    speedBoardsChecked: 100, speedBoardsWithSixProvenance: 100,
    taskIdsSha256,
    bucketIdsSha256: apply.canonicalSha256([...new Set(rows.map((row) => row.data.exposureBucket))].sort()),
    manifestSha256, bundleSha256, receiptLedgerSha256, exposureLayoutHash,
  };
  const runtimeAudit: any = { ...auditBody, auditSha256: apply.canonicalSha256(auditBody) };
  const runtimeAuditSha256 = runtimeAudit.auditSha256;
  const manifest: any = {
    kind: 'tournament_pool_v11_dry_run_v1', poolVersion: apply.TARGET_VERSION,
    reviewedTaskCount: 4_000, receiptCount: 4_000, productionWrites: 0, providerCalls: 0,
    pins: {
      manifestSha256, bundleSha256, receiptLedgerSha256, exposureLayoutHash,
      finalizedPoolSha256, runtimeAuditSha256,
    },
    gates: {
      exactTaskCount: true, exactReceiptCoverage: true, diversity: true,
      exposure730Days: true, exactRuntimeAudit: true, productionWrites: 0, providerCalls: 0,
    },
  };
  const pins: any = { ...basePins, finalizedPoolSha256, runtimeAuditSha256 };
  return { rows, receiptIndex, manifest, runtimeAudit, pins };
}

const sharedTarget: any = targetFixture();

class MemoryAdapter {
  barrier: Record<string, unknown>;
  tasks = new Map<string, Row>();
  rooms: Array<{ id: string; data: Record<string, unknown> }> = [];
  calls: string[] = [];
  afterAcquire: (() => void) | null = null;
  afterFirstCreate: (() => void) | null = null;
  afterFirstDelete: (() => void) | null = null;
  writeChunkSizes: number[] = [];
  readChunkSizes: number[] = [];
  deleteChunkSizes: number[] = [];

  constructor(barrier: Record<string, unknown>, rows: Row[]) {
    this.barrier = structuredClone(barrier);
    rows.forEach((row) => this.tasks.set(row.id, row));
  }

  async readBarrier() { this.calls.push('readBarrier'); return structuredClone(this.barrier); }
  async readAllTasks() {
    this.calls.push('readAllTasks');
    return [...this.tasks.values()];
  }
  async readRooms() { this.calls.push('readRooms'); return structuredClone(this.rooms); }
  async acquireBarrier(expected: unknown, next: Record<string, unknown>) {
    this.calls.push('acquireBarrier'); expect(this.barrier).toEqual(expected); this.barrier = structuredClone(next);
    this.afterAcquire?.();
  }
  async createTasks(rows: Row[]) {
    this.calls.push('createTasks'); this.writeChunkSizes.push(rows.length);
    for (const row of rows) {
      if (this.tasks.has(row.id)) throw new Error(`already_exists:${row.id}`);
      this.tasks.set(row.id, row);
    }
    const hook = this.afterFirstCreate;
    this.afterFirstCreate = null;
    hook?.();
  }
  async readTasks(ids: string[]) {
    this.calls.push('readTasks'); this.readChunkSizes.push(ids.length);
    return ids.flatMap((id) => this.tasks.has(id) ? [this.tasks.get(id)!] : []);
  }
  async restoreTasks(rows: Row[]) {
    this.calls.push('restoreTasks'); this.writeChunkSizes.push(rows.length);
    rows.forEach((row) => this.tasks.set(row.id, row));
  }
  async deleteTasks(ids: string[]) {
    this.calls.push('deleteTasks'); this.deleteChunkSizes.push(ids.length);
    ids.forEach((id) => this.tasks.delete(id));
    const hook = this.afterFirstDelete;
    this.afterFirstDelete = null;
    hook?.();
  }
  async switchBarrier(expected: unknown, next: Record<string, unknown>) {
    this.calls.push('switchBarrier'); expect(this.barrier).toEqual(expected); this.barrier = structuredClone(next);
  }
}

describe('tournament pool v11 guarded migration scripts', () => {
  test('defaults to preflight and requires independent two-factor apply and rollback guards', () => {
    expect(apply.resolveApplyIntent([], {})).toBe(false);
    expect(apply.resolveApplyIntent([], { PHRASEMAN_TOURNAMENT_V11_APPLY: '1' })).toBe(false);
    expect(() => apply.resolveApplyIntent(['--apply'], {})).toThrow('apply_guard_missing');
    expect(apply.resolveApplyIntent(['--apply'], { PHRASEMAN_TOURNAMENT_V11_APPLY: '1' })).toBe(true);
    expect(rollback.resolveRollbackIntent([], {})).toBe(false);
    expect(() => rollback.resolveRollbackIntent(['--rollback'], {})).toThrow('rollback_guard_missing');
    expect(rollback.resolveRollbackIntent(['--rollback'], { PHRASEMAN_TOURNAMENT_V11_ROLLBACK: '1' })).toBe(true);
    expect(() => rollback.resolveRollbackIntent(['--apply'], { PHRASEMAN_TOURNAMENT_V11_ROLLBACK: '1' }))
      .toThrow('rollback_flag_required');
  });

  test('pins all 4,000 identities and semantic hashes and caps every chunk', () => {
    const target = sharedTarget;
    const validated = apply.validateTargetArtifacts(target);
    expect(validated.taskIds).toHaveLength(4_000);
    expect(new Set(validated.taskIds).size).toBe(4_000);
    const bucketLoads = new Map<string, number>();
    target.rows.forEach((row: Row) => bucketLoads.set(
      String(row.data.exposureBucket),
      (bucketLoads.get(String(row.data.exposureBucket)) ?? 0) + 1,
    ));
    expect(bucketLoads.size).toBe(102);
    expect(Math.max(...bucketLoads.values())).toBeLessThanOrEqual(40);
    expect(apply.chunkItems(validated.rows, 999).map((chunk: Row[]) => chunk.length))
      .toEqual(Array.from({ length: 10 }, () => 400));
    expect(() => apply.validateTargetArtifacts({
      ...target, pins: { ...target.pins, bundleSha256: 'f'.repeat(64) },
    })).toThrow('target_bundle_hash_mismatch');
    expect(() => apply.validateTargetArtifacts({ ...target, rows: target.rows.slice(1) }))
      .toThrow('target_task_count_mismatch');
    expect(() => apply.validateTargetArtifacts({
      ...target,
      manifest: { ...target.manifest, gates: { ...target.manifest.gates, diversity: false } },
    })).toThrow('target_manifest_invalid');
    expect(() => apply.validateTargetArtifacts({
      ...target,
      manifest: { ...target.manifest, gates: { ...target.manifest.gates, exposure730Days: false } },
    })).toThrow('target_manifest_invalid');
    const incompleteRows = [
      { ...target.rows[0], data: { ...target.rows[0].data, payload: {} } },
      ...target.rows.slice(1),
    ];
    expect(() => apply.validateTargetArtifacts({
      ...target,
      rows: incompleteRows,
      pins: {
        ...target.pins,
        taskRowsSha256: apply.canonicalSha256([...incompleteRows].sort((a, b) => a.id.localeCompare(b.id))),
      },
    })).toThrow('target_task_invalid');
    const underfullGuessBucket = [...bucketLoads].find(([bucket, count]) => (
      bucket.includes(':guess_phrase:') && count === 39
    ))?.[0];
    const exposureSource = target.rows.find((row: Row) => row.data.mode === 'guess_phrase'
      && bucketLoads.get(String(row.data.exposureBucket)) === 40);
    if (!underfullGuessBucket || !exposureSource) throw new Error('exposure_drift_fixture_invalid');
    const exposureRows = target.rows.map((row: Row) => row.id === exposureSource.id
      ? { ...row, data: { ...row.data, exposureBucket: underfullGuessBucket } } : row);
    expect(() => apply.validateTargetArtifacts({
      ...target,
      rows: exposureRows,
      pins: {
        ...target.pins,
        taskRowsSha256: apply.canonicalSha256([...exposureRows].sort((a, b) => a.id.localeCompare(b.id))),
      },
    })).toThrow('target_exposure_layout_hash_mismatch');
    const driftedRows = [
      {
        ...target.rows[0],
        data: {
          ...target.rows[0].data,
          explanation: { ...(target.rows[0].data.explanation as object), ruleNote: 'Drifted but valid rule.' },
        },
      },
      ...target.rows.slice(1),
    ];
    expect(() => apply.validateTargetArtifacts({ ...target, rows: driftedRows }))
      .toThrow('target_task_rows_hash_mismatch');
    expect(() => apply.validateTargetArtifacts({
      ...target,
      rows: driftedRows,
      pins: {
        ...target.pins,
        taskRowsSha256: apply.canonicalSha256([...driftedRows].sort((a, b) => a.id.localeCompare(b.id))),
      },
    })).toThrow('target_bundle_hash_mismatch');
    const driftedTaskRowsSha256 = apply.canonicalSha256(
      [...driftedRows].sort((a, b) => a.id.localeCompare(b.id)),
    );
    const driftedBundleSha256 = apply.bundleSha256(driftedRows, target.pins.manifestSha256);
    expect(() => apply.validateTargetArtifacts({
      ...target,
      rows: driftedRows,
      pins: { ...target.pins, taskRowsSha256: driftedTaskRowsSha256, bundleSha256: driftedBundleSha256 },
      manifest: {
        ...target.manifest,
        pins: { ...target.manifest.pins, bundleSha256: driftedBundleSha256 },
      },
    })).toThrow('target_finalized_pool_hash_mismatch');
    const { auditSha256: _auditSha256, ...auditBody } = target.runtimeAudit;
    const driftedAuditBody = { ...auditBody, speedBoardsChecked: auditBody.speedBoardsChecked + 1 };
    const driftedAudit = { ...driftedAuditBody, auditSha256: apply.canonicalSha256(driftedAuditBody) };
    expect(() => apply.validateTargetArtifacts({
      ...target, runtimeAudit: driftedAudit,
    })).toThrow('target_runtime_audit_invalid');
    const fullBucket = [...bucketLoads].find(([, count]) => count === 40)?.[0];
    const sourceRow = target.rows.find((row: Row) => row.data.exposureBucket !== fullBucket
      && row.data.mode === String(fullBucket).split(':')[1]);
    expect(fullBucket).toBeDefined();
    expect(sourceRow).toBeDefined();
    if (!fullBucket || !sourceRow) throw new Error('bucket_limit_fixture_invalid');
    const overLimitRows = target.rows.map((row: Row) => row.id === sourceRow.id
      ? { ...row, data: { ...row.data, exposureBucket: fullBucket } } : row);
    expect(() => apply.validateTargetArtifacts({ ...target, rows: overLimitRows }))
      .toThrow('target_exposure_bucket_limit');
    for (const tags of [
      ['provenance-parity:0'],
      [`pool:${apply.TARGET_VERSION}`],
      [`pool:${apply.TARGET_VERSION}`, 'provenance-parity:0', 'provenance-parity:1'],
      [`pool:${apply.TARGET_VERSION}`, 'pool:tpool_legacy', 'provenance-parity:0'],
    ]) expect(() => apply.validateTargetArtifacts({
      ...target,
      rows: target.rows.map((row: Row, index: number) => index === 0
        ? { ...row, data: { ...row.data, tags } } : row),
    })).toThrow('target_task_invalid');
  });

  test('pins the actual source barrier and blocks protected room references before acquisition', () => {
    const source = sourceBarrier();
    const pin = apply.sourceBarrierPin(source);
    expect(() => apply.assertPinnedSourceBarrier(structuredClone(source), pin)).not.toThrow();
    expect(() => apply.assertPinnedSourceBarrier({ ...source, revision: 28 }, pin))
      .toThrow('source_barrier_drift');
    expect(apply.findBlockingRoomReferences([{
      id: 'active', data: { state: 'round2', rounds: [{ taskIds: ['target-a'] }] },
    }], new Set(['target-a']))).toEqual([{ roomId: 'active', state: 'round2' }]);
  });

  test('preflights without writes, then applies in bounded chunks and verifies before the release transaction', async () => {
    const source = sourceBarrier();
    const oldRows = [{ id: 'old-a', data: { taskId: 'old-a', poolVersion: source.generation } }];
    const target = sharedTarget;
    const adapter = new MemoryAdapter(source, oldRows);
    const preflight = await apply.executeApply({
      adapter, target, sourcePin: apply.sourceBarrierPin(source), apply: false,
    });
    expect(preflight.mode).toBe('preflight');
    expect(preflight.productionWrites).toBe(0);
    expect(adapter.calls).toEqual(['readBarrier', 'readRooms', 'readAllTasks']);
    expect(adapter.tasks.size).toBe(1);
    const artifact = preflight.rollbackArtifact;
    expect(artifact.targetBarrier).toEqual(expect.objectContaining({
      kind: 'tournament_task_pool_barrier_v1', state: 'ready',
      generation: 'tpool_20260808_v11', revision: source.revision + 2,
      exposureBucketCounts: { guess_phrase: 38, fill_gap: 13, find_oddity: 8, translate_build: 38, speed_match: 5 },
      releasedAt: expect.any(String),
    }));
    expect(artifact.targetBarrierSha256).toBe(apply.canonicalSha256(artifact.targetBarrier));
    expect(apply.validateRollbackArtifact(artifact, artifact.backupSha256).sourceRows).toEqual(oldRows);

    adapter.calls = [];
    const result = await apply.executeApply({
      adapter, target, sourcePin: apply.sourceBarrierPin(source), apply: true,
      rollbackArtifact: artifact, expectedBackupSha256: artifact.backupSha256,
    });
    expect(result.mode).toBe('apply');
    expect(Math.max(...adapter.writeChunkSizes, ...adapter.readChunkSizes)).toBeLessThanOrEqual(400);
    expect(adapter.calls.indexOf('readBarrier')).toBe(0);
    expect(adapter.calls.indexOf('readRooms')).toBeLessThan(adapter.calls.indexOf('acquireBarrier'));
    expect(adapter.calls.lastIndexOf('readTasks')).toBeLessThan(adapter.calls.indexOf('switchBarrier'));
    expect(adapter.barrier).toEqual(result.targetBarrier);
    expect(await adapter.readBarrier()).toEqual(result.targetBarrier);
    expect(result.targetBarrier).toEqual(artifact.targetBarrier);
  });

  test('apply rechecks the complete source row set after acquiring the barrier', async () => {
    const target = targetFixture();
    const sourceRows = [{ id: 'legacy-a', data: { taskId: 'legacy-a', verified: true } }];
    const adapter = new MemoryAdapter(sourceBarrier(), sourceRows);
    const sourcePin = apply.sourceBarrierPin(adapter.barrier);
    const preflight = await apply.executeApply({ adapter, target, sourcePin, apply: false, now: '2026-08-24T00:00:00.000Z' });
    adapter.afterAcquire = () => {
      adapter.afterAcquire = null;
      adapter.tasks.set('concurrent-extra', { id: 'concurrent-extra', data: { taskId: 'concurrent-extra' } });
    };
    await expect(apply.executeApply({
      adapter, target, sourcePin, apply: true,
      rollbackArtifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256,
    })).rejects.toThrow('source_post_acquire_mismatch');
    expect([...adapter.tasks.keys()].some((id) => id.startsWith('tv11_'))).toBe(false);
  });

  test('apply fences the exact full source plus target row set immediately before release', async () => {
    const target = targetFixture();
    const sourceRows = [{ id: 'legacy-a', data: { taskId: 'legacy-a', verified: true } }];
    const adapter = new MemoryAdapter(sourceBarrier(), sourceRows);
    const sourcePin = apply.sourceBarrierPin(adapter.barrier);
    const preflight = await apply.executeApply({ adapter, target, sourcePin, apply: false });
    adapter.afterFirstCreate = () => adapter.tasks.set('late-apply-extra', {
      id: 'late-apply-extra', data: { taskId: 'late-apply-extra' },
    });
    await expect(apply.executeApply({
      adapter, target, sourcePin, apply: true,
      rollbackArtifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256,
    })).rejects.toThrow('apply_final_rows_mismatch');
    expect(adapter.calls).not.toContain('switchBarrier');
  });

  test('rollback requires the exact artifact, restores its source rows, and deletes only pinned v11 ids', async () => {
    const source = sourceBarrier();
    const oldRows = [
      { id: 'old-a', data: { taskId: 'old-a', poolVersion: source.generation } },
      { id: 'old-b', data: { taskId: 'old-b', poolVersion: source.generation } },
    ];
    const target = sharedTarget;
    const preflightAdapter = new MemoryAdapter(source, oldRows);
    const preflight = await apply.executeApply({
      adapter: preflightAdapter, target, sourcePin: apply.sourceBarrierPin(source), apply: false,
    });
    await apply.executeApply({
      adapter: preflightAdapter, target, sourcePin: apply.sourceBarrierPin(source), apply: true,
      rollbackArtifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256,
    });
    const result = await rollback.executeRollback({
      adapter: preflightAdapter,
      artifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256,
      rollback: true,
    });
    expect(result.restored).toBe(0);
    expect(result.deleted).toBe(4_000);
    expect(preflightAdapter.barrier).toEqual(source);
    expect(preflightAdapter.tasks.get('old-a')).toEqual(oldRows[0]);
    expect(preflightAdapter.tasks.get('old-b')).toEqual(oldRows[1]);
    expect([...preflightAdapter.tasks.keys()].some((id) => id.startsWith('tv11_'))).toBe(false);
    expect(Math.max(...preflightAdapter.deleteChunkSizes)).toBeLessThanOrEqual(400);
    for (const drift of [
      { revision: preflight.rollbackArtifact.targetBarrier.revision + 1 },
      { exposureBucketCounts: { ...preflight.rollbackArtifact.targetBarrier.exposureBucketCounts, fill_gap: 12 } },
      { releasedAt: '2099-01-01T00:00:00.000Z' },
      { unexpected: true },
    ]) expect(() => rollback.assertTargetOrInterruptedBarrier({
      ...preflight.rollbackArtifact.targetBarrier, ...drift,
    }, preflight.rollbackArtifact)).toThrow('rollback_target_barrier_drift');
    await expect(rollback.executeRollback({
      adapter: preflightAdapter,
      artifact: { ...preflight.rollbackArtifact, sourceRows: [] },
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256,
      rollback: true,
    })).rejects.toThrow('rollback_artifact_hash_mismatch');
  });

  test('rollback rejects unknown and missing target rows before restore or deletion', async () => {
    const target = targetFixture();
    const sourceRows = [{ id: 'legacy-a', data: { taskId: 'legacy-a', verified: true } }];
    const source = sourceBarrier();
    const adapter = new MemoryAdapter(source, sourceRows);
    const sourcePin = apply.sourceBarrierPin(source);
    const preflight = await apply.executeApply({ adapter, target, sourcePin, apply: false, now: '2026-08-24T00:00:00.000Z' });
    await apply.executeApply({
      adapter, target, sourcePin, apply: true,
      rollbackArtifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256,
    });
    adapter.tasks.set('unknown-concurrent', { id: 'unknown-concurrent', data: { taskId: 'unknown-concurrent' } });
    await expect(rollback.executeRollback({
      adapter, artifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256, rollback: true,
    })).rejects.toThrow('rollback_current_rows_mismatch');

    adapter.tasks.delete('unknown-concurrent');
    adapter.tasks.delete(target.rows[0].id);
    await expect(rollback.executeRollback({
      adapter, artifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256, rollback: true,
    })).rejects.toThrow('rollback_target_rows_missing');
  });

  test('rollback rereads the complete row set after acquiring its barrier', async () => {
    const target = targetFixture();
    const sourceRows = [{ id: 'legacy-a', data: { taskId: 'legacy-a', verified: true } }];
    const source = sourceBarrier();
    const adapter = new MemoryAdapter(source, sourceRows);
    const sourcePin = apply.sourceBarrierPin(source);
    const preflight = await apply.executeApply({ adapter, target, sourcePin, apply: false });
    await apply.executeApply({
      adapter, target, sourcePin, apply: true,
      rollbackArtifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256,
    });
    adapter.afterAcquire = () => {
      adapter.afterAcquire = null;
      adapter.tasks.set('rollback-concurrent-extra', {
        id: 'rollback-concurrent-extra', data: { taskId: 'rollback-concurrent-extra' },
      });
    };
    await expect(rollback.executeRollback({
      adapter, artifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256, rollback: true,
    })).rejects.toThrow('rollback_post_acquire_rows_mismatch');
    expect([...adapter.tasks.keys()].filter((id) => id.startsWith('tv11_'))).toHaveLength(4_000);
  });

  test('rollback fences the exact final source row set immediately before restoration', async () => {
    const target = targetFixture();
    const sourceRows = [{ id: 'legacy-a', data: { taskId: 'legacy-a', verified: true } }];
    const source = sourceBarrier();
    const adapter = new MemoryAdapter(source, sourceRows);
    const sourcePin = apply.sourceBarrierPin(source);
    const preflight = await apply.executeApply({ adapter, target, sourcePin, apply: false });
    await apply.executeApply({
      adapter, target, sourcePin, apply: true,
      rollbackArtifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256,
    });
    adapter.calls = [];
    adapter.afterFirstDelete = () => adapter.tasks.set('late-rollback-extra', {
      id: 'late-rollback-extra', data: { taskId: 'late-rollback-extra' },
    });
    await expect(rollback.executeRollback({
      adapter, artifact: preflight.rollbackArtifact,
      expectedBackupSha256: preflight.rollbackArtifact.backupSha256, rollback: true,
    })).rejects.toThrow('rollback_final_rows_mismatch');
    expect(adapter.calls).not.toContain('switchBarrier');
  });
});
