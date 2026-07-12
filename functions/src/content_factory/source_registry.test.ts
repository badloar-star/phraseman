import { inspectSourceRegistryCoverage, sourceRegistryDocId, validateSourceRegistry, type SourceRegistry } from './source_registry';

const registry: SourceRegistry = {
  blueprintId: 'english-core-32', blueprintLocale: 'en', blueprintHash: 'a'.repeat(64), version: 'v1',
  evidence: [{ evidenceId: 'cambridge-a1', kind: 'official_curriculum', authority: 'Cambridge', url: 'https://example.com/a1', retrievedAt: '2026-07-10T00:00:00.000Z', claim: 'A1 progression' }],
  lessons: { '1': { lessonId: 1, topic: 'identity', sourcePhrases: ['I am ready'], vocabularyFocus: ['be'], drills: ['part_of_speech'] } },
};

describe('server source registry', () => {
  it('validates a versioned English blueprint and uses a safe doc id', () => {
    expect(sourceRegistryDocId(registry.blueprintId, registry.version)).toBe('english-core-32:v1');
    expect(validateSourceRegistry(registry)).toEqual({ ok: true, errors: [] });
  });

  it('rejects invented source evidence and non-English blueprint locale', () => {
    expect(validateSourceRegistry({ ...registry, blueprintLocale: 'fr' }).errors).toContain('blueprint_locale_must_be_en');
    expect(validateSourceRegistry({ ...registry, evidence: [{ ...registry.evidence[0], url: 'javascript:bad' }] }).errors).toContain('source_evidence_invalid');
  });

  it('reports the exact requested lessons missing from a 32-lesson registry', () => {
    const lessons = Object.fromEntries(Array.from({ length: 32 }, (_, index) => {
      const lessonId = index + 1;
      return [String(lessonId), { lessonId, topic: `topic-${lessonId}`, sourcePhrases: [`Phrase ${lessonId}`], vocabularyFocus: [], drills: [] }];
    }));

    expect(inspectSourceRegistryCoverage({ ...registry, lessons }, [32, 33])).toEqual({
      ok: false,
      code: 'source_coverage',
      missingLessonIds: [33],
    });
  });
});
