/**
 * Server twin of the dialogue target registry. Keep this separate from the
 * general AI language contract: expanding only Dialogues must not silently
 * expand unrelated AI endpoints.
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

export function resolveDialogueStudyTarget(value: unknown): DialogueStudyTarget | null {
  const code = String(value ?? '').trim().toLowerCase();
  return (DIALOGUE_STUDY_TARGETS as readonly string[]).includes(code)
    ? code as DialogueStudyTarget
    : null;
}

export function dialogueLanguageMeta(target: DialogueStudyTarget): DialogueLanguageMeta {
  return DIALOGUE_LANGUAGE_META[target];
}
