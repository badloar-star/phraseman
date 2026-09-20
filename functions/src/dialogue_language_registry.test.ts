import {
  DIALOGUE_STUDY_TARGETS,
  dialogueLanguageMeta,
  resolveDialogueStudyTarget,
} from './dialogue_language_registry';

describe('server dialogue language registry', () => {
  it('matches the client language universe and speech locales', () => {
    expect(DIALOGUE_STUDY_TARGETS).toEqual(['en', 'es', 'fr', 'de']);
    expect(dialogueLanguageMeta('en').speechLocale).toBe('en-US');
    expect(dialogueLanguageMeta('es').speechLocale).toBe('es-ES');
    expect(dialogueLanguageMeta('fr').speechLocale).toBe('fr-FR');
    expect(dialogueLanguageMeta('de').speechLocale).toBe('de-DE');
  });

  it('fails closed for an unknown target', () => {
    expect(resolveDialogueStudyTarget('it')).toBeNull();
    expect(resolveDialogueStudyTarget()).toBeNull();
  });
});
