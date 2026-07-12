const QUEUE_KEY = 'progress_server_event_queue_v1';
const MIGRATED_KEY = 'progress_server_snapshot_migrated_v1';
const BASELINE_KEY = 'progress_server_snapshot_baseline_v1';
const DEAD_LETTER_KEY = 'progress_server_event_dead_letter_v1';
let activeStableId = 'stable-1';
const ownedKey = (base: string, stableId = activeStableId) =>
  `${base}:${encodeURIComponent(stableId)}`;

type CallableHandlers = Record<string, jest.Mock<Promise<unknown>, [unknown]>>;

function callableMock(fn: (payload: unknown) => Promise<unknown>): jest.Mock<Promise<unknown>, [unknown]> {
  return jest.fn(fn);
}

function progressResult(overrides: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    stableUid: 'stable-1',
    eventId: 'event-1',
    type: 'lesson_answer' as const,
    duplicate: false,
    xpDelta: 10,
    totalXp: 110,
    level: 2,
    streakCount: 3,
    activeDate: '2026-06-13',
    weekKey: '2026-06-08',
    weekXp: 40,
    ...overrides,
  };
}

async function loadClient(
  handlers: CallableHandlers,
  stableId = 'stable-1',
  appCheckReadiness: { value: boolean } = { value: true },
) {
  jest.resetModules();
  activeStableId = stableId;
  const reconcileLevelUpRewards = jest.fn(async () => []);
  const accountGeneration = { generation: 1, stableId };

  jest.doMock('../app/config', () => ({
    CLOUD_SYNC_ENABLED: true,
    IS_EXPO_GO: false,
  }));
  jest.doMock('../app/cloud_sync', () => ({
    ensureAnonUser: jest.fn(async () => activeStableId),
  }));
  jest.doMock('../app/user_id_policy', () => ({
    getCanonicalUserId: jest.fn(async () => activeStableId),
  }));
  jest.doMock('../app/app_check_init', () => ({
    initFirebaseAppCheckIfAvailable: jest.fn(async () => appCheckReadiness.value),
  }));
  jest.doMock('../app/level_up_reward_reconciler', () => ({
    reconcileLevelUpRewards,
  }));
  jest.doMock('../app/account_generation', () => ({
    captureAccountGeneration: jest.fn(() => ({
      generation: accountGeneration.generation,
      stableId: accountGeneration.stableId,
      phase: 'active',
    })),
    isCurrentAccountGeneration: jest.fn((token, expectedStableId) => (
      token.generation === accountGeneration.generation
      && token.stableId === accountGeneration.stableId
      && expectedStableId === accountGeneration.stableId
    )),
    withAccountTransitionLock: jest.fn(async (work) => work()),
  }));
  jest.doMock('@react-native-firebase/app', () => ({
    getApp: jest.fn(() => ({})),
  }));
  jest.doMock('@react-native-firebase/functions', () => ({
    getFunctions: jest.fn(() => ({})),
    httpsCallable: jest.fn((_functions, name: string) => {
      const handler = handlers[name];
      if (!handler) throw new Error(`missing_handler_${name}`);
      return handler;
    }),
  }));
  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: {
      expoConfig: { version: '1.5.42-test' },
      manifest2: null,
    },
  }));

  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default as typeof import('@react-native-async-storage/async-storage').default & {
    __reset?: () => void;
  };
  AsyncStorage.__reset?.();

  const client = await import('../app/progress_events_client');
  return { AsyncStorage, client, reconcileLevelUpRewards, accountGeneration };
}

