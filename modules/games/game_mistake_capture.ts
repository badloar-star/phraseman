/**
 * Ошибка в игре → «Мои ошибки». Решение владельца 11.11.2026 (D207): связь игр и ошибок — в обе стороны;
 * макет «Потока»: «Мимо — темп ниже, фраза уйдёт в «Ошибки»».
 *
 * Пишем в тот же журнал, что уроки, экзамен и Пик (captureCurrentAccountObjectiveAttempt, локально, без сети),
 * и только то, из чего «Мои ошибки» потом соберут решаемое упражнение (как у Пика, app/spire/spire_mistake_capture.ts):
 *   • meaning       — фраза изучаемого языка + её перевод («Поток», «На слух», «Лишнее слово»);
 *   • missing_token — фраза с пропуском + верное слово («Точное слово», «Охота на ошибку»).
 * «Память», «Три формы», «Сортировка», «Собери диалог» не пишутся: из их промаха упражнение не собрать,
 * а неразрешимое задание в журнале стоит человеку жизни (инцидент 2026-09-21).
 * Запись никогда не бросает — игра не должна спотыкаться о журнал. Причина каждого пропуска и сбоя — в журнале [GAME-MISTAKE].
 *
 * sourceKind: своего значения у игр в объединении MistakeSourceKind пока нет (файл контрактов общий), журнал хранит
 * его строкой, неизвестное попадает в группу «другое» — так же сделано у Пика.
 */
import { captureCurrentAccountObjectiveAttempt } from '../../app/mistake_practice_capture';
import type { MistakeSourceKind } from '../mistake-practice/contracts';
import { isMistakeStudyTargetValue } from '../mistake-practice/contracts';

const LOG = '[GAME-MISTAKE]';
const GAME_SOURCE_KIND = 'game' as MistakeSourceKind;

export type GameMistakeOutcome = 'saved' | 'skipped' | 'failed';
export type GameMistakeGame = 'flow' | 'odd_word' | 'listen' | 'exact' | 'hunt';

type Base = Readonly<{
  /** Какая игра: попадает в id записи, чтобы записи разных игр не склеивались. */
  game: GameMistakeGame;
  studyTarget: string;
  /** Id задания или фразы. */
  itemId: string;
  /** Что человек выбрал или нажал. */
  given: string;
  /** Ключ захода — чтобы один и тот же промах за заход не писался дважды. */
  attemptKey: string;
}>;

/** Фраза + перевод: упражнение «вспомни фразу по смыслу». */
export type GameMeaningMistake = Base & Readonly<{ target: string; meaning: string }>;

/** Фраза с пропуском: упражнение «вставь слово». `gapped` содержит ровно один `___`. */
export type GameGapMistake = Base & Readonly<{ kind: 'gap'; gapped: string; word: string; distractors?: readonly string[] }>;

export type GameMistakeInput = GameMeaningMistake | GameGapMistake;

const clean = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

function isGap(input: GameMistakeInput): input is GameGapMistake {
  return (input as GameGapMistake).kind === 'gap';
}

export async function captureGameMistake(input: GameMistakeInput): Promise<GameMistakeOutcome> {
  if (!isMistakeStudyTargetValue(input.studyTarget)) {
    console.log(`${LOG} skip language ${JSON.stringify({ game: input.game, studyTarget: input.studyTarget })}`); // guard-ok: ранний выход называет причину
    return 'skipped';
  }
  if (!input.itemId) {
    console.warn(`${LOG} skip no_item ${JSON.stringify({ game: input.game })}`);
    return 'skipped';
  }
  let content: { sourceKind: MistakeSourceKind; sourceId: string; canonicalTarget: string; sourceMeaning?: string; sourcePrompt?: string; distractors?: readonly string[] };
  let facet: { kind: 'meaning' | 'missing_token'; expected: string; given: string };
  const sourceId = `game:${input.game}:${input.itemId}`;
  if (isGap(input)) {
    const gapped = clean(input.gapped);
    const word = clean(input.word);
    if (!word || gapped.split('___').length !== 2) {
      console.warn(`${LOG} skip bad_gap ${JSON.stringify({ game: input.game, itemId: input.itemId, word: Boolean(word) })}`);
      return 'skipped';
    }
    content = { sourceKind: GAME_SOURCE_KIND, sourceId, canonicalTarget: clean(gapped.replace('___', word)), sourcePrompt: gapped, ...(input.distractors?.length ? { distractors: input.distractors.map(clean).filter(Boolean) } : {}) };
    facet = { kind: 'missing_token', expected: word, given: input.given };
  } else {
    const target = clean(input.target);
    const meaning = clean(input.meaning);
    if (!target || !meaning) {
      console.warn(`${LOG} skip empty ${JSON.stringify({ game: input.game, itemId: input.itemId, target: Boolean(target), meaning: Boolean(meaning) })}`);
      return 'skipped';
    }
    content = { sourceKind: GAME_SOURCE_KIND, sourceId, canonicalTarget: target, sourceMeaning: meaning };
    // как у Пика (guess_phrase): ожидается фраза изучаемого языка — упражнение «Моих ошибок» строится по ней
    facet = { kind: 'meaning', expected: target, given: input.given };
  }
  try {
    const result = await captureCurrentAccountObjectiveAttempt({
      attemptId: `game:${input.game}:${input.attemptKey}:${input.itemId}`,
      studyTarget: input.studyTarget,
      verdict: 'wrong',
      objective: true,
      content,
      facet,
    });
    console.log(`${LOG} ${input.game} ${input.itemId} → ${result.kind}${result.kind === 'ignored' ? ` (${String((result as { reason?: unknown }).reason)})` : ''}`); // guard-ok: итог записи
    return result.kind === 'captured' ? 'saved' : 'skipped';
  } catch (error) {
    console.warn(`${LOG} failed ${JSON.stringify({ game: input.game, itemId: input.itemId, error: error instanceof Error ? error.message : String(error) })}`);
    return 'failed';
  }
}

/** Безопасный вызов из экрана: не ждёт и не бросает. */
export function noteGameMistake(input: GameMistakeInput): void {
  captureGameMistake(input).catch((error: unknown) => {
    console.warn(`${LOG} note:failed ${error instanceof Error ? error.message : String(error)}`);
  });
}

/** Ключ захода игры: один на открытие экрана. */
export function newGameAttemptKey(): string {
  return Date.now().toString(36);
}
