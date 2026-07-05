import { evaluateRecallAnswer } from '../app/review_evaluator';

// Регресс на репорт пользователя (2026-07-05): в режиме «Вспомни фразу»
// неоднозначный перевод («Привет. Я рад.») невозможно набрать дословно —
// носитель скажет её многими способами. evaluateRecallAnswer теперь
// принимает список легитимных альтернатив.
describe('evaluateRecallAnswer — альтернативные формулировки', () => {
  const target = 'Hi there. I am happy.';
  const alternatives = [
    'Hi. I am happy.',
    'Hi there. I am glad.',
    'Hi. I am glad.',
    'Hello. I am glad.',
  ];

  it('засчитывает канонический ответ', () => {
    expect(evaluateRecallAnswer('Hi there. I am happy.', target, alternatives).ok).toBe(true);
  });

  it('засчитывает любую из альтернатив', () => {
    for (const alt of alternatives) {
      expect(evaluateRecallAnswer(alt, target, alternatives).ok).toBe(true);
    }
  });

  it('засчитывает сокращённую форму альтернативы (I\'m glad)', () => {
    // normalize раскрывает "I'm" → "I am", так что сокращение = альтернатива.
    expect(evaluateRecallAnswer("Hi. I'm glad", target, alternatives).ok).toBe(true);
    expect(evaluateRecallAnswer("Hi there. I'm happy", target, alternatives).ok).toBe(true);
  });

  it('игнорирует хвостовую пунктуацию и регистр', () => {
    expect(evaluateRecallAnswer('hi. i am glad', target, alternatives).ok).toBe(true);
  });

  it('всё ещё отклоняет ответ не по смыслу', () => {
    expect(evaluateRecallAnswer('Goodbye. I am sad.', target, alternatives).ok).toBe(false);
  });

  it('без альтернатив ведёт себя как раньше (только канон)', () => {
    expect(evaluateRecallAnswer('Hi there. I am happy.', target).ok).toBe(true);
    expect(evaluateRecallAnswer('Hi. I am glad.', target).ok).toBe(false);
  });
});
