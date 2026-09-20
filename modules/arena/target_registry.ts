import { ARENA_TASK_MODES, type ArenaTaskMode } from './contract';

/** Arena owns this registry; unrelated product surfaces may support fewer targets. */
export const ARENA_STUDY_TARGETS = ['en', 'es', 'fr', 'de'] as const;
export type ArenaStudyTarget = typeof ARENA_STUDY_TARGETS[number];

export type ArenaStudyTargetMeta = Readonly<{
  name: 'English' | 'Spanish' | 'French' | 'German';
  sourceLocale: 'ru';
  speechLocale: 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';
  distractorProfile: 'english_core' | 'spanish_agreement' | 'french_agreement' | 'german_case_order';
  modes: readonly ArenaTaskMode[];
}>;

const META: Readonly<Record<ArenaStudyTarget, ArenaStudyTargetMeta>> = Object.freeze({
  en: Object.freeze({
    name: 'English', sourceLocale: 'ru', speechLocale: 'en-US',
    distractorProfile: 'english_core', modes: ARENA_TASK_MODES,
  }),
  es: Object.freeze({
    name: 'Spanish', sourceLocale: 'ru', speechLocale: 'es-ES',
    distractorProfile: 'spanish_agreement', modes: ARENA_TASK_MODES,
  }),
  fr: Object.freeze({
    name: 'French', sourceLocale: 'ru', speechLocale: 'fr-FR',
    distractorProfile: 'french_agreement', modes: ARENA_TASK_MODES,
  }),
  de: Object.freeze({
    name: 'German', sourceLocale: 'ru', speechLocale: 'de-DE',
    distractorProfile: 'german_case_order', modes: ARENA_TASK_MODES,
  }),
});

export const ARENA_LANGUAGE_REGISTRY_VERSION = 'arena-language-registry-v1' as const;

export function resolveArenaStudyTarget(value: unknown): ArenaStudyTarget | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return (ARENA_STUDY_TARGETS as readonly string[]).includes(normalized)
    ? normalized as ArenaStudyTarget
    : null;
}

export function arenaStudyTargetMeta(target: ArenaStudyTarget): ArenaStudyTargetMeta {
  return META[target];
}
