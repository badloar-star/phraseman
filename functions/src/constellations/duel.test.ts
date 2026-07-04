import { scoreDuel, type DuelAnswer } from './duel';

const ans = (correct: boolean, timeMs: number): DuelAnswer => ({ correct, timeMs });

describe('constellations/duel — блиц до 3 очков (A4a)', () => {
  test('очко за верность: верный против неверного', () => {
    const res = scoreDuel(
      [ans(true, 5000), ans(false, 5000), ans(true, 5000)],
      [ans(false, 3000), ans(true, 4000), ans(false, 2000)],
    );
    expect(res.points).toEqual([2, 1]);
    expect(res.winner).toBe(0);
    expect(res.suddenDeath).toBe(false);
  });

  test('оба верно — очко быстрейшему (серверные метки)', () => {
    const res = scoreDuel(
      [ans(true, 2000), ans(true, 9000), ans(true, 2000)],
      [ans(true, 3000), ans(true, 1000), ans(true, 8000)],
    );
    expect(res.points).toEqual([2, 1]);
    expect(res.winner).toBe(0);
  });

  test('2:0 — блиц заканчивается досрочно, третий вопрос не считается', () => {
    const res = scoreDuel(
      [ans(true, 1000), ans(true, 1000), ans(false, 1000)],
      [ans(false, 2000), ans(false, 2000), ans(true, 1000)],
    );
    expect(res.points).toEqual([2, 0]);
    expect(res.winner).toBe(0);
    expect(res.decidedAtQuestion).toBe(1); // индекс второго вопроса
  });

  test('оба неверно — очка никому', () => {
    const res = scoreDuel(
      [ans(false, 1000), ans(true, 1000), ans(true, 1000)],
      [ans(false, 2000), ans(false, 2000), ans(false, 2000)],
    );
    expect(res.points).toEqual([2, 0]);
    expect(res.winner).toBe(0);
  });

  test('ничья 1:1 после трёх → внезапная смерть: первый верный забирает', () => {
    const res = scoreDuel(
      [ans(true, 5000), ans(false, 5000), ans(false, 5000), ans(true, 4000)],
      [ans(false, 5000), ans(true, 5000), ans(false, 5000), ans(true, 3000)],
    );
    expect(res.suddenDeath).toBe(true);
    expect(res.winner).toBe(1); // быстрее в 4-м
  });

  test('внезапная смерть: верный только один → он и победил', () => {
    const res = scoreDuel(
      [ans(false, 1000), ans(true, 1000), ans(false, 1000), ans(true, 9000)],
      [ans(true, 2000), ans(false, 2000), ans(false, 2000), ans(false, 1000)],
    );
    expect(res.suddenDeath).toBe(true);
    expect(res.winner).toBe(0);
  });

  test('внезапная смерть: оба мимо → победителя нет (звезда прежнему владельцу)', () => {
    const res = scoreDuel(
      [ans(true, 1000), ans(false, 1000), ans(false, 1000), ans(false, 1000)],
      [ans(false, 2000), ans(true, 2000), ans(false, 2000), ans(false, 2000)],
    );
    expect(res.suddenDeath).toBe(true);
    expect(res.winner).toBeNull();
  });

  test('0:0 после трёх → тоже внезапная смерть', () => {
    const res = scoreDuel(
      [ans(false, 1000), ans(false, 1000), ans(false, 1000), ans(true, 5000)],
      [ans(false, 2000), ans(false, 2000), ans(false, 2000), ans(false, 2000)],
    );
    expect(res.suddenDeath).toBe(true);
    expect(res.winner).toBe(0);
  });

  test('отвалившийся мид-блиц (неотвеченные = неверно): сопернику достаточно 1 верного', () => {
    const res = scoreDuel(
      [ans(true, 4000), ans(true, 5000), ans(false, 0)],
      [ans(false, 10_000), ans(false, 10_000), ans(false, 10_000)], // все «не ответил»
    );
    expect(res.winner).toBe(0);
    expect(res.decidedAtQuestion).toBe(1);
  });

  test('равное время при обоих верных — очко никому не даётся дважды: разруливается индексом игрока (детерминизм)', () => {
    const res = scoreDuel(
      [ans(true, 5000), ans(false, 1000), ans(false, 1000), ans(false, 1000)],
      [ans(true, 5000), ans(false, 2000), ans(false, 2000), ans(false, 2000)],
    );
    // одинаковое время → очко первому по индексу (детерминированно, не рандом)
    expect(res.points[0] + res.points[1]).toBe(1);
  });
});