describe('progress events client durable queue', () => {
  it('keeps queued progress offline until App Check recovers', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async (event: unknown) => ({
        data: progressResult({ eventId: (event as { eventId: string }).eventId }),
      })),
    };
    const readiness = { value: false };
    const { AsyncStorage, client } = await loadClient(handlers, 'stable-1', readiness);

    await expect(client.submitProgressEvent({
      eventId: 'lesson:answer:app-check-pending',
      type: 'lesson_answer',
      payload: { xpDelta: 10 },
    })).rejects.toThrow('progress_event_pending');

    expect(handlers.progressMigrateSnapshot).not.toHaveBeenCalled();
    expect(handlers.progressSubmitEvent).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(ownedKey(MIGRATED_KEY))).toBeNull();
    expect(JSON.parse(String(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))))).toHaveLength(1);

    readiness.value = true;
    await expect(client.flushPendingProgressEvents()).resolves.toBe(1);
    expect(handlers.progressSubmitEvent).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))).toBe('[]');
  });

  it('marks migration only after the server accepts the local snapshot', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '42');

    await client.ensureProgressSnapshotMigrated();

    expect(handlers.progressMigrateSnapshot).toHaveBeenCalledTimes(1);
    expect(handlers.progressMigrateSnapshot.mock.calls[0][0]).toMatchObject({
      stableId: 'stable-1',
      progress: { user_total_xp: '42' },
    });
    expect(await AsyncStorage.getItem(ownedKey(MIGRATED_KEY))).toBe('1');

    await client.ensureProgressSnapshotMigrated();
    expect(handlers.progressMigrateSnapshot).toHaveBeenCalledTimes(1);
  });

  it('does not mark migration when the server rejects the snapshot', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => {
        throw new Error('offline');
      }),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client } = await loadClient(handlers);

    await expect(client.ensureProgressSnapshotMigrated()).rejects.toThrow('offline');

    expect(await AsyncStorage.getItem(ownedKey(MIGRATED_KEY))).toBeNull();
  });

  it('uses a frozen migration baseline for optimistic local XP updates', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async (event: unknown) => ({
        data: progressResult({ eventId: (event as { eventId: string }).eventId }),
      })),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '42');

    const baseline = await client.prepareProgressMigrationSnapshot();
    await AsyncStorage.setItem('user_total_xp', '142');
    await client.submitProgressEvent({
      eventId: 'lesson:answer:optimistic',
      type: 'lesson_answer',
      payload: { xpDelta: 100 },
    }, { migrationSnapshot: baseline });

    expect(handlers.progressMigrateSnapshot.mock.calls[0][0]).toMatchObject({
      stableId: 'stable-1',
      progress: { user_total_xp: '42' },
    });
    expect(await AsyncStorage.getItem(ownedKey(BASELINE_KEY))).toBeNull();
  });

  it('queues the current event when migration is temporarily unavailable', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => {
        throw new Error('offline');
      }),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '42');

    const baseline = await client.prepareProgressMigrationSnapshot();
    await AsyncStorage.setItem('user_total_xp', '142');
    await expect(client.submitProgressEvent({
      eventId: 'lesson:answer:migration-offline',
      type: 'lesson_answer',
      payload: { xpDelta: 100 },
    }, { migrationSnapshot: baseline })).rejects.toThrow('offline');

    const queued = JSON.parse(String(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))));
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      eventId: 'lesson:answer:migration-offline',
      type: 'lesson_answer',
      stableId: 'stable-1',
      payload: { xpDelta: 100 },
    });
    expect(handlers.progressSubmitEvent).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(ownedKey(MIGRATED_KEY))).toBeNull();
    expect(JSON.parse(String(await AsyncStorage.getItem(ownedKey(BASELINE_KEY))))).toMatchObject({
      ownerStableUid: 'stable-1',
      progress: { user_total_xp: '42' },
    });
  });

  it('persists a failed event once and retries it later through flush', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => {
        throw new Error('offline');
      }),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    const request = {
      eventId: 'lesson:answer:stable',
      type: 'lesson_answer' as const,
      payload: { xp: 10, lessonId: 1 },
    };

    await expect(client.submitProgressEvent(request)).rejects.toThrow('progress_event_pending');
    await expect(client.submitProgressEvent(request)).rejects.toThrow('progress_event_pending');

    const queuedRaw = await AsyncStorage.getItem(ownedKey(QUEUE_KEY));
    const queued = JSON.parse(String(queuedRaw));
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      eventId: 'lesson:answer:stable',
      type: 'lesson_answer',
      stableId: 'stable-1',
      appVersion: '1.5.42-test',
      platform: 'ios',
      payload: { xp: 10, lessonId: 1 },
    });

    handlers.progressSubmitEvent.mockImplementation(async (event: unknown) => ({
      data: progressResult({
        eventId: (event as { eventId: string }).eventId,
        totalXp: 120,
        weekXp: 50,
      }),
    }));

    await expect(client.flushPendingProgressEvents()).resolves.toBe(1);
    expect(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))).toBe('[]');
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('120');
    expect(await AsyncStorage.getItem('weekly_xp')).toBe('50');
  });

  it('queues the current event when an older pending event blocks submit', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => {
        throw new Error('still_offline');
      }),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    await AsyncStorage.setItem(ownedKey(QUEUE_KEY), JSON.stringify([{
      eventId: 'old-event',
      type: 'lesson_answer',
      clientLocalDate: '2026-06-13',
      clientCreatedAt: 1,
      appVersion: 'old',
      platform: 'ios',
      stableId: 'stable-1',
      payload: { xp: 1 },
    }]));

    await expect(client.submitProgressEvent({
      eventId: 'new-event',
      type: 'quiz_answer',
      payload: { xp: 2 },
    })).rejects.toThrow('progress_event_pending');

    const queued = JSON.parse(String(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))));
    expect(queued.map((event: { eventId: string }) => event.eventId)).toEqual(['old-event', 'new-event']);
  });

  it('keeps a fresher local streak when a stale server result is mirrored', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    await AsyncStorage.multiSet([
      ['streak_count', '60'],
      ['last_active_date', '2026-06-13'],
      ['streak_last_date', '2026-06-13'],
    ]);

    await client.mirrorProgressResultToLocal(progressResult({ streakCount: 3, activeDate: '2026-06-13' }));

    expect(await AsyncStorage.getItem('streak_count')).toBe('60');
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-06-13');
  });

  it('does not let a late server mirror reduce local total or current-week XP', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    await AsyncStorage.multiSet([
      ['user_total_xp', '500'],
      ['weekly_xp', '300'],
      ['weekly_xp_period_start', '2026-06-08'],
      ['week_points_v2', JSON.stringify({ weekKey: '2026-W24', points: 350 })],
    ]);

    await client.mirrorProgressResultToLocal(progressResult({
      totalXp: 110,
      weekKey: '2026-W24',
      weekXp: 40,
      activeDate: '2026-06-13',
    }));

    expect(await AsyncStorage.getItem('user_total_xp')).toBe('500');
    expect(await AsyncStorage.getItem('weekly_xp')).toBe('350');
    expect(await AsyncStorage.getItem('week_points')).toBe('350');
    expect(await AsyncStorage.getItem('week_points_v2')).toBe(JSON.stringify({ weekKey: '2026-W24', points: 350 }));
  });

  it('reconciles a positive non-duplicate server XP advance after the local mirror', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '50');

    await client.mirrorProgressResultToLocal(progressResult({ xpDelta: 100, totalXp: 150, duplicate: false }));

    expect(reconcileLevelUpRewards).toHaveBeenCalledWith(50, 150);
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('150');
  });

  it('reconciles only the fresh server event interval when local XP is missing history', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '50');

    await client.mirrorProgressResultToLocal(progressResult({ xpDelta: 100, totalXp: 5000, duplicate: false }));

    expect(reconcileLevelUpRewards).toHaveBeenCalledWith(4900, 5000);
  });

  it.each([
    ['duplicate response', { duplicate: true, xpDelta: 100, totalXp: 150 }],
    ['zero delta', { duplicate: false, xpDelta: 0, totalXp: 150 }],
    ['negative delta', { duplicate: false, xpDelta: -10, totalXp: 150 }],
    ['non-finite delta', { duplicate: false, xpDelta: Number.POSITIVE_INFINITY, totalXp: 150 }],
    ['stale server total', { duplicate: false, xpDelta: 100, totalXp: 40 }],
  ])('does not reconcile level rewards for a %s', async (_label, overrides) => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '50');

    await client.mirrorProgressResultToLocal(progressResult(overrides));

    expect(reconcileLevelUpRewards).not.toHaveBeenCalled();
  });

  it.each([
    ['string delta', { xpDelta: '100', totalXp: 150 }],
    ['boolean delta', { xpDelta: true, totalXp: 150 }],
    ['fractional delta', { xpDelta: 100.5, totalXp: 150 }],
    ['unsafe delta', { xpDelta: Number.MAX_SAFE_INTEGER + 1, totalXp: Number.MAX_SAFE_INTEGER + 1 }],
    ['missing delta', { xpDelta: undefined, totalXp: 150 }],
    ['string total', { xpDelta: 100, totalXp: '150' }],
    ['boolean total', { xpDelta: 1, totalXp: true }],
    ['fractional total', { xpDelta: 100, totalXp: 150.5 }],
    ['unsafe total', { xpDelta: 100, totalXp: Number.MAX_SAFE_INTEGER + 1 }],
    ['missing total', { xpDelta: 100, totalXp: undefined }],
    ['delta greater than total', { xpDelta: 151, totalXp: 150 }],
  ])('does not reconcile rewards for a %s', async (_label, overrides) => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '50');

    await client.mirrorProgressResultToLocal(progressResult({ duplicate: false, ...overrides }));

    expect(reconcileLevelUpRewards).not.toHaveBeenCalled();
  });

  it('does not apply a queued response after the account generation changes', async () => {
    let resolveSubmit!: (value: unknown) => void;
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(() => new Promise((resolve) => { resolveSubmit = resolve; })),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards, accountGeneration } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '50');

    const submission = client.submitProgressEvent({
      eventId: 'lesson:answer:account-race',
      type: 'lesson_answer',
      payload: { xpDelta: 100 },
    });
    await new Promise((resolve) => setImmediate(resolve));
    accountGeneration.generation += 1;
    accountGeneration.stableId = 'stable-2';
    resolveSubmit({ data: progressResult({
      eventId: 'lesson:answer:account-race',
      stableUid: 'stable-1',
      xpDelta: 100,
      totalXp: 150,
    }) });

    await expect(submission).resolves.toMatchObject({ eventId: 'lesson:answer:account-race' });
    const progressWrites = (AsyncStorage.multiSet as jest.Mock).mock.calls.filter(([pairs]) => (
      pairs.some(([key]: [string, string]) => key === 'user_total_xp')
    ));
    expect(progressWrites).toHaveLength(0);
    expect(reconcileLevelUpRewards).not.toHaveBeenCalled();
  });

  it('dead-letters an owner mismatch and continues with the next queued event', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async (event: unknown) => {
        const row = event as { eventId: string };
        return {
          data: progressResult(row.eventId === 'wrong-owner'
            ? { eventId: row.eventId, stableUid: 'stable-2', xpDelta: 100, totalXp: 150 }
            : { eventId: row.eventId, stableUid: 'stable-1', xpDelta: 10, totalXp: 160 }),
        };
      }),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards } = await loadClient(handlers);
    const queued = (eventId: string) => ({
      eventId,
      type: 'lesson_answer',
      clientLocalDate: '2026-07-10',
      clientCreatedAt: 1,
      appVersion: 'test',
      platform: 'ios',
      stableId: 'stable-1',
      payload: { xpDelta: 10 },
    });
    await AsyncStorage.multiSet([
      [ownedKey(MIGRATED_KEY), '1'],
      [ownedKey(QUEUE_KEY), JSON.stringify([queued('wrong-owner'), queued('valid-owner')])],
      ['user_total_xp', '50'],
    ]);

    await expect(client.flushPendingProgressEvents()).resolves.toBe(1);

    expect(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))).toBe('[]');
    const deadLetters = JSON.parse(String(await AsyncStorage.getItem(ownedKey(DEAD_LETTER_KEY))));
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toMatchObject({ event: { eventId: 'wrong-owner' } });
    expect(reconcileLevelUpRewards).toHaveBeenCalledTimes(1);
    expect(reconcileLevelUpRewards).toHaveBeenCalledWith(150, 160);
  });

  it('does not resurrect a direct-submit owner mismatch after dead-lettering it', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async (event: unknown) => ({
        data: progressResult({
          eventId: (event as { eventId: string }).eventId,
          stableUid: 'stable-2',
          xpDelta: 100,
          totalXp: 150,
        }),
      })),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards } = await loadClient(handlers);

    await expect(client.submitProgressEvent({
      eventId: 'direct-wrong-owner',
      type: 'lesson_answer',
      payload: { xpDelta: 100 },
    })).rejects.toThrow('progress_event_terminal');

    expect(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))).toBe('[]');
    const deadLetters = JSON.parse(String(await AsyncStorage.getItem(ownedKey(DEAD_LETTER_KEY))));
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toMatchObject({ event: { eventId: 'direct-wrong-owner' } });
    expect(reconcileLevelUpRewards).not.toHaveBeenCalled();
  });

  it('does not resurrect a direct owner mismatch when dead-letter persistence fails', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async (event: unknown) => ({
        data: progressResult({
          eventId: (event as { eventId: string }).eventId,
          stableUid: 'stable-2',
          xpDelta: 100,
          totalXp: 150,
        }),
      })),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards } = await loadClient(handlers);
    const setItem = AsyncStorage.setItem as jest.Mock;
    const defaultSetItem = setItem.getMockImplementation()!;
    setItem.mockImplementation((key: string, value: string) => (
      key === ownedKey(DEAD_LETTER_KEY)
        ? Promise.reject(new Error('dead_letter_storage_failed'))
        : defaultSetItem(key, value)
    ));

    await expect(client.submitProgressEvent({
      eventId: 'direct-wrong-owner-storage-failure',
      type: 'lesson_answer',
      payload: { xpDelta: 100 },
    })).rejects.toThrow('progress_event_terminal');

    expect(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))).toBe('[]');
    expect(handlers.progressSubmitEvent).toHaveBeenCalledTimes(1);
    expect(reconcileLevelUpRewards).not.toHaveBeenCalled();
  });

  it.each([
    ['missing duplicate marker', { duplicate: undefined }],
    ['non-boolean duplicate marker', { duplicate: 'false' }],
  ])('mirrors XP but does not reconcile when the response has a %s', async (_label, overrides) => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client, reconcileLevelUpRewards } = await loadClient(handlers);
    await AsyncStorage.setItem('user_total_xp', '50');

    await client.mirrorProgressResultToLocal(progressResult({ xpDelta: 100, totalXp: 150, ...overrides }));

    expect(await AsyncStorage.getItem('user_total_xp')).toBe('150');
    expect(reconcileLevelUpRewards).not.toHaveBeenCalled();
  });

  it('does not carry stale previous-week local XP into a new server week', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    await AsyncStorage.multiSet([
      ['weekly_xp', '9999'],
      ['weekly_xp_period_start', '2026-06-01'],
      ['week_points_v2', JSON.stringify({ weekKey: '2026-W23', points: 9999 })],
    ]);

    await client.mirrorProgressResultToLocal(progressResult({
      weekKey: '2026-W24',
      weekXp: 40,
      activeDate: '2026-06-13',
    }));

    expect(await AsyncStorage.getItem('weekly_xp')).toBe('40');
    expect(await AsyncStorage.getItem('week_points')).toBe('40');
    expect(await AsyncStorage.getItem('week_points_v2')).toBe(JSON.stringify({ weekKey: '2026-W24', points: 40 }));
  });

  it('sends local streak evidence with progress events', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    await AsyncStorage.multiSet([
      ['streak_count', '60'],
      ['last_active_date', '2026-06-13'],
    ]);

    await client.submitProgressEvent({
      eventId: 'lesson:answer:streak-evidence',
      type: 'lesson_answer',
      payload: { xp: 10 },
    });

    expect(handlers.progressSubmitEvent.mock.calls[0][0]).toMatchObject({
      payload: {
        xp: 10,
        clientStreakCount: '60',
        clientLastActiveDate: '2026-06-13',
      },
    });
  });

  it('keeps the 101st queued event instead of silently slicing it away', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => {
        throw new Error('offline');
      }),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    const existing = Array.from({ length: 100 }, (_, index) => ({
      eventId: `event-${index}`,
      type: 'lesson_answer',
      clientLocalDate: '2026-07-10',
      clientCreatedAt: index,
      appVersion: 'test',
      platform: 'ios',
      stableId: 'stable-1',
      payload: { xpDelta: 1 },
    }));
    await AsyncStorage.multiSet([
      [ownedKey(MIGRATED_KEY), '1'],
      [ownedKey(QUEUE_KEY), JSON.stringify(existing)],
    ]);

    await expect(client.submitProgressEvent({
      eventId: 'event-100',
      type: 'lesson_answer',
      payload: { xpDelta: 1 },
    })).rejects.toThrow('progress_event_pending');

    expect(JSON.parse(String(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))))).toHaveLength(101);
  });

  it('moves permanent poison events to bounded dead-letter and continues the queue', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async (event: unknown) => {
        const eventId = (event as { eventId: string }).eventId;
        if (eventId === 'poison') {
          throw Object.assign(new Error('bad payload'), { code: 'functions/invalid-argument' });
        }
        return { data: progressResult({ eventId }) };
      }),
    };
    const { AsyncStorage, client } = await loadClient(handlers);
    const makeQueued = (eventId: string) => ({
      eventId,
      type: 'lesson_answer',
      clientLocalDate: '2026-07-10',
      clientCreatedAt: 1,
      appVersion: 'test',
      platform: 'ios',
      stableId: 'stable-1',
      payload: { xpDelta: 1 },
    });
    await AsyncStorage.multiSet([
      [ownedKey(MIGRATED_KEY), '1'],
      [ownedKey(QUEUE_KEY), JSON.stringify([makeQueued('poison'), makeQueued('valid')])],
    ]);

    await expect(client.flushPendingProgressEvents()).resolves.toBe(1);
    expect(await AsyncStorage.getItem(ownedKey(QUEUE_KEY))).toBe('[]');
    const deadLetters = JSON.parse(String(await AsyncStorage.getItem(ownedKey(DEAD_LETTER_KEY))));
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toMatchObject({
      event: { eventId: 'poison', stableId: 'stable-1' },
      diagnostic: 'functions/invalid-argument',
    });
  });

  it('does not let account A queue or baseline block account B', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async (event: unknown) => {
        const row = event as { eventId: string; stableId: string };
        if (row.stableId === 'account-A') throw new Error('offline-A');
        return { data: progressResult({ stableUid: row.stableId, eventId: row.eventId }) };
      }),
    };
    const { AsyncStorage, client } = await loadClient(handlers, 'account-A');
    await AsyncStorage.setItem('user_total_xp', '111');
    await client.prepareProgressMigrationSnapshot();
    await expect(client.submitProgressEvent({
      eventId: 'A-event',
      type: 'lesson_answer',
      payload: { xpDelta: 1 },
    })).rejects.toThrow('progress_event_pending');

    activeStableId = 'account-B';
    await AsyncStorage.setItem('user_total_xp', '222');
    await client.prepareProgressMigrationSnapshot();
    await expect(client.submitProgressEvent({
      eventId: 'B-event',
      type: 'lesson_answer',
      payload: { xpDelta: 1 },
    })).resolves.toMatchObject({ eventId: 'B-event' });
    expect(await client.hasPendingProgressServerEvents()).toBe(false);

    expect(await AsyncStorage.getItem(ownedKey(BASELINE_KEY, 'account-A'))).toBeNull();
    expect(await AsyncStorage.getItem(ownedKey(BASELINE_KEY, 'account-B'))).toBeNull();
    expect(JSON.parse(String(await AsyncStorage.getItem(ownedKey(QUEUE_KEY, 'account-A'))))).toHaveLength(1);
    expect(await AsyncStorage.getItem(ownedKey(QUEUE_KEY, 'account-B'))).toBe('[]');
  });

  it('makes club mission ids deterministic', async () => {
    const handlers: CallableHandlers = {
      progressMigrateSnapshot: callableMock(async () => ({ data: { ok: true, migrated: true } })),
      progressSubmitEvent: callableMock(async () => ({ data: progressResult() })),
    };
    const { client } = await loadClient(handlers);
    const payload = { missionId: 'speak-1', completedAt: 123 };
    expect(client.makeDeterministicProgressEventId('club_mission_complete', payload)).toBe(
      client.makeDeterministicProgressEventId('club_mission_complete', payload),
    );
    expect(client.makeDeterministicProgressEventId('club_mission_complete', payload)).toMatch(/^club:/);
  });
});
