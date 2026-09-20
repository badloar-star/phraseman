/**
 * Dialogue-specific target language contract.
 *
 * This deliberately does not reuse the application-wide study-target resolver:
 * that resolver is allowed to retain legacy English fallbacks for surfaces that
 * have not been migrated yet. Dialogues must never silently teach English when
 * a selected target has no dialogue pack.
 */
export const DIALOGUE_STUDY_TARGETS = ['en', 'es', 'fr', 'de'] as const;

export type DialogueStudyTarget = typeof DIALOGUE_STUDY_TARGETS[number];

export type DialogueLanguageMeta = Readonly<{
  name: 'English' | 'Spanish' | 'French' | 'German';
  speechLocale: 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';
}>;

const DIALOGUE_LANGUAGE_META: Readonly<Record<DialogueStudyTarget, DialogueLanguageMeta>> = Object.freeze({
  en: Object.freeze({ name: 'English', speechLocale: 'en-US' }),
  es: Object.freeze({ name: 'Spanish', speechLocale: 'es-ES' }),
  fr: Object.freeze({ name: 'French', speechLocale: 'fr-FR' }),
  de: Object.freeze({ name: 'German', speechLocale: 'de-DE' }),
});

export const DIALOGUE_LANGUAGE_REGISTRY_VERSION = 'dialogue-language-registry-v1';
export const DIALOGUE_STATE_KEY_PREFIX = 'dialogue_v1';

export function resolveDialogueStudyTarget(value: unknown): DialogueStudyTarget | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase();
  return (DIALOGUE_STUDY_TARGETS as readonly string[]).includes(code)
    ? code as DialogueStudyTarget
    : null;
}

export function dialogueLanguageMeta(target: DialogueStudyTarget): DialogueLanguageMeta {
  return DIALOGUE_LANGUAGE_META[target];
}

/**
 * Migration-safe dialogue state key.
 *
 * English keeps its historical key so existing progress remains visible.
 * Every other supported target gets an explicit namespace. Unknown targets
 * receive no key at all: callers must fail closed instead of falling back to
 * English state.
 */
export function dialogueStateStorageKey(target: unknown, legacyEnglishKey: string): string | null {
  const resolved = resolveDialogueStudyTarget(target);
  if (!resolved || !legacyEnglishKey) return null;
  return resolved === 'en'
    ? legacyEnglishKey
    : `${DIALOGUE_STATE_KEY_PREFIX}::${resolved}::${legacyEnglishKey}`;
}
