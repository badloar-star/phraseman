import { createHash } from 'node:crypto';

import {
  ARENA_PUBLICATION_PAGE_LIMIT,
  arenaPublicationJobPath,
  buildArenaPublicationTask,
  parseArenaPublicationRequest,
  type ArenaPublicationSourceRoot,
} from './arena_target_publication_bridge';
import {
  arenaPublishedTaskDocumentId,
  arenaTargetPublicationFingerprint,
} from './arena_target_registry';
import {
  buildTournamentPoolTaskProofs,
  tournamentPoolTaskLeafSha256,
  verifyTournamentPoolTaskProof,
} from './tournament_pool_publication';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function sourceRoot(): ArenaPublicationSourceRoot {
  const identity = {
    studyTarget: 'es' as const,
    poolVersion: 'tpool_20260808_v11',
    manifestSha256: '1'.repeat(64),
    merkleRootSha256: '2'.repeat(64),
    factPackVersion: 'es-facts-v1',
    factPackSha256: '3'.repeat(64),
  };
  return {
    kind: 'tournament_pool_v11_target_bundle_v2',
    publicationSchema: 'tournament-pool-v11-target-v2',
    taskCount: 4_000,
    bundleSha256: '4'.repeat(64),
    taskIdsSha256: '5'.repeat(64),
    receiptLedgerSha256: '6'.repeat(64),
    approvalSha256: '7'.repeat(64),
    approvalReceiptLedgerSha256: 'd'.repeat(64),
    ...identity,
    publicationFingerprint: arenaTargetPublicationFingerprint(identity),
  };
}

