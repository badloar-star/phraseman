import fs from 'node:fs';
import path from 'node:path';
import * as runtime from './tournaments';

const source = fs.readFileSync(path.join(__dirname, 'tournaments.ts'), 'utf8');

type Pool = {
  bots: Array<{ id: string }>;
  tasks: Array<{ taskId: string }>;
  taskPoolGeneration: string;
  taskPoolRevision: number;
};

type BarrierToken = { generation: string; revision: number };

describe('tournamentStartNow latency controls', () => {
  it('treats barrier revision as part of the authoritative pool token', () => {
    const matches = (runtime as unknown as {
      sameTournamentPoolBarrierToken: (left: BarrierToken, right: BarrierToken) => boolean;
    }).sameTournamentPoolBarrierToken;
    expect(matches(
      { generation: 'generation-a', revision: 1 },
      { generation: 'generation-a', revision: 1 },
    )).toBe(true);
    expect(matches(
      { generation: 'generation-a', revision: 1 },
      { generation: 'generation-a', revision: 3 },
    )).toBe(false);
    expect(matches(
      { generation: 'generation-a', revision: 1 },
      { generation: 'generation-b', revision: 1 },
    )).toBe(false);
  });

  it('reuses one cached pool only while the ready generation and TTL match', async () => {
    let nowMs = 1_000;
    let generation = 'generation-a';
    let revision = 1;
    let barrierReads = 0;
    let resourceReads = 0;
    const createLoader = (runtime as unknown as {
      createTournamentResourcePoolCacheLoader: (options: {
        readReadyToken: () => Promise<BarrierToken>;
        loadForToken: (value: BarrierToken) => Promise<Pool>;
        nowMs: () => number;
        ttlMs: number;
      }) => () => Promise<Pool>;
    }).createTournamentResourcePoolCacheLoader;
    const load = createLoader({
      readReadyToken: async () => {
        barrierReads += 1;
        return { generation, revision };
      },
      loadForToken: async (value) => {
        resourceReads += 1;
        return {
          bots: [{ id: value.generation }],
          tasks: [{ taskId: value.generation }],
          taskPoolGeneration: value.generation,
          taskPoolRevision: value.revision,
        };
      },
      nowMs: () => nowMs,
      ttlMs: 60_000,
    });

    const first = await load();
    const second = await load();
    expect(second).toBe(first);
    expect(barrierReads).toBe(3);
    expect(resourceReads).toBe(1);

    generation = 'generation-b';
    revision = 2;
    await load();
    expect(resourceReads).toBe(2);

    nowMs += 60_001;
    await load();
    expect(resourceReads).toBe(3);
  });

  it('uses the production default TTL of exactly 60,000ms', async () => {
    let nowMs = 1_000;
    let resourceReads = 0;
    const createLoader = (runtime as unknown as {
      createTournamentResourcePoolCacheLoader: (options: {
        readReadyToken: () => Promise<BarrierToken>;
        loadForToken: (value: BarrierToken) => Promise<Pool>;
        nowMs: () => number;
      }) => () => Promise<Pool>;
    }).createTournamentResourcePoolCacheLoader;
    const load = createLoader({
      readReadyToken: async () => ({ generation: 'generation-a', revision: 1 }),
      loadForToken: async (value) => {
        resourceReads += 1;
        return {
          bots: [],
          tasks: [],
          taskPoolGeneration: value.generation,
          taskPoolRevision: value.revision,
        };
      },
      nowMs: () => nowMs,
    });

    await load();
    nowMs = 60_999;
    await load();
    expect(resourceReads).toBe(1);

    nowMs = 61_000;
    await load();
    expect(resourceReads).toBe(2);
  });

  it('checks the barrier before every cache hit and rejects migration fail-closed', async () => {
    let migrating = false;
    let resourceReads = 0;
    const createLoader = (runtime as unknown as {
      createTournamentResourcePoolCacheLoader: (options: {
        readReadyToken: () => Promise<BarrierToken>;
        loadForToken: (value: BarrierToken) => Promise<Pool>;
      }) => () => Promise<Pool>;
    }).createTournamentResourcePoolCacheLoader;
    const load = createLoader({
      readReadyToken: async () => {
        if (migrating) throw new Error('tournament_pool_migrating');
        return { generation: 'generation-a', revision: 1 };
      },
      loadForToken: async (value) => {
        resourceReads += 1;
        return {
          bots: [{ id: value.generation }],
          tasks: [{ taskId: value.generation }],
          taskPoolGeneration: value.generation,
          taskPoolRevision: value.revision,
        };
      },
    });

    await load();
    migrating = true;
    await expect(load()).rejects.toThrow('tournament_pool_migrating');
    expect(resourceReads).toBe(1);
  });

  it('coalesces concurrent resource loads for the same ready generation', async () => {
    let release: ((pool: Pool) => void) | undefined;
    let resourceReads = 0;
    const createLoader = (runtime as unknown as {
      createTournamentResourcePoolCacheLoader: (options: {
        readReadyToken: () => Promise<BarrierToken>;
        loadForToken: (value: BarrierToken) => Promise<Pool>;
      }) => () => Promise<Pool>;
    }).createTournamentResourcePoolCacheLoader;
    const load = createLoader({
      readReadyToken: async () => ({ generation: 'generation-a', revision: 1 }),
      loadForToken: async () => {
        resourceReads += 1;
        return new Promise<Pool>((resolve) => { release = resolve; });
      },
    });

    const first = load();
    const second = load();
    await Promise.resolve();
    await Promise.resolve();
    expect(resourceReads).toBe(1);
    release?.({ bots: [], tasks: [], taskPoolGeneration: 'generation-a', taskPoolRevision: 1 });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });

  it('rejects an ABA generation when the barrier revision changes during resource queries', async () => {
    let barrierReads = 0;
    const createLoader = (runtime as unknown as {
      createTournamentResourcePoolCacheLoader: (options: {
        readReadyToken: () => Promise<BarrierToken>;
        loadForToken: (value: BarrierToken) => Promise<Pool>;
      }) => () => Promise<Pool>;
    }).createTournamentResourcePoolCacheLoader;
    const load = createLoader({
      readReadyToken: async () => {
        barrierReads += 1;
        return { generation: 'generation-a', revision: barrierReads === 1 ? 1 : 3 };
      },
      loadForToken: async (value) => ({
        bots: [],
        tasks: [],
        taskPoolGeneration: value.generation,
        taskPoolRevision: value.revision,
      }),
    });

    await expect(load()).rejects.toThrow('tournament_pool_generation_changed');
    expect(barrierReads).toBe(2);
  });

  it('rejects legacy generation-only commits on ready barriers while preserving migration errors', async () => {
    const barrierData = { current: {
      kind: 'tournament_task_pool_barrier_v1',
      state: 'ready',
      generation: 'generation-a',
      revision: 1,
    } };
    const db = {
      collection: () => ({ doc: () => ({ id: 'tournament_pool_barrier' }) }),
    } as unknown as FirebaseFirestore.Firestore;
    const tx = {
      get: async () => ({ data: () => barrierData.current }),
    } as unknown as FirebaseFirestore.Transaction;

    await expect(runtime.assertTournamentPoolCommitAllowed(
      tx, db, 'generation-a',
    )).rejects.toThrow('tournament_pool_token_required');

    barrierData.current = {
      ...barrierData.current,
      state: 'migrating',
      revision: 2,
    };
    await expect(runtime.assertTournamentPoolCommitAllowed(
      tx, db, 'generation-a',
    )).rejects.toThrow('tournament_pool_migrating');
  });

  // зачем 2026-08-03: смысл проверки прежний — КАЖДОЕ место, которое пишет
  // комнату, обязано сверить поколение пула внутри транзакции. Изменилась
  // только форма токена: россыпь generation:/revision: заменена целостным
  // resources.barrierToken, который вдобавок несёт хеш exposure-раскладки,
  // поэтому ловит и смену бакетов между чтением пула и коммитом комнаты.
  it('passes the whole barrier token at exactly all five room writer call sites', () => {
    const calls = Array.from(source.matchAll(
      /await assertTournamentPoolCommitAllowed\(([\s\S]*?)\n\s*\);/g,
    ));
    expect(calls).toHaveLength(5);
    for (const call of calls) {
      expect(call[1]).toContain('resources.barrierToken');
    }
  });

  it('starts independent prerequisites in parallel but keeps ban after identity', async () => {
    const events: string[] = [];
    const loadPrerequisites = (runtime as unknown as {
      loadTournamentStartNowPrerequisites: <TConfig, TResources, TEconomy>(options: {
        loadConfig: () => Promise<TConfig>;
        resolveStableUid: () => Promise<string>;
        assertNotBanned: (uid: string) => Promise<void>;
        loadResources: () => Promise<TResources>;
        loadEconomy: () => Promise<TEconomy>;
      }) => Promise<unknown>;
    }).loadTournamentStartNowPrerequisites;

    await loadPrerequisites({
      loadConfig: async () => { events.push('config'); return 'config'; },
      resolveStableUid: async () => { events.push('identity'); return 'stable-uid'; },
      assertNotBanned: async (uid) => { events.push(`ban:${uid}`); },
      loadResources: async () => { events.push('resources'); return 'resources'; },
      loadEconomy: async () => { events.push('economy'); return 'economy'; },
    });

    expect(events.slice(0, 4)).toEqual(['config', 'identity', 'resources', 'economy']);
    expect(events[4]).toBe('ban:stable-uid');
  });

  it('starts request prerequisites without awaiting an initialization pool read', async () => {
    const events: string[] = [];
    let releaseResources: ((value: string) => void) | undefined;
    const loadPrerequisites = (runtime as unknown as {
      loadTournamentStartNowPrerequisites: (options: {
        loadConfig: () => Promise<string>;
        resolveStableUid: () => Promise<string>;
        assertNotBanned: (uid: string) => Promise<void>;
        loadResources: () => Promise<string>;
        loadEconomy: () => Promise<string>;
      }) => Promise<unknown>;
    }).loadTournamentStartNowPrerequisites;

    const pending = loadPrerequisites({
      loadConfig: async () => { events.push('config'); return 'config'; },
      resolveStableUid: async () => { events.push('identity'); return 'stable-uid'; },
      assertNotBanned: async () => { events.push('ban'); },
      loadResources: async () => {
        events.push('resources');
        return new Promise<string>((resolve) => { releaseResources = resolve; });
      },
      loadEconomy: async () => { events.push('economy'); return 'economy'; },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(events).toEqual(['config', 'identity', 'resources', 'economy', 'ban']);
    releaseResources?.('resources');
    await expect(pending).resolves.toBeDefined();
  });

  it('keeps identity and ban failures authoritative over parallel read failures', async () => {
    const loadPrerequisites = (runtime as unknown as {
      loadTournamentStartNowPrerequisites: (options: {
        loadConfig: () => Promise<string>;
        resolveStableUid: () => Promise<string>;
        assertNotBanned: (uid: string) => Promise<void>;
        loadResources: () => Promise<string>;
        loadEconomy: () => Promise<string>;
      }) => Promise<unknown>;
    }).loadTournamentStartNowPrerequisites;

    await expect(loadPrerequisites({
      loadConfig: async () => { throw new Error('config_failed'); },
      resolveStableUid: async () => 'stable-uid',
      assertNotBanned: async () => { throw new Error('user_banned'); },
      loadResources: async () => { throw new Error('pool_failed'); },
      loadEconomy: async () => 'economy',
    })).rejects.toThrow('user_banned');
  });

  it('keeps one warm StartNow instance without an awaited onInit prewarm', () => {
    const start = source.slice(
      source.indexOf('export const tournamentStartNow'),
      source.indexOf('export const tournamentRoundReview'),
    );
    expect(start).toContain('minInstances: 1');
    expect(source).not.toContain('onInit(');
    expect(source).not.toContain('prewarmTournamentStartNowResourcePool');
  });

  it('creates and authoritatively joins StartNow in exactly one transaction', () => {
    const start = source.slice(
      source.indexOf('export const tournamentStartNow'),
      source.indexOf('export const tournamentRoundReview'),
    );
    expect(start.match(/\.runTransaction\(/g)).toHaveLength(1);
    expect(start).not.toContain('tournamentJoinTransaction(');
    expect(start).toContain('assertTransactionalTournamentAccess(');
    expect(start).toContain('leaderboardRef');
    expect(start).toContain('participantAuthUids');
    expect(start).toContain('currentConfigSnap');
    expect(start).toContain('currentEconomySnap');
    expect(start).not.toContain('tx.set(userRef');
    expect(start).not.toContain('FieldValue.increment(-');
    // зачем 2026-08-03: раньше поколение пула сверялось двумя россыпью полями
    // (generation:/revision:). Теперь это целостный barrierToken, который
    // сверяется ВНУТРИ транзакции через assertTournamentPoolCommitAllowed —
    // защита строже прежней: кроме поколения и ревизии токен несёт хеш
    // exposure-раскладки, поэтому смена бакетов между чтением пула и коммитом
    // комнаты тоже ловится (aborted: tournament_pool_generation_changed).
    expect(start).toContain('assertTournamentPoolCommitAllowed(');
    expect(start).toContain('resources.barrierToken');
    expect(start).toContain('taskPoolGeneration');
  });

  it('plans a zero-economy joined room with 15 bots and one authoritative human', () => {
    const plan = (runtime as unknown as {
      planTournamentStartNowJoinedRoom: (input: Record<string, unknown>) => {
        room: Record<string, any>;
        joinResult: Record<string, any>;
        botMetadata: Record<string, any>;
      };
    }).planTournamentStartNowJoinedRoom;
    const nowMs = 10_000;
    const botPlayers = Array.from({ length: 15 }, (_, index) => ({
      id: `bot-${index}`,
      isBot: true,
      name: `Bot ${index}`,
      avatar: 'B',
      color: '#111111',
      score: 0,
      streak: 0,
      botWinRate: 0.5,
      joinAtMs: nowMs + 1_000 + index,
    }));
    const rounds = Array.from({ length: 4 }, (_, index) => ({
      roundNo: index + 1,
      mode: 'mix',
      taskIds: [`task-${index}`],
      results: {},
    }));
    const result = plan({
      room: {
        roomId: 'now-test-room',
        slotId: 'now-test-slot',
        seed: 'now-test-room',
        state: 'lobby',
        startsAt: nowMs + 20_000,
        stateDeadlineAtMs: nowMs + 20_000,
        players: botPlayers,
        rounds,
        participantAuthUids: [],
        participantAuthUidsComplete: true,
        version: 0,
        createdAtMs: nowMs,
        testMode: true,
        ticketsRequired: 0,
        economySnapshot: {
          entryGems: 0,
          botEntryGems: 0,
          weeklyBankRate: 0.1,
          prizeShares: [0.6, 0.25, 0.15],
          weeklyShares: [0.6, 0.25, 0.15],
        },
        lobbyEvents: [],
        potGems: 0,
      },
      authUid: 'auth-user',
      stableUid: 'stable-user',
      user: { shards: 77, firebaseAuthUid: 'auth-user', name: 'Fallback' },
      leaderboardProfile: { name: 'Leaderboard Name', avatar: 'L' },
      publicProfile: { name: 'Correct Nick', avatar: 'custom:custom-gen-41:aurora:black', aura: 'aura-violet' },
      config: { slots: [], freeWeeklyEntry: false, ticketGemValue: 0 },
      currentEconomy: {
        entryGems: 99,
        botEntryGems: 99,
        weeklyBankRate: 0.33,
        prizeShares: [0.5, 0.3, 0.2],
        weeklyShares: [0.5, 0.3, 0.2],
      },
      selectedTasks: [],
      botMetadata: {
        kind: 'bot_simulation_v1',
        expectedBotCount: 15,
        bots: botPlayers.map((player, index) => ({
          playerId: player.id,
          profileId: `profile-${index}`,
          winRate: 0.5,
        })),
      },
      nowMs,
      testModeReleaseEnabled: true,
    });

    expect(result.room.players).toHaveLength(16);
    expect(result.room.players.filter((player: any) => player.id === 'stable-user')).toHaveLength(1);
    expect(result.room.players.find((player: any) => player.id === 'stable-user')).toMatchObject({
      name: 'Correct Nick',
      avatar: 'custom:custom-gen-41:aurora:black',
      aura: 'aura-violet',
    });
    expect(result.room.participantAuthUids).toEqual(['auth-user']);
    expect(result.room.version).toBe(1);
    expect(result.room.state).toBe('lobby');
    expect(result.room.economySnapshot).toMatchObject({
      entryGems: 0,
      botEntryGems: 0,
      weeklyBankRate: 0.33,
    });
    expect(result.joinResult).toMatchObject({
      ok: true,
      joined: true,
      roomId: 'now-test-room',
      entryGems: 0,
      gemsLeft: 77,
      startImmediately: false,
    });
    expect(result.botMetadata.expectedBotCount).toBe(15);
  });
});
