import {
  FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT,
  __resetRemoteFlagsForTest,
  getEffectiveFreeTrainerSessions,
  getFreeTrainerSessionsPerDay,
  getTrainerAbGroup,
  trainerSessionsForGroup,
} from '../app/remote_flags';

describe('remote_flags — trainer sessions', () => {
  beforeEach(() => {
    __resetRemoteFlagsForTest();
  });

  it('default free trainer sessions per day is 1', async () => {
    expect(FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT).toBe(1);
    expect(getFreeTrainerSessionsPerDay()).toBe(1);
    await expect(getEffectiveFreeTrainerSessions('user-abc-123')).resolves.toBe(1);
  });

  it('maps A/B groups to session counts', () => {
    expect(trainerSessionsForGroup('A')).toBe(1);
    expect(trainerSessionsForGroup('B')).toBe(2);
    expect(trainerSessionsForGroup('C')).toBe(3);
  });

  it('assigns an A/B group deterministically for the same userId', () => {
    const g1 = getTrainerAbGroup('user-abc-123');
    const g2 = getTrainerAbGroup('user-abc-123');
    expect(g1).toBe(g2);
    expect(['A', 'B', 'C']).toContain(g1);
  });

  it('without an A/B split, group assignment keeps its compatibility fallback', () => {
    // env-доли не заданы в тесте → total = 0 → деградация к 'B'
    expect(getTrainerAbGroup('any-user')).toBe('B');
  });
});
