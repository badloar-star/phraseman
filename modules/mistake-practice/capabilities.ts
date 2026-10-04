import type { MistakeFacet } from './contracts';
import type { MistakeExerciseCapabilities } from './exercise_mode_registry';

/** Поля записи ошибки, из которых выводятся возможности упражнения. */
export interface MistakeCapabilitySource {
  readonly facet: MistakeFacet;
  readonly canonicalTarget: string;
  readonly audioRef?: string | null;
  readonly distractors?: readonly string[];
  readonly tokens?: readonly string[];
}

/**
 * Возможности упражнения для записи ошибки.
 * зачем (04.10): вынесено из session.ts без изменений — тот же расчёт нужен проекции, чтобы правило
 * «ушла из счётчика» требовало второй режим только там, где второй режим вообще возможен.
 */
export function mistakeExerciseCapabilitiesFor(item: MistakeCapabilitySource): MistakeExerciseCapabilities {
  return {
    hasMeaningDistractors: (item.distractors?.length ?? 0) > 0,
    hasTokenDistractors: (item.distractors?.length ?? 0) > 0,
    hasOddityCandidates: (item.distractors?.length ?? 0) > 0,
    supportsTyping: true,
    hasAudio: !!item.audioRef,
    supportsSpeech: item.facet === 'pronunciation' || !!item.audioRef,
    tokenCount: item.tokens?.length ?? item.canonicalTarget.split(/\s+/).length,
  };
}
