/**
 * Контракт четырёх типов турнирных заданий.
 *
 * зачем: у типов РАЗНЫЕ контракты, и ошибка здесь не видна на глаз — задание
 * тихо ляжет в пул, а в турнире игрок не сможет ответить правильно. Поэтому
 * каждый тип гоняем до конца: ответ модели → задание пула → серверный
 * validateTournamentTask → verifyTournamentAnswer с верным и неверным ответом.
 */

import {
  kindItemSemanticKey,
  kindItemTaskId,
  kindItemToTask,
  kindTaskPassesServerContract,
  parseKindItem,
} from './tournament_ai_kind_items';
import { TOURNAMENT_AI_KINDS, KIND_TO_MODE } from './tournament_ai_blueprint';
import { validateTournamentTaskForNewRoom, verifyTournamentAnswer } from './tournament_core';

// ── Эталонные ответы модели ─────────────────────────────────────────────────

const SITUATION = {
  prompt: 'Официант принёс не то блюдо. Что скажешь?',
  options: [
    'Sorry, this is not what I ordered.',
    'You brought me the wrong dish again.',
    'I demand another dish immediately now.',
    'This food here is a mistake of yours.',
  ],
  correctIndex: 0,
  correctAnswer: 'Sorry, this is not what I ordered.',
  scenario: 'кафе',
  ruleNote: 'Верно первое: вежливое сомнение. Остальные грамматичны, но звучат грубо.',
  example: 'I think this is not what I ordered. — Кажется, это не то, что я заказывал.',
};

const GAP = {
  prompt: 'I have been looking ___ my keys all morning.',
  options: ['for', 'at', 'after', 'to'],
  correctIndex: 0,
  correctAnswer: 'for',
  scenario: 'дом',
  ruleNote: 'look for — искать. look after — заботиться, look at — смотреть на.',
  example: 'I am looking for my phone. — Я ищу телефон.',
};

const ODDITY = {
  prompt: 'Какая фраза звучит неправильно?',
  options: [
    'I feel good today.',
    'I feel myself good today.',
    'I am feeling great now.',
    'I feel a bit tired.',
  ],
  correctIndex: 1,
  correctAnswer: 'I feel myself good today.',
  scenario: 'самочувствие',
  ruleNote: 'Калька с русского: feel myself — грубая ошибка, feel не требует myself.',
  example: 'I feel good today. — Сегодня я хорошо себя чувствую.',
};

const ASSEMBLY = {
  prompt: 'Соберите фразу: Я собираюсь позвонить ей завтра',
  answer: 'I am going to call her tomorrow',
  tokens: ['I', 'am', 'going', 'to', 'call', 'her', 'tomorrow'],
  decoys: ['will'],
  scenario: 'планы',
  ruleNote: 'be going to — намерение. will — другое значение, him и yesterday не подходят.',
  example: 'We are going to visit them tomorrow. — Мы собираемся навестить их завтра.',
};

const RAW_BY_KIND = {
  situation: SITUATION,
  gap: GAP,
  oddity: ODDITY,
  assembly: ASSEMBLY,
} as const;

// ── Золотой путь для каждого типа ───────────────────────────────────────────

