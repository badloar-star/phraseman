import {
  ARENA_GOAL_ORDER,
  ARENA_GOAL_TARGETS,
  arenaDailyGoals,
} from '../modules/arena/daily_goals';

/**
 * Дневные цели.
 *
 * Три и не больше: список длиннее трёх перестаёт читаться как «что сделать
 * сегодня» и превращается в работу.
 *
 * Владелец (D-62) просил три РАЗНЫЕ оси: сыграть, скорость, точность. Первая
 * версия считала «сыграть / выиграть / набрать звёзд» — это две оси из трёх,
 * потому что звёзды и победы набираются одним и тем же действием. Ось скорости
 * теперь считается по заданиям, закрытым ПЕРВЫМ верным ответом: победить можно
 * и медленно.
 */

const today = '2026-08-13';

const goals = (over: Record<string, unknown> = {}) => arenaDailyGoals({
  storedDayKey: today,
  todayKey: today,
  matchesToday: 0,
  firstAnswersToday: 0,
  winsToday: 0,
  ...over,
});

describe('состав', () => {
  it('целей ровно три и порядок постоянный', () => {
    expect(goals().goals.length).toBe(3);
    expect(goals().goals.map((row) => row.key)).toEqual([...ARENA_GOAL_ORDER]);
  });

  it('день закрывается за несколько матчей, а не за десяток', () => {
    expect(ARENA_GOAL_TARGETS.play).toBeLessThanOrEqual(5);
    expect(ARENA_GOAL_TARGETS.accuracy).toBeLessThanOrEqual(3);
  });

  /** Три цели на одну ось — это одна цель, растянутая на три строки. */
  it('оси разные: сыграть, скорость, точность', () => {
    expect(ARENA_GOAL_ORDER).toEqual(['play', 'speed', 'accuracy']);
  });

  it('ось скорости требует отвечать первым, а не просто побеждать', () => {
    const fast = goals({ firstAnswersToday: ARENA_GOAL_TARGETS.speed }).goals[1];
    expect(fast.complete).toBe(true);
    // Победы ось скорости не закрывают: победить можно и медленно.
    expect(goals({ winsToday: 99 }).goals[1].complete).toBe(false);
  });
});

describe('прогресс', () => {
  it('пустой день — ничего не выполнено', () => {
    const result = goals();
    expect(result.completedCount).toBe(0);
    expect(result.allComplete).toBe(false);
    expect(result.goals.every((row) => row.progress === 0)).toBe(true);
  });

  it('частичный прогресс считается долей', () => {
    const play = goals({ matchesToday: 1 }).goals[0];
    expect(play.done).toBe(1);
    expect(play.progress).toBeCloseTo(1 / ARENA_GOAL_TARGETS.play, 5);
    expect(play.complete).toBe(false);
  });

  it('достижение цели закрывает её', () => {
    expect(goals({ winsToday: ARENA_GOAL_TARGETS.accuracy }).goals[2].complete).toBe(true);
  });

  /** «5 из 3» читается как ошибка, а не как успех. */
  it('перевыполнение не показывается сверх цели', () => {
    const play = goals({ matchesToday: 99 }).goals[0];
    expect(play.done).toBe(ARENA_GOAL_TARGETS.play);
    expect(play.progress).toBe(1);
    expect(play.complete).toBe(true);
  });

  it('все три выполнены — день закрыт', () => {
    const result = goals({
      matchesToday: ARENA_GOAL_TARGETS.play,
      firstAnswersToday: ARENA_GOAL_TARGETS.speed,
      winsToday: ARENA_GOAL_TARGETS.accuracy,
    });
    expect(result.completedCount).toBe(3);
    expect(result.allComplete).toBe(true);
  });

  /** Иначе вчерашние успехи закрывали бы сегодняшний день. */
  it('вчерашние счётчики сегодня не считаются', () => {
    const result = arenaDailyGoals({
      storedDayKey: '2026-08-12',
      todayKey: today,
      matchesToday: 10,
      firstAnswersToday: 20,
      winsToday: 5,
    });
    expect(result.completedCount).toBe(0);
    expect(result.goals.every((row) => row.done === 0)).toBe(true);
  });

  it('пустой ключ дня не засчитывает ничего', () => {
    expect(arenaDailyGoals({ storedDayKey: '', todayKey: '', matchesToday: 9 }).completedCount).toBe(0);
  });

  it('мусор в счётчиках считается нулём', () => {
    for (const value of [null, undefined, NaN, -5, 'три', {}]) {
      expect(goals({ matchesToday: value }).goals[0].done).toBe(0);
    }
  });

  it('доля никогда не выходит за границы', () => {
    for (const value of [-100, 0, 1, 2, 3, 999]) {
      for (const row of goals({ matchesToday: value, firstAnswersToday: value, winsToday: value }).goals) {
        expect(row.progress).toBeGreaterThanOrEqual(0);
        expect(row.progress).toBeLessThanOrEqual(1);
      }
    }
  });
});
