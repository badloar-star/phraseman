import {
  ARENA_GENERATOR_PROFILES,
  ARENA_POOL_TASK_COUNT,
  ARENA_REQUIRED_GENERATION_PLAN,
  ARENA_REQUIRED_GENERATION_TARGETS,
  arenaCanonicalSha256,
  parseArenaGeneratorRequest,
  validateArenaPreauthoringReceipt,
} from './arena_content_generation';

const hash = (seed: string) => arenaCanonicalSha256({ seed });

function preauthoring(studyTarget: 'en' | 'es' | 'fr' | 'de', overrides: Record<string, unknown> = {}) {
  const profile = ARENA_GENERATOR_PROFILES[studyTarget];
  return {
    schemaVersion: 'arena-preauthoring-v1',
    role: 'arena_preauthoring_guardian',
    verdict: 'PASS',
    studyTarget,
    sourceLocale: 'ru',
    mode: 'guess_phrase',
    difficulty: 1,
    cefrBand: 'A1',
    poolVersion: `arena-${studyTarget}-v1`,
    profileSha256: profile.profileSha256,
    generatorPromptSha256: hash('prompt'),
    evidencePackSha256: hash('facts'),
    approvedExemplarSha256: hash('exemplar'),
    semanticLedgerSha256: hash('ledger'),
    issuedAt: '2026-09-19T10:00:00.000Z',
    runId: `guardian-${studyTarget}-1`,
    authorRunId: `author-${studyTarget}-1`,
    authorMustNotSelfIssue: true,
    intendedAnswer: 'Target-language answer',
    acceptedVariants: ['Target-language answer'],
    distractorTrapPlan: [
      { optionIndex: 1, trapType: 'agreement', factIds: ['fact-1'] },
      { optionIndex: 2, trapType: 'government', factIds: ['fact-2'] },
      { optionIndex: 3, trapType: 'morphology', factIds: ['fact-3'] },
    ],
    inputSha256: hash({ studyTarget, slot: 'guess_phrase:1:A1' } as unknown as string),
    ...overrides,
  };
}

function request(studyTarget: 'en' | 'es' | 'fr' | 'de', overrides: Record<string, unknown> = {}) {
  const profile = ARENA_GENERATOR_PROFILES[studyTarget];
  return {
    schemaVersion: 'arena-generator-request-v1',
    studyTarget,
    sourceLocale: 'ru',
    requestedTaskCount: ARENA_POOL_TASK_COUNT,
    poolVersion: `arena-${studyTarget}-v1`,
    profileSha256: profile.profileSha256,
    generatorPromptSha256: hash('prompt'),
    evidencePackSha256: hash('facts'),
    approvedExemplarSha256: hash('exemplar'),
    semanticLedgerSha256: hash('ledger'),
    preauthoringReceipt: preauthoring(studyTarget),
    ...overrides,
  };
}

describe('Arena target-specific generation contract', () => {
  it('requires exactly 4,000 new tasks for Spanish, French and German, not a duplicate English generation', () => {
    expect(ARENA_REQUIRED_GENERATION_TARGETS).toEqual(['es', 'fr', 'de']);
    expect(ARENA_REQUIRED_GENERATION_PLAN).toEqual({ es: 4_000, fr: 4_000, de: 4_000 });
    expect(ARENA_GENERATOR_PROFILES.en.requiredNewTaskCount).toBe(0);
  });

  test.each(['es', 'fr', 'de'] as const)(
    '%s profile requires 4,000 new tasks over the English V11 five-mode difficulty envelope',
    (target) => {
      const profile = ARENA_GENERATOR_PROFILES[target];
      expect(profile.requiredNewTaskCount).toBe(4_000);
      expect(profile.modes).toEqual([
        'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
      ]);
      expect(profile.difficulties).toEqual([1, 2, 3]);
      expect(Object.values(profile.modeDifficultyQuotas).reduce((sum, count) => sum + count, 0)).toBe(4_000);
      expect(profile.sourceLocale).toBe('ru');
      expect(profile.targetLocale.startsWith(target)).toBe(true);
      expect(profile.profileSha256).toMatch(/^[a-f0-9]{64}$/);
    },
  );

  it('accepts an exact target-scoped request with an independent PASS preauthoring receipt', () => {
    expect(parseArenaGeneratorRequest(request('de'))).toMatchObject({
      ok: true,
      value: { studyTarget: 'de', requestedTaskCount: 4_000 },
    });
  });

  it('fails closed for a smaller quota, a copied English profile, or target drift in the receipt', () => {
    expect(parseArenaGeneratorRequest(request('es', { requestedTaskCount: 3_999 })))
      .toEqual({ ok: false, reason: 'generator_task_count_invalid' });
    expect(parseArenaGeneratorRequest(request('fr', {
      profileSha256: ARENA_GENERATOR_PROFILES.en.profileSha256,
    }))).toEqual({ ok: false, reason: 'generator_profile_hash_mismatch' });
    expect(parseArenaGeneratorRequest(request('de', {
      preauthoringReceipt: preauthoring('en'),
    }))).toEqual({ ok: false, reason: 'preauthoring_identity_mismatch' });
  });

  it('rejects self-issued, HOLD, stale and incomplete preauthoring evidence', () => {
    expect(validateArenaPreauthoringReceipt(preauthoring('es', {
      authorRunId: 'guardian-es-1',
    }))).toEqual({ ok: false, reason: 'preauthoring_independence_invalid' });
    expect(validateArenaPreauthoringReceipt(preauthoring('es', { verdict: 'HOLD' })))
      .toEqual({ ok: false, reason: 'preauthoring_not_pass' });
    expect(parseArenaGeneratorRequest(request('es', {
      preauthoringReceipt: preauthoring('es', { generatorPromptSha256: hash('old-prompt') }),
    }))).toEqual({ ok: false, reason: 'preauthoring_hash_mismatch' });
    expect(validateArenaPreauthoringReceipt(preauthoring('es', { distractorTrapPlan: [] })))
      .toEqual({ ok: false, reason: 'preauthoring_trap_plan_invalid' });
  });
});
