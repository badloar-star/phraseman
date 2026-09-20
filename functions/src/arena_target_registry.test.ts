import {
  ARENA_STUDY_TARGETS,
  arenaTargetPublicationFingerprint,
  arenaStudyTargetMeta,
  parseArenaTargetPublicationState,
  resolveArenaTargetPublication,
  resolveArenaStudyTarget,
} from './arena_target_registry';

function exactPublications(overrides: Partial<Record<(typeof ARENA_STUDY_TARGETS)[number], unknown>> = {}) {
  return Object.fromEntries(ARENA_STUDY_TARGETS.map((studyTarget) => [
    studyTarget,
    overrides[studyTarget] ?? { studyTarget, enabled: false, ready: false },
  ]));
}

describe('server Arena target registry', () => {
  it('mirrors the complete client contract', () => {
    expect(ARENA_STUDY_TARGETS).toEqual(['en', 'es', 'fr', 'de']);
    expect(ARENA_STUDY_TARGETS.map((target) => arenaStudyTargetMeta(target).speechLocale))
      .toEqual(['en-US', 'es-ES', 'fr-FR', 'de-DE']);
    expect(ARENA_STUDY_TARGETS.every((target) => arenaStudyTargetMeta(target).modes.length === 5))
      .toBe(true);
  });

  it('fails closed for absent and unknown target codes', () => {
    expect(resolveArenaStudyTarget('fr')).toBe('fr');
    expect(resolveArenaStudyTarget(undefined)).toBeNull();
    expect(resolveArenaStudyTarget('it')).toBeNull();
  });

  it('requires an explicitly ready target-scoped publication with a target-bound fingerprint', () => {
    const ready = {
      studyTarget: 'es' as const,
      enabled: true as const,
      ready: true as const,
      poolVersion: 'arena-es-v1',
      manifestSha256: 'a'.repeat(64),
      merkleRootSha256: 'b'.repeat(64),
      factPackVersion: 'arena-es-facts-v1',
      factPackSha256: 'c'.repeat(64),
    };
    const publicationFingerprint = arenaTargetPublicationFingerprint(ready);
    expect(resolveArenaTargetPublication({}, 'en')).toBeNull();
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({
      es: { studyTarget: 'es', enabled: true, ready: false },
    }) }, 'es')).toBeNull();
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({
      es: { ...ready, publicationFingerprint },
    }) }, 'es')).toEqual({ ...ready, publicationFingerprint });
  });

  it('rejects spoofed, cross-target, incomplete and non-exact publications', () => {
    const ready = {
      studyTarget: 'de' as const,
      enabled: true as const,
      ready: true as const,
      poolVersion: 'arena-de-v1',
      manifestSha256: '1'.repeat(64),
      merkleRootSha256: '2'.repeat(64),
      factPackVersion: 'arena-de-facts-v1',
      factPackSha256: '3'.repeat(64),
    };
    const exact = { ...ready, publicationFingerprint: arenaTargetPublicationFingerprint(ready) };
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({ de: exact }) }, 'es')).toBeNull();
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({ de: exact }) }, 'de')).toEqual(exact);
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({
      de: { ...exact, studyTarget: 'en' },
    }) }, 'de')).toBeNull();
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({
      de: { ...exact, publicationFingerprint: 'f'.repeat(64) },
    }) }, 'de')).toBeNull();
    const { factPackSha256: _removed, ...incomplete } = exact;
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({ de: incomplete }) }, 'de')).toBeNull();
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({
      de: { ...exact, browserInjected: true },
    }) }, 'de')).toBeNull();
    expect(resolveArenaTargetPublication({ targetPublications: exactPublications({
      de: { studyTarget: 'de', enabled: true, ready: false },
    }) }, 'de')).toBeNull();
    expect(parseArenaTargetPublicationState(
      { studyTarget: 'de', enabled: true, ready: false },
      'de',
    )).toBeNull();
  });

  it('binds the fingerprint to the target and every immutable publication identity field', () => {
    const base = {
      studyTarget: 'fr' as const,
      poolVersion: 'arena-fr-v1',
      manifestSha256: 'a'.repeat(64),
      merkleRootSha256: 'b'.repeat(64),
      factPackVersion: 'arena-fr-facts-v1',
      factPackSha256: 'c'.repeat(64),
    };
    const fingerprint = arenaTargetPublicationFingerprint(base);
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(arenaTargetPublicationFingerprint({ ...base, studyTarget: 'es' })).not.toBe(fingerprint);
    expect(arenaTargetPublicationFingerprint({ ...base, factPackVersion: 'arena-fr-facts-v2' })).not.toBe(fingerprint);
  });
});
