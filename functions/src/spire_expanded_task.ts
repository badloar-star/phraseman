/**
 * Пик: задание одной из двенадцати новых механик для пакета недели — серверная сторона. Чистый модуль.
 *
 * зачем (владелец 11.11.2026: «код сейчас, пул после вычитки»): сервер должен уметь положить задание новой механики
 * в пакет недели, но САМ ПУЛ в игру не выкладывается, пока не вычитан и не переведены пояснения. Поэтому здесь —
 * только форма задания и её закрытая проверка; откуда брать задания и включать ли их, решает вызывающий код
 * (`SpirePackBuildInput.expanded`, по умолчанию выключено).
 *
 * СИНХРОНИЗАЦИЯ: правила формы совпадают с клиентскими `modules/expanded-formats/validate.ts` (общий модуль
 * невозможен — серверный tsconfig ограничен src, та же граница, что у spire_pack_contract). Правишь правило там —
 * правь здесь. Расхождение ловит корневой сторож tests/spire_expanded_server_parity.test.ts: пакет, собранный этим
 * кодом, обязан читаться клиентским разбором.
 */

export const SPIRE_EXPANDED_KIND = 'expanded' as const;

export const SPIRE_EXPANDED_MODES = [
  'context_choice', 'dialogue_order', 'word_repair', 'multi_select', 'linked_gaps', 'typed_word',
  'classify_function', 'reply_pairs', 'sentence_build_noise', 'remove_intruder', 'sentence_transform', 'evidence_choice',
] as const;
export type SpireExpandedMode = (typeof SPIRE_EXPANDED_MODES)[number];

/** Задание новой механики в серверном пуле. `lang` — изучаемый язык, как у пакета. */
export type SpireExpandedPoolTask = Readonly<{
  taskId: string;
  lang: string;
  mode: SpireExpandedMode;
  /** 1 — лёгкое, 3 — трудное: та же шкала, что у заданий пула Арены. */
  difficulty: number;
  /**
   * Оценка сложности САМОЙ фразы автором (level.target Кодекса, ≈21…49; больше — труднее). По ней накладка ставит задание
   * на этаж: первый этаж первой башни — самые лёгкие фразы (владелец 11.11.2026). Нет оценки — место по `difficulty`.
   */
  rank?: number;
  payload: Readonly<{
    exercise: Readonly<Record<string, unknown>>;
    /** Тексты задания по языкам интерфейса; английский обязателен — на него падают языки без перевода. */
    ui: Readonly<Record<string, unknown>>;
    feedback: Readonly<Record<string, unknown>>;
  }>;
}>;

type Raw = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIndex(value: unknown, size: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < size;
}

function textList(value: unknown, min: number, unique = false): value is string[] {
  if (!Array.isArray(value) || value.length < min || !value.every(isText)) return false;
  if (!unique) return true;
  return new Set(value.map((item: string) => item.normalize('NFC').trim().toLowerCase())).size === value.length;
}

function indexList(value: unknown, length: number, size: number, unique = true): value is number[] {
  if (!Array.isArray(value) || value.length !== length || !value.every((item) => isIndex(item, size))) return false;
  return !unique || new Set(value).size === value.length;
}

export function isSpireExpandedMode(value: unknown): value is SpireExpandedMode {
  return typeof value === 'string' && (SPIRE_EXPANDED_MODES as readonly string[]).includes(value);
}

