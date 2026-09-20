import {
  DIALOGUE_STUDY_TARGETS,
  dialogueLanguageMeta,
  resolveDialogueStudyTarget,
} from '../app/dialogue_language_registry';

describe('dialogue language registry', () => {
  it('declares the complete dialogue target set with speech locales', () => {
    expect(DIALOGUE_STUDY_TARGETS).toEqual(['en', 'es', 'fr', 'de']);
    expect(dialogueLanguageMeta('en')).toMatchObject({ name: 'English', speechLocale: 'en-US' });
    expect(dialogueLanguageMeta('es')).toMatchObject({ name: 'Spanish', speechLocale: 'es-ES' });
    expect(dialogueLanguageMeta('fr')).toMatchObject({ name: 'French', speechLocale: 'fr-FR' });
    expect(dialogueLanguageMeta('de')).toMatchObject({ name: 'German', speechLocale: 'de-DE' });
  });

  it('does not turn unknown dialogue targets into English', () => {
    expect(resolveDialogueStudyTarget('es')).toBe('es');
    expect(resolveDialogueStudyTarget('DE')).toBe('de');
    expect(resolveDialogueStudyTarget('it')).toBeNull();
    expect(resolveDialogueStudyTarget(undefined)).toBeNull();
  });

  it.each([['en'], ['de'], { toString: () => 'en' }, { toString: () => { throw new Error('not a language'); } }].map(value => [value]))(
    'rejects non-string targets without coercing them: %p', value => {
      expect(resolveDialogueStudyTarget(value)).toBeNull();
    },
  );
});
