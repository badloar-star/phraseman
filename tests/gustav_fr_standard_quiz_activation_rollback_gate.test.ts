import {
  frenchTargetObjectPrefix,
  getFrenchStudyTargetServerPackRegistrations,
  sanitizeFrenchTargetInPackPath,
} from '../app/french_target_remote_registration';

describe('Gustav French standard quiz activation and rollback gate', () => {
  it('keeps French server-pack registrations closed until explicit approval resolver allows them', () => {
    expect(getFrenchStudyTargetServerPackRegistrations('ru', () => false)).toEqual([]);
    expect(getFrenchStudyTargetServerPackRegistrations('uk', () => false)).toEqual([]);

    const approvedRu = getFrenchStudyTargetServerPackRegistrations('ru', () => true);
    const approvedUk = getFrenchStudyTargetServerPackRegistrations('uk', () => true);

    expect(approvedRu.some((item) => item.surface === 'quiz')).toBe(true);
    expect(approvedUk.some((item) => item.surface === 'quiz')).toBe(true);
    expect(approvedRu.every((item) => item.studyTarget === 'fr' && item.sourceLocale === 'ru')).toBe(true);
    expect(approvedUk.every((item) => item.studyTarget === 'fr' && item.sourceLocale === 'uk')).toBe(true);
  });

  it('keeps quiz object paths isolated to course-packs/fr/{sourceLocale}/quiz', () => {
    expect(frenchTargetObjectPrefix('ru', 'quiz')).toContain('course-packs/fr/ru/quiz/');
    expect(frenchTargetObjectPrefix('uk', 'quiz')).toContain('course-packs/fr/uk/quiz/');

    const [quizRegistration] = getFrenchStudyTargetServerPackRegistrations('ru', () => true)
      .filter((item) => item.surface === 'quiz');

    expect(quizRegistration.manifestUrl).toContain(encodeURIComponent('course-packs/fr/ru/quiz/'));
    expect(quizRegistration.rowUrl('fr_standard_quizzes_runtime_payload_ru.dryrun.json'))
      .toContain(encodeURIComponent('course-packs/fr/ru/quiz/'));
    expect(quizRegistration.rowUrl('fr_standard_quizzes_runtime_payload_ru.dryrun.json'))
      .not.toContain(encodeURIComponent('course-packs/en/'));
  });

  it('rejects rollback/upload object paths that escape the source-locale pack container', () => {
    expect(sanitizeFrenchTargetInPackPath('fr_standard_quizzes_runtime_payload_ru.dryrun.json'))
      .toBe('fr_standard_quizzes_runtime_payload_ru.dryrun.json');

    expect(() => sanitizeFrenchTargetInPackPath('../manifest.json')).toThrow();
    expect(() => sanitizeFrenchTargetInPackPath('/manifest.json')).toThrow();
    expect(() => sanitizeFrenchTargetInPackPath('https://example.com/manifest.json')).toThrow();
    expect(() => sanitizeFrenchTargetInPackPath('course-packs/en/quiz/manifest.json')).toThrow();
    expect(() => sanitizeFrenchTargetInPackPath('payload.json?alt=media')).toThrow();
  });
});
