import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  arenaPublicationJobPath,
  parseArenaPublicationRequest,
} from './arena_target_publication_bridge';

describe('Arena publication admin boundary', () => {
  it('never accepts browser-supplied tasks, receipts, pointers or readiness', () => {
    const identity = { studyTarget: 'de', bundleSha256: 'a'.repeat(64), requestId: 'publish-de-001' };
    expect(parseArenaPublicationRequest(identity)).toEqual(identity);
    for (const injected of [
      { tasks: [] }, { receipts: [] }, { publicationFingerprint: 'b'.repeat(64) },
      { ready: true }, { previousTargetPublication: null },
    ]) expect(parseArenaPublicationRequest({ ...identity, ...injected })).toBeNull();
  });

  it('exports only Arena callables and leaves the retired Tournament callable surface absent', () => {
    const index = readFileSync(join(__dirname, 'index.ts'), 'utf8');
    expect(index).toContain('adminArenaPublicationStage');
    expect(index).toContain('adminArenaPublicationActivate');
    expect(index).toContain('adminArenaPublicationRollback');
    expect(index).not.toMatch(/export\s*\{[^}]*adminTournamentTasks/u);
  });

  it('keeps source bundles, bridge checkpoints and receipts outside browser-admin access', () => {
    const rules = readFileSync(join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
    for (const root of [
      'tournament_pool_v11_target_bundles',
      'arena_target_publication_approval_receipts',
      'arena_target_publication_jobs',
      'arena_target_publication_receipts',
    ]) {
      expect(rules).toContain(`match /${root}/{document=**}`);
      expect(rules).toMatch(new RegExp(`isBrowserAdminExcludedTournamentRoot[\\s\\S]*${root}`, 'u'));
    }
  });

  it('binds runtime pool queries and the exact Firestore index to the publication fingerprint', () => {
    const arenaV2 = readFileSync(join(__dirname, 'arena_v2.ts'), 'utf8');
    const expansion = readFileSync(join(__dirname, 'arena_expansion.ts'), 'utf8');
    expect(arenaV2).toContain(".where('publicationFingerprint', '==', publication.publicationFingerprint)");
    expect(expansion).toContain(".where('publicationFingerprint', '==', publication.publicationFingerprint)");
    const indexes = JSON.parse(readFileSync(join(__dirname, '..', '..', 'firestore.indexes.json'), 'utf8'));
    expect(indexes.indexes).toContainEqual(expect.objectContaining({
      collectionGroup: 'tournamentTasks',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'poolVersion', order: 'ASCENDING' },
        { fieldPath: 'studyTarget', order: 'ASCENDING' },
        { fieldPath: 'publicationFingerprint', order: 'ASCENDING' },
        { fieldPath: 'mode', order: 'ASCENDING' },
        { fieldPath: 'difficulty', order: 'ASCENDING' },
        { fieldPath: '__name__', order: 'ASCENDING' },
      ],
    }));
  });

  it('binds a resumable job to all three caller identities', () => {
    const left = arenaPublicationJobPath('fr', '1'.repeat(64), 'request-one');
    expect(left).not.toBe(arenaPublicationJobPath('fr', '1'.repeat(64), 'request-two'));
    expect(left).not.toBe(arenaPublicationJobPath('es', '1'.repeat(64), 'request-one'));
    expect(left).not.toBe(arenaPublicationJobPath('fr', '2'.repeat(64), 'request-one'));
  });
});
