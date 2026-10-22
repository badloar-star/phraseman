// зачем (Ревизор 22.10, правки к a9c43b863 до включения флага экзамена):
// 1) пауза час после провала проверяется в подготовке экзамена, а не только на карте — прямой маршрут не даёт попытку раньше;
// 2) посреди экзамена роутер режимов получает только вердикт «Верно / Неверно» без авторского разбора варианта (он называет ответ).
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { saveLearningV2ChapterExamRecordV1 } from '../app/learning_v2_chapter_exam_store_v1';
import { prepareLearningV2ChapterExamV1 } from '../app/learning_v2_chapter_exam_v1';
import { chapterExamKeyV1, CHAPTER_EXAM_RETRY_DELAY_MS_V1 } from '../modules/learning-v2/exam/chapter_exam_v1';
import { resolveLearningV2ModeFeedbackV1 } from '../modules/learning-v2/modes/mode_feedback_v1';

const scope = 'c'.repeat(64);
const examKey = chapterExamKeyV1({ targetLanguage: 'en', lessonOrdinal: 1, chapterOrdinal: 2 });

beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); jest.spyOn(console, 'warn').mockImplementation(() => {}); });

describe('chapter exam: cooldown is enforced when the exam is prepared', () => {
  it('a failed attempt less than an hour ago gives no questions, only the minutes left', async () => {
    const finishedAtMs = 1_800_000_000_000;
    await saveLearningV2ChapterExamRecordV1(scope, {
      examKey, status: 'failed', passedCorrect: null, lastCorrect: 8, attempts: 1,
      lastFinishedAtMs: finishedAtMs, retryAtMs: finishedAtMs + CHAPTER_EXAM_RETRY_DELAY_MS_V1,
    } as never);
    const exam = await prepareLearningV2ChapterExamV1({
      accountScopeHash: scope, targetLanguage: 'en', lessonOrdinal: 1, chapterOrdinal: 2, locale: 'ru', nowMs: finishedAtMs + 60_000,
    });
    expect(exam).toMatchObject({ kind: 'cooldown', examKey, minutesLeft: 59 });
  });

  it('the screen shows the cooldown instead of questions and logs it', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning-v2', 'chapter-exam.tsx'), 'utf8');
    expect(src).toContain("exam.kind === 'cooldown'");
    expect(src).toContain('screen:cooldown');
    expect(src).toContain("learningV2ChapterExamResultCopy(lang, 'retryIn'");
  });
});

describe('chapter exam: no answer leaks mid-exam', () => {
  it('verdict-only feedback carries no authored analysis', () => {
    for (const outcome of ['correct', 'wrong'] as const) {
      const fb = resolveLearningV2ModeFeedbackV1({ interfaceLocale: 'ru', modePayload: null, outcome, selectedResponseId: null, orderedResponseIds: [] });
      expect(fb).toMatchObject({ authored: false, analysis: null, diagnostics: null, responseId: null });
    }
  });

  it('the exam screen passes the router only the verdict, never the task data feedback', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning-v2', 'chapter-exam.tsx'), 'utf8');
    expect(src).toContain("const verdictFeedback = resolveLearningV2ModeFeedbackV1({ interfaceLocale, modePayload: null,");
    expect(src).not.toContain('setFeedback(fb)');
    expect(src).toContain('explanation={null}');
  });
});

// зачем (Сверка 22.10, sverka-status §22): шесть дефектов показа экзамена — сторожим, чтобы не вернулись
describe('chapter exam: Sverka defects stay fixed', () => {
  const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
  const screen = read('app', 'learning-v2', 'chapter-exam.tsx');

  it('one «Проверить»: the footer CTA; built-in builder/dictation submit is hidden on the exam', () => {
    expect(screen).toContain('hideInlineSubmit');
    for (const mode of ['phrase_builder_mode_v1.tsx', 'listen_build_dictation_mode_v1.tsx']) {
      expect(read('modules', 'learning-v2', 'modes', mode)).toContain('props.hideInlineSubmit ? null');
    }
  });

  it('wrong answer says «Неверно», not «Попробуй ещё раз»', () => {
    const { learningV2ChapterExamCopy } = require('../components/learning-v2/learning_v2_chapter_exam_copy');
    expect(learningV2ChapterExamCopy('ru', 'wrong')).toBe('Неверно.');
    expect(screen).toContain("learningV2ChapterExamCopy(interfaceLocale, 'wrong')");
  });

  it('picking an option only selects it; the answer is not revealed on the card', () => {
    const pick = screen.slice(screen.indexOf('onPick={'), screen.indexOf('onAppendToken='));
    expect(pick).toContain('setSelectedChoiceId(responseId)');
    expect(pick).not.toContain('evaluate(');
    expect(screen).toContain('hideTranscriptReveal');
    expect(read('modules', 'learning-v2', 'modes', 'listen_choose_mode_v1.tsx')).toContain('!props.hideTranscriptReveal');
  });

  it('failed title depends on the score; mistakes are written as digits', () => {
    const copy = require('../components/learning-v2/learning_v2_chapter_exam_result_copy');
    expect(copy.learningV2ChapterExamFailedTitle('ru', 0)).toBe('Пока не вышло');
    expect(copy.learningV2ChapterExamFailedTitle('ru', 5)).toBe('Пока не вышло');
    expect(copy.learningV2ChapterExamFailedTitle('ru', 6)).toBe('Почти получилось');
    expect(copy.learningV2ChapterExamFailedTitle('ru', 9)).toBe('Почти получилось');
    expect(copy.learningV2ChapterExamFailedBody('ru', 12)).toBe('Чтобы сдать, нужно 10. Разберём 12 ошибок, и через час можно пересдать.');
    expect(copy.learningV2ChapterExamFailedBody('ru', 3)).toContain('Разберём 3 ошибки');
    expect(copy.learningV2ChapterExamFailedBody('uk', 4)).toContain('Розберемо 4 помилки');
  });

  it('review content stays below the status bar (inset on the container, not on the scroll content)', () => {
    const result = read('components', 'learning-v2', 'LearningV2ChapterExamResult.tsx');
    expect(result).toContain('<View style={[styles.flex, { paddingTop: p.topInset }]}>');
    expect(result).not.toContain('paddingTop: p.topInset + 8');
  });
});
