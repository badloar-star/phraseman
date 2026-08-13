import { ARENA_ANSWER_MS, type ArenaTaskMode, arenaIsTaskMode } from './stars';

/**
 * Разбор матча.
 *
 * Владелец потребовал разбор обязательным: «в конце матча разбор вопросов и
 * заданий». Разбор отвечает на три вопроса, и ни на один из них экран
 * результата не отвечает: что было спрошено, что я ответил и что было верно, и
 * почему звёзд именно столько.
 *
 * Источник — документ разбора, который сервер пишет при закрытии матча. Он
 * содержит запечатанные правильные ответы и объяснения; вывести их на клиенте
 * нельзя: публичное задание правильный ответ не содержит, а перебирать порядок
 * слов в сборке перевода нечем.
 *
 * Здесь только разбор данных, ни сети, ни часов.
 */

export type ArenaReviewVerdict = 'correct' | 'wrong' | 'timeout' | 'partial';

export type ArenaReviewRow = Readonly<{
  taskIndex: number;
  taskId: string;
  mode: ArenaTaskMode;
  /** Вопрос как его видел игрок. */
  prompt: string;
  /** Варианты ответа, если они были. Для сборки перевода — банк слов. */
  options: readonly string[];
  /** Что игрок выбрал. Пусто, если не ответил. */
  givenText: string | null;
  /** Что было правильно. Пусто, если восстановить нечем. */
  correctText: string | null;
  verdict: ArenaReviewVerdict;
  elapsedMs: number;
  /** Правило и пример из объяснения задания. Показываются только в разборе. */
  ruleNote: string | null;
  example: string | null;
  /** Почему выбранный вариант неверен. Только для того варианта, что выбрал игрок. */
  trapNote: string | null;
}>;

