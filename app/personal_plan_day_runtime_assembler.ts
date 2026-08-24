import type { PlanMinutesChoice } from './personal_plan_catalog';
import {
  startPlanRuntimeExerciseSession,
  type PlanRuntimeExerciseSession,
} from './personal_plan_exercise_runtime_session';
import {
  buildPlanRuntimeExerciseViewModel,
  validatePlanRuntimeExerciseViewModel,
  type PlanRuntimeExerciseViewModel,
} from './personal_plan_exercise_runtime_view_model';
import {
  validatePlanRuntimeBlockBundle,
  type PlanRuntimeBlockBundle,
} from './personal_plan_runtime_block_factory';

export type PlanDayRuntimeBlockStatus =
  | 'locked_by_minutes'
  | 'available'
  | 'active'
  | 'completed';

export type PlanDayRuntimeBlockState = {
  blockId: string;
  title: string;
  type: PlanRuntimeBlockBundle['block']['type'];
  estimatedMinutes: number;
  requiredFor: PlanMinutesChoice[];
  status: PlanDayRuntimeBlockStatus;
};

export type PlanDayRuntimeCarryover = {
  hasCarryover: boolean;
  phraseIds: string[];
  label: string;
};

export type PlanDayRuntimeCompletion = {
  title: string;
  text: string;
};

export type PlanDayRuntimeAssembly = {
  planInstanceId: string;
  minutesPerDay: PlanMinutesChoice;
  availableBlockIds: string[];
  lockedBlockIds: string[];
  completedBlockIds: string[];
  activeBlockId?: string;
  totalEstimatedMinutes: number;
  dayCompleted: boolean;
  blockStates: PlanDayRuntimeBlockState[];
  activeSession?: PlanRuntimeExerciseSession;
  activeViewModel?: PlanRuntimeExerciseViewModel;
  carryover: PlanDayRuntimeCarryover;
  completion?: PlanDayRuntimeCompletion;
};

export type AssemblePlanDayRuntimeInput = {
  bundles: PlanRuntimeBlockBundle[];
  minutesPerDay: PlanMinutesChoice;
  planInstanceId: string;
  completedBlockIds?: string[];
  carryoverPhraseIds?: string[];
  sessionIdPrefix?: string;
};

export type AssemblePlanDayRuntimeResult =
  | {
    status: 'ready';
    assembly: PlanDayRuntimeAssembly;
  }
  | {
    status: 'blocked';
    issues: string[];
  };

export type PlanDayRuntimeAssemblyIssue =
  | 'missing_plan_instance_id'
  | 'no_available_bundles'
  | 'invalid_bundle'
  | 'active_session_blocked'
  | 'active_view_model_invalid'
  | 'invalid_block_state'
  | 'technical_copy'
  | 'corrupted_copy';

const TECHNICAL_COPY_RE = /\b(?:dev|debug|draft|placeholder|renderer|route|sourcePhraseId|contentUnit)\b/i;
const CORRUPTED_COPY_RE = /[ÐÑÃÂâ]/;

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isAvailableForMinutes(bundle: PlanRuntimeBlockBundle, minutes: PlanMinutesChoice): boolean {
  return bundle.block.requiredFor.includes(minutes);
}

function sessionIdFor(prefix: string | undefined, blockId: string): string | undefined {
  return prefix?.trim() ? `${prefix.trim()}:${blockId}` : undefined;
}

function carryoverFor(
  selectedBundles: PlanRuntimeBlockBundle[],
  inputPhraseIds: string[] | undefined,
): PlanDayRuntimeCarryover {
  const selectedPhraseIds = new Set(selectedBundles.flatMap((bundle) => bundle.block.contentUnitIds));
  const phraseIds = unique(inputPhraseIds ?? []).filter((phraseId) => selectedPhraseIds.has(phraseId));
  const count = phraseIds.length;

  return {
    hasCarryover: count > 0,
    phraseIds,
    label: count === 1
      ? '1 фраза вернется на повтор'
      : `${count} фраз вернутся на повтор`,
  };
}

function completionFor(dayCompleted: boolean): PlanDayRuntimeCompletion | undefined {
  if (!dayCompleted) return undefined;

  return {
    title: 'День закрыт',
    text: 'Все задания на сегодня выполнены. Можно отдохнуть или вернуться к самостоятельной практике.',
  };
}

function blockState(
  bundle: PlanRuntimeBlockBundle,
  minutesPerDay: PlanMinutesChoice,
  completedBlockIds: string[],
  activeBlockId: string | undefined,
): PlanDayRuntimeBlockState {
  const blockId = bundle.block.id;
  const available = isAvailableForMinutes(bundle, minutesPerDay);
  let status: PlanDayRuntimeBlockStatus = 'locked_by_minutes';

  if (available && completedBlockIds.includes(blockId)) {
    status = 'completed';
  } else if (available && blockId === activeBlockId) {
    status = 'active';
  } else if (available) {
    status = 'available';
  }

  return {
    blockId,
    title: bundle.block.title,
    type: bundle.block.type,
    estimatedMinutes: bundle.block.estimatedMinutes,
    requiredFor: [...bundle.block.requiredFor],
    status,
  };
}

