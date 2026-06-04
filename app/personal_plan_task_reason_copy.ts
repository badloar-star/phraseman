import type {
  PlanTaskSelectionReason,
  PlanTaskSelectionReasonCode,
  PlanTaskSelectionReasonReadiness,
} from './personal_plan_task_selection_reasons';

export type PlanTaskReasonCopy = {
  reasonId: string;
  blockId: string;
  code: PlanTaskSelectionReasonCode;
  label: string;
  body: string;
};

export type PlanTaskReasonCopyIssueCode =
  | 'missing_copy'
  | 'label_too_long'
  | 'body_too_long'
  | 'developer_copy'
  | 'corrupted_copy'
  | 'missing_weak_spot_evidence'
  | 'missing_due_count';

export type PlanTaskReasonCopyIssue = {
  code: PlanTaskReasonCopyIssueCode;
  reasonId: string;
  detail: string;
};

export type PlanTaskReasonCopyValidationResult = {
  valid: boolean;
  issues: PlanTaskReasonCopyIssue[];
};

export type PlanTaskReasonCopyResult =
  | {
    status: 'ready';
    copy: PlanTaskReasonCopy;
  }
  | {
    status: 'blocked';
    issue: PlanTaskReasonCopyIssue;
  };

export type PlanTaskReasonCopyBundle = {
  valid: boolean;
  issues: PlanTaskReasonCopyIssue[];
  copiesByBlockId: Record<string, PlanTaskReasonCopy[]>;
  summary: {
    blocks: number;
    copies: number;
    blocked: number;
  };
};

type PlanTaskReasonCopyTemplate = {
  label: string;
  body: string;
};

export const PLAN_TASK_REASON_COPY_BY_CODE: Record<
  PlanTaskSelectionReasonCode,
  PlanTaskReasonCopyTemplate
> = {
  lesson_foundation: {
    label: 'Сначала база',
    body: 'Разберем основу, чтобы новые фразы не висели в воздухе.',
  },
  new_phrase_practice: {
    label: 'Фразы на сегодня',
    body: 'Соберем короткие ответы, которые пригодятся в разных ситуациях.',
  },
  natural_choice_practice: {
    label: 'Живой вариант',
    body: 'Выберем фразу, которая звучит естественно, а не как из старого учебника.',
  },
  listening_practice: {
    label: 'Поймать на слух',
    body: 'Потренируем короткую фразу так, как ее можно услышать в жизни.',
  },
  quiz_check: {
    label: 'Проверить себя',
    body: 'Десять коротких вопросов покажут, что уже держится уверенно.',
  },
  recall_due: {
    label: 'Вернуть в память',
    body: 'Короткое повторение: вернем нужные фразы без лишнего давления.',
  },
  trainer_due: {
    label: 'Точная тренировка',
    body: 'Подтянем то, что уже просилось на повтор.',
  },
  mistake_review_due: {
    label: 'Спокойный повтор',
    body: 'Закрепим место, где раньше было неуверенно.',
  },
  weak_spot_recovery: {
    label: 'Мягкая страховка',
    body: 'На минуту вернем то, что недавно споткнулось, и спокойно закрепим.',
  },
};

const MAX_LABEL_LENGTH = 28;
const MAX_BODY_LENGTH = 96;
const CORRUPTED_COPY_PATTERN = /[\u00d0\u00d1\u00c2\u00e2]/;

const DEVELOPER_COPY_PATTERN =
  /(?:block|contentUnit|weakSpot|renderer|destination|source|active recall|актив реколл|сцена|маршрут|плановый|применяем конструкц)/i;

function issue(
  code: PlanTaskReasonCopyIssueCode,
  reasonId: string,
  detail: string,
): PlanTaskReasonCopyIssue {
  return { code, reasonId, detail };
}

function hasWeakSpotEvidence(reason: PlanTaskSelectionReason): boolean {
  return (reason.evidence.weakSpotIds ?? []).length > 0
    && (reason.evidence.contentUnitIds ?? []).length > 0;
}

