import {
  LESSON_REPLAY_XP_RATE,
  resolveLessonAnswerBaseXp,
  type LessonReplayXpState,
} from '../app/lesson_replay_reward';

describe('lesson replay reward', () => {
  it('awards exactly 20% cumulatively and never zero for real lesson answers', () => {
    const normalRewards = [5, 5, 5, 5, 8, 8, 10, 10, 13, 15];
    let state: LessonReplayXpState = { normalBaseXpTotal: 0, awardedBaseXpTotal: 0 };
    const replayRewards = normalRewards.map((normalBaseXp) => {
      const result = resolveLessonAnswerBaseXp(normalBaseXp, true, state);
      state = result;
      return result.baseXp;
    });

    expect(LESSON_REPLAY_XP_RATE).toBe(0.2);
    expect(replayRewards.every((reward) => reward > 0)).toBe(true);
    expect(replayRewards.reduce((sum, reward) => sum + reward, 0)).toBe(
      Math.round(normalRewards.reduce((sum, reward) => sum + reward, 0) * 0.2),
    );
  });

  it('leaves first-pass base XP unchanged', () => {
    const result = resolveLessonAnswerBaseXp(13, false, {
      normalBaseXpTotal: 0,
      awardedBaseXpTotal: 0,
    });

    expect(result.baseXp).toBe(13);
    expect(result.normalBaseXp).toBe(13);
  });

  it('fails closed for malformed XP input', () => {
    const result = resolveLessonAnswerBaseXp(Number.NaN, true, {
      normalBaseXpTotal: 0,
      awardedBaseXpTotal: 0,
    });

    expect(result.baseXp).toBe(0);
    expect(result.normalBaseXpTotal).toBe(0);
  });
});
