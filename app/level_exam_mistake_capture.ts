/**
 * Ошибки экзамена уровня → раздел «Мои ошибки».
 *
 * зачем (владелец 11.11.2026, «Сначала перенести»): прежний встроенный экран экзамена записывал каждый неверный ответ в
 * «Мои ошибки» (решение 22.09 — для всех языков курса; «Мои ошибки 3.0» — вместе с ответом ученика и текстом вопроса).
 * Новый движок (components/level-exam/LevelExamV2.tsx) этого не делал: экзамен перестал пополнять раздел. Здесь запись
 * восстановлена. В новом экзамене ответ можно менять до «Продолжить», а вердикт виден только в итоге, поэтому ошибки
 * пишутся один раз — когда экзамен завершён и посчитан, а не на каждое нажатие.
 *
 * Что пишем: задания, где есть однозначные «надо было» и «ты ответил» — выбор фразы, пропущенное слово, сборка фразы и
 * семь новых механик, собранных из фразы урока (эталон для раздела — сама фраза урока, её и предстоит повторить).
 * Что не пишем: «Так не говорят» (верный ответ там — неправильная фраза, тренировать её нельзя), быстрые пары и пять механик
 * из банка диалогов и текстов (у них нет фразы урока — в разделе нечего было бы повторять). Задание без ответа или с
 * недоделанным ответом (вышло время) — не ошибка ученика по существу, как и в прежнем экране: писался только сделанный выбор.
 */
import { expandedCorrectText, expandedGivenText, gradeExpanded, isExpandedResponseComplete } from '../modules/expanded-formats/grade';
import { MISTAKE_GIVEN_MAX_CHARS, isMistakeStudyTargetValue, type MistakeFacet } from '../modules/mistake-practice/contracts';
import { PHRASE_BUILT_FORMATS } from './level_exam_expanded_builder';
import type { LevelExamAnswers } from './level_exam_scoring';
import type { LevelExamBlueprint, LevelExamLevel } from './level_exam_types';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';

const LOG = '[LEVEL-EXAM-MISTAKES]';

export type LevelExamMistake = {
  scoreUnitId: string;
  sourceId: string;
  lessonId: string;
  canonicalTarget: string;
  sourceMeaning: string;
  sourcePrompt: string;
  distractors: string[];
  kind: MistakeFacet;
  expected: string;
  given: string;
  /** Номер пропущенного слова во фразе — без него раздел не принимает ошибку вида «пропущенное слово». */
  tokenIndex?: number;
};

/** Неверные ответы завершённой попытки в виде, готовом к записи. Чистая функция: по чертежу и ответам. */
export function levelExamMistakes(blueprint: LevelExamBlueprint, answers: LevelExamAnswers): LevelExamMistake[] {
  const mistakes: LevelExamMistake[] = [];
  for (const task of blueprint.tasks) {
    if (task.format === 'guess_phrase' || task.format === 'fill_gap') {
      const answer = answers[task.scoreUnitId];
      if (answer?.kind !== 'choice') continue;
      if ((task.acceptedOptionIds || [task.correctOptionId]).includes(answer.optionId)) continue;
      const expected = task.options.find((option) => option.id === task.correctOptionId)?.text ?? '';
      const given = task.options.find((option) => option.id === answer.optionId)?.text ?? '';
      if (!expected) continue;
      // зачем: у пропуска задание — «перевод, затем фраза с ___»; эталон для раздела — целая фраза с подставленным словом
      const lines = task.prompt.split('\n');
      const gapLine = lines.find((line) => line.includes('___')) ?? '';
      // зачем: «пропущенное слово» раздел принимает только с номером слова (modules/mistake-practice/identity.ts) — без него
      // запись молча отбрасывалась как неподдержанная; нет строки с пропуском — пишем как ошибку смысла, а не теряем
      const tokenIndex = gapLine.trim().split(/\s+/).findIndex((word) => word.includes('___'));
      const isGap = task.format === 'fill_gap' && tokenIndex >= 0;
      mistakes.push({
        scoreUnitId: task.scoreUnitId,
        sourceId: `${blueprint.level}:${task.phraseId}:${task.format}`,
        lessonId: String(task.lessonId),
        canonicalTarget: isGap ? gapLine.replace('___', expected) : expected,
        sourceMeaning: isGap && lines.length > 1 ? lines.filter((line) => line !== gapLine).join(' ') : task.prompt,
        sourcePrompt: isGap ? gapLine : task.prompt,
        distractors: task.options.map((option) => option.text),
        kind: isGap ? 'missing_token' : 'meaning',
        expected,
        given,
        ...(isGap ? { tokenIndex } : {}),
      });
    } else if (task.format === 'translate_build') {
      const answer = answers[task.scoreUnitId];
      if (answer?.kind !== 'translate_build') continue;
      const picked = answer.tokenIds;
      if (picked.length === task.correctTokenIds.length && picked.every((id, index) => id === task.correctTokenIds[index])) continue;
      const textOf = (id: string) => task.tokens.find((token) => token.id === id)?.text ?? '';
      const expected = task.correctTokenIds.map(textOf).filter(Boolean).join(' ');
      if (!expected) continue;
      mistakes.push({
        scoreUnitId: task.scoreUnitId,
        sourceId: `${blueprint.level}:${task.phraseId}:${task.format}`,
        lessonId: String(task.lessonId),
        canonicalTarget: expected,
        sourceMeaning: task.prompt,
        sourcePrompt: task.prompt,
        distractors: task.tokens.filter((token) => token.isDistractor).map((token) => token.text),
        kind: 'word_order',
        expected,
        given: picked.map(textOf).filter(Boolean).join(' '),
      });
    } else if ('exercise' in task) {
      // зачем (владелец 11.11.2026, «чтобы не было жалоб»): новые механики из фраз уроков тоже пополняют «Мои ошибки» —
      // иначе две трети экзамена B1/B2 проходили бы мимо раздела
      if (!(PHRASE_BUILT_FORMATS as readonly string[]).includes(task.format)) continue;
      const answer = answers[task.scoreUnitId];
      if (answer?.kind !== 'expanded' || !isExpandedResponseComplete(task.exercise, answer.response)) continue;
      if (gradeExpanded(task.exercise, answer.response, blueprint.studyTarget)) continue;
      // у задания из фразы урока пояснение — «фраза — перевод» (app/level_exam_blueprint.ts)
      const cut = task.explanation.indexOf(' — ');
      const phrase = (cut >= 0 ? task.explanation.slice(0, cut) : '').trim();
      if (!phrase) continue;
      mistakes.push({
        scoreUnitId: task.scoreUnitId,
        sourceId: `${blueprint.level}:${task.phraseId}:${task.format}`,
        lessonId: String(task.lessonId),
        canonicalTarget: phrase,
        sourceMeaning: task.explanation.slice(cut + 3).trim(),
        sourcePrompt: [task.instruction, task.prompt, task.context].map((line) => line.trim()).filter(Boolean).join('\n'),
        distractors: [],
        kind: task.format === 'sentence_build_noise' ? 'word_order' : 'form',
        expected: expandedCorrectText(task.exercise),
        given: expandedGivenText(task.exercise, answer.response),
      });
    }
  }
  return mistakes;
}