describe('четыре типа: золотой путь до турнира', () => {
  it.each(TOURNAMENT_AI_KINDS)('тип %s проходит путь до verifyTournamentAnswer', (kind) => {
    const parsed = parseKindItem(RAW_BY_KIND[kind], kind);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const task = kindItemToTask(parsed.item, { level: 'B1', difficulty: 2 });
    expect(kindTaskPassesServerContract(task)).toBe(true);
    expect(validateTournamentTaskForNewRoom({ ...task, verified: true })).toMatchObject({ ok: true });
    expect(task.mode).toBe(KIND_TO_MODE[kind]);
    expect(task.verified).toBe(false);
    expect(task).toMatchObject({
      lifecycle: 'awaiting_approval',
      aiVerdict: 'approved',
    });
    expect(task).not.toHaveProperty('humanApprovedBy');
    expect(task.tags).toContain('source:ai');
    expect(task.tags).toContain(`kind:${kind}`);
    expect(task.explanation).toMatchObject({
      ruleNote: parsed.item.ruleNote,
      example: parsed.item.example,
      wrongOptionReasons: parsed.item.wrongOptionReasons,
    });
    expect(parsed.item.wrongOptionReasons).toHaveLength(kind === 'assembly' ? 0 : 4);
    if (kind !== 'assembly') {
      expect(parsed.item.wrongOptionReasons[parsed.item.correctIndex]).toBe('');
      expect(parsed.item.wrongOptionReasons.filter((reason) => reason.length > 0)).toHaveLength(3);
    }

    const live = { ...task, verified: true };
    if (kind === 'assembly') {
      expect(task.payload).toMatchObject({
        correctTokenCount: parsed.item.correctTokens.length,
        correctTokens: parsed.item.correctTokens,
      });
      // Сервер сверяет порядок слов точно.
      expect(verifyTournamentAnswer(live, { tokens: [...parsed.item.correctTokens] })).toBe(true);
      expect(verifyTournamentAnswer(live, { tokens: ['I', 'will', 'call', 'her'] })).toBe(false);
    } else {
      expect(verifyTournamentAnswer(live, { selectedIndex: parsed.item.correctIndex })).toBe(true);
      expect(verifyTournamentAnswer(live, { selectedIndex: (parsed.item.correctIndex + 1) % 4 })).toBe(false);
      // Голое число вместо объекта — регрессия формата ответа клиента.
      expect(verifyTournamentAnswer(live, parsed.item.correctIndex)).toBe(false);
    }
  });

  it('taskId детерминирован и различает типы', () => {
    const a = parseKindItem(GAP, 'gap');
    const b = parseKindItem(GAP, 'gap');
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(kindItemTaskId(a.item)).toBe(kindItemTaskId(b.item));
    expect(kindItemTaskId(a.item).startsWith('ai_gap_')).toBe(true);
    expect(/^[A-Za-z0-9._:-]{1,160}$/.test(kindItemTaskId(a.item))).toBe(true);

    const situation = parseKindItem(SITUATION, 'situation');
    expect(situation.ok).toBe(true);
    if (!situation.ok) return;
    expect(kindItemSemanticKey(situation.item)).not.toBe(kindItemSemanticKey(a.item));
  });
});

// ── Классы брака ────────────────────────────────────────────────────────────

describe('четыре типа: брак ловится', () => {
  it('«пропущенное слово» без пропуска → kind_gap_missing_blank', () => {
    const broken = { ...GAP, prompt: 'I have been looking for my keys.' };
    const result = parseKindItem(broken, 'gap');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_gap_missing_blank');
  });

  it('ситуация не по-русски → kind_situation_prompt_not_russian', () => {
    const broken = { ...SITUATION, prompt: 'The waiter brought the wrong dish.' };
    const result = parseKindItem(broken, 'situation');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_situation_prompt_not_russian');
  });

  it('сборка: токены не совпадают с фразой → нерешаемое задание', () => {
    // Самый опасный класс: сервер сверяет порядок точно, игрок не сможет
    // ответить верно НИКАК, а на глаз задание выглядит нормальным.
    const broken = { ...ASSEMBLY, tokens: ['I', 'will', 'call', 'her', 'tomorrow'] };
    const result = parseKindItem(broken, 'assembly');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_tokens_answer_mismatch');
  });

  it('сборка: приманка дублирует настоящее слово → kind_decoy_duplicates_token', () => {
    const broken = { ...ASSEMBLY, decoys: ['call'] };
    const result = parseKindItem(broken, 'assembly');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_decoy_duplicates_token');
  });

  it('choice: правильный ответ не совпадает с вариантом → kind_correct_mismatch', () => {
    const broken = { ...GAP, correctAnswer: 'about' };
    const result = parseKindItem(broken, 'gap');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_correct_mismatch');
  });

  it('choice: повтор варианта → kind_options_not_unique', () => {
    const broken = { ...GAP, options: ['for', 'for', 'after', 'to'] };
    const result = parseKindItem(broken, 'gap');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_options_not_unique');
  });

  it('choice: правильный выдаётся длиной → kind_length_giveaway', () => {
    const broken = {
      ...GAP,
      options: ['for the entire long morning without any luck', 'at', 'after', 'to'],
      correctIndex: 0,
      correctAnswer: 'for the entire long morning without any luck',
    };
    const result = parseKindItem(broken, 'gap');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_length_giveaway');
  });

  it('мусор вместо задания → kind_item_shape_invalid', () => {
    expect(parseKindItem(null, 'gap').ok).toBe(false);
    expect(parseKindItem('строка', 'situation').ok).toBe(false);
  });

  it('задание без примера для разбора отклоняется до записи в пул', () => {
    const { example: _example, ...withoutExample } = GAP;
    const result = parseKindItem(withoutExample, 'gap');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_example_invalid');
  });
});

