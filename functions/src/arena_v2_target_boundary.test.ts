import { readFileSync } from 'node:fs';
import path from 'node:path';

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

describe('Arena V2 target source contract', () => {
  const source = readFileSync(path.join(__dirname, 'arena_v2.ts'), 'utf8').replace(/\r\n/g, '\n');

  it('does not return another target queue or active match from Home', () => {
    const home = source.slice(
      source.indexOf('export const arenaV2Home ='),
      source.indexOf('export const arenaV2FindMatch ='),
    );
    expect(home).toContain('const activeQueueVisible = arenaQueuePublicationCompatible(');
    expect(home).toContain('const activeMatchVisible = activeMatch?.data()?.studyTarget === publication.studyTarget');
    expect(home).toContain("activeMatch?.data()?.publicationFingerprint\n      === activePrivate?.data()?.publicationFingerprint");
    expect(home).toContain('...(activeQueueVisible ? { activeQueue: queueSnap.data() } : {})');
    expect(home).toContain('...(activeMatchVisible ? { activeMatch: activeMatch?.data() } : {})');
  });

  it('loads a target publication and never uses the compile-time English publication', () => {
    const loader = source.slice(
      source.indexOf('async function loadArenaTaskPool('),
      source.indexOf('function selectedTaskEnvelope('),
    );
    expect(loader).toContain(".where('studyTarget', '==', publication.studyTarget)");
    expect(loader).toContain(".where('poolVersion', '==', publication.poolVersion)");
    expect(loader).toContain('tournamentV11TargetTaskId(');
    expect(loader).toContain('.orderBy(admin.firestore.FieldPath.documentId())');
    expect(loader).toContain('validateArenaTaskForNewRoom(raw, {');
    expect(loader).toContain('verifyTournamentPoolTaskProof(raw, publication.merkleRootSha256)');
    expect(loader).not.toContain('NEW_TOURNAMENT_POOL_VERSION');
    expect(loader).not.toContain('tp2_20260801_v10_');
  });

  it('tags queue and match documents and rejects cross-target candidates', () => {
    const find = source.slice(
      source.indexOf('export const arenaV2FindMatch ='),
      source.indexOf('export const arenaV2OnQueueWrite ='),
    );
    expect(find).toContain('const publication = arenaRequiredTargetPublication(request.data?.studyTarget);');
    expect(find).toContain('studyTarget: publication.studyTarget');
    expect(find).toContain('publicationFingerprint: publication.publicationFingerprint');
    expect(find).toContain('arenaQueuePublicationCompatible(data, publication)');
    expect(find).toContain(".where('studyTarget', '==', publication.studyTarget)");
    expect(find).toContain(".where('publicationFingerprint', '==', publication.publicationFingerprint)");

    const matchBuilder = source.slice(source.indexOf('function makeMatch('), source.indexOf('function assertParticipant('));
    expect(matchBuilder).toContain('studyTarget: input.publication.studyTarget');
    expect(matchBuilder).toContain('publicationFingerprint: input.publication.publicationFingerprint');
  });

  it('requires target equality for plan and finish while preserving an explicit legacy path', () => {
    const plan = source.slice(
      source.indexOf('export const arenaV2MatchPlan ='),
      source.indexOf('function arenaDuelStoreOutcomes('),
    );
    expect(plan).toContain('arenaRequiredTargetPublication(request.data?.studyTarget);');
    expect(plan).toContain('arenaAssertTaggedMatchTarget(');
    expect(plan).toContain('arenaAssertSealedMatchTasks(privateDoc, targetIdentity);');
    expect(plan).not.toContain('arena_match_publication_stale');
    expect(plan).toContain('studyTarget: targetIdentity.studyTarget');
    expect(plan).toContain('arenaTargetBoundPlanHash(');

    const finish = source.slice(
      source.indexOf('export const arenaV2MatchFinish ='),
      source.indexOf('export const arenaV2MatchSettle ='),
    );
    expect(finish).toContain('arenaAssertTaggedMatchTarget(');
    expect(finish).toContain('arenaLegacyFinishRequested(request.data)');
    expect(finish).toContain('arenaTargetBoundPlanHash(');
  });

  it('binds every friend invite transition and dev friend match to one publication', () => {
    const create = source.slice(
      source.indexOf('export const arenaV2InviteCreate ='),
      source.indexOf('const arenaV2InviteAcceptLegacy ='),
    );
    expect(create).toContain('const publication = arenaRequiredTargetPublication(request.data?.studyTarget);');
    expect(create).toContain('studyTarget: publication.studyTarget');
    expect(create).toContain('publicationFingerprint: publication.publicationFingerprint');

    for (const [startName, endName] of [
      ['export const arenaV2InviteAccept =', 'export const arenaV2InviteReady ='],
      ['export const arenaV2InviteReady =', 'export const arenaV2InviteDecline ='],
      ['export const arenaV2InviteStatus =', 'const ARENA_FRIENDS_BOARD_LIMIT ='],
    ] as const) {
      const block = source.slice(source.indexOf(startName), source.indexOf(endName));
      expect(block).toContain('arenaAssertInviteTarget(');
    }

    const ready = source.slice(
      source.indexOf('export const arenaV2InviteReady ='),
      source.indexOf('export const arenaV2InviteDecline ='),
    );
    expect(ready).toContain('loadArenaTaskPool(tx, contentDivision, matchId, publication,');
    expect(ready).toContain('publication,');

    const dev = source.slice(
      source.indexOf('export const arenaV2DevFriendBotCreate ='),
      source.indexOf('export const arenaV2MatchAccept ='),
    );
    expect(dev).toContain('const publication = arenaRequiredTargetPublication(request.data?.studyTarget);');
    expect(dev).toContain('loadArenaTaskPool(tx, profile.rank, matchId, publication,');
  });

  it('checks target equality before tagged match mutations', () => {
    for (const [startName, endName] of [
      ['export const arenaV2MatchAccept =', 'export const arenaV2MatchDecline ='],
      ['export const arenaV2MatchDecline =', 'function recordRankedQueueDodge('],
      ['export const arenaV2SubmitAnswer =', 'export const arenaV2SubmitSpeedAttempt ='],
      ['export const arenaV2SubmitSpeedAttempt =', 'export const arenaV2SyncMatch ='],
      ['export const arenaV2SyncMatch =', 'export const arenaV2Forfeit ='],
      ['export const arenaV2Forfeit =', 'function inviteTokenFor('],
      ['export const arenaV2MatchSettle =', 'export const arenaV2ReleaseStaleMatch ='],
      ['export const arenaV2ReleaseStaleMatch =', 'export const arenaV2Forfeit ='],
    ] as const) {
      const block = source.slice(source.indexOf(startName), source.indexOf(endName));
      expect(block).toContain('arenaAssertMutationTarget(');
    }
  });
});
