import {
  validatePersonalPlanDayContentQuality,
  PersonalPlanDayContentQualityResult,
} from './personal_plan_day_content_quality_gate';
import {
  PersonalPlanContentQualityScope,
  PersonalPlanPhraseDraft,
} from './personal_plan_content_quality_contract';

export type PersonalPlanWeekContentIssueCode =
  | 'missing_week_identity'
  | 'invalid_day_count'
  | 'day_sequence_invalid'
  | 'duplicate_day_id'
  | 'duplicate_day_index'
  | 'day_plan_mismatch'
  | 'day_one_not_universal_start'
  | 'day_failed_quality_gate'
  | 'low_week_variety'
  | 'narrow_scenario_overload';

export type PersonalPlanWeekDayDraft = {
  dayId: string;
  scope: PersonalPlanContentQualityScope;
  phrases: PersonalPlanPhraseDraft[];
  focusTags: string[];
  exerciseGoals: string[];
};

export type PersonalPlanWeekContentQualityInput = {
  weekId: string;
  planId: string;
  days: PersonalPlanWeekDayDraft[];
};

export type PersonalPlanWeekContentIssue = {
  code: PersonalPlanWeekContentIssueCode;
  dayId?: string;
  detail?: string;
};

export type PersonalPlanWeekContentQualitySummary = {
  totalDays: number;
  validDays: number;
  invalidDays: number;
  uniqueGoalCount: number;
};

export type PersonalPlanWeekContentQualityResult = {
  valid: boolean;
  weekId: string;
  planId: string;
  summary: PersonalPlanWeekContentQualitySummary;
  dayResults: PersonalPlanDayContentQualityResult[];
  issues: PersonalPlanWeekContentIssue[];
};

const NARROW_SCENARIO_TAGS = new Set([
  'apartment',
  'apartment_viewing',
  'bank_card',
  'documents',
  'passport',
  'phone_number',
  'rent',
  'visa',
]);

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueGoals(days: PersonalPlanWeekDayDraft[]): Set<string> {
  const goals = new Set<string>();

  for (const day of days) {
    for (const tag of day.focusTags) {
      if (tag.trim()) {
        goals.add(normalized(tag));
      }
    }

    for (const goal of day.exerciseGoals) {
      if (goal.trim()) {
        goals.add(normalized(goal));
      }
    }
  }

  return goals;
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return [...duplicates];
}

function narrowScenarioCounts(days: PersonalPlanWeekDayDraft[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const day of days) {
    const dayNarrowTags = new Set(
      [...day.focusTags, ...day.exerciseGoals]
        .map(normalized)
        .filter((tag) => NARROW_SCENARIO_TAGS.has(tag)),
    );

    for (const tag of dayNarrowTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return counts;
}

export function validatePersonalPlanWeekContentQuality(
  input: PersonalPlanWeekContentQualityInput,
): PersonalPlanWeekContentQualityResult {
  const issues: PersonalPlanWeekContentIssue[] = [];
  const dayResults = input.days.map((day) => validatePersonalPlanDayContentQuality({
    dayId: day.dayId,
    scope: day.scope,
    phrases: day.phrases,
  }));

  if (!input.weekId.trim() || !input.planId.trim()) {
    issues.push({
      code: 'missing_week_identity',
    });
  }

  if (input.days.length !== 7) {
    issues.push({
      code: 'invalid_day_count',
      detail: String(input.days.length),
    });
  }

  const normalizedDayIds = input.days.map((day) => normalized(day.dayId)).filter(Boolean);
  for (const duplicateDayId of duplicateValues(normalizedDayIds)) {
    issues.push({
      code: 'duplicate_day_id',
      dayId: duplicateDayId,
    });
  }

  const dayIndexes = input.days.map((day) => day.scope.dayIndex);
  for (const duplicateDayIndex of duplicateValues(dayIndexes.map(String))) {
    issues.push({
      code: 'duplicate_day_index',
      detail: duplicateDayIndex,
    });
  }

  const expectedIndexes = [1, 2, 3, 4, 5, 6, 7];
  if (
    input.days.length === 7
    && dayIndexes.some((dayIndex, index) => dayIndex !== expectedIndexes[index])
  ) {
    issues.push({
      code: 'day_sequence_invalid',
      detail: dayIndexes.join(','),
    });
  }

  for (const day of input.days) {
    if (day.scope.planId !== input.planId) {
      issues.push({
        code: 'day_plan_mismatch',
        dayId: day.dayId,
        detail: day.scope.planId,
      });
    }
  }

  const dayOne = input.days[0];
  if (
    !dayOne
    || dayOne.scope.dayIndex !== 1
    || dayOne.scope.weekIndex !== 1
    || dayOne.scope.mode !== 'universal_start'
  ) {
    issues.push({
      code: 'day_one_not_universal_start',
      dayId: dayOne?.dayId,
    });
  }

  for (const dayResult of dayResults) {
    if (!dayResult.valid) {
      issues.push({
        code: 'day_failed_quality_gate',
        dayId: dayResult.dayId,
      });
    }
  }

  const goalSet = uniqueGoals(input.days);
  if (goalSet.size < 5) {
    issues.push({
      code: 'low_week_variety',
      detail: String(goalSet.size),
    });
  }

  for (const [tag, count] of narrowScenarioCounts(input.days)) {
    if (count > 2) {
      issues.push({
        code: 'narrow_scenario_overload',
        detail: `${tag}:${count}`,
      });
    }
  }

  const validDays = dayResults.filter((dayResult) => dayResult.valid).length;

  return {
    valid: issues.length === 0,
    weekId: input.weekId,
    planId: input.planId,
    summary: {
      totalDays: input.days.length,
      validDays,
      invalidDays: dayResults.length - validDays,
      uniqueGoalCount: goalSet.size,
    },
    dayResults,
    issues,
  };
}