function assemblyCopy(assembly: PlanDayRuntimeAssembly): string {
  return [
    ...assembly.blockStates.flatMap((state) => [state.title, state.status]),
    assembly.carryover.label,
    assembly.completion?.title,
    assembly.completion?.text,
    assembly.activeViewModel?.title,
    assembly.activeViewModel?.instruction,
  ].filter(Boolean).join(' ');
}

export function assemblePlanDayRuntime(
  input: AssemblePlanDayRuntimeInput,
): AssemblePlanDayRuntimeResult {
  const planInstanceId = input.planInstanceId.trim();
  if (!planInstanceId) {
    return {
      status: 'blocked',
      issues: ['missing_plan_instance_id'],
    };
  }

  const bundleIssues = input.bundles.flatMap((bundle) =>
    validatePlanRuntimeBlockBundle(bundle).map((issue) => `${bundle.block.id}:${issue}`),
  );
  if (bundleIssues.length > 0) {
    return {
      status: 'blocked',
      issues: ['invalid_bundle', ...unique(bundleIssues)],
    };
  }

  const selectedBundles = input.bundles.filter((bundle) =>
    isAvailableForMinutes(bundle, input.minutesPerDay),
  );
  if (selectedBundles.length === 0) {
    return {
      status: 'blocked',
      issues: ['no_available_bundles'],
    };
  }

  const completedBlockIds = unique(input.completedBlockIds ?? [])
    .filter((blockId) => selectedBundles.some((bundle) => bundle.block.id === blockId));
  const activeBundle = selectedBundles.find((bundle) => !completedBlockIds.includes(bundle.block.id));
  const activeBlockId = activeBundle?.block.id;
  const dayCompleted = !activeBundle;
  let activeSession: PlanRuntimeExerciseSession | undefined;
  let activeViewModel: PlanRuntimeExerciseViewModel | undefined;

  if (activeBundle) {
    const session = startPlanRuntimeExerciseSession({
      block: activeBundle.block,
      items: activeBundle.items,
      planInstanceId,
      sessionId: sessionIdFor(input.sessionIdPrefix, activeBundle.block.id),
    });

    if (session.status !== 'ready') {
      return {
        status: 'blocked',
        issues: ['active_session_blocked', session.issue.code],
      };
    }

    activeSession = session.session;
    activeViewModel = buildPlanRuntimeExerciseViewModel(activeSession);
    const viewIssues = validatePlanRuntimeExerciseViewModel(activeViewModel);
    if (viewIssues.length > 0) {
      return {
        status: 'blocked',
        issues: ['active_view_model_invalid', ...viewIssues],
      };
    }
  }

  const assembly: PlanDayRuntimeAssembly = {
    planInstanceId,
    minutesPerDay: input.minutesPerDay,
    availableBlockIds: selectedBundles.map((bundle) => bundle.block.id),
    lockedBlockIds: input.bundles
      .filter((bundle) => !isAvailableForMinutes(bundle, input.minutesPerDay))
      .map((bundle) => bundle.block.id),
    completedBlockIds,
    activeBlockId,
    totalEstimatedMinutes: selectedBundles.reduce((sum, bundle) => sum + bundle.block.estimatedMinutes, 0),
    dayCompleted,
    blockStates: input.bundles.map((bundle) =>
      blockState(bundle, input.minutesPerDay, completedBlockIds, activeBlockId),
    ),
    activeSession,
    activeViewModel,
    carryover: carryoverFor(selectedBundles, input.carryoverPhraseIds),
    completion: completionFor(dayCompleted),
  };
  const issues = validatePlanDayRuntimeAssembly(assembly);

  if (issues.length > 0) {
    return {
      status: 'blocked',
      issues,
    };
  }

  return {
    status: 'ready',
    assembly,
  };
}

export function validatePlanDayRuntimeAssembly(
  assembly: PlanDayRuntimeAssembly,
): PlanDayRuntimeAssemblyIssue[] {
  const issues: PlanDayRuntimeAssemblyIssue[] = [];
  const activeCount = assembly.blockStates.filter((state) => state.status === 'active').length;

  if (!assembly.dayCompleted && activeCount !== 1) {
    issues.push('invalid_block_state');
  }
  if (assembly.dayCompleted && (assembly.activeBlockId || assembly.activeSession || assembly.activeViewModel)) {
    issues.push('invalid_block_state');
  }
  if (assembly.activeViewModel) {
    const viewIssues = validatePlanRuntimeExerciseViewModel(assembly.activeViewModel);
    if (viewIssues.length > 0) issues.push('active_view_model_invalid');
  }

  const copy = assemblyCopy(assembly);
  if (TECHNICAL_COPY_RE.test(copy)) issues.push('technical_copy');
  if (CORRUPTED_COPY_RE.test(copy)) issues.push('corrupted_copy');

  return [...new Set(issues)];
}
