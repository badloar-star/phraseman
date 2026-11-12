/**
 * Ошибка в игре → «Мои ошибки». Решение владельца 11.11.2026 (D207): связь игр и ошибок — в обе стороны;
 * макет «Потока»: «Мимо — темп ниже, фраза уйдёт в «Ошибки»».
 *
 * Пишем в тот же журнал, что уроки, экзамен и Пик (captureCurrentAccountObjectiveAttempt, локально, без сети),
 * и только то, из чего «Мои ошибки» потом соберут решаемое упражнение: фраза изучаемого языка + её перевод.
 * Запись никогда не бросает — игра не должна спотыкаться о журнал. Причина каждого пропуска и сбоя — в журнале [GAME-MISTAKE].
 *
 * sourceKind: своего значения у игр в объединении MistakeSourceKind пока нет (файл контрактов общий), журнал хранит
 * его строкой, неизвестное попадает в группу «другое» — так же сделано у Пика (app/spire/spire_mistake_capture.ts).
 */
import { captureCurrentAccountObjectiveAttempt } from '../../app/mistake_practice_capture';
import type { MistakeSourceKind } from '../mistake-practice/contracts';
import { isMistakeStudyTargetValue } from '../mistake-practice/contracts';

const LOG = '[GAME-MISTAKE]';
const GAME_SOURCE_KIND = 'game' as MistakeSourceKind;

export type GameMistakeOutcome = 'saved' | 'skipped' | 'failed';

export type GameMistakeInput = Readonly<{
  /** Какая игра: попадает в id записи, чтобы записи разных игр не склеивались. */
  game: 'flow';
  studyTarget: string;
  /** Id фразы урока. */
  itemId: string;
  /** Фраза на изучаемом языке. */
  target: string;
  /** Её перевод на язык интерфейса. */
  meaning: string;
  /** Что человек выбрал. */
  given: string;
  /** Уникальный ключ захода — чтобы один и тот же промах за заход не писался дважды. */
  attemptKey: string;
}>;

export async function captureGameMistake(input: GameMistakeInput): Promise<GameMistakeOutcome> {
  const target = typeof input.target === 'string' ? input.target.trim() : '';
  const meaning = typeof input.meaning === 'string' ? input.meaning.trim() : '';
  if (!isMistakeStudyTargetValue(input.studyTarget)) {
    console.log(`${LOG} skip language ${JSON.stringify({ game: input.game, studyTarget: input.studyTarget })}`); // guard-ok: ранний выход называет причину
    return 'skipped';
  }
  if (!target || !meaning || !input.itemId) {
    console.warn(`${LOG} skip empty ${JSON.stringify({ game: input.game, itemId: input.itemId, target: Boolean(target), meaning: Boolean(meaning) })}`);
    return 'skipped';
  }
  try {
    const result = await captureCurrentAccountObjectiveAttempt({
      attemptId: `game:${input.game}:${input.attemptKey}:${input.itemId}`,
      studyTarget: input.studyTarget,
      verdict: 'wrong',
      objective: true,
      content: { sourceKind: GAME_SOURCE_KIND, sourceId: `game:${input.game}:${input.itemId}`, canonicalTarget: target, sourceMeaning: meaning },
      // как у Пика (guess_phrase): ожидается фраза изучаемого языка — упражнение «Моих ошибок» строится по ней
      facet: { kind: 'meaning', expected: target, given: input.given },
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
