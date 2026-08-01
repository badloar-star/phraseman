import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function loadScript(fileName: string): Record<string, any> {
  const absolutePath = path.resolve(__dirname, '..', 'scripts', fileName);
  const source = fs.readFileSync(absolutePath, 'utf8')
    .replace(/if \(require\.main === module\) \{[\s\S]*?\n\}/u, '')
    .replace(/main\(\)\.catch\([\s\S]*$/u, '');
  const module = { exports: {} as Record<string, any> };
  const sandbox = {
    Buffer,
    console,
    module,
    exports: module.exports,
    process: { argv: ['node', absolutePath], env: {}, stderr: { write: jest.fn() }, stdout: { write: jest.fn() } },
    require: (request: string) => require(request.startsWith('.')
      ? path.resolve(path.dirname(absolutePath), request)
      : request),
    __dirname: path.dirname(absolutePath),
    __filename: absolutePath,
  };
  vm.runInNewContext(source, sandbox, { filename: absolutePath });
  return module.exports;
}

describe('tournament pool migration scripts', () => {
  const apply = loadScript('apply-tournament-pool-v2.cjs');
  const rollback = loadScript('rollback-tournament-pool-v2.cjs');

  test('pins both directions to the v5 pool and defaults to preflight-only', () => {
    expect(apply.EXPECTED_VERSION).toBe('tpool_20260801_v5');
    expect(apply.EXPECTED_SOURCE_VERSION).toBe('tpool_20260729_v3');
    expect(rollback.EXPECTED_VERSION).toBe('tpool_20260801_v5');
    expect(apply.resolveApplyIntent([], {})).toBe(false);
    expect(apply.resolveApplyIntent([], { PHRASEMAN_TOURNAMENT_POOL_V5_APPLY: '1' })).toBe(false);
    expect(() => apply.resolveApplyIntent(['--apply'], {})).toThrow('apply_guard_missing');
    expect(apply.resolveApplyIntent(['--apply'], { PHRASEMAN_TOURNAMENT_POOL_V5_APPLY: '1' })).toBe(true);
    expect(rollback.resolveRollbackIntent([], {})).toBe(false);
    expect(() => rollback.resolveRollbackIntent(['--apply'], {})).toThrow('rollback_guard_missing');
    expect(rollback.resolveRollbackIntent(['--apply'], { PHRASEMAN_TOURNAMENT_POOL_V5_ROLLBACK: '1' })).toBe(true);
  });

  test('pins the source barrier to a uniform v3 backup and fails closed on drift', () => {
    const row = (poolVersion?: string) => ({
      id: `old-${poolVersion ?? 'missing'}`,
      data: { taskId: 'old-task', ...(poolVersion ? { poolVersion } : {}) },
    });

    expect(apply.resolveSourceGeneration([
      row('tpool_20260729_v3'),
      { ...row('tpool_20260729_v3'), id: 'old-v3-second' },
    ])).toBe('tpool_20260729_v3');
    expect(() => apply.resolveSourceGeneration([
      row('tpool_20260729_v3'), row('tpool_20260801_v5'),
    ])).toThrow('backup_source_generation_mismatch');
    expect(() => apply.resolveSourceGeneration([row()]))
      .toThrow('backup_source_generation_mismatch');
  });

  test('emits v5 migration report contracts without stale v3 guards', () => {
    const applySource = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'apply-tournament-pool-v2.cjs'), 'utf8');
    const rollbackSource = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'rollback-tournament-pool-v2.cjs'), 'utf8');

    expect(applySource).toContain("kind: 'tournament_pool_v5_preflight_v1'");
    expect(applySource).toContain("kind: 'tournament_pool_v5_apply_report_v1'");
    expect(rollbackSource).toContain("kind: 'tournament_pool_v5_rollback_preflight_v1'");
    expect(rollbackSource).toContain("kind: 'tournament_pool_v5_rollback_report_v1'");
    expect(applySource).not.toContain('PHRASEMAN_TOURNAMENT_POOL_V3_APPLY');
    expect(rollbackSource).not.toContain('PHRASEMAN_TOURNAMENT_POOL_V3_ROLLBACK');
  });

  test('requires translate_build correctTokenCount parity and exactly one trap', () => {
    const row = (correctTokens: string[], wordBank: string[], correctTokenCount = correctTokens.length) => ({
      id: 'task-1',
      data: {
        taskId: 'task-1',
        mode: 'translate_build',
        poolVersion: 'tpool_20260801_v5',
        payload: { correctTokens, correctTokenCount, wordBank },
      },
    });

    expect(() => apply.assertTranslateBuildSemantics([
      row(['I', 'am', 'ready'], ['ready', 'trap', 'I', 'am']),
    ])).not.toThrow();
    expect(() => apply.assertTranslateBuildSemantics([
      row(['I', 'am'], ['I', 'am', 'trap'], 1),
    ])).toThrow('translate_build_correct_token_count');
    expect(() => apply.assertTranslateBuildSemantics([
      row(['I', 'am'], ['I', 'am']),
    ])).toThrow('translate_build_trap_count');
    expect(() => apply.assertTranslateBuildSemantics([
      row(['I', 'am'], ['I', 'am', 'one', 'two']),
    ])).toThrow('translate_build_trap_count');
  });

  test('keeps rollback able to remove the pinned legacy two-trap bundle', () => {
    expect(() => rollback.assertRollbackTranslateBuildSemantics([{
      id: 'two-trap-task',
      data: {
        mode: 'translate_build',
        payload: {
          correctTokens: ['We', 'go'],
          correctTokenCount: 2,
          wordBank: ['trap-a', 'We', 'go', 'trap-b'],
        },
      },
    }])).not.toThrow();
  });

  test('blocks removal when active or future rooms reference backed-up task ids', () => {
    const nowMs = 1_000;
    const rooms = [
      { id: 'active', data: { state: 'round2', startsAt: 900, rounds: [{ taskIds: ['old-a'] }] } },
      { id: 'future-closed', data: { state: 'closed', startsAt: 2_000, rounds: [{ taskIds: ['old-b'] }] } },
      { id: 'past-closed', data: { state: 'closed', startsAt: 500, rounds: [{ taskIds: ['old-a'] }] } },
      { id: 'unrelated', data: { state: 'scheduled', startsAt: 2_000, rounds: [{ taskIds: ['new-a'] }] } },
    ];

    expect(Array.from(apply.findBlockingRoomReferences(rooms, new Set(['old-a', 'old-b']), nowMs), (x: any) => x.roomId))
      .toEqual(['active', 'future-closed']);
    expect(Array.from(rollback.findBlockingRoomReferences(rooms, new Set(['old-a', 'old-b']), nowMs), (x: any) => x.roomId))
      .toEqual(['active', 'future-closed']);
  });

  test('fails closed on malformed room state when it references a removable id', () => {
    const blockers = apply.findBlockingRoomReferences([
      { id: 'malformed', data: { startsAt: 0, rounds: [{ taskIds: ['old-a'] }] } },
    ], new Set(['old-a']), 1_000);
    expect(blockers).toHaveLength(1);
  });

  test('allows a retained rewards room only after every removable task secret validates', async () => {
    const requested: string[] = [];
    const result = await apply.inspectRoomReferenceSafety({
      roomRows: [{
        id: 'rewards-complete',
        data: {
          state: 'rewards',
          startsAt: 500,
          reviewRetentionUntilMs: 2_000,
          rounds: [
            { taskIds: ['old-a', 'new-a'] },
            { taskIds: ['old-b', 'old-a'] },
          ],
        },
      }],
      removableIds: new Set(['old-a', 'old-b']),
      nowMs: 1_000,
      readTaskSecrets: async (_roomId: string, taskIds: string[]) => {
        requested.push(...taskIds);
        return taskIds.map((taskId) => ({
          id: taskId,
          exists: true,
          data: { taskId, verified: true },
        }));
      },
      validateTaskSecret: (_taskId: string, data: any) => data.verified === true,
    });

    expect(requested).toEqual(['old-a', 'old-b']);
    expect(result.blockers).toEqual([]);
    expect(result.evidence).toEqual({
      roomsScanned: 1,
      referencedRoomsScanned: 1,
      retainedRewardsRoomsValidated: 1,
      taskSecretsRead: 2,
      taskSecretsValidated: 2,
    });
  });

  test.each([
    ['missing', [{ id: 'old-a', exists: false, data: undefined }], 'task_secret_missing'],
    ['mismatched', [{ id: 'old-a', exists: true, data: { taskId: 'some-other-task', verified: true } }], 'task_secret_identity_invalid'],
    ['invalid', [{ id: 'old-a', exists: true, data: { taskId: 'old-a', verified: false } }], 'task_secret_invalid'],
  ])('keeps a rewards room blocking when a removable secret is %s', async (_label, secrets, reason) => {
    const result = await apply.inspectRoomReferenceSafety({
      roomRows: [{
        id: 'unsafe-rewards',
        data: {
          state: 'rewards', startsAt: 500, reviewRetentionUntilMs: 2_000,
          rounds: [{ taskIds: ['old-a'] }],
        },
      }],
      removableIds: new Set(['old-a']),
      nowMs: 1_000,
      readTaskSecrets: async () => secrets,
      validateTaskSecret: (_taskId: string, data: any) => data.verified === true,
    });

    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0]).toMatchObject({ roomId: 'unsafe-rewards', reason });
    expect(result.evidence.retainedRewardsRoomsValidated).toBe(0);
  });

  test('keeps unfinished, expired-retention, future, and malformed rooms blocking without reading secrets', async () => {
    const readTaskSecrets = jest.fn(async () => []);
    const result = await apply.inspectRoomReferenceSafety({
      roomRows: [
        ...['lobby', 'round1', 'table', 'final', 'results'].map((state) => ({
          id: state, data: { state, startsAt: 500, rounds: [{ taskIds: ['old-a'] }] },
        })),
        { id: 'expired-rewards', data: { state: 'rewards', startsAt: 500, reviewRetentionUntilMs: 999, rounds: [{ taskIds: ['old-a'] }] } },
        { id: 'future-rewards', data: { state: 'rewards', startsAt: 1_001, reviewRetentionUntilMs: 2_000, rounds: [{ taskIds: ['old-a'] }] } },
        { id: 'malformed-rewards', data: { state: 'rewards', reviewRetentionUntilMs: 2_000, rounds: [{ taskIds: ['old-a'] }] } },
        { id: 'malformed', data: { startsAt: 500, rounds: [{ taskIds: ['old-a'] }] } },
      ],
      removableIds: new Set(['old-a']),
      nowMs: 1_000,
      readTaskSecrets,
      validateTaskSecret: () => true,
    });

    expect(Array.from(result.blockers, (blocker: any) => blocker.roomId)).toEqual([
      'lobby', 'round1', 'table', 'final', 'results', 'expired-rewards', 'future-rewards',
      'malformed-rewards', 'malformed',
    ]);
    expect(readTaskSecrets).not.toHaveBeenCalled();
  });

  test('preflight reads retained rewards evidence from the room taskSecrets subcollection', async () => {
    const secretRef = { id: 'old-a', path: 'tournamentRooms/rewards-room/taskSecrets/old-a' };
    const roomRef = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn((taskId: string) => ({ ...secretRef, id: taskId, path: `tournamentRooms/rewards-room/${name}/${taskId}` })),
      })),
    };
    const roomsCollection = {
      get: jest.fn(async () => ({
        docs: [{
          id: 'rewards-room',
          data: () => ({
            state: 'rewards', startsAt: 500, reviewRetentionUntilMs: Date.now() + 60_000,
            rounds: [{ taskIds: ['old-a'] }],
          }),
        }],
      })),
      doc: jest.fn(() => roomRef),
    };
    const db = {
      collection: jest.fn(() => roomsCollection),
      getAll: jest.fn(async (...refs: any[]) => refs.map((ref) => ({
        id: ref.id, exists: true, data: () => ({ taskId: ref.id, verified: true }),
      }))),
    };

    const evidence = await apply.assertNoProtectedRoomReferences(
      db, new Set(['old-a']), 'test_preflight', (_taskId: string, data: any) => data.verified === true,
    );

    expect(db.getAll).toHaveBeenCalledTimes(1);
    expect(db.getAll.mock.calls[0][0].path).toBe(secretRef.path);
    expect(evidence).toMatchObject({
      roomsScanned: 1,
      retainedRewardsRoomsValidated: 1,
      taskSecretsRead: 1,
      taskSecretsValidated: 1,
    });
  });

  test('requires independent artifact hashes and a frozen zero-write manifest', () => {
    const backup = Buffer.from('{"id":"old"}\n');
    const next = Buffer.from('{"id":"new"}\n');
    const digest = (value: Buffer) => require('node:crypto').createHash('sha256').update(value).digest('hex');
    const manifest = {
      kind: 'tournament_pool_v2_replacement_dry_run_v1',
      projectId: 'phraseman-ea0b3',
      generated: { poolVersion: 'tpool_20260801_v5', taskCount: 180 },
      exactProposedMutations: { stageNewCreates: 180, finalDocuments: 180 },
      gates: { strictValidatorInvalid: 0, oldPoolUntouched: true, productionWritesPerformed: 0 },
      artifacts: { backupSha256: digest(backup), newPoolSha256: digest(next) },
    };

    expect(() => apply.assertPinnedBundle(
      manifest, Buffer.from('{}'), backup, next, digest(backup), digest(next),
    )).not.toThrow();
    expect(() => apply.assertPinnedBundle(
      manifest, Buffer.from('{}'), backup, next, '0'.repeat(64), digest(next),
    )).toThrow('backup_hash_pin_mismatch');
    expect(() => apply.assertPinnedBundle(
      { ...manifest, gates: { ...manifest.gates, oldPoolUntouched: false } },
      Buffer.from('{}'), backup, next, digest(backup), digest(next),
    )).toThrow();
  });

  test('acquires and releases the shared generation barrier with owner checks', async () => {
    expect(apply.POOL_BARRIER_COLLECTION).toBe('tournamentPrivateState');
    expect(apply.POOL_BARRIER_DOC).toBe('task_pool_generation_v1');
    expect(apply.POOL_BARRIER_KIND).toBe('tournament_task_pool_barrier_v1');

    let barrier = {
      kind: apply.POOL_BARRIER_KIND,
      state: 'ready',
      generation: 'legacy:backup-sha',
      revision: 7,
    };
    const ref = { path: `${apply.POOL_BARRIER_COLLECTION}/${apply.POOL_BARRIER_DOC}` };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => ref) })),
      runTransaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback({
        get: jest.fn(async () => ({ exists: true, data: () => ({ ...barrier }) })),
        set: jest.fn((_ref, data) => { barrier = { ...data }; }),
      })),
    };

    await apply.acquirePoolMigrationBarrier(db, {
      expectedGeneration: 'legacy:backup-sha',
      targetGeneration: 'tpool_20260801_v5',
      migrationId: 'apply:manifest-sha',
    });
    expect(barrier).toMatchObject({
      state: 'migrating',
      generation: 'legacy:backup-sha',
      targetGeneration: 'tpool_20260801_v5',
      migrationId: 'apply:manifest-sha',
      revision: 8,
    });

    await expect(apply.releasePoolMigrationBarrier(db, {
      expectedGeneration: 'legacy:backup-sha',
      targetGeneration: 'tpool_20260801_v5',
      migrationId: 'some-other-owner',
    })).rejects.toThrow('pool_barrier_owner_mismatch');

    await apply.releasePoolMigrationBarrier(db, {
      expectedGeneration: 'legacy:backup-sha',
      targetGeneration: 'tpool_20260801_v5',
      migrationId: 'apply:manifest-sha',
    });
    expect(barrier).toMatchObject({
      state: 'ready',
      generation: 'tpool_20260801_v5',
      revision: 9,
    });
    expect(barrier).not.toHaveProperty('migrationId');
    expect(barrier).not.toHaveProperty('targetGeneration');
  });

  test('resumes the pinned apply owner from an exact staged old-plus-new pool', () => {
    const sourceGeneration = `legacy:${'a'.repeat(64)}`;
    const migrationId = `apply:${'b'.repeat(64)}`;
    const oldRows = [{
      id: 'old-a', data: { taskId: 'old-a', value: 1 },
      createTime: '2026-07-29T00:00:00.000Z', updateTime: '2026-07-29T00:00:00.000Z',
    }];
    const newRows = [{ id: 'new-a', data: { taskId: 'new-a', value: 2 } }];

    const recovery = apply.planApplyPoolRecovery({
      currentRows: [...oldRows, ...newRows],
      backupRows: oldRows,
      newRows,
      barrier: {
        kind: apply.POOL_BARRIER_KIND,
        state: 'migrating',
        generation: sourceGeneration,
        targetGeneration: apply.EXPECTED_VERSION,
        migrationId,
        revision: 4,
      },
      sourceGeneration,
      targetGeneration: apply.EXPECTED_VERSION,
      migrationId,
    });

    expect(recovery).toEqual({
      phase: 'staged',
      createNew: false,
      remainingOldIds: ['old-a'],
      resumed: true,
    });
  });

  test('fails closed when staged apply documents are not protected by the pinned owner barrier', () => {
    expect(() => apply.planApplyPoolRecovery({
      currentRows: [
        { id: 'old-a', data: { taskId: 'old-a' } },
        { id: 'new-a', data: { taskId: 'new-a' } },
      ],
      backupRows: [{ id: 'old-a', data: { taskId: 'old-a' } }],
      newRows: [{ id: 'new-a', data: { taskId: 'new-a' } }],
      barrier: {
        kind: apply.POOL_BARRIER_KIND,
        state: 'migrating',
        generation: `legacy:${'a'.repeat(64)}`,
        targetGeneration: apply.EXPECTED_VERSION,
        migrationId: `apply:${'c'.repeat(64)}`,
        revision: 2,
      },
      sourceGeneration: `legacy:${'a'.repeat(64)}`,
      targetGeneration: apply.EXPECTED_VERSION,
      migrationId: `apply:${'b'.repeat(64)}`,
    })).toThrow('apply_manual_recovery_required:staged_pool_without_owned_barrier');
  });

  test('rollback takes over only the exact pinned interrupted apply barrier and can then resume', async () => {
    const sourceGeneration = `legacy:${'a'.repeat(64)}`;
    const applyMigrationId = `apply:${'b'.repeat(64)}`;
    const rollbackMigrationId = `rollback:${'b'.repeat(64)}`;
    let barrier = {
      kind: apply.POOL_BARRIER_KIND,
      state: 'migrating',
      generation: sourceGeneration,
      targetGeneration: apply.EXPECTED_VERSION,
      migrationId: applyMigrationId,
      revision: 8,
      acquiredAt: '2026-07-29T00:00:00.000Z',
    };
    const ref = { path: `${apply.POOL_BARRIER_COLLECTION}/${apply.POOL_BARRIER_DOC}` };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => ref) })),
      runTransaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback({
        get: jest.fn(async () => ({ exists: true, data: () => ({ ...barrier }) })),
        set: jest.fn((_ref, data) => { barrier = { ...data }; }),
      })),
    };
    const options = {
      expectedGeneration: apply.EXPECTED_VERSION,
      targetGeneration: sourceGeneration,
      migrationId: rollbackMigrationId,
      interruptedApply: {
        expectedGeneration: sourceGeneration,
        targetGeneration: apply.EXPECTED_VERSION,
        migrationId: applyMigrationId,
      },
    };

    const takeover = await rollback.acquirePoolRollbackBarrier(db, options);
    expect(takeover).toMatchObject({ resumed: false, recoveredInterruptedApply: true, revision: 9 });
    expect(barrier).toMatchObject({
      state: 'migrating',
      generation: apply.EXPECTED_VERSION,
      targetGeneration: sourceGeneration,
      migrationId: rollbackMigrationId,
      recoveredFromMigrationId: applyMigrationId,
      revision: 9,
    });

    const resumed = await rollback.acquirePoolRollbackBarrier(db, options);
    expect(resumed).toMatchObject({ resumed: true, recoveredInterruptedApply: false, revision: 9 });
  });

  test('rollback audit counts only the release write when barrier acquisition resumes', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'scripts', 'rollback-tournament-pool-v2.cjs'),
      'utf8',
    );

    expect(source).toMatch(
      /productionWrites:\s*missingOld\.length\s*\+\s*verifiedNewDocs\.length\s*\+\s*\(barrierAcquisition\.resumed\s*\?\s*1\s*:\s*2\)/u,
    );
  });

  test('rollback emits precise manual-recovery evidence for an unknown migrating owner', async () => {
    const sourceGeneration = `legacy:${'a'.repeat(64)}`;
    const barrier = {
      kind: apply.POOL_BARRIER_KIND,
      state: 'migrating',
      generation: sourceGeneration,
      targetGeneration: apply.EXPECTED_VERSION,
      migrationId: `apply:${'c'.repeat(64)}`,
      revision: 12,
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ path: 'barrier' })) })),
      runTransaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback({
        get: jest.fn(async () => ({ exists: true, data: () => ({ ...barrier }) })),
        set: jest.fn(),
      })),
    };

    await expect(rollback.acquirePoolRollbackBarrier(db, {
      expectedGeneration: apply.EXPECTED_VERSION,
      targetGeneration: sourceGeneration,
      migrationId: `rollback:${'b'.repeat(64)}`,
      interruptedApply: {
        expectedGeneration: sourceGeneration,
        targetGeneration: apply.EXPECTED_VERSION,
        migrationId: `apply:${'b'.repeat(64)}`,
      },
    })).rejects.toThrow(
      `rollback_manual_recovery_required:unknown_barrier_owner:state=migrating:generation=${sourceGeneration}:target=${apply.EXPECTED_VERSION}:migrationId=apply:${'c'.repeat(64)}:revision=12`,
    );
  });
});
