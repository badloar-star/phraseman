import {
  ARENA_ADMIN_CONTENT_TARGETS,
  arenaAdminContentStatus,
  validateArenaAdminDraftManifest,
} from './admin_arena_content';
import { arenaCanonicalSha256 } from './arena_content_generation';

const HASH = 'a'.repeat(64);
const OWNER_DECISION_BY_TARGET = Object.freeze({ es: 'D155', fr: 'D156', de: 'D157', it: 'D154' } as const);

function validManifest(studyTarget: 'es' | 'fr' | 'de' | 'it') {
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

function validReleaseManifest(studyTarget: 'es' | 'fr' | 'de' | 'it') {
  const linguisticReviewBody = {
    schemaVersion: 'spire-multilingual-linguistic-review-v1',
    studyTarget,
    verdict: 'PASS',
    reviewerIndependence: 'independent_read_only',
    reviewerQualification: 'target_language_expert',
    linguisticEvidenceStatus: 'approved',
    cefrEvidenceStatus: 'not_claimed',
    reviewerRunId: 'test-reviewer',
    reviewedAt: '2026-10-03',
    tasksSha256: HASH,
    evidencePackSha256: HASH,
  };
  const linguisticReviewReceipt = {
    ...linguisticReviewBody,
    receiptSha256: arenaCanonicalSha256(linguisticReviewBody),
  };
  const adminPublicationBody = {
    schemaVersion: 'spire-multilingual-admin-publication-v1',
    studyTarget,
    publicationStatus: 'approved',
    publicationId: `owner-2026-10-03-spire-${studyTarget}`,
    publisherRole: 'content_admin',
    ownerDecision: OWNER_DECISION_BY_TARGET[studyTarget],
    tasksSha256: HASH,
    linguisticReviewReceiptSha256: linguisticReviewReceipt.receiptSha256,
  };
  const body = {
    ...validManifest(studyTarget),
    verdict: 'PASS',
    releaseEligible: true,
    coverage: {
      ...validManifest(studyTarget).coverage,
      lexicalFactInventoryStatus: 'approved',
      cefrEvidenceStatus: 'not_claimed',
    },
    linguisticReviewReceipt,
    adminPublicationReceipt: {
      ...adminPublicationBody,
      receiptSha256: arenaCanonicalSha256(adminPublicationBody),
    },
  };
  delete (body as { blockReason?: string }).blockReason;
  const { manifestSha256: _stale, ...manifestBody } = body;
  return { ...manifestBody, manifestSha256: arenaCanonicalSha256(manifestBody) };
}

describe('admin Arena content DRAFT contract', () => {
  test('exposes the four multilingual target contours and never English fallback', () => {
    expect(ARENA_ADMIN_CONTENT_TARGETS).toEqual(['es', 'fr', 'de', 'it']);
    expect(ARENA_ADMIN_CONTENT_TARGETS).not.toContain('en');
  });

  test('bundled status exposes every independently reviewed and owner-approved contour', () => {
    const status = arenaAdminContentStatus();
    expect(status).toMatchObject({
      schemaVersion: 'arena-admin-content-status-v1',
      workflow: 'DRAFT',
      transport: {
        available: false,
        reason: 'large_static_package_transport_unavailable',
      },
    });
    expect(status.targets).toHaveLength(4);
    for (const target of status.targets) {
      expect(target).toMatchObject({
        requiredTaskCount: 4_000,
        generatedTaskCount: 4_000,
        countComplete: true,
        manifestIntegrity: 'PASS',
      });
      expect(target).toMatchObject({
        verdict: 'PASS', reviewReadiness: 'PASS', publicationDecision: 'PASS', releaseEligible: true,
      });
      expect(target.blockReason).toBe('');
      for (const hash of [target.manifestSha256, target.tasksSha256,
        target.semanticLedgerSha256, target.evidencePackSha256]) {
        expect(hash).toMatch(/^[a-f0-9]{64}$/u);
      }
    }
  });

  test('rejects an unknown target before considering manifest shape', () => {
    expect(validateArenaAdminDraftManifest(validManifest('es'), 'pt')).toEqual({
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

  test('accepts each exact per-target owner decision and rejects cross-target authorization', () => {
    for (const target of ARENA_ADMIN_CONTENT_TARGETS) {
      expect(validateArenaAdminDraftManifest(validReleaseManifest(target), target)).toEqual({
        ok: true,
        code: 'manifest_valid_release',
      });
    }
    const wrongDecision = validReleaseManifest('es');
    wrongDecision.adminPublicationReceipt.ownerDecision = 'D154';
    const { receiptSha256: _oldPublicationHash, ...wrongPublicationBody } = wrongDecision.adminPublicationReceipt;
    wrongDecision.adminPublicationReceipt.receiptSha256 = arenaCanonicalSha256(wrongPublicationBody);
    const { manifestSha256: _wrongManifestHash, ...wrongManifestBody } = wrongDecision;
    wrongDecision.manifestSha256 = arenaCanonicalSha256(wrongManifestBody);
    expect(validateArenaAdminDraftManifest(wrongDecision, 'es'))
      .toMatchObject({ ok: false, code: 'release_receipt_invalid' });

    const staleReceipt = validReleaseManifest('it');
    staleReceipt.linguisticReviewReceipt.tasksSha256 = 'b'.repeat(64);
    const { manifestSha256: _oldHash, ...staleBody } = staleReceipt;
    staleReceipt.manifestSha256 = arenaCanonicalSha256(staleBody);
    expect(validateArenaAdminDraftManifest(staleReceipt, 'it'))
      .toMatchObject({ ok: false, code: 'release_receipt_invalid' });
  });
});