describe('сборка фразы: банк слов не выдаёт ответ', () => {
  it.each([[[]], [['will', 'already']]] as readonly [readonly string[]][])('требует ровно одну ловушку: %j', (decoys) => {
    const result = parseKindItem({ ...ASSEMBLY, decoys }, 'assembly');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('kind_decoys_invalid');
  });

  it('пунктуация не становится значимой частью ответа или отдельного чипа', () => {
    const result = parseKindItem({
      ...ASSEMBLY,
      answer: 'I am going to call her tomorrow!',
      tokens: ['I', 'am', 'going', 'to', 'call', 'her', 'tomorrow!'],
      decoys: ['will,'],
    }, 'assembly');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.correctAnswer).toBe('I am going to call her tomorrow');
    expect(result.item.correctTokens).toEqual(['I', 'am', 'going', 'to', 'call', 'her', 'tomorrow']);
    expect(result.item.options).toEqual(expect.arrayContaining([
      'tomorrow', 'will',
    ]));
    expect(result.item.options.some((chip) => /[!?.,]/u.test(chip))).toBe(false);
  });

  it('ограничивает условие и правильный ответ восемью нормализованными словами', () => {
    const longPrompt = parseKindItem({
      ...GAP,
      prompt: 'I have really been looking everywhere ___ since early this morning.',
    }, 'gap');
    expect(longPrompt.ok).toBe(false);
    if (!longPrompt.ok) expect(longPrompt.errors).toContain('kind_prompt_word_limit');

    const longAnswer = parseKindItem({
      ...ASSEMBLY,
      answer: 'I am definitely going to call her tomorrow morning',
      tokens: ['I', 'am', 'definitely', 'going', 'to', 'call', 'her', 'tomorrow', 'morning'],
    }, 'assembly');
    expect(longAnswer.ok).toBe(false);
    if (!longAnswer.ok) expect(longAnswer.errors).toContain('kind_answer_word_limit');
  });

  it('слова перемешаны, но состав полный', () => {
    // Если банк идёт по порядку фразы, задание решается без знания языка.
    const parsed = parseKindItem(ASSEMBLY, 'assembly');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.item.options).toHaveLength(ASSEMBLY.tokens.length + ASSEMBLY.decoys.length);
    for (const token of [...ASSEMBLY.tokens, ...ASSEMBLY.decoys]) {
      expect(parsed.item.options).toContain(token);
    }
    // Порядок банка не совпадает с порядком ответа.
    expect(parsed.item.options.slice(0, ASSEMBLY.tokens.length)).not.toEqual(ASSEMBLY.tokens);
    // Эталонный порядок при этом сохранён отдельно — по нему сверяет сервер.
    expect(parsed.item.correctTokens).toEqual(ASSEMBLY.tokens);
  });

  it('перемешивание детерминированно — повторный разбор даёт тот же банк', () => {
    const a = parseKindItem(ASSEMBLY, 'assembly');
    const b = parseKindItem(ASSEMBLY, 'assembly');
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.item.options).toEqual(b.item.options);
  });
});
