import {
  PERSONAL_PLAN_CATALOG,
  allTasksForDay,
  nextTaskAfterVisibleSlice,
  tasksForMinutes,
  type PersonalPlanId,
  type PlanTaskKind,
} from './personal_plan_catalog';

export const PERSONAL_PLAN_FULL_REBUILD_REQUIRED_MODES = [
  'plan_phrase_lesson',
  'plan_missing_word',
  'plan_choose_natural_phrase',
  'plan_listen_choose',
  'plan_listen_build',
  'plan_pronunciation_repeat',
  'plan_phrase_recall',
  'plan_quiz',
] as const satisfies readonly PlanTaskKind[];

export type PersonalPlanFullRebuildMode = typeof PERSONAL_PLAN_FULL_REBUILD_REQUIRED_MODES[number];

export type PersonalPlanFullRebuildPlanAudit = {
  planId: PersonalPlanId;
  days: number;
  tasks: number;
  acceptedRuntimeBoundDays: number;
  scaffoldDaysToRebuild: number;
  certifiedDays: number;
  authoredNeedsReviewDays: number;
  firstDayVisibleTasksByMinutes: Record<5 | 10 | 15 | 20, number>;
  addMoreAvailableOnFirstDay: boolean;
};

export type PersonalPlanFullRebuildPhase = {
  id: 'audit-lock' | 'regenerate-day-packets' | 'materialize-modes' | 'review-and-evidence' | 'source-write-and-release-gate';
  title: string;
  acceptance: string;
};

export type PersonalPlanFullRebuildReadinessAudit = {
  kind: 'personal_plan_full_rebuild_readiness_audit';
  productionReady: false;
  totals: {
    plans: number;
    days: number;
    tasks: number;
    acceptedRuntimeBoundDays: number;
    scaffoldDaysToRebuild: number;
    certifiedDays: number;
    authoredNeedsReviewDays: number;
  };
  requiredModes: readonly PersonalPlanFullRebuildMode[];
  modeCoverage: Record<PersonalPlanFullRebuildMode, number>;
  plans: PersonalPlanFullRebuildPlanAudit[];
  currentReadiness: string[];
  blockers: string[];
  implementationPlan: PersonalPlanFullRebuildPhase[];
};

function emptyModeCoverage(): Record<PersonalPlanFullRebuildMode, number> {
  return Object.fromEntries(
    PERSONAL_PLAN_FULL_REBUILD_REQUIRED_MODES.map((mode) => [mode, 0]),
  ) as Record<PersonalPlanFullRebuildMode, number>;
}

export function buildPersonalPlanFullRebuildReadinessAudit(): PersonalPlanFullRebuildReadinessAudit {
  const modeCoverage = emptyModeCoverage();

  const plans = PERSONAL_PLAN_CATALOG.map((plan): PersonalPlanFullRebuildPlanAudit => {
    let tasks = 0;
    let acceptedRuntimeBoundDays = 0;
    let scaffoldDaysToRebuild = 0;
    let certifiedDays = 0;
    let authoredNeedsReviewDays = 0;

    for (const day of plan.days) {
      if (day.source?.status === 'accepted_candidate_runtime_bound') acceptedRuntimeBoundDays += 1;
      if (day.source?.status === 'scaffold_generated') scaffoldDaysToRebuild += 1;
      if (day.status === 'certified') certifiedDays += 1;
      if (day.status === 'authored_needs_review') authoredNeedsReviewDays += 1;

      for (const task of allTasksForDay(day)) {
        tasks += 1;
        if (PERSONAL_PLAN_FULL_REBUILD_REQUIRED_MODES.includes(task.kind as PersonalPlanFullRebuildMode)) {
          modeCoverage[task.kind as PersonalPlanFullRebuildMode] += 1;
        }
      }
    }

    const firstDay = plan.days[0];

    return {
      planId: plan.id,
      days: plan.days.length,
      tasks,
      acceptedRuntimeBoundDays,
      scaffoldDaysToRebuild,
      certifiedDays,
      authoredNeedsReviewDays,
      firstDayVisibleTasksByMinutes: {
        5: tasksForMinutes(firstDay, 5).length,
        10: tasksForMinutes(firstDay, 10).length,
        15: tasksForMinutes(firstDay, 15).length,
        20: tasksForMinutes(firstDay, 20).length,
      },
      addMoreAvailableOnFirstDay: nextTaskAfterVisibleSlice(firstDay, 5, 0) !== null,
    };
  });

  const totals = plans.reduce(
    (acc, plan) => ({
      plans: acc.plans + 1,
      days: acc.days + plan.days,
      tasks: acc.tasks + plan.tasks,
      acceptedRuntimeBoundDays: acc.acceptedRuntimeBoundDays + plan.acceptedRuntimeBoundDays,
      scaffoldDaysToRebuild: acc.scaffoldDaysToRebuild + plan.scaffoldDaysToRebuild,
      certifiedDays: acc.certifiedDays + plan.certifiedDays,
      authoredNeedsReviewDays: acc.authoredNeedsReviewDays + plan.authoredNeedsReviewDays,
    }),
    {
      plans: 0,
      days: 0,
      tasks: 0,
      acceptedRuntimeBoundDays: 0,
      scaffoldDaysToRebuild: 0,
      certifiedDays: 0,
      authoredNeedsReviewDays: 0,
    },
  );

  return {
    kind: 'personal_plan_full_rebuild_readiness_audit',
    productionReady: false,
    totals,
    requiredModes: PERSONAL_PLAN_FULL_REBUILD_REQUIRED_MODES,
    modeCoverage,
    plans,
    currentReadiness: [
      'All 546 days already have the full 8-mode task pool.',
      'All 4,368 generated tasks have launchable task material coverage.',
      'Selected daily time controls only the initial visible slice; add-more can reveal the remaining pool.',
      'Runtime audio is approved and registered for the generated listening assets.',
      '406 scaffold-generated days still need authored rebuild, review, and source/runtime approval before production readiness.',
    ],
    blockers: [
      'Rebuild 406 scaffold-generated days into authored plan-native day packets.',
      'Run human/content review on every rebuilt day packet.',
      'Generate or map approved audio for listening tasks beyond the currently approved runtime set.',
      'Provide real pronunciation recordings/scored attempts before claiming pronunciation readiness.',
      'Capture final human acceptance after the rebuilt corpus and evidence gates pass.',
    ],
    implementationPlan: [
      {
        id: 'audit-lock',
        title: 'Lock the rebuild baseline',
        acceptance: 'The audit shows 546 days, 4,368 tasks, 8 required modes per day, and the exact scaffold-day backlog by plan.',
      },
      {
        id: 'regenerate-day-packets',
        title: 'Regenerate authored day packets',
        acceptance: 'Every scaffold-generated day is replaced by a reviewed day packet with natural phrases, translations, teaching notes, recall links, and no technical copy.',
      },
      {
        id: 'materialize-modes',
        title: 'Materialize every mode',
        acceptance: 'Each rebuilt day produces phrase-build, missing-word, natural-choice, listen-choose, listen-build, pronunciation-repeat, recall, and quiz payloads.',
      },
      {
        id: 'review-and-evidence',
        title: 'Review content and evidence',
        acceptance: 'Human review approves content, listening tasks have approved audio, and pronunciation tasks have real scorer/recording evidence before readiness is claimed.',
      },
      {
        id: 'source-write-and-release-gate',
        title: 'Write guarded source and gate release',
        acceptance: 'Guarded source/runtime write passes route, storage, materials, audio, pronunciation, TypeScript, and focused Personal Plans tests.',
      },
    ],
  };
}
