import { canonicalJsonV1 } from '../../../modules/learning-v2/policies/decision_registry';
import { buildV2CanonicalSeasonPlan, parseV2CanonicalPlanRequest } from './v2_canonical_generation_plan';
import {
  buildBlockedV2StageAcceptance,
  parseV2ImmutableDependencySnapshot,
  v2DependencyFingerprint,
} from './v2_generation_workspace_contract';

const hash = (char: string) => char.repeat(64);

function plan() {
  return buildV2CanonicalSeasonPlan(parseV2CanonicalPlanRequest(canonicalJsonV1({
    schemaVersion: 'v2-canonical-plan-request.v1',
    workspaceId: 'workspace-1', jobId: 'job-1', authoringRevision: 2,
    seasonId: 'season-1', scope: 'vertical_slice', episodeIds: ['episode-1'],
    recipes: [{ episodeId: 'episode-1', speakingMission: true }],
    languageProfileRef: { profileId: 'english-general', targetLanguage: 'en', version: 1, contentHash: hash('a') },
    decisionRegistryRef: { decisionId: 'HYP-V2-007', version: 1, contentHash: hash('7') },
    templateBindings: [{
      episodeId: 'episode-1',
      templateRefs: [{ templateId: 'phrase-builder', version: 2, contentHash: hash('b') }],
    }],
  })));
}

const stageDependency = (stageId: string) => ({
  dependencyType: 'stage', stageId, artifactHash: hash('c'), reviewFingerprint: hash('d'),
  objectPath: 'objects/stage.json', objectGeneration: '17', lifecycleFingerprint: hash('e'),
});

const profileDependency = {
  dependencyType: 'language_profile', profileId: 'english-general', version: 1, contentHash: hash('a'),
  objectPath: 'profiles/english-general.json', objectGeneration: '4', lifecycleFingerprint: hash('f'),
};
const templateDependency = {
  dependencyType: 'published_template', templateId: 'phrase-builder', version: 2, contentHash: hash('b'),
  objectPath: 'templates/phrase-builder.json', objectGeneration: '5', lifecycleFingerprint: hash('0'),
};
const blockedRaw = (value: unknown) => canonicalJsonV1(value);

