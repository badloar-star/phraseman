// ═══════════════════════════════════════════════════════════════════════════
// tournament_ai_generator.test.ts — симуляция ИИ-генератора без OpenAI.
//
// зачем: владелец просил «моделируй и доводи до идеала». Здесь фейковые
// ответы модели: один золотой батч (обязан пройти) и по мутации на КАЖДЫЙ
// класс брака (обязан упасть с конкретным кодом). Плюс сквозная проверка:
// принятый батч → задания пула → серверный validateTournamentTask →
// verifyTournamentAnswer, т.е. путь до реального турнира целиком.
// ═══════════════════════════════════════════════════════════════════════════

import {
  TOURNAMENT_AI_BATCH_SIZE,
  TOURNAMENT_AI_LEVELS,
  buildTournamentAiPromptPacket,
  buildTournamentAiRepairTask,
  isTournamentAiLevel,
  tournamentAiDifficulty,
  tournamentAiSemanticKey,
  tournamentAiTaskFrom,
  tournamentAiTaskId,
  tournamentAiTasksFrom,
  validateTournamentAiBatch,
  type TournamentAiItem,
} from './tournament_ai_generator';
import { validateTournamentTask, verifyTournamentAnswer } from './tournament_core';

// ── Золотой батч: то, что обязана вернуть хорошая модель ────────────────────

/** Раскладка correctIndex: 0,1,2,3 × 2-3 раза, серий длиннее 2 нет. */
const PLAN = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1] as const;
const DIFFICULTIES = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'] as const;

const PHRASES = [
  'Could I get the bill, please?',
  'I am running a bit late today.',
  'Do you mind if I open the window?',
  'Let me know when you are free.',
  'I would like a table for two.',
  'Sorry, I did not catch your name.',
  'How long does it take to get there?',
  'I have been meaning to call you.',
  'Could you watch my bag, please?',
  'It slipped my mind completely.',
] as const;

const SCENARIOS = [
  'кафе и счёт', 'опоздание', 'разговор в офисе', 'планы с другом', 'ресторан',
  'знакомство', 'дорога и транспорт', 'звонок другу', 'просьба в аэропорту', 'забытое дело',
] as const;

function goldenItem(index: number): TournamentAiItem {
  // Четыре русских варианта сопоставимой длины; правильный — по плану.
  const options = [
    `перевод фразы ${index} алый`,
    `перевод фразы ${index} синий`,
    `перевод фразы ${index} белый`,
    `перевод фразы ${index} тёмный`,
  ];
  const correctIndex = PLAN[index];
  return {
    phrase: PHRASES[index],
    options,
    correctIndex,
    correctAnswer: options[correctIndex],
    difficulty: DIFFICULTIES[index],
    scenario: SCENARIOS[index],
    ruleNote: `Верен вариант ${correctIndex + 1}: остальные — ловушки времени и предлога.`,
    example: `I use phrase ${index} every day. — Я использую фразу ${index} каждый день.`,
    wrongOptionReasons: options.map((_, optionIndex) => optionIndex === correctIndex
      ? ''
      : `Вариант ${optionIndex + 1} меняет смысл исходной фразы.`),
  };
}

function goldenBatch(): { items: TournamentAiItem[] } {
  return { items: Array.from({ length: TOURNAMENT_AI_BATCH_SIZE }, (_, index) => goldenItem(index)) };
}

/** Мутация золотого батча: клонирует и правит один вопрос. */
function mutate(index: number, patch: Partial<TournamentAiItem>): { items: TournamentAiItem[] } {
  const batch = goldenBatch();
  batch.items[index] = { ...batch.items[index], ...patch };
  return batch;
}

/**
 * Коды брака независимо от исхода батча.
 *
 * зачем: с 2026-07-26 плохой вопрос отсеивается ПОШТУЧНО, а батч из
 * оставшихся принимается — иначе один брак из десяти ронял весь оплаченный
 * запрос. Коды при этом возвращаются в обоих случаях: как errors при отказе
 * и как rejected при частичном приёме.
 */