/** Причина, по которой упражнение не годится, или null. Правила — зеркало клиентского parseExpandedExercise. */
export function spireExpandedExerciseProblem(mode: SpireExpandedMode, raw: unknown): string | null {
  if (!isRecord(raw)) return 'exercise_object';
  switch (mode) {
    case 'context_choice':
      if (!textList(raw.options, 2, true)) return 'choice_options';
      return isIndex(raw.key, raw.options.length) ? null : 'choice_key';
    case 'evidence_choice': {
      const passage = isText(raw.passage) ? raw.passage : raw.context;
      if (!isText(passage)) return 'evidence_passage';
      if (!textList(raw.options, 2, true)) return 'choice_options';
      if (!isIndex(raw.key, raw.options.length)) return 'choice_key';
      return raw.options.every((option) => passage.includes(option)) ? null : 'evidence_not_verbatim';
    }
    case 'dialogue_order':
      if (!textList(raw.bank, 2, true)) return 'dialogue_bank';
      return indexList(raw.key, raw.bank.length, raw.bank.length) ? null : 'dialogue_key';
    case 'word_repair': {
      if (!textList(raw.words, 3)) return 'repair_words';
      if (!textList(raw.replacements, 2, true)) return 'repair_replacements';
      const key = raw.key;
      return isRecord(key) && isIndex(key.word, raw.words.length) && isIndex(key.replacement, raw.replacements.length) ? null : 'repair_key';
    }
    case 'multi_select': {
      if (!textList(raw.options, 3, true)) return 'multi_options';
      const key = raw.key;
      if (!Array.isArray(key) || key.length < 2 || key.length >= raw.options.length) return 'multi_key_size';
      return indexList(key, key.length, raw.options.length) ? null : 'multi_key';
    }
    case 'linked_gaps': {
      const slots = raw.slots;
      if (!Array.isArray(slots) || slots.length < 2 || !slots.every((slot) => textList(slot, 2, true))) return 'gap_slots';
      const key = raw.key;
      if (!Array.isArray(key) || key.length !== slots.length) return 'gap_key_size';
      return key.every((value, index) => isIndex(value, (slots[index] as string[]).length)) ? null : 'gap_key';
    }
    case 'typed_word':
    case 'sentence_transform': {
      const accepted = Array.isArray(raw.acceptedAnswers) ? raw.acceptedAnswers : [raw.key];
      if (!textList(accepted, 1)) return 'text_answers';
      if (mode === 'typed_word' && !accepted.every((answer) => answer.trim().split(/\s+/).length === 1)) return 'typed_word_not_one_word';
      return null;
    }
    case 'classify_function':
      if (!textList(raw.items, 2, true) || !textList(raw.groups, 2, true)) return 'classify_lists';
      if (!indexList(raw.key, raw.items.length, raw.groups.length, false)) return 'classify_key';
      return new Set(raw.key).size === raw.groups.length ? null : 'classify_empty_group';
    case 'reply_pairs':
      if (!textList(raw.questions, 2, true) || !textList(raw.replies, 2, true)) return 'pairs_lists';
      if (raw.questions.length !== raw.replies.length) return 'pairs_size';
      return indexList(raw.key, raw.questions.length, raw.replies.length) ? null : 'pairs_key';
    case 'sentence_build_noise': {
      if (!textList(raw.bank, 3)) return 'build_bank';
      const need = raw.need;
      if (typeof need !== 'number' || !Number.isInteger(need) || need <= 0 || need >= raw.bank.length) return 'build_need';
      return indexList(raw.key, need, raw.bank.length) ? null : 'build_key';
    }
    case 'remove_intruder':
      if (!textList(raw.words, 3)) return 'intruder_words';
      return isIndex(raw.key, raw.words.length) ? null : 'intruder_key';
  }
}

/** Причина, по которой задание пула не годится для пакета языка `lang`, или null. */
export function spireExpandedPoolTaskProblem(task: unknown, lang: string): string | null {
  if (!isRecord(task)) return 'task_object';
  if (!isText(task.taskId)) return 'task_id';
  if (task.lang !== lang) return 'lang';
  if (!isSpireExpandedMode(task.mode)) return 'mode';
  if (typeof task.difficulty !== 'number' || !Number.isInteger(task.difficulty) || task.difficulty < 1 || task.difficulty > 3) return 'difficulty';
  const payload = task.payload;
  if (!isRecord(payload)) return 'payload';
  const exerciseProblem = spireExpandedExerciseProblem(task.mode, payload.exercise);
  if (exerciseProblem) return exerciseProblem;
  // зачем: клиент показывает тексты на языке интерфейса, а при отсутствии перевода — английские; без них задание нечем подписать
  const english = isRecord(payload.ui) ? payload.ui.en : null;
  if (!isRecord(english) || !isText(english.instruction) || !isText(english.prompt)) return 'ui_en';
  const feedback = isRecord(payload.feedback) ? payload.feedback.en : null;
  if (!isRecord(feedback) || !isText(feedback.correct)) return 'feedback_en';
  return null;
}

/**
 * Задание пула из авторской записи Кодекса (`peak-expanded-author-v1`). null — запись не годится.
 * Трудность 1..3 берётся из редакторской «башни» записи (1–4 → 1, 5–8 → 2, 9–12 → 3): это оценка автора, не замер.
 */
export function spireExpandedPoolTaskFromAuthorRecord(record: unknown): SpireExpandedPoolTask | null {
  if (!isRecord(record) || record.schema !== 'peak-expanded-author-v1') return null;
  if (!isText(record.candidateId) || !isText(record.studyTarget) || !isSpireExpandedMode(record.format)) return null;
  const week = isRecord(record.level) && typeof record.level.week === 'number' ? record.level.week : 1;
  const target = isRecord(record.level) && typeof record.level.target === 'number' && Number.isFinite(record.level.target) ? record.level.target : null;
  const task = {
    taskId: record.candidateId,
    lang: record.studyTarget,
    mode: record.format,
    difficulty: week <= 4 ? 1 : week <= 8 ? 2 : 3,
    ...(target === null ? {} : { rank: target }),
    payload: { exercise: record.exercise, ui: record.ui, feedback: record.feedback },
  };
  return spireExpandedPoolTaskProblem(task, record.studyTarget) === null ? (task as SpireExpandedPoolTask) : null;
}