export type ArenaReviewSummary = Readonly<{
  total: number;
  correct: number;
  wrong: number;
  timeout: number;
  /** Задания, которые стоит переспросить: неверные и просроченные. */
  retryTaskIndexes: readonly number[];
  slowestTaskIndex: number | null;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function strList(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Текст ответа по его закодированному виду.
 *
 * Разные виды заданий кодируют ответ по-разному, и склеивать их в одну строку
 * приходится здесь: экран не должен знать, что выбор — это индекс, а сборка —
 * список слов.
 */
function answerText(
  mode: ArenaTaskMode,
  options: readonly string[],
  answer: unknown,
): string | null {
  if (answer === null || answer === undefined) return null;
  const record = isRecord(answer) ? answer : null;
  if (mode === 'translate_build') {
    const tokens = strList(record?.tokens);
    return tokens.length ? tokens.join(' ') : null;
  }
  if (mode === 'speed_match') {
    // Пары разбираются отдельно: одной строкой их не показать, а врать
    // «ответ такой-то» про доску из четырёх пар нельзя.
    return null;
  }
  const index = Number(record?.selectedIndex);
  if (!Number.isInteger(index) || index < 0 || index >= options.length) return null;
  return options[index];
}

function correctText(
  mode: ArenaTaskMode,
  options: readonly string[],
  solution: unknown,
): string | null {
  const record = isRecord(solution) ? solution : null;
  if (!record) return null;
  if (mode === 'translate_build') {
    const tokens = strList(record.correctTokens);
    if (tokens.length) return tokens.join(' ');
    const answer = str(record.correctAnswer);
    return answer || null;
  }
  if (mode === 'speed_match') return null;
  const index = Number(record.correctIndex);
  if (!Number.isInteger(index) || index < 0 || index >= options.length) return null;
  return options[index];
}

/**
 * Почему выбранный вариант неверен.
 *
 * Берётся ТОЛЬКО для того варианта, который выбрал игрок: вывалить причины по
 * всем вариантам сразу — значит превратить разбор в стену текста, из которой
 * непонятно, что относится к тебе.
 */
function trapNote(
  mode: ArenaTaskMode,
  explanation: unknown,
  answer: unknown,
): string | null {
  if (mode === 'translate_build' || mode === 'speed_match') return null;
  const reasons = isRecord(explanation) ? strList(explanation.wrongOptionReasons) : [];
  if (!reasons.length) return null;
  const index = Number(isRecord(answer) ? answer.selectedIndex : NaN);
  if (!Number.isInteger(index) || index < 0 || index >= reasons.length) return null;
  return reasons[index] || null;
}

function verdictOf(mode: ArenaTaskMode, correct: boolean, elapsedMs: number): ArenaReviewVerdict {
  if (correct) return 'correct';
  // Полное окно без верного ответа — это просрочка, а не ошибка: игрок не
  // ошибся, он не успел, и это разные вещи для того, кто читает разбор.
  return elapsedMs >= ARENA_ANSWER_MS[mode] ? 'timeout' : 'wrong';
}

/** Разбирает одну строку документа разбора. `null` — строку не показывать. */
export function arenaParseReviewRow(raw: unknown): ArenaReviewRow | null {
  if (!isRecord(raw)) return null;
  const mode = raw.mode;
  if (!arenaIsTaskMode(mode)) return null;
  const publicTask = isRecord(raw.publicTask) ? raw.publicTask : null;
  const payload = publicTask && isRecord(publicTask.payload) ? publicTask.payload : {};
  const taskIndex = Math.trunc(Number(raw.taskIndex));
  if (!Number.isInteger(taskIndex) || taskIndex < 0) return null;

  const options = mode === 'translate_build'
    ? strList(payload.wordBank)
    : strList(payload.options);
  const prompt = str(payload.phrase) || str(payload.prompt);
  const explanation = isRecord(raw.explanation) ? raw.explanation : null;
  const answer = raw.answerSnapshot;
  const elapsedMs = Math.max(0, Math.trunc(Number(raw.elapsedMs) || 0));
  const correct = raw.correct === true;

  return {
    taskIndex,
    taskId: str(raw.taskId),
    mode,
    prompt,
    options,
    givenText: answerText(mode, options, answer),
    correctText: correctText(mode, options, raw.solution),
    verdict: mode === 'speed_match' && !correct && elapsedMs < ARENA_ANSWER_MS[mode]
      // Доска пар почти никогда не бывает «полностью неверной»: часть пар
      // обычно собрана. Называть это ошибкой несправедливо.
      ? 'partial'
      : verdictOf(mode, correct, elapsedMs),
    elapsedMs,
    ruleNote: explanation ? str(explanation.ruleNote) || null : null,
    example: explanation ? str(explanation.example) || null : null,
    trapNote: trapNote(mode, explanation, answer),
  };
}

/** Строки разбора по порядку заданий. Битые выпадают. */
export function arenaReviewRows(raws: readonly unknown[]): readonly ArenaReviewRow[] {
  return raws
    .map(arenaParseReviewRow)
    .filter((row): row is ArenaReviewRow => row !== null)
    .sort((left, right) => left.taskIndex - right.taskIndex);
}

export function arenaReviewSummary(rows: readonly ArenaReviewRow[]): ArenaReviewSummary {
  const wrong = rows.filter((row) => row.verdict === 'wrong').length;
  const timeout = rows.filter((row) => row.verdict === 'timeout').length;
  const retry = rows.filter((row) => row.verdict !== 'correct').map((row) => row.taskIndex);
  let slowest: number | null = null;
  let slowestMs = -1;
  for (const row of rows) {
    if (row.elapsedMs > slowestMs) {
      slowestMs = row.elapsedMs;
      slowest = row.taskIndex;
    }
  }
  return {
    total: rows.length,
    correct: rows.filter((row) => row.verdict === 'correct').length,
    wrong,
    timeout,
    // Повторять предлагается всё, что не сошлось, включая частично собранные
    // пары: пара, угаданная со второй попытки, — тоже незнание.
    retryTaskIndexes: retry,
    slowestTaskIndex: rows.length ? slowest : null,
  };
}
