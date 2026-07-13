import type { SoftUpsellContext, SoftUpsellTrigger } from './soft_upsell_core';

export type SoftUpsellMode = 'production' | 'test';

export type SoftUpsellAttribution = Readonly<{
  impressionId: string;
  trigger: SoftUpsellTrigger;
  context: SoftUpsellContext;
  mode: SoftUpsellMode;
}>;

type RouteParams = Record<string, unknown>;

const CONTEXT_BY_TRIGGER: Record<SoftUpsellTrigger, SoftUpsellContext> = {
  first_lesson: 'first_lesson_success',
  free_lessons_complete: 'free_lessons_complete',
  weekly_review: 'weekly_review',
  second_ai_dialogue: 'dialog_repeat_success',
  streak_milestone: 'streak_milestone',
  repeated_training: 'trainer_repeat_success',
};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/;

function isTrigger(value: unknown): value is SoftUpsellTrigger {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CONTEXT_BY_TRIGGER, value);
}

function scalar(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function createSoftUpsellAttribution(value: SoftUpsellAttribution): SoftUpsellAttribution {
  if (!ID_PATTERN.test(value.impressionId)) throw new Error('Invalid soft_upsell_impression_id');
  if (!isTrigger(value.trigger) || CONTEXT_BY_TRIGGER[value.trigger] !== value.context) {
    throw new Error('Invalid soft upsell trigger/context');
  }
  if (value.mode !== 'production' && value.mode !== 'test') throw new Error('Invalid soft upsell mode');
  return Object.freeze({ ...value });
}

export function softUpsellRouteParams(value: SoftUpsellAttribution): Record<string, string> {
  const valid = createSoftUpsellAttribution(value);
  return {
    soft_upsell_impression_id: valid.impressionId,
    soft_upsell_trigger: valid.trigger,
    soft_upsell_context: valid.context,
    soft_upsell_mode: valid.mode,
  };
}

export function parseSoftUpsellAttribution(params: RouteParams): SoftUpsellAttribution | null {
  const impressionId = scalar(params.soft_upsell_impression_id);
  const trigger = scalar(params.soft_upsell_trigger);
  const context = scalar(params.soft_upsell_context);
  const mode = scalar(params.soft_upsell_mode);
  if (!impressionId || !isTrigger(trigger) || context == null || (mode !== 'production' && mode !== 'test')) {
    return null;
  }
  try {
    return createSoftUpsellAttribution({ impressionId, trigger, context: context as SoftUpsellContext, mode });
  } catch {
    return null;
  }
}

export function softUpsellEventId(value: SoftUpsellAttribution, semanticSuffix: string): string {
  const valid = createSoftUpsellAttribution(value);
  const suffix = semanticSuffix.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32) || 'event';
  return `${valid.impressionId}:${suffix}`.slice(0, 80);
}

export function softUpsellAnalyticsParams(
  value: SoftUpsellAttribution | null | undefined,
  semanticSuffix: string,
): Record<string, string> {
  if (!value) return {};
  return {
    ...softUpsellRouteParams(value),
    event_id: softUpsellEventId(value, semanticSuffix),
  };
}

export default function __RouteShim() { return null; }
