import {
  applyProgressEvent,
  buildMigrationPatch,
  buildProgressBaseline,
  canonicalProgressEventSemantics,
  candidateHasSameProgressSemantics,
  fingerprintProgressEvent,
  fingerprintProgressEventV2,
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

  it('does not let obsolete transport markers bypass semantic dedupe', () => {
    const legacy = normalizeProgressEvent({
      eventId: 'lesson:1:answer:legacy',
      type: 'lesson_answer',
      payload: { xpDelta: 10 },
    });
    const v1 = normalizeProgressEvent({
      eventId: 'lesson:1:answer:v1',
      type: 'lesson_answer',
      levelSpinProtocol: 'v1',
      payload: { xpDelta: 10 },
    });
    expect(fingerprintProgressEvent(legacy)).toBe(fingerprintProgressEvent(v1));
    expect(canonicalProgressEventSemantics(legacy)).toBe(canonicalProgressEventSemantics(v1));
  });

  it('rejects a deliberate FNV collision when canonical event semantics differ', () => {
    const first = normalizeProgressEvent({
      eventId: 'lesson:collision-a', type: 'lesson_answer', clientLocalDate: '2026-06-13', payload: { nonce: 99_999 },
    });
    const second = normalizeProgressEvent({
      eventId: 'lesson:collision-b', type: 'lesson_answer', clientLocalDate: '2026-06-13', payload: { nonce: 160_606 },
    });
    expect(fingerprintProgressEvent(first)).toBe(fingerprintProgressEvent(second));
    expect(fingerprintProgressEventV2(first)).not.toBe(fingerprintProgressEventV2(second));
    expect(canonicalProgressEventSemantics(first)).not.toBe(canonicalProgressEventSemantics(second));
    expect(candidateHasSameProgressSemantics(first, {
      type: second.type,
      clientLocalDate: second.clientLocalDate,
      payload: second.payload,
    })).toBe(false);
    expect(candidateHasSameProgressSemantics(first, {
      type: first.type,
      clientLocalDate: first.clientLocalDate,
      payload: first.payload,
    })).toBe(true);
  });

  it('compares bounded FNV candidates canonically before writes', () => {
    const source = readFileSync(join(__dirname, 'progress_events.ts'), 'utf8');
    expect(source).toMatch(/\.where\('fingerprint', '==', eventFingerprint\)\r?\n\s+\.limit\(16\)/);
    expect(source).toContain('candidateHasSameProgressSemantics(event, candidate.data())');
    expect(source).toContain('fingerprintCanonicalVersion: 1');
    expect(source).toContain('fingerprintCanonical: canonicalProgressEventSemantics(event)');
  });

  it('records first-day streak without restoring retired XP counters', () => {
    const event = normalizeProgressEvent({
      eventId: 'lesson:1:answer:001',
      type: 'lesson_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 25 },
    });

    const result = applyProgressEvent({}, event, now);

    expect(result.streakCount).toBe(1);
    expect(result.progressPatch).toMatchObject({
      streak_count: '1',
      last_active_date: '2026-06-13',
    });
    expect(result.progressPatch).not.toHaveProperty('user_total_xp');
    expect(result.progressPatch).not.toHaveProperty('weekly_xp');
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

  it('accepts final exam completion without a retired XP reward', () => {
    const event = normalizeProgressEvent({
      eventId: 'exam:final:en:attempt-1:complete',
      type: 'exam_complete',
      clientLocalDate: '2026-06-13',
      payload: { level: 'final', pct: 95, passed: true, xpDelta: 10000 },
    });

    const result = applyProgressEvent({}, event, now);

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

  it('ignores untrusted XP payloads by event type', () => {
    const event = normalizeProgressEvent({
      eventId: 'lesson:1:answer:huge',
      type: 'lesson_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 100000 },
    });

    expect(applyProgressEvent({}, event, now).progressPatch).not.toHaveProperty('user_total_xp');
  });

  it('accepts personal-plan task completion without an XP reward', () => {
    const event = normalizeProgressEvent({
      eventId: 'plan:en:instance-1:task-1:complete',
      type: 'plan_task_complete',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 100000, planInstanceId: 'instance-1', planTaskId: 'task-1' },
    });

    expect(event.type).toBe('plan_task_complete');
    expect(applyProgressEvent({}, event, now).progressPatch).not.toHaveProperty('user_total_xp');
  });

  it('rejects personal-plan completion without canonical plan and task ids', () => {
    for (const payload of [
      { xpDelta: 6, planInstanceId: '', planTaskId: 'task-1' },
      { xpDelta: 6, planInstanceId: 'instance-1', planTaskId: '../task' },
    ]) {
      expect(() => normalizeProgressEvent({
        eventId: 'plan:en:instance-1:task-1:complete',
        type: 'plan_task_complete',
        payload,
      })).toThrow('bad_plan_completion_identity');
    }
  });

  it('rejects retired reward event types', () => {
    expect(() => normalizeProgressEvent({
      eventId: 'level_up:5:bonus',
      type: 'level_up_bonus',
      clientLocalDate: '2026-06-13',
      payload: { level: 5, xpDelta: 100 },
    })).toThrow('bad_progress_event_type');
    expect(() => normalizeProgressEvent({
      eventId: 'wager:2026-06-01:5:100:win',
      type: 'wager_win',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta: 15000 },
    })).toThrow('bad_progress_event_type');
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

  describe('retired XP payloads do not affect progress', () => {
    const answerEvent = (xpDelta: number, id: string) => normalizeProgressEvent({
      eventId: `lesson:1:answer:${id}`,
      type: 'lesson_answer',
      clientLocalDate: '2026-06-13',
      payload: { xpDelta },
    });

    it('ignores the payload regardless of prior daily counters', () => {
      const result = applyProgressEvent({}, answerEvent(80, 'a'), now);
      expect(result.progressPatch).not.toHaveProperty('user_total_xp');
    });
  });

  describe('level exams retain structural progress without XP', () => {
    const levelExam = (pct: number, passed: boolean, xpDelta: number, id = '1') => normalizeProgressEvent({
      eventId: `exam:en:a1:${id}:complete`,
      type: 'exam_complete',
      clientLocalDate: '2026-06-13',
      payload: { level: 'a1', pct, passed, xpDelta },
    });

    it('ignores client XP values for a passed exam', () => {
      const result = applyProgressEvent({}, levelExam(80, true, 9999), now, { examAttemptsToday: 0 });
      expect(result.progressPatch).not.toHaveProperty('user_total_xp');
    });

    it('records exam progress independent of retired XP and attempt counters', () => {
      const result = applyProgressEvent({}, levelExam(95, true, 100), now, { examAttemptsToday: 5 });
      expect(result.progressPatch.level_exam_A1_best_pct).toBe('95');
      expect(result.progressPatch.level_exam_A1_passed).toBe('true');
    });

    it('records final exam completion without a reward', () => {
      const finalEvent = normalizeProgressEvent({
        eventId: 'exam:final:en:attempt-1:complete',
        type: 'exam_complete',
        clientLocalDate: '2026-06-13',
        payload: { level: 'final', pct: 95, passed: true, xpDelta: 10000 },
      });
      const result = applyProgressEvent({}, finalEvent, now, { examAttemptsToday: 5 });
      expect(result.progressPatch).not.toHaveProperty('user_total_xp');
    });
  });
});

describe('buildProgressBaseline — теневой стрик не занижает цепочку', () => {
  const now = new Date('2026-08-28T10:00:00.000Z');

  // зачем (владелец, 2026-08-28: «у меня 137 дней цепочка, а не 93»): пути, не
  // ведущие стрик (награда за друга, арена), обновляют progressServerState со
  // свежей датой и УСТАРЕВШИМ streakCount. Раньше он брался вслепую и обрезал
  // честную цепочку. Правило зеркалит клиентское mergeStreakByActivityDate.
  it('keeps the local streak when the shadow date is one day fresher', () => {
    const baseline = buildProgressBaseline(
      { streak_count: '137', last_active_date: '2026-08-27' },
      { streakCount: 93, lastActiveDate: '2026-08-28' },
      now,
    );
    expect(baseline.streak_count).toBe('137');
    expect(baseline.last_active_date).toBe('2026-08-28');
  });

  it('still burns a genuinely broken streak when the gap is two days or more', () => {
    const baseline = buildProgressBaseline(
      { streak_count: '137', last_active_date: '2026-08-20' },
      { streakCount: 2, lastActiveDate: '2026-08-28' },
      now,
    );
    expect(baseline.streak_count).toBe('2');
  });

  it('takes the shadow streak when there is no local activity date', () => {
    const baseline = buildProgressBaseline(
      { streak_count: '137' },
      { streakCount: 4, lastActiveDate: '2026-08-28' },
      now,
    );
    expect(baseline.streak_count).toBe('4');
  });
});
