const callable = jest.fn();
const commitConfirmedExternalShardEvent = jest.fn<Promise<Record<string, unknown>>, [Record<string, unknown>]>(async () => ({
  status: 'applied' as const,
  balanceBefore: 0,
  balanceAfter: 10,
  operation: { operationId: 'external:collectibles:test' },
}));

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => callable),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/remote_flags', () => ({ isCollectiblesEnabled: jest.fn(() => true) }));
jest.mock('../app/shards_system', () => ({ commitConfirmedExternalShardEvent }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
import { maybeRollCollectibleDrop } from '../app/collectibles/storage';

describe('collectibles replay external-event recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('collectibles-owner');
  });

  it('projects the deterministic bonus on retry after the server committed but the first response was lost', async () => {
    callable
      .mockRejectedValueOnce(new Error('connection_lost_after_server_commit'))
      .mockResolvedValueOnce({
        data: {
          ok: true,
          alreadyClaimed: true,
          dropped: true,
          card: { id: 'aurora_01', setId: 'aurora', rarity: 'common' },
          setCompleted: true,
          bonusShards: 10,
        },
      });

    await expect(maybeRollCollectibleDrop('lesson', 'lesson-42', { dailyScoped: false }))
      .resolves.toBeNull();
    expect(commitConfirmedExternalShardEvent).not.toHaveBeenCalled();

    await expect(maybeRollCollectibleDrop('lesson', 'lesson-42', { dailyScoped: false }))
      .resolves.toBeNull();
    expect(commitConfirmedExternalShardEvent).toHaveBeenCalledTimes(1);
    expect(commitConfirmedExternalShardEvent).toHaveBeenCalledWith(expect.objectContaining({
      expectedOwnerStableId: 'collectibles-owner',
      source: 'collectibles',
      eventId: 'lesson:lesson-42',
      delta: 10,
      reason: 'collectible_set_bonus',
      grant: expect.objectContaining({
        kind: 'collectible_set_bonus',
        subjectId: 'aurora',
      }),
    }));
  });

  it('accepts an already-applied replay without attempting a second user-visible drop', async () => {
    commitConfirmedExternalShardEvent.mockResolvedValueOnce({
      status: 'already-applied', balanceBefore: 0, balanceAfter: 10,
      operation: { operationId: 'external:collectibles:test' },
    });
    callable.mockResolvedValueOnce({
      data: {
        ok: true,
        alreadyClaimed: true,
        dropped: true,
        card: { id: 'aurora_01', setId: 'aurora', rarity: 'common' },
        bonusShards: 10,
      },
    });

    await expect(maybeRollCollectibleDrop('lesson', 'lesson-42', { dailyScoped: false }))
      .resolves.toBeNull();
    expect(commitConfirmedExternalShardEvent).toHaveBeenCalledTimes(1);
  });
});
