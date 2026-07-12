import { resolveArenaCourseIdentity } from '../app/language_runtime/arena_course_identity';

const hash = 'a'.repeat(64);

describe('arena course identity resolution', () => {
  it('uses the exact active release for a server-delivered target', async () => {
    const identity = await resolveArenaCourseIdentity('de', 'ru', async () => ({
      releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru', artifacts: { arena: { contentHash: hash } },
    } as any));
    expect(identity).toEqual({ studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' });
  });

  it('preserves the legacy English and Spanish arena paths without relabelling them as another release', async () => {
    const fetchRelease = jest.fn();
    await expect(resolveArenaCourseIdentity('en', 'uk', fetchRelease)).resolves.toEqual({ studyTarget: 'en', learnerSourceLocale: 'uk', courseReleaseId: 'legacy-en-v1' });
    await expect(resolveArenaCourseIdentity('es', 'ru', fetchRelease)).resolves.toEqual({ studyTarget: 'es', learnerSourceLocale: 'ru', courseReleaseId: 'legacy-es-v1' });
    expect(fetchRelease).not.toHaveBeenCalled();
  });

  it('rejects a release returned for another source locale', async () => {
    await expect(resolveArenaCourseIdentity('de', 'ru', async () => ({ releaseId: 'de-uk-r1', studyTarget: 'de', learnerSourceLocale: 'uk', artifacts: { arena: {} } } as any))).rejects.toThrow('arena_course_identity_mismatch');
  });
});