describe('V2 canonical workspace pure contract', () => {
  it('parses exact dependency bytes and uses a domain-separated deterministic fingerprint', () => {
    const dependencies = [profileDependency, templateDependency];
    const parsed = parseV2ImmutableDependencySnapshot(canonicalJsonV1(dependencies));
    const reversed = parseV2ImmutableDependencySnapshot(canonicalJsonV1([...dependencies].reverse()));
    expect(parsed).toEqual(dependencies);
    expect(v2DependencyFingerprint(parsed)).toMatch(/^[0-9a-f]{64}$/);
    expect(v2DependencyFingerprint(reversed)).toBe(v2DependencyFingerprint(parsed));
    expect(() => v2DependencyFingerprint([...parsed])).toThrow('v2_dependency_snapshot_untrusted');
  });

  it('rejects noncanonical, duplicate, malformed, deep and oversized dependency bytes before authority', () => {
    expect(() => parseV2ImmutableDependencySnapshot(JSON.stringify([profileDependency], null, 2)))
      .toThrow('v2_dependency_snapshot_noncanonical');
    expect(() => parseV2ImmutableDependencySnapshot(canonicalJsonV1([profileDependency, profileDependency])))
      .toThrow('v2_dependency_duplicate');
    expect(() => parseV2ImmutableDependencySnapshot(JSON.stringify([{ ...profileDependency, extra: { deep: { value: 1 } } }])))
      .toThrow('v2_dependency_fields_invalid');
    expect(() => parseV2ImmutableDependencySnapshot(JSON.stringify([[[[[[['x']]]]]]])))
      .toThrow('v2_dependency_invalid');
    expect(() => parseV2ImmutableDependencySnapshot('\ud800')).toThrow('v2_dependency_snapshot_invalid');
    expect(() => parseV2ImmutableDependencySnapshot(' '.repeat(65_537))).toThrow('v2_dependency_snapshot_too_large');
  });

  it('derives a blocked receipt from an exact branded plan coordinate and exact dependency closure', () => {
    const current = plan();
    const season = current.stages.find((stage) => stage.kind === 'v2_season_outline')!;
    const acceptance = buildBlockedV2StageAcceptance(current, blockedRaw({
      stageId: season.stageId,
      artifactRef: { objectPath: 'artifacts/season.json', contentHash: hash('1'), objectGeneration: '8', byteSize: 2048 },
      dependencySnapshotRaw: canonicalJsonV1([profileDependency, templateDependency]),
      validatorVersion: 'v2-season-preflight.v1',
      blockingIssueCodes: ['stage_validators_not_installed'],
      evidenceReceiptRefs: [],
    }));
    expect(acceptance).toMatchObject({
      stageId: season.stageId,
      stageKind: 'v2_season_outline',
      outcome: 'blocked',
      executionAuthority: 'none',
      publicationPolicy: 'draft_only_no_consumer',
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
      evidenceAuthority: 'structural_snapshot_only',
      stageDependencyEvidenceAuthority: 'unverified_structural_only',
      planFingerprint: current.planFingerprint,
    });
    expect(acceptance.acceptanceFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.isFrozen(acceptance)).toBe(true);
  });

  it('normalizes dependency, issue and evidence order before acceptance fingerprinting', () => {
    const current = plan();
    const season = current.stages.find((stage) => stage.kind === 'v2_season_outline')!;
    const body = {
      stageId: season.stageId,
      artifactRef: { objectPath: 'artifacts/order.json', contentHash: hash('1'), objectGeneration: '1', byteSize: 10 },
      dependencySnapshotRaw: canonicalJsonV1([profileDependency, templateDependency]),
      validatorVersion: 'preflight.v1',
      blockingIssueCodes: ['validators_missing', 'human_review_missing'],
      evidenceReceiptRefs: [
        { objectPath: 'receipts/a.json', contentHash: hash('2'), objectGeneration: '1', byteSize: 10 },
        { objectPath: 'receipts/b.json', contentHash: hash('3'), objectGeneration: '1', byteSize: 10 },
      ],
    };
    const first = buildBlockedV2StageAcceptance(current, blockedRaw(body));
    const second = buildBlockedV2StageAcceptance(current, blockedRaw({
      ...body,
      dependencySnapshotRaw: canonicalJsonV1([templateDependency, profileDependency]),
      blockingIssueCodes: [...body.blockingIssueCodes].reverse(),
      evidenceReceiptRefs: [...body.evidenceReceiptRefs].reverse(),
    }));
    expect(second.acceptanceFingerprint).toBe(first.acceptanceFingerprint);
    expect(second).toEqual(first);
  });

  it('rejects forged plans, foreign coordinates, missing, extra and stale external dependencies', () => {
    const current = plan();
    const outline = current.stages.find((stage) => stage.kind === 'v2_episode_outline')!;
    const season = current.stages.find((stage) => stage.kind === 'v2_season_outline')!;
    const base = {
      stageId: outline.stageId,
      artifactRef: { objectPath: 'artifacts/outline.json', contentHash: hash('1'), objectGeneration: '8', byteSize: 2048 },
      dependencySnapshotRaw: canonicalJsonV1([stageDependency(season.stageId)]),
      validatorVersion: 'v2-outline-preflight.v1',
      blockingIssueCodes: ['stage_validators_not_installed'],
      evidenceReceiptRefs: [],
    };
    expect(() => buildBlockedV2StageAcceptance({ ...current } as never, blockedRaw(base))).toThrow('v2_stage_acceptance_plan_invalid');
    expect(() => buildBlockedV2StageAcceptance(current, blockedRaw({ ...base, stageId: 'foreign-stage' }))).toThrow('v2_stage_acceptance_stage_invalid');
    expect(() => buildBlockedV2StageAcceptance(current, blockedRaw({ ...base, dependencySnapshotRaw: canonicalJsonV1([profileDependency]) })))
      .toThrow('v2_stage_acceptance_dependency_closure_invalid');
    expect(() => buildBlockedV2StageAcceptance(current, blockedRaw({
      ...base,
      dependencySnapshotRaw: canonicalJsonV1([stageDependency(season.stageId), profileDependency]),
    }))).toThrow('v2_stage_acceptance_dependency_closure_invalid');
    const staleProfile = { ...profileDependency, contentHash: hash('9') };
    expect(() => buildBlockedV2StageAcceptance(current, blockedRaw({
      ...base,
      stageId: season.stageId,
      dependencySnapshotRaw: canonicalJsonV1([staleProfile, templateDependency]),
    }))).toThrow('v2_stage_acceptance_dependency_closure_invalid');
  });

  it('does not execute accessors and exposes no public path to self-assert human-review eligibility', () => {
    const current = plan();
    const season = current.stages.find((stage) => stage.kind === 'v2_season_outline')!;
    let getterCalled = false;
    const hostile = Object.defineProperty({}, 'stageId', {
      enumerable: true,
      get() { getterCalled = true; return season.stageId; },
    });
    expect(() => buildBlockedV2StageAcceptance(current, hostile as never)).toThrow('v2_stage_acceptance_input_invalid');
    expect(getterCalled).toBe(false);
    expect(buildBlockedV2StageAcceptance.toString()).not.toContain('eligible_for_human_review');
    let proxyTraps = 0;
    const proxy = new Proxy([], { get() { proxyTraps += 1; return undefined; }, ownKeys() { proxyTraps += 1; return []; } });
    expect(() => v2DependencyFingerprint(proxy as never)).toThrow('v2_dependency_snapshot_untrusted');
    expect(proxyTraps).toBe(0);
    const tooManyReceipts = Array.from({ length: 65 }, (_, index) => ({
      objectPath: `receipts/${index}.json`, contentHash: hash('1'), objectGeneration: '1', byteSize: 10,
    }));
    expect(() => buildBlockedV2StageAcceptance(current, blockedRaw({
      stageId: season.stageId,
      artifactRef: { objectPath: 'artifacts/season.json', contentHash: hash('2'), objectGeneration: '1', byteSize: 10 },
      dependencySnapshotRaw: canonicalJsonV1([profileDependency, templateDependency]),
      validatorVersion: 'preflight.v1',
      blockingIssueCodes: ['validators_missing'],
      evidenceReceiptRefs: tooManyReceipts,
    }))).toThrow('v2_stage_acceptance_receipts_invalid');
    expect(() => buildBlockedV2StageAcceptance(current, blockedRaw({
      stageId: season.stageId,
      artifactRef: { objectPath: 'artifacts/season.json', contentHash: hash('2'), objectGeneration: '1', byteSize: 10 },
      dependencySnapshotRaw: canonicalJsonV1([profileDependency, templateDependency]),
      validatorVersion: 'preflight.v1',
      blockingIssueCodes: ['validators_missing'],
      evidenceReceiptRefs: [
        { objectPath: 'receipts/shared.json', contentHash: hash('3'), objectGeneration: '7', byteSize: 10 },
        { objectPath: 'receipts/shared.json', contentHash: hash('4'), objectGeneration: '7', byteSize: 10 },
      ],
    }))).toThrow('v2_stage_acceptance_receipts_duplicate');
  });

  it('accepts the longest compiler-valid stage identity consistently', () => {
    const token = `a${'x'.repeat(127)}`;
    const request = {
      schemaVersion: 'v2-canonical-plan-request.v1' as const,
      workspaceId: token,
      jobId: token,
      authoringRevision: 1,
      seasonId: token,
      scope: 'vertical_slice' as const,
      episodeIds: [token],
      languageProfileRef: { profileId: 'profile', targetLanguage: 'en', version: 1, contentHash: hash('a') },
      decisionRegistryRef: { decisionId: 'HYP-V2-007', version: 1, contentHash: hash('7') },
      templateBindings: [{ episodeId: token, templateRefs: [{ templateId: 'template', version: 1, contentHash: hash('b') }] }],
    };
    const current = buildV2CanonicalSeasonPlan(parseV2CanonicalPlanRequest(canonicalJsonV1(request)));
    const season = current.stages.find((stage) => stage.kind === 'v2_season_outline')!;
    expect(season.stageId.length).toBeLessThanOrEqual(500);
    const profile = { ...profileDependency, profileId: 'profile' };
    const template = { ...templateDependency, templateId: 'template', version: 1 };
    expect(() => buildBlockedV2StageAcceptance(current, blockedRaw({
      stageId: season.stageId,
      artifactRef: { objectPath: 'artifacts/season.json', contentHash: hash('1'), objectGeneration: '1', byteSize: 10 },
      dependencySnapshotRaw: canonicalJsonV1([profile, template]),
      validatorVersion: 'preflight.v1',
      blockingIssueCodes: ['validators_missing'],
      evidenceReceiptRefs: [],
    }))).not.toThrow();
  });

  it('materializes the byte-safe maximum 28-template activity closure', () => {
    const episodeIds = Array.from({ length: 32 }, (_, index) => `episode-${index + 1}`);
    const refs = Array.from({ length: 28 }, (_, index) => ({
      templateId: `template-${index + 1}`,
      version: 1,
      contentHash: index.toString(16).padStart(64, '0'),
    }));
    const request = {
      schemaVersion: 'v2-canonical-plan-request.v1' as const,
      workspaceId: 'workspace-capacity', jobId: 'job-capacity', authoringRevision: 1,
      seasonId: 'season-capacity', scope: 'full_season' as const, episodeIds,
      recipes: [{ episodeId: 'episode-1', dialogue: true, speakingMission: true }],
      languageProfileRef: { profileId: 'profile-capacity', targetLanguage: 'en', version: 1, contentHash: hash('a') },
      decisionRegistryRef: { decisionId: 'HYP-V2-007', version: 1, contentHash: hash('7') },
      templateBindings: episodeIds.map((episodeId, index) => ({
        episodeId,
        templateRefs: index === 0 ? refs : [refs[0]],
      })),
    };
    const current = buildV2CanonicalSeasonPlan(parseV2CanonicalPlanRequest(canonicalJsonV1(request)));
    const instances = current.stages.find((stage) => stage.kind === 'v2_activity_instances' && stage.episodeId === 'episode-1')!;
    const stageRows = instances.dependsOn.map((stageId, index) => ({
      dependencyType: 'stage', stageId, artifactHash: hash('c'), reviewFingerprint: hash('d'),
      objectPath: `${String(index).padStart(3, '0')}${'x'.repeat(997)}`, objectGeneration: 'g'.repeat(160),
      lifecycleFingerprint: hash('e'),
    }));
    const templateRows = instances.externalRequirements.map((requirement, index) => {
      if (requirement.dependencyType !== 'published_template') throw new Error('test_template_requirement_expected');
      return {
          dependencyType: 'published_template', templateId: requirement.templateId, version: requirement.version,
          contentHash: requirement.contentHash, objectPath: `${String(index).padStart(3, '0')}${'x'.repeat(997)}`, objectGeneration: 'g'.repeat(160),
          lifecycleFingerprint: hash('f'),
      };
    });
    const dependencyRows = [...stageRows, ...templateRows];
    expect(dependencyRows).toHaveLength(32);
    expect(Buffer.byteLength(canonicalJsonV1(dependencyRows), 'utf8')).toBeLessThanOrEqual(64 * 1024);
    expect(() => buildBlockedV2StageAcceptance(current, blockedRaw({
      stageId: instances.stageId,
      artifactRef: { objectPath: 'artifacts/capacity.json', contentHash: hash('1'), objectGeneration: '1', byteSize: 10 },
      dependencySnapshotRaw: canonicalJsonV1(dependencyRows),
      validatorVersion: 'preflight.v1',
      blockingIssueCodes: ['validators_missing'],
      evidenceReceiptRefs: [],
    }))).not.toThrow();
  });
});
