import { parseMatchmakingQueueState } from '../app/services/arena_db';

describe('authoritative matchmaking queue state', () => {
  it('distinguishes a match, a live queue entry, and absence', () => {
    expect(parseMatchmakingQueueState('u1', {
      exists: true,
      data: () => ({ userId: 'u1', sessionId: 'session-1' }),
    })).toEqual({ kind: 'matched', sessionId: 'session-1' });

    expect(parseMatchmakingQueueState('u1', {
      exists: true,
      data: () => ({ userId: 'u1', joinedAt: 123 }),
    })).toEqual({ kind: 'queued', queueId: 'u1' });

    expect(parseMatchmakingQueueState('u1', {
      exists: false,
      data: () => undefined,
    })).toEqual({ kind: 'absent' });
  });
});
