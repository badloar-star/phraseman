const QUEUE_KEY = 'progress_server_event_queue_v1';
const MIGRATED_KEY = 'progress_server_snapshot_migrated_v1';
const BASELINE_KEY = 'progress_server_snapshot_baseline_v1';

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

async function loadClient(handlers: CallableHandlers) {
  jest.resetModules();

  jest.doMock('../app/config', () => ({
    CLOUD_SYNC_ENABLED: true,
    IS_EXPO_GO: false,
  }));
  jest.doMock('../app/cloud_sync', () => ({
    ensureAnonUser: jest.fn(async () => 'stable-1'),
  }));
  jest.doMock('../app/user_id_policy', () => ({
    getCanonicalUserId: jest.fn(async () => 'stable-1'),
  }));
  jest.doMock('../app/app_check_init', () => ({
    initFirebaseAppCheckIfAvailable: jest.fn(async () => false),
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
  return { AsyncStorage, client };
}

describe('progress events client durable queue', () => {
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
    expect(await AsyncStorage.getItem(MIGRATED_KEY)).toBe('1');

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

    expect(await AsyncStorage.getItem(MIGRATED_KEY)).toBeNull();
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
    expect(await AsyncStorage.getItem(BASELINE_KEY)).toBeNull();
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

    const queued = JSON.parse(String(await AsyncStorage.getItem(QUEUE_KEY)));
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      eventId: 'lesson:answer:migration-offline',
      type: 'lesson_answer',
      stableId: 'stable-1',
      payload: { xpDelta: 100 },
    });
    expect(handlers.progressSubmitEvent).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(MIGRATED_KEY)).toBeNull();
    expect(JSON.parse(String(await AsyncStorage.getItem(BASELINE_KEY)))).toMatchObject({ user_total_xp: '42' });
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

    await expect(client.submitProgressEvent(request)).rejects.toThrow('offline');
    await expect(client.submitProgressEvent(request)).rejects.toThrow('offline');

    const queuedRaw = await AsyncStorage.getItem(QUEUE_KEY);
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
    expect(await AsyncStorage.getItem(QUEUE_KEY)).toBe('[]');
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
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([{
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
    })).rejects.toThrow('still_offline');

    const queued = JSON.parse(String(await AsyncStorage.getItem(QUEUE_KEY)));
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
});
