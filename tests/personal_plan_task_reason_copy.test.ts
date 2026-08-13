import {
  buildPlanTaskReasonCopyBundle,
  buildPlanTaskReasonCopy,
  PLAN_TASK_REASON_COPY_BY_CODE,
  validatePlanTaskReasonCopy,
  type PlanTaskReasonCopy,
} from '../app/personal_plan_task_reason_copy';
import type {
  PlanTaskSelectionReason,
  PlanTaskSelectionReasonCode,
} from '../app/personal_plan_task_selection_reasons';

const ALL_REASON_CODES: PlanTaskSelectionReasonCode[] = [
  'lesson_foundation',
  'new_phrase_practice',
  'natural_choice_practice',
  'listening_practice',
  'quiz_check',
  'recall_due',
  'trainer_due',
  'mistake_review_due',
  'weak_spot_recovery',
];

const BANNED_COPY_RE =
  /(?:block|contentUnit|weakSpot|renderer|destination|source|active recall|актив реколл|сцена|маршрут|плановый|применяем конструкц)/i;
const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/;

function reason(
  code: PlanTaskSelectionReasonCode,
  evidence: PlanTaskSelectionReason['evidence'] = {},
): PlanTaskSelectionReason {
  return {
    id: `reason:${code}`,
    blockId: 'block-1',
    code,
    source: code === 'weak_spot_recovery' ? 'weak_spot_summary' : 'plan_structure',
    priority: 80,
    tone: code === 'quiz_check'
      ? 'check'
      : code.includes('due') || code === 'weak_spot_recovery'
        ? 'recovery'
        : 'practice',
    evidence,
  };
}

function allCopyText(copy: PlanTaskReasonCopy): string {
  return [copy.label, copy.body].join(' ');
}

describe('personal plan task reason copy', () => {
  it('covers every task-selection reason code with short production copy', () => {
    expect(Object.keys(PLAN_TASK_REASON_COPY_BY_CODE).sort()).toEqual([...ALL_REASON_CODES].sort());

    for (const code of ALL_REASON_CODES) {
      const copy = buildPlanTaskReasonCopy(reason(code, {
        weakSpotIds: ['grammar:i-need'],
        contentUnitIds: ['p1'],
        recallDueCount: 2,
        trainerDueCount: 1,
        mistakeAnalyticsDueCount: 1,
      }));

      expect(copy.status).toBe('ready');
      if (copy.status !== 'ready') throw new Error(`Expected copy for ${code}`);
      expect(copy.copy.label.length).toBeLessThanOrEqual(28);
      expect(copy.copy.body.length).toBeLessThanOrEqual(96);
      expect(allCopyText(copy.copy)).not.toMatch(BANNED_COPY_RE);
      expect(allCopyText(copy.copy)).not.toMatch(MOJIBAKE_RE);
    }
  });

  it('uses evidence-aware copy for weak-spot recovery and does not lie without evidence', () => {
    const ready = buildPlanTaskReasonCopy(reason('weak_spot_recovery', {
      weakSpotIds: ['grammar:i-need'],
      contentUnitIds: ['p1'],
      recallDueCount: 1,
    }));

    expect(ready.status).toBe('ready');
    if (ready.status !== 'ready') throw new Error('Expected ready weak-spot copy.');
    expect(ready.copy.body).toContain('вернем');
    expect(ready.copy.body).not.toMatch(/ошибк/i);

    const blocked = buildPlanTaskReasonCopy(reason('weak_spot_recovery'));

    expect(blocked.status).toBe('blocked');
    if (blocked.status !== 'blocked') throw new Error('Expected blocked weak-spot copy.');
    expect(blocked.issue.code).toBe('missing_weak_spot_evidence');
  });

  it('requires real due counts for recall trainer and mistake-review copy', () => {
    expect(buildPlanTaskReasonCopy(reason('recall_due')).status).toBe('blocked');
    expect(buildPlanTaskReasonCopy(reason('trainer_due')).status).toBe('blocked');
    expect(buildPlanTaskReasonCopy(reason('mistake_review_due')).status).toBe('blocked');

    expect(buildPlanTaskReasonCopy(reason('recall_due', { recallDueCount: 2 })).status).toBe('ready');
    expect(buildPlanTaskReasonCopy(reason('trainer_due', { trainerDueCount: 1 })).status).toBe('ready');
    expect(buildPlanTaskReasonCopy(reason('mistake_review_due', {
      mistakeAnalyticsDueCount: 1,
    })).status).toBe('ready');
  });

  it('fails validation for developer terms, long copy, and fake personalization', () => {
    const badCopy: PlanTaskReasonCopy = {
      reasonId: 'bad',
      blockId: 'block-1',
      code: 'weak_spot_recovery',
      label: 'weakSpot block',
      body: 'Этот renderer вернул contentUnit, поэтому маршрут применяет конструкцию автоматически.',
    };

    const result = validatePlanTaskReasonCopy(badCopy, reason('weak_spot_recovery'));

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'developer_copy' }),
      expect.objectContaining({ code: 'missing_weak_spot_evidence' }),
    ]));
  });

  it('fails validation for mojibake or corrupted Cyrillic copy', () => {
    const badCopy: PlanTaskReasonCopy = {
      reasonId: 'bad_mojibake',
      blockId: 'block-1',
      code: 'new_phrase_practice',
      label: '\u00d0\u00a4\u00d1\u20ac\u00d0\u00b0\u00d0\u00b7\u00d1\u2039',
      body: 'Сломанная строка выглядит так: \u00d0\u00bf\u00d1\u20ac\u00d0\u00b8\u00d0\u00b2\u00d0\u00b5\u00d1\u201a.',
    };

    const result = validatePlanTaskReasonCopy(badCopy, reason('new_phrase_practice'));

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'corrupted_copy',
    }));
  });

  it('builds a UI-ready copy bundle from task-selection readiness', () => {
    const bundle = buildPlanTaskReasonCopyBundle({
      valid: true,
      issues: [],
      reasonsByBlockId: {
        'block-1': [
          reason('new_phrase_practice'),
          reason('weak_spot_recovery', {
            weakSpotIds: ['grammar:i-need'],
            contentUnitIds: ['p1'],
            recallDueCount: 1,
          }),
        ],
      },
      summary: {
        blocks: 1,
        reasons: 2,
        weakSpotReasons: 1,
        recallDueCount: 1,
        trainerDueCount: 0,
        mistakeAnalyticsDueCount: 0,
      },
    });

    expect(bundle.valid).toBe(true);
    expect(bundle.summary).toEqual({
      blocks: 1,
      copies: 2,
      blocked: 0,
    });
    expect(bundle.copiesByBlockId['block-1']).toEqual([
      expect.objectContaining({ code: 'new_phrase_practice' }),
      expect.objectContaining({ code: 'weak_spot_recovery' }),
    ]);
  });
});
