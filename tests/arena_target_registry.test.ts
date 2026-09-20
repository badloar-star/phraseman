import {
  ARENA_STUDY_TARGETS,
  arenaStudyTargetMeta,
  resolveArenaStudyTarget,
} from '../modules/arena/target_registry';

describe('Arena target registry', () => {
  it('declares the four isolated targets with the complete five-mode contract', () => {
    expect(ARENA_STUDY_TARGETS).toEqual(['en', 'es', 'fr', 'de']);
    for (const target of ARENA_STUDY_TARGETS) {
      const meta = arenaStudyTargetMeta(target);
      expect(meta.sourceLocale).toBe('ru');
      expect(meta.speechLocale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(meta.modes).toEqual([
        'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
      ]);
      expect(meta.distractorProfile).toMatch(/^[a-z_]+$/);
    }
  });

  it('never turns a missing or unsupported target into English', () => {
    expect(resolveArenaStudyTarget('ES')).toBe('es');
    expect(resolveArenaStudyTarget(' de ')).toBe('de');
    expect(resolveArenaStudyTarget(undefined)).toBeNull();
    expect(resolveArenaStudyTarget(null)).toBeNull();
    expect(resolveArenaStudyTarget('it')).toBeNull();
    expect(resolveArenaStudyTarget('')).toBeNull();
  });
});
