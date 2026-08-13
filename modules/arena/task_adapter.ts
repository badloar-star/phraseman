import { isArenaTaskMode, type ArenaPublicTask, type ArenaTaskMode } from './contract';

export type ArenaQuestionView =
  | Readonly<{ type: 'choices'; mode: ArenaTaskMode; prompt: string; options: readonly string[] }>
  | Readonly<{ type: 'builder'; mode: 'translate_build'; prompt: string; tokens: readonly string[] }>
  | Readonly<{ type: 'matching'; mode: 'speed_match'; prompt: string; left: readonly string[]; right: readonly string[] }>;

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function text(payload: Readonly<Record<string, unknown>>, keys: readonly string[]): string {
  for (const key of keys) {
    if (typeof payload[key] === 'string' && payload[key]) return payload[key] as string;
  }
  return '';
}

/**
 * Public adapter intentionally knows no correct answer and rejects leaked answer metadata.
 * Server verdict is the only source of correctness.
 */
export function adaptArenaTask(task: ArenaPublicTask): ArenaQuestionView {
  const payload = task.payload;
  if ('answerFingerprints' in payload || 'correctAnswer' in payload || 'answer' in payload) {
    throw new Error('arena_public_task_contains_answer_metadata');
  }
  if (!isArenaTaskMode(task.mode)) throw new Error('arena_task_mode_unsupported');
  const prompt = text(payload, ['prompt', 'question', 'source', 'phrase']);
  if (task.mode === 'translate_build') {
    const tokens = stringArray(payload.wordBank ?? payload.tokens ?? payload.options ?? payload.words);
    if (!tokens.length) throw new Error('arena_builder_tokens_missing');
    return { type: 'builder', mode: task.mode, prompt, tokens };
  }
  if (task.mode === 'speed_match') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const left = items.map((item) => (item && typeof item === 'object' ? String((item as { prompt?: unknown }).prompt ?? '') : '')).filter(Boolean);
    const right = stringArray(payload.rightOptions);
    if (!left.length || left.length !== right.length) throw new Error('arena_match_pairs_missing');
    return { type: 'matching', mode: task.mode, prompt, left, right };
  }
  const options = stringArray(payload.options ?? payload.choices ?? payload.variants);
  if (options.length < 2) throw new Error('arena_choice_options_missing');
  return { type: 'choices', mode: task.mode, prompt, options };
}

export function encodeArenaSelection(view: ArenaQuestionView, selection: unknown): unknown {
  if (view.type === 'choices') return { selectedIndex: selection };
  if (view.type === 'builder') {
    const indexes = Array.isArray(selection) ? selection.filter((item): item is number => Number.isInteger(item)) : [];
    return { tokens: indexes.map((index) => view.tokens[index]).filter((token): token is string => typeof token === 'string') };
  }
  return { pairs: selection };
}

/**
 * Отрисуется ли задание вообще.
 *
 * `adaptArenaTask` бросает исключение на испорченном задании, а зовут его в
 * `useMemo` во время отрисовки — то есть падает не задание, а весь экран, и
 * вместе с ним матч. Машина матча умеет закрывать такое задание как сломанное
 * и играть дальше (`reportBroken`), но узнать о поломке ей было неоткуда.
 *
 * Проверка отдельная и чистая: экран спрашивает ДО отрисовки.
 */
export function arenaTaskRenderable(task: ArenaPublicTask): boolean {
  try {
    adaptArenaTask(task);
    return true;
  } catch {
    return false;
  }
}
