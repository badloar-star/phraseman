import { validateTournamentTaskForNewRoom } from './tournament_core';
import {
  spireConvertMultilingualPool,
  spireMultilingualPoolSourceHash,
  spireTaskFromMultilingualRow,
} from './spire_multilingual_pool';

function grammarOptions(correctIndex: number) {
  return ['a', 'b', 'c', 'd'].map((_, i) => ({
    token: `t${i}`,
    grammatical: i === correctIndex,
    reason: i === correctIndex ? 'matches_subject_person' : 'verb_person_conflicts_with_fixed_subject',
  }));
}

function choiceRow(mode: string, over: Record<string, unknown> = {}) {
  const base = {
    schemaVersion: 'arena-multilingual-task-v1',
    taskId: `arena-es-${mode}-1-0000`,
    studyTarget: 'es',
    mode,
    difficulty: 1,
    payload: {
      promptRu: 'Я силён.',
      stem: { prefix: 'Yo ', suffix: ' fuerte.' },
      options: ['soy', 'eres', 'es', 'somos'],
      correctIndex: 0,
      grammarMatrix: { options: grammarOptions(0) },
    },
  };
  return { ...base, ...over };
}

describe('spireTaskFromMultilingualRow', () => {
  test('guess_phrase/fill_gap конвертируются в choice с готовым explanation и проходят серверную проверку', () => {
    for (const mode of ['guess_phrase', 'fill_gap']) {
      const task = spireTaskFromMultilingualRow(choiceRow(mode));
      expect(task).not.toBeNull();
      expect(task!.mode).toBe(mode);
      expect(task!.payload.phrase).toBe('Yo ___ fuerte.');
      expect(task!.explanation!.wrongOptionReasons).toEqual([
        '', 'Форма глагола не согласована с этим подлежащим по лицу.',
        'Форма глагола не согласована с этим подлежащим по лицу.',
        'Форма глагола не согласована с этим подлежащим по лицу.',
      ]);
      const validation = validateTournamentTaskForNewRoom(task!);
      expect(validation.ok).toBe(true);
    }
  });

  test('guess_phrase без stem использует promptRu как phrase (пример: guess_phrase из чистого текста)', () => {
    const row = choiceRow('guess_phrase', {
      payload: {
        promptRu: 'Выбери верный перевод.',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 1,
        grammarMatrix: { options: grammarOptions(1) },
      },
    });
    const task = spireTaskFromMultilingualRow(row);
    expect(task!.payload.phrase).toBe('Выбери верный перевод.');
    expect(validateTournamentTaskForNewRoom(task!).ok).toBe(true);
  });

  test('find_oddity читает oddityIndex и inverseProof.options, ruleNote другой (найди ошибку)', () => {
    const row = choiceRow('find_oddity', {
      payload: {
        promptRu: 'Найдите фразу с ошибкой.',
        options: ['a', 'b', 'c', 'd'],
        oddityIndex: 2,
        inverseProof: {
          options: [
            { grammatical: true, reason: 'subject_verb_person_agree' },
            { grammatical: true, reason: 'subject_verb_person_agree' },
            { grammatical: false, reason: 'only_error_subject_verb_person_mismatch' },
            { grammatical: true, reason: 'subject_verb_person_agree' },
          ],
        },
      },
    });
    const task = spireTaskFromMultilingualRow(row);
    expect(task!.payload.correctIndex).toBe(2);
    expect(task!.explanation!.ruleNote).toBe('Найди вариант с ошибкой согласования.');
    expect(task!.explanation!.wrongOptionReasons).toEqual([
      'Подлежащее и сказуемое здесь согласованы верно.',
      'Подлежащее и сказуемое здесь согласованы верно.',
      '',
      'Подлежащее и сказуемое здесь согласованы верно.',
    ]);
    expect(validateTournamentTaskForNewRoom(task!).ok).toBe(true);
  });

  test('translate_build конвертируется в translate (tokenBank → wordBank, promptRu → phrase), проходит серверную проверку', () => {
    const row = {
      schemaVersion: 'arena-multilingual-task-v1',
      taskId: 'arena-es-translate_build-1-0000',
      studyTarget: 'es',
      mode: 'translate_build',
      difficulty: 1,
      payload: {
        promptRu: 'Я нахожусь в банке.',
        correctTokens: ['Yo', 'estoy', 'en', 'el', 'banco.'],
        tokenBank: ['estás', 'en', 'Yo', 'estoy', 'el', 'banco.'],
        correctTokenCount: 5,
      },
    };
    const task = spireTaskFromMultilingualRow(row);
    expect(task).not.toBeNull();
    expect(task!.mode).toBe('translate_build');
    expect(task!.payload.phrase).toBe('Я нахожусь в банке.');
    expect(task!.payload.wordBank).toEqual(row.payload.tokenBank);
    expect(task!.payload.correctTokenCount).toBe(5);
    expect(validateTournamentTaskForNewRoom(task!).ok).toBe(true);
  });

  test('speed_match пропускается (несовместим с контрактом 6 пар × 3 слова)', () => {
    const row = {
      schemaVersion: 'arena-multilingual-task-v1',
      taskId: 'arena-es-speed_match-1-0000',
      studyTarget: 'es',
      mode: 'speed_match',
      difficulty: 1,
      payload: { pairs: [{ left: 'a', right: 'b' }] },
    };
    expect(spireTaskFromMultilingualRow(row)).toBeNull();
  });

  test('неизвестная/битая строка не роняет конвертер', () => {
    expect(spireTaskFromMultilingualRow(null)).toBeNull();
    expect(spireTaskFromMultilingualRow({})).toBeNull();
    expect(spireTaskFromMultilingualRow({ schemaVersion: 'wrong' })).toBeNull();
  });

  test('незнакомый reason-код не роняет конвертер — уходит в нейтральный текст', () => {
    const row = choiceRow('guess_phrase', {
      payload: {
        promptRu: 'x', stem: { prefix: 'a', suffix: 'b' }, options: ['a', 'b', 'c', 'd'], correctIndex: 0,
        grammarMatrix: { options: [
          { reason: 'matches_subject_person' },
          { reason: 'totally_unknown_future_code' },
          { reason: 'totally_unknown_future_code' },
          { reason: 'totally_unknown_future_code' },
        ] },
      },
    });
    const task = spireTaskFromMultilingualRow(row);
    expect(task).not.toBeNull();
    expect(task!.explanation!.wrongOptionReasons?.[1]).toBe('Этот вариант не согласуется с правилом задания.');
  });

  test('НЕ проставляет v11-теги — строгая v11-проверка не должна активироваться', () => {
    const task = spireTaskFromMultilingualRow(choiceRow('guess_phrase'))!;
    expect(task.tags).toEqual([]);
    expect((task as { poolVersion?: string }).poolVersion).toBeUndefined();
  });
});

describe('spireConvertMultilingualPool', () => {
  test('честно считает converted и skippedByMode, не молчит о пропусках', () => {
    const rows = [
      choiceRow('guess_phrase'),
      choiceRow('fill_gap'),
      { schemaVersion: 'arena-multilingual-task-v1', taskId: 'x', studyTarget: 'es', mode: 'speed_match', difficulty: 1, payload: {} },
    ];
    const { tasks, stats } = spireConvertMultilingualPool('es', rows);
    expect(tasks).toHaveLength(2);
    expect(stats).toEqual({ lang: 'es', totalRows: 3, converted: 2, skippedByMode: { speed_match: 1 } });
  });
});

describe('spireMultilingualPoolSourceHash', () => {
  test('детерминирован и меняется при изменении содержимого', () => {
    const rows = [choiceRow('guess_phrase')];
    const h1 = spireMultilingualPoolSourceHash(rows);
    const h2 = spireMultilingualPoolSourceHash(rows);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    const h3 = spireMultilingualPoolSourceHash([choiceRow('fill_gap')]);
    expect(h3).not.toBe(h1);
  });
});