function errorsOf(raw: unknown, previousKeys?: ReadonlySet<string>): readonly string[] {
  const result = validateTournamentAiBatch(raw, { level: 'A2', previousKeys });
  return result.ok ? (result.rejected ?? []) : result.errors;
}

// ── Золотой путь ────────────────────────────────────────────────────────────

describe('tournament_ai_generator: золотой батч', () => {
  it('золотой батч проходит валидацию целиком', () => {
    const result = validateTournamentAiBatch(goldenBatch(), { level: 'A2' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(TOURNAMENT_AI_BATCH_SIZE);
  });

  it('сквозной путь: батч → задания пула → серверный контракт → verifyTournamentAnswer', () => {
    const result = validateTournamentAiBatch(goldenBatch(), { level: 'A2' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tasks = tournamentAiTasksFrom(result.items, 'A2');
    expect(tasks).not.toBeNull();
    if (!tasks) return;

    for (let i = 0; i < tasks.length; i += 1) {
      const task = { ...tasks[i], verified: true };
      const validation = validateTournamentTask(task);
      expect(validation).toEqual({ ok: true, kind: 'choice' });
      // Позицию задаёт сервер (rebalanceCorrectPositions), берём фактическую.
      const correct = result.items[i].correctIndex;
      expect(verifyTournamentAnswer(task, { selectedIndex: correct })).toBe(true);
      expect(verifyTournamentAnswer(task, { selectedIndex: (correct + 1) % 4 })).toBe(false);
      // Голое число вместо объекта — регрессия формата ответа клиента.
      expect(verifyTournamentAnswer(task, correct)).toBe(false);
    }
  });

  it('задание получает режим guess_phrase, теги source:ai и cefr, verified:false', () => {
    const task = tournamentAiTaskFrom(goldenItem(0), 'B1');
    expect(task.mode).toBe('guess_phrase');
    expect(task.verified).toBe(false);
    expect(task.tags).toContain('source:ai');
    expect(task.tags).toContain('cefr:b1');
    expect(task.tags.some((tag) => tag.startsWith('topic:'))).toBe(true);
  });

  it('taskId детерминирован, с префиксом ai_choice_ и в формате ID_RE', () => {
    const a = tournamentAiTaskId(goldenItem(0));
    const b = tournamentAiTaskId(goldenItem(0));
    expect(a).toBe(b);
    expect(a.startsWith('ai_choice_')).toBe(true);
    expect(/^[A-Za-z0-9._:-]{1,160}$/.test(a)).toBe(true);
    // Другой вопрос — другой id.
    expect(tournamentAiTaskId(goldenItem(1))).not.toBe(a);
  });
});

// ── Классы брака: каждый ловится своим кодом ────────────────────────────────

describe('tournament_ai_generator: классы брака', () => {
  it('не 10 вопросов → ai_batch_count_invalid', () => {
    const batch = goldenBatch();
    batch.items.pop();
    expect(errorsOf(batch)).toContain('ai_batch_count_invalid');
  });

  it('мусор вместо батча → ai_batch_shape_invalid', () => {
    expect(errorsOf(null)).toContain('ai_batch_shape_invalid');
    expect(errorsOf({ items: 'no' })).toContain('ai_batch_shape_invalid');
  });

  it('фраза с кириллицей или пустая → ai_phrase_invalid', () => {
    expect(errorsOf(mutate(0, { phrase: 'Могу я получить счёт?' }))).toContain('ai_phrase_invalid');
    expect(errorsOf(mutate(0, { phrase: '' }))).toContain('ai_phrase_invalid');
  });

  it('фраза и правильный ответ ограничены восемью нормализованными словами', () => {
    expect(errorsOf(mutate(0, {
      phrase: 'I would really like to book a table for two tonight.',
    }))).toContain('ai_phrase_word_limit');

    const item = goldenItem(0);
    const options = [...item.options];
    options[item.correctIndex] = 'это слишком длинный правильный ответ для быстрого турнирного задания сегодня';
    expect(errorsOf(mutate(0, {
      options,
      correctAnswer: options[item.correctIndex],
    }))).toContain('ai_correct_answer_word_limit');
  });

  it('одинаковая фраза дважды → ai_phrase_duplicate', () => {
    expect(errorsOf(mutate(1, { phrase: PHRASES[0] }))).toContain('ai_phrase_duplicate');
  });

  it('не 4 опции → ai_options_invalid', () => {
    expect(errorsOf(mutate(0, { options: ['раз', 'два', 'три'] }))).toContain('ai_options_invalid');
  });

  it('повтор опции → ai_options_not_unique', () => {
    const item = goldenItem(0);
    const options = [item.options[0], item.options[0], item.options[2], item.options[3]];
    expect(errorsOf(mutate(0, { options }))).toContain('ai_options_not_unique');
  });

  it('метка "A)" в опции → ai_option_label_prefix', () => {
    const item = goldenItem(0);
    const options = [`A) ${item.options[0]}`, item.options[1], item.options[2], item.options[3]];
    expect(errorsOf(mutate(0, { options }))).toContain('ai_option_label_prefix');
  });

  it('опция без кириллицы (перепутано направление) → ai_option_language_invalid', () => {
    const item = goldenItem(0);
    const options = ['the bill please now', item.options[1], item.options[2], item.options[3]];
    expect(errorsOf(mutate(0, { options }))).toContain('ai_option_language_invalid');
  });

  it('correctIndex вне 0-3 → ai_correct_index_invalid', () => {
    expect(errorsOf(mutate(0, { correctIndex: 5 }))).toContain('ai_correct_index_invalid');
    expect(errorsOf(mutate(0, { correctIndex: -1 }))).toContain('ai_correct_index_invalid');
  });

  it('correctAnswer не совпадает байт-в-байт → ai_correct_mismatch', () => {
    expect(errorsOf(mutate(0, { correctAnswer: 'другой текст ответа' }))).toContain('ai_correct_mismatch');
  });

  it('дистрактор — обрезок правильного ответа → ai_truncated_choice_conflict', () => {
    const options = [
      'открывалка для консервных банок',
      'банок',
      'штопор для винных бутылок',
      'щипцы для салата на кухне',
    ];
    expect(errorsOf(mutate(0, { options, correctIndex: 0, correctAnswer: options[0] })))
      .toContain('ai_truncated_choice_conflict');
  });

  it('правильный ответ выдан длиной в одном вопросе → ai_length_giveaway_item', () => {
    const options = [
      'да',
      'перевод фразы ноль синий',
      'перевод фразы ноль белый',
      'перевод фразы ноль тёмный',
    ];
    expect(errorsOf(mutate(0, { options, correctIndex: 0, correctAnswer: options[0] })))
      .toContain('ai_length_giveaway_item');
  });

  it('правильный систематически самый длинный по батчу → ai_length_giveaway_batch', () => {
    const batch = goldenBatch();
    // В 6 вопросах правильный длиннее остальных на ~7 символов: поштучный
    // мягкий порог (10) не срабатывает, но паттерн «выбирай длинное» есть.
    for (let i = 0; i < 6; i += 1) {
      const item = batch.items[i];
      const options = [...item.options];
      options[item.correctIndex] = `${options[item.correctIndex]} ещё чуть`;
      batch.items[i] = { ...item, options, correctAnswer: options[item.correctIndex] };
    }
    expect(errorsOf(batch)).toContain('ai_length_giveaway_batch');
  });

  it('difficulty вне easy/medium/hard → ai_difficulty_invalid', () => {
    expect(errorsOf(mutate(0, { difficulty: 'extreme' as never }))).toContain('ai_difficulty_invalid');
  });

  it('смещение сложности на 1 допустимо — батч за это не бракуется', () => {
    // Требовать точного 3/4/3 нереалистично: проходил 1 расклад из 66, и целый
    // батч терялся вместе с потраченными деньгами. Допуск ±1 (2026-07-26).
    expect(errorsOf(mutate(0, { difficulty: 'medium' })))
      .not.toContain('ai_difficulty_distribution_mismatch');
  });

  it('явный перекос сложности → ai_difficulty_distribution_mismatch', () => {
    // Все десять «лёгкие»: easy 10 против 3 — за пределами допуска.
    const batch = goldenBatch();
    batch.items = batch.items.map((item) => ({ ...item, difficulty: 'easy' as const }));
    expect(errorsOf(batch)).toContain('ai_difficulty_distribution_mismatch');
  });

  it('один плохой вопрос не убивает батч — отсеивается поштучно', () => {
    // Главная жалоба владельца 2026-07-26: «ИИ предложил 0 вопросов, деньги
    // потрачены». Один брак из десяти ронял весь оплаченный запрос.
    const batch = mutate(3, { phrase: 'Могу я получить счёт?' }); // кириллица во фразе
    const result = validateTournamentAiBatch(batch, { level: 'A2' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(TOURNAMENT_AI_BATCH_SIZE - 1);
    expect(result.rejected).toContain('ai_phrase_invalid');
    // Плохой вопрос в принятые не попал.
    expect(result.items.some((item) => item.phrase === 'Могу я получить счёт?')).toBe(false);
  });

  it('если уцелело меньше минимума — батч всё же отклоняется', () => {
    const batch = goldenBatch();
    // Портим восемь из десяти: принять нечего.
    for (let i = 0; i < 8; i += 1) {
      batch.items[i] = { ...batch.items[i], phrase: '' };
    }
    expect(validateTournamentAiBatch(batch, { level: 'A2' }).ok).toBe(false);
  });

  it('позиции правильного ответа раскладываются сервером, а не бракуют батч', () => {
    // 2026-07-26: модель почти никогда не попадала в распределение сама
    // (6 раскладов из 286), и оплаченный батч терялся целиком. Требование
    // механическое — чиним перестановкой вариантов внутри вопроса.
    const batch = goldenBatch();
    batch.items = batch.items.map((item) => ({
      ...item,
      correctIndex: 2,
      correctAnswer: item.options[2],
      wrongOptionReasons: item.options.map((_, optionIndex) => optionIndex === 2
        ? ''
        : `Вариант ${optionIndex + 1} меняет смысл исходной фразы.`),
    }));
    const result = validateTournamentAiBatch(batch, { level: 'A2' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const counts = [0, 0, 0, 0];
    result.items.forEach((item) => { counts[item.correctIndex] += 1; });
    expect(counts.every((count) => count >= 2 && count <= 3)).toBe(true);

    // Серий длиннее двух подряд быть не должно.
    let run = 1;
    for (let i = 1; i < result.items.length; i += 1) {
      run = result.items[i].correctIndex === result.items[i - 1].correctIndex ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(2);
    }
    // Правильный ответ остаётся тем же текстом, просто на другом месте.
    result.items.forEach((item) => {
      expect(item.options[item.correctIndex]).toBe(item.correctAnswer);
    });
  });

  it('сцена пустая или не по-русски → ai_scenario_invalid', () => {
    expect(errorsOf(mutate(0, { scenario: '' }))).toContain('ai_scenario_invalid');
    expect(errorsOf(mutate(0, { scenario: 'airport talk' }))).toContain('ai_scenario_invalid');
  });

  it('все сцены одинаковые → ai_scenarios_too_narrow', () => {
    const batch = goldenBatch();
    batch.items = batch.items.map((item) => ({ ...item, scenario: 'кафе и счёт' }));
    expect(errorsOf(batch)).toContain('ai_scenarios_too_narrow');
  });

  it('пустая заметка для редактора → ai_rule_note_invalid', () => {
    expect(errorsOf(mutate(0, { ruleNote: '' }))).toContain('ai_rule_note_invalid');
  });

  it('не принимает генерацию без примера или отдельной причины каждой ловушки', () => {
    expect(errorsOf(mutate(0, { example: '' }))).toContain('ai_example_invalid');
    expect(errorsOf(mutate(0, { wrongOptionReasons: ['', 'первая', '', 'третья'] })))
      .toContain('ai_wrong_option_reasons_invalid');
  });

  it('два смыслово одинаковых вопроса → ai_semantic_duplicate', () => {
    const batch = goldenBatch();
    batch.items[1] = { ...batch.items[0], scenario: SCENARIOS[1] };
    expect(errorsOf(batch)).toContain('ai_semantic_duplicate');
  });

  it('повтор вопроса из прошлых генераций → ai_previous_duplicate', () => {
    const previous = new Set([tournamentAiSemanticKey(goldenItem(0))]);
    expect(errorsOf(goldenBatch(), previous)).toContain('ai_previous_duplicate');
  });
});

// ── Сложность и уровни ──────────────────────────────────────────────────────

describe('tournament_ai_generator: уровни', () => {
  it('маппинг easy/medium/hard вокруг базы CEFR', () => {
    expect(tournamentAiDifficulty('A1', 'easy')).toBe(1);
    expect(tournamentAiDifficulty('A1', 'medium')).toBe(1);
    expect(tournamentAiDifficulty('A1', 'hard')).toBe(2);
    expect(tournamentAiDifficulty('B1', 'easy')).toBe(1);
    expect(tournamentAiDifficulty('B1', 'medium')).toBe(2);
    expect(tournamentAiDifficulty('B1', 'hard')).toBe(3);
    expect(tournamentAiDifficulty('C2', 'easy')).toBe(2);
    expect(tournamentAiDifficulty('C2', 'medium')).toBe(3);
    expect(tournamentAiDifficulty('C2', 'hard')).toBe(3);
  });

  it('isTournamentAiLevel принимает только 6 уровней CEFR', () => {
    for (const level of TOURNAMENT_AI_LEVELS) expect(isTournamentAiLevel(level)).toBe(true);
    expect(isTournamentAiLevel('D1')).toBe(false);
    expect(isTournamentAiLevel('')).toBe(false);
  });
});

// ── Промпт ──────────────────────────────────────────────────────────────────

describe('tournament_ai_generator: промпт', () => {
  it('пакет содержит уровень с якорем, правила честности и strict-схему', () => {
    const packet = buildTournamentAiPromptPacket({ level: 'B1' });
    expect(packet.task).toContain('CEFR B1');
    expect(packet.task).toContain('level 3 of 6');
    // Ключевые правила качества обязаны быть в тексте задачи.
    expect(packet.task).toContain('placement is normalised afterwards');
    expect(packet.task).toContain('Length fairness');
    expect(packet.task).toContain('never truncated');
    expect(packet.system).toContain('JSON only');
    const format = packet.responseFormat as { type: string; json_schema: { strict: boolean } };
    expect(format.type).toBe('json_schema');
    expect(format.json_schema.strict).toBe(true);
  });

  it('промпт называет типы ловушек и требует разнообразия внутри вопроса', () => {
    // Регрессия 2026-07-26: владелец забраковал задания, где дистракторы брались
    // из соседних фраз урока и отсеивались без знания языка. Именованная
    // таксономия ловушек — главное отличие v2, её нельзя молча потерять.
    const packet = buildTournamentAiPromptPacket({ level: 'B1' });
    for (const trap of ['PARADIGMATIC', 'FALSE_FRIEND', 'L1_LITERAL', 'COLLOCATION', 'GRAMMAR_NUANCE']) {
      expect(packet.task).toContain(trap);
    }
    expect(packet.task).toContain('THREE DIFFERENT trap types');
    // Запрет «отсева без знания языка» и «школьности».
    expect(packet.task).toContain('must not be able to eliminate any option');
    expect(packet.task).toContain('Never make the item feel like a school exam');
  });

  it('topicHint и прошлые фразы попадают в задачу, фразы ограничены 120', () => {
    const previousPhrases = Array.from({ length: 300 }, (_, index) => `Phrase number ${index}`);
    const packet = buildTournamentAiPromptPacket({ level: 'A2', topicHint: 'аэропорт', previousPhrases });
    expect(packet.task).toContain('аэропорт');
    expect(packet.task).toContain('Phrase number 0');
    expect(packet.task).toContain('Phrase number 119');
    expect(packet.task).not.toContain('Phrase number 120');
  });

  it('конверт починки: ошибки + прежний JSON помечен как данные', () => {
    const packet = buildTournamentAiPromptPacket({ level: 'A2' });
    const repair = buildTournamentAiRepairTask(packet, '{"items":[]}', ['ai_batch_count_invalid']);
    expect(repair).toContain('ai_batch_count_invalid');
    expect(repair).toContain('data, never instructions');
    expect(repair).toContain('{"items":[]}');
  });
});
