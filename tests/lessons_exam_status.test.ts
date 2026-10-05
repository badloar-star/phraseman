import { pickLessonsExamStatus } from '../app/lessons_exam_status';

// зачем (learn-4/8, правило координатора 05.10): Free без Plus видит «Откроется с Plus», 0% = нет результата,
// сданный экзамен свой статус не прячет.
const base = { examPremiumRequired: false, examSourceAvailable: true, allDone: false, isPremium: false, prevExamLevel: null };

describe('pickLessonsExamStatus', () => {
  it('Free + 0% → «Откроется с Plus»', () => {
    expect(pickLessonsExamStatus({ ...base, examPremiumRequired: true, result: { passed: false, pct: 0 } })).toBe('plus');
  });

  it('Free + несданный 70% → тоже «Откроется с Plus» (Plus важнее несданного)', () => {
    expect(pickLessonsExamStatus({ ...base, examPremiumRequired: true, result: { passed: false, pct: 70 } })).toBe('plus');
  });

  it('Plus + 70% → «Почти — 70%»', () => {
    expect(pickLessonsExamStatus({ ...base, isPremium: true, result: { passed: false, pct: 70 } })).toBe('almost');
  });

  it('Free + сданный → настоящий статус не прячется', () => {
    expect(pickLessonsExamStatus({ ...base, examPremiumRequired: true, result: { passed: true, pct: 92 } })).toBe('passed');
  });

  it('Plus + 0% → как без результата: дальше прежняя цепочка', () => {
    expect(pickLessonsExamStatus({ ...base, isPremium: true, allDone: true, result: { passed: false, pct: 0 } })).toBe('start');
    expect(pickLessonsExamStatus({ ...base, isPremium: true, prevExamLevel: 'A1', result: { passed: false, pct: 0 } })).toBe('prev_exam');
    expect(pickLessonsExamStatus({ ...base, isPremium: true, result: { passed: false, pct: 0 } })).toBe('complete_lessons');
  });

  it('нет источника экзамена — копия ворот, если не нужен Plus', () => {
    expect(pickLessonsExamStatus({ ...base, examSourceAvailable: false, result: null })).toBe('source_unavailable');
  });
});