/**
 * Записывает ошибки завершённой попытки. Не мешает показу итога: вызывается без await, пишет на устройство фоном.
 * Повторный вызов для той же попытки безопасен — номер записи строится из номера попытки и задания, приёмник
 * вторую такую же запись не добавляет. Записи идут по очереди: приёмник читает журнал, дописывает и сохраняет,
 * и десять записей разом затёрли бы друг друга.
 */
export function captureLevelExamMistakes(input: {
  blueprint: LevelExamBlueprint;
  answers: LevelExamAnswers;
  level: LevelExamLevel;
  studyTarget: string;
  attemptId: string;
}): number {
  const { blueprint, answers, level, studyTarget, attemptId } = input;
  if (!isMistakeStudyTargetValue(studyTarget)) {
    console.warn(`${LOG} пропуск: язык курса «${studyTarget}» не поддержан разделом «Мои ошибки» level=${level}`); // guard-ok: ранний выход назван
    return 0;
  }
  const mistakes = levelExamMistakes(blueprint, answers);
  const writeOne = (mistake: LevelExamMistake) => (
    captureCurrentAccountObjectiveAttempt({
      attemptId: `${attemptId}:${mistake.scoreUnitId}`,
      studyTarget,
      verdict: 'wrong',
      objective: true,
      content: {
        sourceKind: 'level_exam',
        sourceId: mistake.sourceId,
        canonicalTarget: mistake.canonicalTarget,
        sourceMeaning: mistake.sourceMeaning,
        // зачем («Мои ошибки 3.0», этап 1): сам вопрос — без него ошибку нельзя ни показать, ни объяснить
        sourcePrompt: mistake.sourcePrompt,
        lessonId: mistake.lessonId,
        distractors: mistake.distractors,
      },
      facet: {
        kind: mistake.kind,
        expected: mistake.expected,
        // зачем: выбранный или собранный вариант — «Твой ответ» в разделе
        given: mistake.given.slice(0, MISTAKE_GIVEN_MAX_CHARS),
        ...(mistake.tokenIndex === undefined ? {} : { tokenIndex: mistake.tokenIndex }),
      },
    }).then((result) => {
      // зачем: «не принято» раньше было немым — так запись пропусков и терялась незамеченной
      if (result.kind === 'ignored') console.warn(`${LOG} запись не принята level=${level} unit=${mistake.scoreUnitId} reason=${result.reason}`);
    }).catch((error: unknown) => {
      console.warn(`${LOG} запись не удалась level=${level} unit=${mistake.scoreUnitId}: ${error instanceof Error ? error.message : String(error)}`);
    })
  );
  void mistakes.reduce<Promise<void>>((queue, mistake) => queue.then(() => writeOne(mistake)), Promise.resolve());
  return mistakes.length;
}

export default function __RouteShim() { return null; }
