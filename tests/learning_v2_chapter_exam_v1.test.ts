// зачем (решения владельца 21.10, журнал №8/№10; «НЕ ВИЖУ ЭКЗАМЕН» 22.10): движок экзамена главы и входного теста.
import {
  CHAPTER_EXAM_RETRY_DELAY_MS_V1,
  chapterExamAvailabilityV1,
  chapterExamEnergyCostV1,
  chapterExamKeyV1,
  chapterExamSessionsToCreditV1,
  chapterOrdinalForSessionV1,
  chapterSessionOrdinalsV1,
  recordChapterExamAttemptV1,
  scoreChapterExamV1,
  selectChapterExamQuestionsV1,
  type ChapterExamCandidateV1,
} from '../modules/learning-v2/exam/chapter_exam_v1';

const FAMILIES = ['phrase_builder', 'context_gap_grammar', 'listen_choose', 'listen_build_dictation', 'speed_match', 'scripted_repeat_compare'];
const candidates: ChapterExamCandidateV1[] = chapterSessionOrdinalsV1(2).flatMap((session) =>
  FAMILIES.map((family, i) => ({
    interactionId: `en:lesson-01:session-${session}:i${i}`,
    courseSessionId: `en:lesson-01:session-${session}`,
    sessionOrdinal: session,
    family,
  })).concat([{ interactionId: `en:lesson-01:session-${session}:word`, courseSessionId: `en:lesson-01:session-${session}`, sessionOrdinal: session, family: 'listen_choose', isWordCard: true }]));
const examKey = chapterExamKeyV1({ targetLanguage: 'en', lessonOrdinal: 1, chapterOrdinal: 2 });
const answers = (correct: number) => Array.from({ length: 12 }, (_, i) => ({ interactionId: `q${i}`, correct: i < correct }));

describe('chapter exam engine', () => {
  it('chapter math: 8 sessions per chapter', () => {
    expect(chapterOrdinalForSessionV1(8)).toBe(1);
    expect(chapterOrdinalForSessionV1(9)).toBe(2);
    expect(chapterSessionOrdinalsV1(2)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect(examKey).toBe('en:lesson-01:chapter-2');
  });

  it('picks 12 ready tasks of the chapter: no voice, no pairs, no word cards, spread over episodes, stable per attempt', () => {
    const first = selectChapterExamQuestionsV1({ examKey, attempt: 1, candidates })!;
    expect(first).toHaveLength(12);
    expect(new Set(first.map((q) => q.interactionId)).size).toBe(12);
    expect(first.every((q) => ['phrase_builder', 'context_gap_grammar', 'listen_choose', 'listen_build_dictation'].includes(q.family))).toBe(true);
    expect(new Set(first.map((q) => q.sessionOrdinal)).size).toBe(8);
    expect(first.map((q) => q.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(selectChapterExamQuestionsV1({ examKey, attempt: 1, candidates })).toEqual(first);
    expect(selectChapterExamQuestionsV1({ examKey, attempt: 2, candidates })!.map((q) => q.interactionId)).not.toEqual(first.map((q) => q.interactionId));
  });

  it('does not build an incomplete exam', () => {
    expect(selectChapterExamQuestionsV1({ examKey, attempt: 1, candidates: candidates.slice(0, 10) })).toBeNull();
  });

  it('passes at 10 of 12', () => {
    expect(scoreChapterExamV1(answers(10)).passed).toBe(true);
    expect(scoreChapterExamV1(answers(9))).toMatchObject({ passed: false, correct: 9, mistakes: ['q9', 'q10', 'q11'] });
    expect(scoreChapterExamV1(answers(10).slice(0, 11)).passed).toBe(false);
  });

  it('fail → retry in an hour; pass stays passed; a later fail does not undo it', () => {
    const now = 1_000_000;
    const failed = recordChapterExamAttemptV1(null, { examKey, result: scoreChapterExamV1(answers(8)), finishedAtMs: now });
    expect(failed).toMatchObject({ status: 'failed', retryAtMs: now + CHAPTER_EXAM_RETRY_DELAY_MS_V1, attempts: 1, passedCorrect: null });
    expect(chapterExamAvailabilityV1({ record: failed, chapterReached: true, nowMs: now + 60_000 })).toEqual({ state: 'cooldown', retryAtMs: now + CHAPTER_EXAM_RETRY_DELAY_MS_V1, minutesLeft: 59 });
    expect(chapterExamAvailabilityV1({ record: failed, chapterReached: true, nowMs: now + CHAPTER_EXAM_RETRY_DELAY_MS_V1 }).state).toBe('available');
    const passed = recordChapterExamAttemptV1(failed, { examKey, result: scoreChapterExamV1(answers(11)), finishedAtMs: now + CHAPTER_EXAM_RETRY_DELAY_MS_V1 });
    expect(passed).toMatchObject({ status: 'passed', passedCorrect: 11, retryAtMs: null, attempts: 2 });
    expect(chapterExamAvailabilityV1({ record: passed, chapterReached: true, nowMs: 0 })).toEqual({ state: 'passed', passedCorrect: 11 });
    const failedAfter = recordChapterExamAttemptV1(passed, { examKey, result: scoreChapterExamV1(answers(3)), finishedAtMs: now * 9 });
    expect(failedAfter).toMatchObject({ status: 'passed', passedCorrect: 11, retryAtMs: null });
  });

  it('can be taken before all episodes: only reaching the chapter is required', () => {
    expect(chapterExamAvailabilityV1({ record: null, chapterReached: false, nowMs: 0 })).toEqual({ state: 'locked', reason: 'chapter_not_reached' });
    expect(chapterExamAvailabilityV1({ record: null, chapterReached: true, nowMs: 0 })).toEqual({ state: 'available' });
  });

  it('energy: exam 1 for free users, free for Plus, placement always free', () => {
    expect(chapterExamEnergyCostV1({ kind: 'chapter_exam', hasPlus: false })).toBe(1);
    expect(chapterExamEnergyCostV1({ kind: 'chapter_exam', hasPlus: true })).toBe(0);
    expect(chapterExamEnergyCostV1({ kind: 'placement', hasPlus: false })).toBe(0);
  });

  it('pass credits the skipped episodes of the chapter in order, without stars', () => {
    expect(chapterExamSessionsToCreditV1({ chapterOrdinal: 2, completedSessionOrdinals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })).toEqual([11, 12, 13, 14, 15, 16]);
    expect(chapterExamSessionsToCreditV1({ chapterOrdinal: 2, completedSessionOrdinals: chapterSessionOrdinalsV1(2) })).toEqual([]);
  });
});
