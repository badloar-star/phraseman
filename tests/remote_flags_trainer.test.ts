import {
  FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT,
  getFreeTrainerSessionsPerDay,
  getTrainerAbGroup,
  trainerSessionsForGroup,
} from '../app/remote_flags';

describe('remote_flags — trainer sessions', () => {
  it('default free trainer sessions per day is 2', () => {
    expect(FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT).toBe(2);
    expect(getFreeTrainerSessionsPerDay()).toBe(2);
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

  it('without an A/B split env, falls back to group B (default 2 sessions)', () => {
    // env-доли не заданы в тесте → total = 0 → деградация к 'B'
    expect(getTrainerAbGroup('any-user')).toBe('B');
  });
});
