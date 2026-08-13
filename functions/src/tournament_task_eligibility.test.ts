import { eligibleTournamentCellCounts } from './tournament_task_eligibility';

const doc = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });
const base = { isVoice: false, difficulty: 1, tags: [], verified: true, source: 'ai' };

describe('eligible tournament readiness counts', () => {
  it('counts only tasks accepted by the new-room validator', () => {
    const choiceExplanation = {
      ruleNote: 'Разбор варианта.',
      example: 'Example. — Пример.',
      wrongOptionReasons: ['', 'Неверный вариант.', 'Неверный вариант.', 'Неверный вариант.'],
    };
    const phrase = {
      ...base,
      mode: 'guess_phrase',
      payload: {
        phrase: 'Пример', options: ['right', 'wrong-1', 'wrong-2', 'wrong-3'], correctIndex: 0,
      },
      explanation: choiceExplanation,
    };
    const options = ['дом', 'кот', 'солнце', 'книга', 'вода', 'друг'];
    const prompts = ['home', 'cat', 'sun', 'book', 'water', 'friend'];
    const speed = {
      ...base,
      mode: 'speed_match',
      explanation: {
        ruleNote: 'Разбор поля.',
        example: 'home — дом.',
        wrongOptionReasons: [],
      },
      payload: {
        prompt: 'Match', rightOptions: options,
        items: options.map((_, index) => ({
          prompt: prompts[index],
          options,
          correctIndex: index,
          explanation: {
            ruleNote: 'Разбор пары.',
            example: 'word — слово.',
            wrongOptionReasons: options.map((__, reasonIndex) => reasonIndex === index ? '' : 'Неверная пара.'),
          },
        })),
      },
    };
    const counts = eligibleTournamentCellCounts([
      doc('phrase-valid', phrase),
      doc('phrase-incomplete-explanation', {
        ...phrase,
        explanation: { ...choiceExplanation, wrongOptionReasons: ['', '', 'Неверный вариант.', 'Неверный вариант.'] },
      }),
      doc('speed-valid', speed),
      doc('speed-five-pairs', {
        ...speed,
        payload: { ...speed.payload, rightOptions: options.slice(0, 5), items: speed.payload.items.slice(0, 5) },
      }),
      doc('legacy-verified', {
        ...base, mode: 'guess_phrase',
        payload: { phrase: 'one', options: ['1', '2', '3', '4'], correctIndex: 0 },
      }),
      doc('non-ai-valid', { ...phrase, source: 'legacy' }),
    ]);

    expect(counts['guess_phrase:1']).toBe(1);
    expect(counts['speed_match:1']).toBe(1);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(2);
  });
});
