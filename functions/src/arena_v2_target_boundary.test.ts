import {
  arenaQueuePublicationCompatible,
  arenaResolveRequiredStudyTarget,
  arenaTargetBoundPlanHash,
} from './arena_v2_core';

const FINGERPRINT = 'a'.repeat(64);
const OTHER_FINGERPRINT = 'b'.repeat(64);

describe('Arena V2 target boundary', () => {
  it.each(['en', 'es', 'fr', 'de'] as const)('accepts explicit %s', (studyTarget) => {
    expect(arenaResolveRequiredStudyTarget(studyTarget)).toEqual({ ok: true, studyTarget });
  });

  it('rejects a missing or unknown target without inventing English', () => {
    expect(arenaResolveRequiredStudyTarget(undefined)).toEqual({
      ok: false,
      reason: 'arena_target_required',
    });
    expect(arenaResolveRequiredStudyTarget('')).toEqual({
      ok: false,
      reason: 'arena_target_required',
    });
    expect(arenaResolveRequiredStudyTarget('it')).toEqual({
      ok: false,
      reason: 'arena_target_invalid',
    });
  });

  it('matches queues only inside one exact target publication', () => {
    const expected = { studyTarget: 'es' as const, publicationFingerprint: FINGERPRINT };
    expect(arenaQueuePublicationCompatible(expected, expected)).toEqual({ ok: true });
    expect(arenaQueuePublicationCompatible({}, expected)).toEqual({
      ok: false,
      reason: 'arena_queue_legacy_untagged',
    });
    expect(arenaQueuePublicationCompatible({
      studyTarget: 'fr', publicationFingerprint: FINGERPRINT,
    }, expected)).toEqual({ ok: false, reason: 'arena_queue_target_mismatch' });
    expect(arenaQueuePublicationCompatible({
      studyTarget: 'es', publicationFingerprint: OTHER_FINGERPRINT,
    }, expected)).toEqual({ ok: false, reason: 'arena_queue_publication_mismatch' });
  });

  it('binds plan identity to the target and immutable publication', () => {
    const tasks = [
      { taskId: 'es-1', mode: 'guess_phrase', difficulty: 1 },
      { taskId: 'es-2', mode: 'fill_gap', difficulty: 2 },
    ];
    const first = arenaTargetBoundPlanHash('match-1', 'es', FINGERPRINT, tasks);
    expect(first).toBe(arenaTargetBoundPlanHash('match-1', 'es', FINGERPRINT, tasks));
    expect(first).not.toBe(arenaTargetBoundPlanHash('match-1', 'fr', FINGERPRINT, tasks));
    expect(first).not.toBe(arenaTargetBoundPlanHash('match-1', 'es', OTHER_FINGERPRINT, tasks));
  });
});

// зачем: D78 — блок "Arena V2 target source contract" читал удалённый arena_v2.ts
// (серверная Арена снята из кода); чистые функции границы цели в arena_v2_core
// остаются под проверкой выше, их использует пул Шпиля.
