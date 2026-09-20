import {
  ARENA_ADMIN_CONTENT_TARGETS,
  arenaAdminContentStatus,
  validateArenaAdminDraftManifest,
} from './admin_arena_content';

const HASH = 'a'.repeat(64);

function validManifest(studyTarget: 'es' | 'fr' | 'de') {
  return {
    schemaVersion: 'arena-multilingual-pool-manifest-v1',
    studyTarget,
    verdict: 'BLOCK',
    blockReason: 'independent_review_and_admin_publication_required;lexical_facts_pending_native_review',
    releaseEligible: false,
    requiredTaskCount: 4_000,
    generatedTaskCount: 4_000,
    quotas: {
      'fill_gap:1': 160,
      'fill_gap:2': 180,
      'fill_gap:3': 160,
      'find_oddity:1': 110,
      'find_oddity:2': 205,
      'find_oddity:3': 0,
      'guess_phrase:1': 470,
      'guess_phrase:2': 554,
      'guess_phrase:3': 469,
      'speed_match:1': 60,
      'speed_match:2': 70,
      'speed_match:3': 62,
      'translate_build:1': 400,
      'translate_build:2': 700,
      'translate_build:3': 400,
    },
    evidencePackSha256: HASH,
    tasksSha256: HASH,
    semanticLedgerSha256: HASH,
    coverage: {
      provenFactCount: 12,
      lexicalFactInventoryStatus: 'pending_native_review',
      sourceFactIds: [`${studyTarget}-fact`],
    },
    structuralRequirements: {
      choiceModes: 'one_grammatical_and_three_invalid_same_frame',
      findOddity: 'three_agree_one_mismatch',
      translateBuild: 'one_same_pos_decoy_and_tokenization_proof',
      speedMatch: 'six_pair_bijection_with_independent_ordinal_groups',
      maxSpeedMatchPairSurfaceReuse: 3,
      learnerSurfaceUniqueness: 'metadata_excluded',
      taskFields: ['studyTarget', 'cefrBand', 'semanticSignature', 'sourceFactIds', 'distractorReasons'],
    },
    manifestSha256: HASH,
  };
}

describe('admin Arena content DRAFT contract', () => {
  test('exposes only the three requested target contours and never English fallback', () => {
    expect(ARENA_ADMIN_CONTENT_TARGETS).toEqual(['es', 'fr', 'de']);
    expect(ARENA_ADMIN_CONTENT_TARGETS).not.toContain('en');
  });

  test('bundled status is read-only, exact-count and publication-blocked', () => {
    const status = arenaAdminContentStatus();
    expect(status).toMatchObject({
      schemaVersion: 'arena-admin-content-status-v1',
      workflow: 'DRAFT',
      transport: {
        available: false,
        reason: 'large_static_package_transport_unavailable',
      },
    });
    expect(status.targets).toHaveLength(3);
    for (const target of status.targets) {
      expect(target).toMatchObject({
        requiredTaskCount: 4_000,
        generatedTaskCount: 4_000,
        countComplete: true,
        manifestIntegrity: 'PASS',
        reviewReadiness: 'BLOCK',
        publicationDecision: 'BLOCK',
        releaseEligible: false,
      });
      expect(target.blockReason).toContain('independent_review_and_admin_publication_required');
      expect(target.blockReason).toContain('lexical_facts_pending_native_review');
      for (const hash of [target.manifestSha256, target.tasksSha256,
        target.semanticLedgerSha256, target.evidencePackSha256]) {
        expect(hash).toMatch(/^[a-f0-9]{64}$/u);
      }
    }
  });

  test('rejects an unknown target before considering manifest shape', () => {
    expect(validateArenaAdminDraftManifest(validManifest('es'), 'it')).toEqual({
      ok: false,
      code: 'target_unsupported',
    });
  });

  test('fails closed for non-exact counts, target mismatch and attempted release eligibility', () => {
    expect(validateArenaAdminDraftManifest({ ...validManifest('es'), generatedTaskCount: 3_999 }, 'es'))
      .toMatchObject({ ok: false, code: 'task_count_not_exact' });
    expect(validateArenaAdminDraftManifest(validManifest('fr'), 'es'))
      .toMatchObject({ ok: false, code: 'target_mismatch' });
    expect(validateArenaAdminDraftManifest({ ...validManifest('de'), releaseEligible: true }, 'de'))
      .toMatchObject({ ok: false, code: 'draft_release_state_invalid' });
  });

  test('fails closed when a hash, quota matrix or manifest fingerprint is malformed', () => {
    expect(validateArenaAdminDraftManifest({ ...validManifest('es'), tasksSha256: 'short' }, 'es'))
      .toMatchObject({ ok: false, code: 'hash_invalid' });
    expect(validateArenaAdminDraftManifest({
      ...validManifest('fr'),
      quotas: { ...validManifest('fr').quotas, 'fill_gap:1': 159 },
    }, 'fr')).toMatchObject({ ok: false, code: 'quota_matrix_invalid' });
    expect(validateArenaAdminDraftManifest(validManifest('de'), 'de'))
      .toMatchObject({ ok: false, code: 'manifest_hash_mismatch' });
  });
});
