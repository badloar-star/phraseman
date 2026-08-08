import {
  applyProgressEvent,
  buildMigrationPatch,
  getWeekKey,
  getWeekStartIso,
  isServerOwnedProgressKey,
  normalizeProgressEvent,
  resolveClientDateKey,
  shouldQualifyReferralFromProgressEvent,
} from './progress_events';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('progress_events engine', () => {
  const now = new Date('2026-06-13T12:00:00.000Z');

  it('applies XP, weekly counters, level and first-day streak on the server', () => {
    const event = normalizeProgressEvent({
      eventId: 'lesson:1:answer:001',
      type: 'lesson_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 25 },
    });

    const result = applyProgressEvent({}, event, now);

    expect(result.xpDelta).toBe(25);
    expect(result.totalXp).toBe(25);
    expect(result.level).toBe(1);
    expect(result.streakCount).toBe(1);
    expect(result.progressPatch).toMatchObject({
      user_prev_xp: '0',
      user_total_xp: '25',
      weekly_xp: '25',
      weekly_xp_period_start: getWeekStartIso('2026-06-13'),
      week_points: '25',
      week_points_v2: JSON.stringify({ weekKey: getWeekKey('2026-06-13'), points: 25 }),
      streak_count: '1',
      last_active_date: '2026-06-13',
    });
  });

  it('extends streak once per local day and does not rewind on an older offline event', () => {
    const dayTwo = normalizeProgressEvent({
      eventId: 'lesson:2:answer:001',
      type: 'lesson_answer',
      clientLocalDate: '2026-06-14',
      payload: { xpDelta: 10 },
    });
    const older = normalizeProgressEvent({
      eventId: 'lesson:2:answer:offline-old',
      type: 'lesson_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 10 },
    });

    const result = applyProgressEvent({
      user_total_xp: '100',
      weekly_xp: '40',
      weekly_xp_period_start: getWeekStartIso('2026-06-14'),
      streak_count: '5',
      last_active_date: '2026-06-13',
    }, dayTwo, new Date('2026-06-14T09:00:00.000Z'));
    const olderResult = applyProgressEvent({
      ...result.progressPatch,
      user_total_xp: result.progressPatch.user_total_xp,
      streak_count: result.progressPatch.streak_count,
      last_active_date: result.progressPatch.last_active_date,
    }, older, new Date('2026-06-14T10:00:00.000Z'));

    expect(result.streakCount).toBe(6);
    expect(result.progressPatch.last_active_date).toBe('2026-06-14');
    expect(olderResult.streakCount).toBe(6);
    expect(olderResult.progressPatch.last_active_date).toBeUndefined();
  });

  it('updates lesson completion fields without lowering previous best score', () => {
    const event = normalizeProgressEvent({
      eventId: 'lesson:7:complete:001',
      type: 'lesson_complete',
      clientLocalDate: '2026-06-13',
      payload: { lessonId: 7, score: 3, passed: true, xpDelta: 80, cellIndex: 42 },
    });

    const result = applyProgressEvent({
      lesson7_best_score: '4',
      lesson7_pass_count: '2',
      lesson7_cellIndex: '50',
      unlocked_lessons: '[1,2,7]',
    }, event, now);

    expect(result.progressPatch.lesson7_best_score).toBe('4');
    expect(result.progressPatch.lesson7_pass_count).toBe('3');
    expect(result.progressPatch.lesson7_cellIndex).toBe('50');
    expect(result.progressPatch.unlocked_lessons).toBe('[1,2,7,8]');
    // pass_live — только для урока 1 (реферальная квалификация).
    expect(result.progressPatch.lesson7_pass_live).toBeUndefined();
  });

  it('ставит live-маркер lesson1_pass_live при живом passed-событии урока 1 (en и fr)', () => {
    const enEvent = normalizeProgressEvent({
      eventId: 'lesson:1:complete:001',
      type: 'lesson_complete',
      clientLocalDate: '2026-06-13',
      payload: { lessonId: 1, score: 3, passed: true, xpDelta: 80 },
    });
    const enResult = applyProgressEvent({}, enEvent, now);
    expect(enResult.progressPatch.lesson1_pass_live).toBe('1');

    const frEvent = normalizeProgressEvent({
      eventId: 'lesson:fr:1:complete:001',
      type: 'lesson_complete',
      clientLocalDate: '2026-06-13',
      payload: { lessonId: 1, score: 3, passed: true, xpDelta: 80, studyTarget: 'fr' },
    });
    const frResult = applyProgressEvent({}, frEvent, now);
    expect(frResult.progressPatch['lesson_progress_v2::fr::lesson1_pass_live']).toBe('1');

    // НЕ passed → маркера нет.
    const failEvent = normalizeProgressEvent({
      eventId: 'lesson:1:complete:002',
      type: 'lesson_complete',
      clientLocalDate: '2026-06-13',
      payload: { lessonId: 1, score: 1, passed: false, xpDelta: 10 },
    });
    const failResult = applyProgressEvent({}, failEvent, now);
    expect(failResult.progressPatch.lesson1_pass_live).toBeUndefined();
  });

  it('updates exam best pct, passed flag, pass count and next level unlock', () => {
    const event = normalizeProgressEvent({
      eventId: 'exam:a1:complete:001',
      type: 'exam_complete',
      clientLocalDate: '2026-06-13',
      payload: { level: 'A1', pct: 82, xpDelta: 500 },
    });

    const result = applyProgressEvent({
      level_exam_A1_best_pct: '75',
      level_exam_A1_pass_count: '1',
      unlocked_lessons: '[1,2]',
    }, event, now);

    expect(result.progressPatch.level_exam_A1_pct).toBe('82');
    expect(result.progressPatch.level_exam_A1_best_pct).toBe('82');
    expect(result.progressPatch.level_exam_A1_passed).toBe('true');
    expect(result.progressPatch.level_exam_A1_pass_count).toBe('2');
    expect(result.progressPatch.unlocked_lessons).toBe('[1,2,9]');
  });

  it('accepts final exam completion and preserves gold XP scale', () => {
    const event = normalizeProgressEvent({
      eventId: 'exam:final:en:attempt-1:complete',
      type: 'exam_complete',
      clientLocalDate: '2026-06-13',
      payload: { level: 'final', pct: 95, passed: true, xpDelta: 10000 },
    });

    const result = applyProgressEvent({}, event, now);

    expect(result.xpDelta).toBe(10000);
    expect(result.progressPatch.level_exam_final_pct).toBe('95');
    expect(result.progressPatch.level_exam_final_best_pct).toBe('95');
    expect(result.progressPatch.level_exam_final_passed).toBe('true');
    expect(result.progressPatch.level_exam_final_pass_count).toBe('1');
  });

  it('writes French lesson and level exam progress to scoped keys', () => {
    const lessonEvent = normalizeProgressEvent({
      eventId: 'lesson:fr:7:complete:1',
      type: 'lesson_complete',
      clientLocalDate: '2026-06-13',
      payload: { studyTarget: 'fr', lessonId: 7, score: 4.5, passed: true, progress: ['correct'], xpDelta: 0 },
    });
    const examEvent = normalizeProgressEvent({
      eventId: 'exam:fr:A1:1:complete',
      type: 'exam_complete',
      clientLocalDate: '2026-06-13',
      payload: { studyTarget: 'fr', level: 'A1', pct: 88, passed: true, xpDelta: 0 },
    });

    const lessonResult = applyProgressEvent({}, lessonEvent, now);
    const examResult = applyProgressEvent(lessonResult.progressPatch, examEvent, now);

    expect(lessonResult.progressPatch['lesson_progress_v2::fr::lesson7_best_score']).toBe('4.5');
    expect(lessonResult.progressPatch['lesson_progress_v2::fr::lesson7_pass_count']).toBe('1');
    expect(lessonResult.progressPatch['lesson_progress_v2::fr::7']).toBe(JSON.stringify(['correct']));
    expect(lessonResult.progressPatch['lesson_progress_v2::fr::unlocked_lessons']).toBe('[8]');
    expect(examResult.progressPatch['level_exams_v2::fr::level_exam_A1_pct']).toBe('88');
    expect(examResult.progressPatch['level_exams_v2::fr::level_exam_A1_passed']).toBe('true');
    expect(examResult.progressPatch['lesson_progress_v2::fr::unlocked_lessons']).toBe('[8,9]');
  });

  it('qualifies referral only from a live passed first lesson event', () => {
    expect(shouldQualifyReferralFromProgressEvent(normalizeProgressEvent({
      eventId: 'lesson:1:complete:ref-ok',
      type: 'lesson_complete',
      payload: { lessonId: 1, score: 3, passed: true },
    }))).toBe(true);

    expect(shouldQualifyReferralFromProgressEvent(normalizeProgressEvent({
      eventId: 'lesson:2:complete:ref-no',
      type: 'lesson_complete',
      payload: { lessonId: 2, score: 5, passed: true },
    }))).toBe(false);

    expect(shouldQualifyReferralFromProgressEvent(normalizeProgressEvent({
      eventId: 'lesson:1:complete:ref-fail',
      type: 'lesson_complete',
      payload: { lessonId: 1, score: 1, passed: false },
    }))).toBe(false);
  });

  it('caps untrusted XP by event type', () => {
    const event = normalizeProgressEvent({
      eventId: 'lesson:1:answer:huge',
      type: 'lesson_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 100000 },
    });

    expect(applyProgressEvent({}, event, now).xpDelta).toBe(100);
  });

  it('preserves high-tier wager rewards', () => {
    const event = normalizeProgressEvent({
      eventId: 'wager:2026-06-01:5:100:win',
      type: 'wager_win',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 15000 },
    });

    expect(applyProgressEvent({}, event, now).xpDelta).toBe(15000);
  });

  it('rejects unknown event types and malformed event ids', () => {
    expect(() => normalizeProgressEvent({
      eventId: 'bad id with spaces',
      type: 'lesson_answer',
      payload: {},
    })).toThrow();
    expect(() => normalizeProgressEvent({
      eventId: 'lesson:1',
      type: 'made_up',
      payload: {},
    })).toThrow();
  });

  it('falls back to server date when client date is too far away', () => {
    expect(resolveClientDateKey('2026-07-20', now)).toBe('2026-06-13');
    expect(resolveClientDateKey('2026-06-12', now)).toBe('2026-06-12');
  });

  it('builds a one-time migration patch without lowering existing server values', () => {
    const patch = buildMigrationPatch({
      user_total_xp: '900',
      weekly_xp: '55',
      streak_count: '4',
      last_active_date: '2026-06-13',
      unlocked_lessons: '[1,2,3]',
      'lesson_progress_v2::fr::unlocked_lessons': '[1,2]',
      lesson4_best_score: '4',
      lesson4_progress: JSON.stringify(['correct', 'correct', 'empty']),
      'lesson_progress_v2::fr::lesson4_best_score': '4',
      'lesson_progress_v2::fr::4': JSON.stringify(['correct', 'correct']),
      level_exam_A1_passed: 'true',
      'level_exams_v2::fr::level_exam_A1_passed': 'true',
    }, {
      user_total_xp: '1000',
      weekly_xp: '20',
      streak_count: '6',
      last_active_date: '2026-06-12',
      unlocked_lessons: '[1,4]',
      'lesson_progress_v2::fr::unlocked_lessons': '[1,3]',
      lesson4_best_score: '5',
      lesson4_progress: JSON.stringify(['correct']),
      'lesson_progress_v2::fr::lesson4_best_score': '5',
      'lesson_progress_v2::fr::4': JSON.stringify(['correct']),
      level_exam_A1_passed: 'false',
      'level_exams_v2::fr::level_exam_A1_passed': 'false',
    }, now);

    expect(patch.user_total_xp).toBeUndefined();
    expect(patch.weekly_xp).toBeUndefined();
    expect(patch.streak_count).toBeUndefined();
    expect(patch.last_active_date).toBeUndefined();
    expect(patch.unlocked_lessons).toBeUndefined();
    expect(patch['lesson_progress_v2::fr::unlocked_lessons']).toBeUndefined();
    expect(patch.lesson4_best_score).toBeUndefined();
    expect(patch.lesson4_progress).toBe(JSON.stringify(['correct', 'correct', 'empty']));
    expect(patch['lesson_progress_v2::fr::lesson4_best_score']).toBeUndefined();
    expect(patch['lesson_progress_v2::fr::4']).toBe(JSON.stringify(['correct', 'correct']));
    expect(patch.level_exam_A1_passed).toBeUndefined();
    expect(patch['level_exams_v2::fr::level_exam_A1_passed']).toBeUndefined();
  });

  it('migrates lesson counters and exam fields with monotonic conflict resolution', () => {
    const patch = buildMigrationPatch({
      lesson8_pass_count: '3',
      lesson8_cellIndex: '44',
      'lesson_progress_v2::fr::lesson8_pass_count': '2',
      'lesson_progress_v2::fr::lesson8_cellIndex': '40',
      level_exam_B2_pct: '72',
      level_exam_B2_best_pct: '92',
      level_exam_B2_pass_count: '4',
      level_exam_B2_completed_at: '2026-06-12',
      'level_exams_v2::fr::level_exam_B1_pct': '81',
      'level_exams_v2::fr::level_exam_B1_best_pct': '88',
      'level_exams_v2::fr::level_exam_B1_pass_count': '2',
      'level_exams_v2::fr::level_exam_B1_completed_at': '2026-06-13',
    }, {
      lesson8_pass_count: '1',
      lesson8_cellIndex: '50',
      'lesson_progress_v2::fr::lesson8_pass_count': '4',
      'lesson_progress_v2::fr::lesson8_cellIndex': '12',
      level_exam_B2_pct: '91',
      level_exam_B2_best_pct: '90',
      level_exam_B2_pass_count: '2',
      level_exam_B2_completed_at: '2026-06-01',
      'level_exams_v2::fr::level_exam_B1_pct': '70',
      'level_exams_v2::fr::level_exam_B1_best_pct': '90',
      'level_exams_v2::fr::level_exam_B1_pass_count': '5',
      'level_exams_v2::fr::level_exam_B1_completed_at': '2026-06-01',
    }, now);

    expect(patch.lesson8_pass_count).toBeUndefined();
    expect(patch.lesson8_cellIndex).toBeUndefined();
    expect(patch['lesson_progress_v2::fr::lesson8_pass_count']).toBeUndefined();
    expect(patch['lesson_progress_v2::fr::lesson8_cellIndex']).toBe('40');
    expect(patch.level_exam_B2_pct).toBeUndefined();
    expect(patch.level_exam_B2_best_pct).toBeUndefined();
    expect(patch.level_exam_B2_pass_count).toBeUndefined();
    expect(patch.level_exam_B2_completed_at).toBeUndefined();
    expect(patch['level_exams_v2::fr::level_exam_B1_pct']).toBeUndefined();
    expect(patch['level_exams_v2::fr::level_exam_B1_best_pct']).toBeUndefined();
    expect(patch['level_exams_v2::fr::level_exam_B1_pass_count']).toBeUndefined();
    expect(patch['level_exams_v2::fr::level_exam_B1_completed_at']).toBeUndefined();
  });

  it('НЕ мигрирует live-маркер lesson1_pass_live из клиентского снапшота (антифрод рефералки)', () => {
    const patch = buildMigrationPatch({
      lesson1_pass_live: '1',
      'lesson_progress_v2::fr::lesson1_pass_live': '1',
      lesson1_pass_count: '1',
    }, {}, now);

    expect(patch.lesson1_pass_live).toBeUndefined();
    expect(patch['lesson_progress_v2::fr::lesson1_pass_live']).toBeUndefined();
    // pass_count тоже серверный: не доверяем клиентскому снимку.
    expect(patch.lesson1_pass_count).toBeUndefined();
  });

  it('recognizes server-owned progress keys for rules and sync filtering', () => {
    expect(isServerOwnedProgressKey('user_total_xp')).toBe(true);
    expect(isServerOwnedProgressKey('lesson12_best_score')).toBe(true);
    expect(isServerOwnedProgressKey('level_exam_a1_best_pct')).toBe(true);
    expect(isServerOwnedProgressKey('level_exam_A1_best_pct')).toBe(true);
    expect(isServerOwnedProgressKey('lesson_progress_v2::fr::lesson12_best_score')).toBe(true);
    expect(isServerOwnedProgressKey('level_exams_v2::fr::level_exam_A1_best_pct')).toBe(true);
    expect(isServerOwnedProgressKey('lesson1_bonus_granted')).toBe(false);
    expect(isServerOwnedProgressKey('lesson_rewards_v2::fr::lesson1_bonus_granted')).toBe(false);
    expect(isServerOwnedProgressKey('premium_plan')).toBe(false);
    expect(isServerOwnedProgressKey('theme_mode')).toBe(false);
  });

  it('writes Firestore progress as a nested merge map, not dotted root fields', () => {
    const source = readFileSync(join(__dirname, 'progress_events.ts'), 'utf8');

    expect(source).toContain('progress: progressPatch');
    expect(source).toContain('progress: patch');
    expect(source).not.toContain('`progress.${key}`');
  });

  // ECON-2: суточный потолок XP с гриндабельных источников (lesson_answer и т.п.).
  // Суточные потолки XP сняты 2026-07-26: они срезали только серверный total, а клиент при
  // зеркалировании берёт Math.max(local, server) и всегда оставался со своим полным числом —
  // потолок не ограничивал фарм, а навсегда расщеплял баланс телефона и сервера.
  describe('daily XP accrual is not capped by how much was earned today', () => {
    const answerEvent = (xpDelta: number, id: string) => normalizeProgressEvent({
      eventId: `lesson:1:answer:${id}`,
      type: 'lesson_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta },
    });

    it('awards full XP regardless of how much this source already gave today', () => {
      const result = applyProgressEvent({}, answerEvent(80, 'a'), now, {
        sourceXpToday: { lesson_answer: 1000 },
      });
      expect(result.xpDelta).toBe(80);
    });

    it('keeps awarding full XP past the old per-source daily budget', () => {
      const result = applyProgressEvent({}, answerEvent(100, 'b'), now, {
        sourceXpToday: { lesson_answer: 7950 },
      });
      expect(result.xpDelta).toBe(100);
    });

    it('keeps awarding full XP past the old global daily budget', () => {
      const result = applyProgressEvent({}, answerEvent(100, 'c'), now, {
        sourceXpToday: { lesson_answer: 50_000 },
        totalXpToday: 500_000,
      });
      expect(result.xpDelta).toBe(100);
    });

    it('still clamps a single forged event to the per-event cap', () => {
      const result = applyProgressEvent({}, answerEvent(999_999, 'd'), now, {});
      expect(result.xpDelta).toBe(100); // EVENT_XP_CAP.lesson_answer
    });
  });

  // ECON-3/11: уровневый зачёт — серверный пересчёт XP + суточный лимит попыток.
  describe('level exam XP guards (ECON-3, ECON-11)', () => {
    const levelExam = (pct: number, passed: boolean, xpDelta: number, id = '1') => normalizeProgressEvent({
      eventId: `exam:en:a1:${id}:complete`,
      type: 'exam_complete',
      clientLocalDate: '2026-06-13',
      payload: { level: 'a1', pct, passed, xpDelta },
    });

    it('recomputes pass XP from pct, ignoring inflated client xpDelta', () => {
      const result = applyProgressEvent({}, levelExam(80, true, 9999), now, { examAttemptsToday: 0 });
      expect(result.xpDelta).toBe(90); // 50 + round(80/2)
    });

    it('gives no XP for spam-click low-percentage attempts', () => {
      const result = applyProgressEvent({}, levelExam(5, false, 9999), now, { examAttemptsToday: 0 });
      expect(result.xpDelta).toBe(0);
    });

    it('blocks XP once the daily attempt limit is reached', () => {
      const result = applyProgressEvent({}, levelExam(95, true, 100), now, { examAttemptsToday: 5 });
      expect(result.xpDelta).toBe(0);
    });

    it('still records exam progress (pct/passed) even when XP is blocked', () => {
      const result = applyProgressEvent({}, levelExam(95, true, 100), now, { examAttemptsToday: 5 });
      expect(result.progressPatch.level_exam_A1_best_pct).toBe('95');
      expect(result.progressPatch.level_exam_A1_passed).toBe('true');
    });

    it('preserves the gold-scale reward for the final exam (not a level exam)', () => {
      const finalEvent = normalizeProgressEvent({
        eventId: 'exam:final:en:attempt-1:complete',
        type: 'exam_complete',
        clientLocalDate: '2026-06-13',
        payload: { level: 'final', pct: 95, passed: true, xpDelta: 10000 },
      });
      const result = applyProgressEvent({}, finalEvent, now, { examAttemptsToday: 5 });
      expect(result.xpDelta).toBe(10000);
    });
  });
});