function hasDueCount(reason: PlanTaskSelectionReason): boolean {
  if (reason.code === 'recall_due') return (reason.evidence.recallDueCount ?? 0) > 0;
  if (reason.code === 'trainer_due') return (reason.evidence.trainerDueCount ?? 0) > 0;
  if (reason.code === 'mistake_review_due') {
    return (reason.evidence.mistakeAnalyticsDueCount ?? 0) > 0;
  }
  return true;
}

export function validatePlanTaskReasonCopy(
  copy: PlanTaskReasonCopy,
  reason: PlanTaskSelectionReason,
): PlanTaskReasonCopyValidationResult {
  const issues: PlanTaskReasonCopyIssue[] = [];
  const text = `${copy.label} ${copy.body}`;

  if (!copy.label.trim() || !copy.body.trim()) {
    issues.push(issue(
      'missing_copy',
      reason.id,
      'Task reason copy needs both label and body.',
    ));
  }

  if (copy.label.length > MAX_LABEL_LENGTH) {
    issues.push(issue(
      'label_too_long',
      reason.id,
      'Task reason label must fit compact task cards.',
    ));
  }

  if (copy.body.length > MAX_BODY_LENGTH) {
    issues.push(issue(
      'body_too_long',
      reason.id,
      'Task reason body must stay short enough for task cards.',
    ));
  }

  if (DEVELOPER_COPY_PATTERN.test(text)) {
    issues.push(issue(
      'developer_copy',
      reason.id,
      'Task reason copy must not expose developer terms or banned route wording.',
    ));
  }

  if (CORRUPTED_COPY_PATTERN.test(text)) {
    issues.push(issue(
      'corrupted_copy',
      reason.id,
      'Task reason copy must not contain mojibake or corrupted Cyrillic text.',
    ));
  }

  if (reason.code === 'weak_spot_recovery' && !hasWeakSpotEvidence(reason)) {
    issues.push(issue(
      'missing_weak_spot_evidence',
      reason.id,
      'Weak-spot copy needs concrete weak spot and content evidence.',
    ));
  }

  if (!hasDueCount(reason)) {
    issues.push(issue(
      'missing_due_count',
      reason.id,
      'Due-task copy needs a real due count before it can claim a return/review task.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function buildPlanTaskReasonCopy(
  reason: PlanTaskSelectionReason,
): PlanTaskReasonCopyResult {
  const template = PLAN_TASK_REASON_COPY_BY_CODE[reason.code];
  if (!template) {
    return {
      status: 'blocked',
      issue: issue('missing_copy', reason.id, 'No production copy is defined for this task reason.'),
    };
  }

  const copy: PlanTaskReasonCopy = {
    reasonId: reason.id,
    blockId: reason.blockId,
    code: reason.code,
    label: template.label,
    body: template.body,
  };
  const validation = validatePlanTaskReasonCopy(copy, reason);

  if (!validation.valid) {
    return {
      status: 'blocked',
      issue: validation.issues[0],
    };
  }

  return {
    status: 'ready',
    copy,
  };
}

export function buildPlanTaskReasonCopyBundle(
  readiness: PlanTaskSelectionReasonReadiness,
): PlanTaskReasonCopyBundle {
  const issues: PlanTaskReasonCopyIssue[] = [];
  const copiesByBlockId: Record<string, PlanTaskReasonCopy[]> = {};

  Object.entries(readiness.reasonsByBlockId).forEach(([blockId, reasons]) => {
    const readyCopies: PlanTaskReasonCopy[] = [];

    reasons.forEach((reason) => {
      const result = buildPlanTaskReasonCopy(reason);
      if (result.status === 'ready') {
        readyCopies.push(result.copy);
      } else {
        issues.push(result.issue);
      }
    });

    if (readyCopies.length > 0) {
      copiesByBlockId[blockId] = readyCopies;
    }
  });

  return {
    valid: issues.length === 0 && readiness.valid,
    issues: [
      ...readiness.issues.map((item) => issue(
        'missing_copy',
        item.blockId ?? 'unknown-block',
        item.detail ?? 'Task selection readiness issue has no detail.',
      )),
      ...issues,
    ],
    copiesByBlockId,
    summary: {
      blocks: Object.keys(readiness.reasonsByBlockId).length,
      copies: Object.values(copiesByBlockId).reduce((sum, items) => sum + items.length, 0),
      blocked: issues.length + readiness.issues.length,
    },
  };
}
