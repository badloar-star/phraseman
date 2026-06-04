import type { PlanRuntimeExerciseViewModel } from './personal_plan_exercise_runtime_view_model';
import type { PlanDayRuntimeBlockState } from './personal_plan_day_runtime_assembler';
import type { PlanDayRuntimeLoop } from './personal_plan_day_runtime_loop_coordinator';

export type PlanDayRuntimeScreenIssue =
  | 'technical_copy'
  | 'corrupted_copy'
  | 'touch_target_too_small'
  | 'missing_header'
  | 'missing_timeline'
  | 'active_exercise_missing';

export type PlanDayRuntimeScreenButton = {
  label: string;
  enabled: boolean;
  minTouchTarget: number;
  variant: 'primary' | 'secondary' | 'disabled';
};

export type PlanDayRuntimeTimelineItem = {
  blockId: string;
  title: string;
  status: PlanDayRuntimeBlockState['status'];
  metaLabel: string;
  button: PlanDayRuntimeScreenButton;
};

export type PlanDayRuntimeScreenModel = {
  header: {
    eyebrow: string;
    title: string;
    percentLabel: string;
  };
  progress: {
    completedBlocks: number;
    totalBlocks: number;
    percent: number;
    label: string;
    estimatedMinutesLabel: string;
  };
  timeline: PlanDayRuntimeTimelineItem[];
  activeExercise?: PlanRuntimeExerciseViewModel;
  carryover: {
    visible: boolean;
    title?: string;
    text?: string;
  };
  completion?: {
    title: string;
    text: string;
    primaryButton: PlanDayRuntimeScreenButton;
  };
  design: {
    styleIntent: 'premium_dark_glass';
    minTouchTarget: 56;
    usesLargeButtons: true;
    avoidsDecorativeNoise: true;
  };
};

const TECHNICAL_COPY_RE = /\b(?:dev|debug|draft|placeholder|renderer|route|sourcePhraseId|contentUnit)\b/i;
const CORRUPTED_COPY_RE = /[ÃÂÐÑâ]/;
const MIN_TOUCH_TARGET = 56;

function percent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function buttonFor(status: PlanDayRuntimeBlockState['status']): PlanDayRuntimeScreenButton {
  if (status === 'active') {
    return {
      label: 'Открыто',
      enabled: true,
      minTouchTarget: MIN_TOUCH_TARGET,
      variant: 'primary',
    };
  }
  if (status === 'available') {
    return {
      label: 'Открыть',
      enabled: true,
      minTouchTarget: MIN_TOUCH_TARGET,
      variant: 'primary',
    };
  }
  if (status === 'completed') {
    return {
      label: 'Повторить',
      enabled: true,
      minTouchTarget: MIN_TOUCH_TARGET,
      variant: 'secondary',
    };
  }

  return {
    label: 'Недоступно',
    enabled: false,
    minTouchTarget: MIN_TOUCH_TARGET,
    variant: 'disabled',
  };
}

function metaLabelFor(state: PlanDayRuntimeBlockState): string {
  if (state.status === 'locked_by_minutes') return 'не входит в выбранное время';
  return `около ${state.estimatedMinutes} мин`;
}

function carryoverText(count: number): string | undefined {
  if (count <= 0) return undefined;
  if (count === 1) {
    return 'Одна фраза вернётся в конце круга. Закрепим спокойно, без подсказок.';
  }
  return `${count} фраз вернутся в конце круга. Закрепим спокойно, без подсказок.`;
}

function screenCopy(model: PlanDayRuntimeScreenModel): string {
  return [
    model.header.eyebrow,
    model.header.title,
    model.header.percentLabel,
    model.progress.label,
    model.progress.estimatedMinutesLabel,
    ...model.timeline.flatMap((item) => [
      item.title,
      item.status,
      item.metaLabel,
      item.button.label,
    ]),
    model.activeExercise?.title,
    model.activeExercise?.instruction,
    model.carryover.title,
    model.carryover.text,
    model.completion?.title,
    model.completion?.text,
    model.completion?.primaryButton.label,
  ].filter(Boolean).join(' ');
}

export function buildPlanDayRuntimeScreenModel(
  loop: PlanDayRuntimeLoop,
): PlanDayRuntimeScreenModel {
  const selectedStates = loop.assembly.blockStates
    .filter((state) => state.status !== 'locked_by_minutes');
  const completedBlocks = selectedStates.filter((state) => state.status === 'completed').length;
  const totalBlocks = selectedStates.length;
  const progressPercent = percent(completedBlocks, totalBlocks);
  const carryoverCount = loop.carryoverPhraseIds.length;

  return {
    header: {
      eyebrow: loop.assembly.activeViewModel?.eyebrow ?? 'Гавань · день 1',
      title: 'Задания дня',
      percentLabel: `${progressPercent}%`,
    },
    progress: {
      completedBlocks,
      totalBlocks,
      percent: progressPercent,
      label: `${completedBlocks} из ${totalBlocks}`,
      estimatedMinutesLabel: `около ${loop.assembly.totalEstimatedMinutes} мин`,
    },
    timeline: loop.assembly.blockStates.map((state) => ({
      blockId: state.blockId,
      title: state.title,
      status: state.status,
      metaLabel: metaLabelFor(state),
      button: buttonFor(state.status),
    })),
    activeExercise: loop.assembly.activeViewModel,
    carryover: {
      visible: carryoverCount > 0,
      title: carryoverCount > 0 ? 'Повторим ещё раз' : undefined,
      text: carryoverText(carryoverCount),
    },
    completion: loop.assembly.completion
      ? {
        title: loop.assembly.completion.title,
        text: loop.assembly.completion.text,
        primaryButton: {
          label: 'К практике',
          enabled: true,
          minTouchTarget: MIN_TOUCH_TARGET,
          variant: 'secondary',
        },
      }
      : undefined,
    design: {
      styleIntent: 'premium_dark_glass',
      minTouchTarget: MIN_TOUCH_TARGET,
      usesLargeButtons: true,
      avoidsDecorativeNoise: true,
    },
  };
}

export function validatePlanDayRuntimeScreenModel(
  model: PlanDayRuntimeScreenModel,
): PlanDayRuntimeScreenIssue[] {
  const issues: PlanDayRuntimeScreenIssue[] = [];

  if (!model.header.title.trim() || !model.header.eyebrow.trim()) {
    issues.push('missing_header');
  }
  if (model.timeline.length === 0) {
    issues.push('missing_timeline');
  }
  if (!model.completion && !model.activeExercise) {
    issues.push('active_exercise_missing');
  }
  if (
    model.design.minTouchTarget < 44 ||
    model.timeline.some((item) => item.button.minTouchTarget < 44) ||
    (model.completion?.primaryButton.minTouchTarget ?? MIN_TOUCH_TARGET) < 44
  ) {
    issues.push('touch_target_too_small');
  }

  const copy = screenCopy(model);
  if (TECHNICAL_COPY_RE.test(copy)) issues.push('technical_copy');
  if (CORRUPTED_COPY_RE.test(copy)) issues.push('corrupted_copy');

  return [...new Set(issues)];
}