describe('Arena target publication bridge contract', () => {
  it('accepts only an exact target + bundleSha256 + requestId request', () => {
    expect(parseArenaPublicationRequest({
      studyTarget: 'es', bundleSha256: 'a'.repeat(64), requestId: 'arena-publish-001',
    })).toEqual({ studyTarget: 'es', bundleSha256: 'a'.repeat(64), requestId: 'arena-publish-001' });
    expect(parseArenaPublicationRequest({ studyTarget: 'es', bundleSha256: 'a'.repeat(64) })).toBeNull();
    expect(parseArenaPublicationRequest({
      studyTarget: 'es', bundleSha256: 'a'.repeat(64), requestId: 'arena-publish-001', extra: true,
    })).toBeNull();
    expect(parseArenaPublicationRequest({
      studyTarget: 'en', bundleSha256: 'a'.repeat(64), requestId: 'arena-publish-001',
    })).toBeNull();
  });

  it('uses a request-bound resumable job path and caps every stage page at 400 tasks', () => {
    expect(ARENA_PUBLICATION_PAGE_LIMIT).toBe(400);
    expect(arenaPublicationJobPath('es', 'a'.repeat(64), 'arena-publish-001'))
      .toBe(`arena_target_publication_jobs/es_${'a'.repeat(64)}_${hash('arena-publish-001')}`);
  });

  it('scopes live Firestore row ids by publication so unchanged tasks survive a rotation', () => {
    const first = sourceRoot();
    const secondIdentity = { studyTarget: first.studyTarget, poolVersion: first.poolVersion,
      manifestSha256: 'e'.repeat(64), merkleRootSha256: 'f'.repeat(64),
      factPackVersion: first.factPackVersion, factPackSha256: first.factPackSha256 };
    const second = { ...first, ...secondIdentity,
      publicationFingerprint: arenaTargetPublicationFingerprint(secondIdentity) };
    expect(arenaPublishedTaskDocumentId(first, 'same-source-task'))
      .not.toBe(arenaPublishedTaskDocumentId(second, 'same-source-task'));
  });

  it('adds top-level and proof publication identity without changing the Merkle leaf', () => {
    const root = sourceRoot();
    const sourceTask = {
      taskId: 'tv11_es_task',
      studyTarget: 'es',
      mode: 'guess_phrase',
      isVoice: false,
      difficulty: 1,
      payload: {
        phrase: 'Выберите правильную фразу.',
        options: ['Yo soy amable.', 'Yo eres amable.', 'Yo somos amable.', 'Yo es amable.'],
        correctIndex: 0,
      },
      explanation: {
        ruleNote: 'Согласование.', example: 'Yo soy amable. — Я добрый.',
        wrongOptionReasons: ['', 'wrong_person', 'wrong_person', 'wrong_person'],
      },
      tags: ['pool:tpool_20260808_v11', 'provenance-parity:0', 'study-target:es'],
      verified: true,
      source: 'ai', poolVersion: 'tpool_20260808_v11', lifecycle: 'published',
      exposureBucket: 'tpool_20260808_v11:es:guess_phrase:001',
      semanticSignature: '8'.repeat(64), contentSha256: '9'.repeat(64),
      semanticReceiptId: 'a'.repeat(64), semanticReceiptSha256: 'b'.repeat(64),
      reviewContractVersion: 'review-v1', promptSetSha256: 'c'.repeat(64),
      provenanceKeys: ['es:1:fact'], sourceFactIds: ['es-fact-1'],
      arenaEvidence: {
        schemaVersion: 'arena-target-evidence-v1', profileId: 'spanish_agreement',
        factPack: { version: 'es-facts-v1', sha256: '3'.repeat(64) },
        familyCode: 'es:spanish_agreement:guess_phrase:v1',
        modeProof: { kind: 'choice', reasons: [
          { optionIndex: 1, reasonCode: 'wrong_person' },
          { optionIndex: 2, reasonCode: 'wrong_person' },
          { optionIndex: 3, reasonCode: 'wrong_person' },
        ] },
      },
      arenaPublication: {
        schemaVersion: 'tournament-task-merkle.v1',
        poolContentSha256: root.manifestSha256,
        manifestSha256: root.manifestSha256,
        merkleRootSha256: root.merkleRootSha256,
        leafSha256: '',
        proof: [],
      },
    };
    const leaf = tournamentPoolTaskLeafSha256(sourceTask);
    const selfIdentity = { studyTarget: root.studyTarget, poolVersion: root.poolVersion,
      manifestSha256: root.manifestSha256, merkleRootSha256: leaf,
      factPackVersion: root.factPackVersion, factPackSha256: root.factPackSha256 };
    const selfRoot = { ...root, merkleRootSha256: leaf,
      publicationFingerprint: arenaTargetPublicationFingerprint(selfIdentity) };
    const withLeaf = {
      ...sourceTask,
      arenaPublication: { ...sourceTask.arenaPublication, merkleRootSha256: leaf, leafSha256: leaf },
    };
    const published = buildArenaPublicationTask(withLeaf, selfRoot);
    expect(published.publicationFingerprint).toBe(selfRoot.publicationFingerprint);
    expect(published.arenaPublication.publicationFingerprint).toBe(selfRoot.publicationFingerprint);
    expect(tournamentPoolTaskLeafSha256(published)).toBe(leaf);
    expect(verifyTournamentPoolTaskProof(published, leaf)).toBe(true);
  });

  it('builds bounded proofs for every task even when the tree has an odd level', () => {
    const tasks = ['c', 'a', 'b'].map((suffix) => ({
      taskId: `task_${suffix}`, mode: 'guess_phrase', isVoice: false, difficulty: 1,
      payload: {}, tags: [], verified: true,
    }));
    const tree = buildTournamentPoolTaskProofs(tasks);
    for (const task of tasks) {
      const proof = tree.byTaskId.get(task.taskId);
      expect(proof).toBeDefined();
      expect(verifyTournamentPoolTaskProof({
        ...task,
        arenaPublication: {
          schemaVersion: 'tournament-task-merkle.v1',
          poolContentSha256: '0'.repeat(64),
          merkleRootSha256: tree.merkleRootSha256,
          leafSha256: proof!.leafSha256,
          proof: proof!.proof,
        },
      }, tree.merkleRootSha256)).toBe(true);
    }
  });
});
