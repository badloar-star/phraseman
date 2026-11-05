// Governance-ID: TG-9F041A65A82B
// зачем (владелец 05.11, дословно): «Правильный ответ сразу +3 монетки! Повторно второй раз даёт +2. Третий раз и все следующие +1 за правильный
// ответ. Урок, Словарь, Глаголы.» Сторож ставок 3 / 2 / 1+ по номеру прохождения сессии, одной оплаты на ответ, сохранения копилки и подключения трёх разделов.
import fs from 'node:fs';
import path from 'node:path';
import {
  PRACTICE_RUNE_FULL_AWARD,
  PRACTICE_RUNE_REPEAT_AWARD,
  PRACTICE_RUNE_SECOND_AWARD,
  awardPracticeRune,
  createPracticeRuneEarnings,
  parsePracticeRuneAccumulator,
  practiceRuneAwardForPass,
  serializePracticeRuneAccumulator,
} from '../app/practice_rune_earnings';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

describe('ставки по номеру прохождения: 3 / 2 / 1', () => {
  it.each([[1, 3], [2, 2], [3, 1], [4, 1], [10, 1], [999, 1]])('прохождение %i → +%i за верный ответ', (pass, rate) => {
    expect(practiceRuneAwardForPass(pass)).toBe(rate);
  });

  it('константы и мусорные номера: не выше 3, не ниже 1', () => {
    expect([PRACTICE_RUNE_FULL_AWARD, PRACTICE_RUNE_SECOND_AWARD, PRACTICE_RUNE_REPEAT_AWARD]).toEqual([3, 2, 1]);
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(practiceRuneAwardForPass(bad)).toBe(1);
    }
  });

  it('копилка берёт цену из passNumber; старый флаг firstCompletion работает как раньше (3 / 1)', () => {
    for (const activity of ['lesson', 'vocabulary', 'irregular_verbs'] as const) {
      expect(createPracticeRuneEarnings({ activity, sessionKey: 's1', passNumber: 1 }).awardPerItem).toBe(3);
      expect(createPracticeRuneEarnings({ activity, sessionKey: 's1', passNumber: 2 }).awardPerItem).toBe(2);
      expect(createPracticeRuneEarnings({ activity, sessionKey: 's1', passNumber: 3 }).awardPerItem).toBe(1);
    }
    expect(createPracticeRuneEarnings({ activity: 'lesson', sessionKey: 's1', firstCompletion: true }).awardPerItem).toBe(3);
    expect(createPracticeRuneEarnings({ activity: 'lesson', sessionKey: 's1', firstCompletion: false }).awardPerItem).toBe(1);
  });
});

describe('начисление за верный ответ в трёх разделах', () => {
  it.each(['lesson', 'vocabulary', 'irregular_verbs'] as const)('%s: 3 / 2 / 1, один раз на ответ, повтор того же ответа даёт 0', (activity) => {
    for (const [pass, rate] of [[1, 3], [2, 2], [3, 1]] as const) {
      let earnings = createPracticeRuneEarnings({ activity, sessionKey: `k_${activity}`, passNumber: pass });
      const first = awardPracticeRune(earnings, 'cell_0');
      expect(first.awarded).toBe(rate);
      earnings = first.earnings;
      expect(awardPracticeRune(earnings, 'cell_0').awarded).toBe(0); // защита от двойного тапа / повторной оплаты
      const second = awardPracticeRune(earnings, 'cell_1');
      expect(second.awarded).toBe(rate);
      expect(second.earnings.pendingRunes).toBe(rate * 2);
    }
  });

  it('копилка со ставкой 2 сохраняется и читается обратно (иначе перезапуск терял бы монеты второго прохождения)', () => {
    const earned = awardPracticeRune(createPracticeRuneEarnings({ activity: 'vocabulary', sessionKey: 'dict', passNumber: 2 }), 'w1').earnings;
    const raw = serializePracticeRuneAccumulator(earned, 2);
    const back = parsePracticeRuneAccumulator(raw, { activity: 'vocabulary', sessionKey: 'dict' });
    expect(back?.earnings.awardPerItem).toBe(2);
    expect(back?.earnings.pendingRunes).toBe(2);
  });
});

describe('подключение: тяжёлых экранов', () => {
  it('хук считает цену по номеру прохождения и пишет причину тихих выходов', () => {
    const hook = read('hooks/usePracticeRunes.ts');
    expect(hook).toContain('const passNumber = input.repeatPriceOnly === true ? 3 : settledCount + 1;');
    expect(hook).toContain('passNumber: Math.max(markerCount, committedOrdinal) + 1');
    expect(hook).toContain('passNumber: input.repeatPriceOnly === true ? 3 : Math.max(settledCountRef.current, 1) + 1');
    expect(hook).toContain("reason: 'earnings_not_ready'");
    expect(hook).toContain("'item_already_credited_in_pass'");
    expect(hook).not.toMatch(/const firstCompletion = input\.repeatPriceOnly/);
  });

  it('урок, словарь и неправильные глаголы получают руны через один и тот же хук с нужной активностью', () => {
    expect(read('app/lesson1.tsx')).toMatch(/usePracticeRunes\(\{\s*activity: 'lesson'/);
    expect(read('app/lesson_words.tsx')).toMatch(/usePracticeRunes\(\{[\s\S]{0,200}activity: 'vocabulary'/);
    expect(read('app/lesson_irregular_verbs.tsx')).toMatch(/usePracticeRunes\(\{[\s\S]{0,200}activity: 'irregular_verbs'/);
  });
});
