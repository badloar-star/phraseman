/**
 * Контракт звания на афише Макса.
 *
 * зачем: звание — единственный видимый прогресс раздела (решение владельца:
 * «кружок с прогрессом в правом верхнем углу, пульсирующая опасити, ранг»).
 * Ошибка в порогах не уронит экран и не даст ошибки в логах — человек просто
 * навсегда останется новичком или сразу станет легендой. Заметить это можно
 * только тестом.
 */
import { rankForCompleted } from '../app/dialogs_rank';

describe('rankForCompleted', () => {
  it('на нуле пройденных — новичок, и следующий порог назван', () => {
    const rank = rankForCompleted(0);
    expect(rank.key).toBe('novice');
    expect(rank.index).toBe(0);
    expect(rank.next).toBe(1);
  });

  it('первый же пройденный диалог поднимает звание — новичок видит движение сразу', () => {
    expect(rankForCompleted(1).key).toBe('speaker');
  });

  it('пороги растут по шагам 5 / 15 / 40', () => {
    expect(rankForCompleted(4).key).toBe('speaker');
    expect(rankForCompleted(5).key).toBe('orator');
    expect(rankForCompleted(14).key).toBe('orator');
    expect(rankForCompleted(15).key).toBe('diplomat');
    expect(rankForCompleted(39).key).toBe('diplomat');
    expect(rankForCompleted(40).key).toBe('legend');
  });

  it('на вершине следующего порога нет — не обещаем звание, которого не существует', () => {
    expect(rankForCompleted(400).key).toBe('legend');
    expect(rankForCompleted(400).next).toBeNull();
  });

  it('мусорное число не ломает расчёт: звание остаётся первым', () => {
    expect(rankForCompleted(-5).key).toBe('novice');
    expect(rankForCompleted(Number.NaN).key).toBe('novice');
  });
});
