import { arenaReadReviewWithRetry } from '../modules/arena/review_retry';

describe('разбор матча доступен сразу после результата', () => {
  it('один раз перечитывает документ, если транзакция расчёта ещё не успела его создать', async () => {
    const tasks = [{ taskId: 'task-1' }];
    let readCount = 0;
    const read = async (): Promise<readonly unknown[] | null> => {
      readCount += 1;
      return readCount === 1 ? null : tasks;
    };
    let waitCount = 0;
    const wait = async (): Promise<void> => {
      waitCount += 1;
    };

    expect(await arenaReadReviewWithRetry(read, wait)).toBe(tasks);
    expect(readCount).toBe(2);
    expect(waitCount).toBe(1);
  });
});
