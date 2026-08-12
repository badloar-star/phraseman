import fs from 'fs';
import path from 'path';
import {
  arenaRivalSeriesAfterGame,
  arenaRunEligibility,
} from './arena_expansion_core';
import { arenaSeasonStars } from './arena_v2_core';

const ROOT = path.resolve(__dirname, '../..');
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), 'utf8');

describe('Arena Rivalry Series backend contract', () => {
  test('implements four real callable transitions instead of a shared unavailable stub', () => {
    const expansion = read('functions/src/arena_expansion.ts');

    expect(expansion).not.toContain('async function rivalRuntimeUnavailable');
    for (const callable of [
      'arenaRivalPropose',
      'arenaRivalAccept',
      'arenaRivalNext',
      'arenaRivalLeave',
      'arenaRivalMute',
    ]) {
      expect(expansion).toMatch(new RegExp(`export const ${callable} = onCall\\(ARENA_EXPANSION_CALLABLE_OPTIONS, async`));
    }
  });

  test('derives a 30-second offer from a sealed settled human Quick/Ranked source', () => {
    const expansion = read('functions/src/arena_expansion.ts');

    expect(expansion).toMatch(/30_000|30 \* 1_000/);
    expect(expansion).toContain("ARENA_V2_COLLECTIONS.matchPrivate");
    expect(expansion).toMatch(/sourceMatchId|source_match_id/);
    expect(expansion).toMatch(/opponentKind[^\n]{0,120}human|human[^\n]{0,120}opponentKind/);
    expect(expansion).toMatch(/quick[^\n]{0,160}ranked|ranked[^\n]{0,160}quick/);
    expect(expansion).toMatch(/participantStableUids/);
    expect(expansion).toMatch(/participantAuthUids/);
    expect(expansion).toMatch(/expiresAtMs/);
    expect(expansion).toContain('rivalOffer: { seriesId, fromSeat: proposerSeat');
  });

  test('uses explicit series matches for games two and three', () => {
    const base = read('functions/src/arena_v2.ts');
    const core = read('functions/src/arena_v2_core.ts');
    const expansion = read('functions/src/arena_expansion.ts');
    const writeStart = expansion.indexOf('function createRivalMatchWrites');
    const writeEnd = expansion.indexOf('function sourceSeriesScore', writeStart);
    const writes = expansion.slice(writeStart, writeEnd);

    expect(core).toMatch(/export type ArenaV2Mode = [^;]*'series'/);
    expect(writes).toMatch(/mode: ['"]series['"]/);
    expect(base).toContain("runKind?: 'match' | 'rival'");
    expect(base).toContain('seriesId?: string');
    expect(base).toMatch(/seriesId/);
  });

  test('hard-disables every reward, Lab and progress projection for series games', () => {
    const expansion = read('functions/src/arena_expansion.ts');
    const writeStart = expansion.indexOf('function createRivalMatchWrites');
    const writeEnd = expansion.indexOf('function sourceSeriesScore', writeStart);
    const writes = expansion.slice(writeStart, writeEnd);

    expect(writes).toMatch(/expansionFlags:\s*\{\s*wallet:\s*false,\s*lab:\s*false,\s*mastery:\s*false,\s*partner:\s*false/);
    expect(arenaRunEligibility('rival', 'ranked')).toEqual({
      rating: false,
      baseStars: false,
      todayStars: false,
      spin: false,
      mastery: false,
      partnerActivity: false,
      profileOutcome: false,
    });
    expect(arenaSeasonStars({
      mode: 'series', rawStars: 100, eligibleMatchIndex: 0, dailyStarsBefore: 0,
    })).toBe(0);
  });

  test('reconciles a settled series game in the same base-game transaction', () => {
    const base = read('functions/src/arena_v2.ts');
    const settleStart = base.indexOf('async function settleMatch');
    const settleEnd = base.indexOf('function clearActiveProfiles', settleStart);
    const settlement = base.slice(settleStart, settleEnd);

    expect(settlement).toContain('seriesId');
    expect(settlement).toContain('arenaRivalSeriesAfterGame');
    expect(settlement).toMatch(/processedMatchIds|processedGameIds/);
  });

  test('requires mutual readiness before game three and cannot leave a live match orphaned', () => {
    const expansion = read('functions/src/arena_expansion.ts');
    const nextStart = expansion.indexOf('export const arenaRivalNext');
    const leaveStart = expansion.indexOf('export const arenaRivalLeave', nextStart);
    const next = expansion.slice(nextStart, leaveStart);
    const leave = expansion.slice(leaveStart);

    expect(next).toMatch(/readyBy|readySeats|nextReady/);
    expect(next).toMatch(/length\s*[>=]{1,2}\s*2|every\(/);
    expect(leave).toMatch(/activeMatchId/);
    expect(leave).toMatch(/arena_rival_game_active|arena_rival_leave_not_allowed|failed-precondition/);
  });

  test('enforces frozen active, pair-cooldown and per-target daily offer limits', () => {
    const expansion = read('functions/src/arena_expansion.ts');
    const proposeStart = expansion.indexOf('export const arenaRivalPropose');
    const acceptStart = expansion.indexOf('export const arenaRivalAccept', proposeStart);
    const propose = expansion.slice(proposeStart, acceptStart);

    expect(propose).toMatch(/15\s*\*\s*60_000|15\s*\*\s*60\s*\*\s*1_000/);
    expect(propose).toMatch(/participantStableUids/);
    expect(propose).toMatch(/active[^\n]{0,180}(?:3|>=\s*3)|(?:3|>=\s*3)[^\n]{0,180}active/);
    expect(propose).toMatch(/target[^\n]{0,180}(?:5|>=\s*5)|(?:5|>=\s*5)[^\n]{0,180}target/i);
  });

  test('binds proposal idempotency and excludes all earlier series task ids', () => {
    const expansion = read('functions/src/arena_expansion.ts');
    const proposeStart = expansion.indexOf('export const arenaRivalPropose');
    const acceptStart = expansion.indexOf('export const arenaRivalAccept', proposeStart);
    const propose = expansion.slice(proposeStart, acceptStart);
    const acceptNext = expansion.slice(acceptStart, expansion.indexOf('export const arenaRivalLeave', acceptStart));

    expect(propose).toMatch(/requestId[^\n]{0,180}(?:conflict|already-exists)|(?:conflict|already-exists)[^\n]{0,180}requestId/);
    expect(propose).toMatch(/participantStableUids[^\n]{0,180}length[^\n]{0,80}2|length[^\n]{0,80}2[^\n]{0,180}participantStableUids/);
    expect(acceptNext).toMatch(/usedTaskIds|excludedTaskIds|previousTaskIds|priorTaskIds/);
  });

  test('a simultaneous invitee proposal discovers the live offer without weakening proposer idempotency', () => {
    const expansion = read('functions/src/arena_expansion.ts');
    const proposeStart = expansion.indexOf('export const arenaRivalPropose');
    const acceptStart = expansion.indexOf('export const arenaRivalAccept', proposeStart);
    const propose = expansion.slice(proposeStart, acceptStart);

    expect(propose).toMatch(/status === ['"]pending['"]/);
    expect(propose).toMatch(/proposerStableUid !== who\.stableUid/);
    expect(propose).toMatch(/offerExpiresAtMs[^\n]{0,100}> now/);
    expect(propose).toMatch(/requestId !== requestId[^\n]{0,120}sourceMatchId !== sourceMatchId/);
  });

  test('reconciles all best-of-three terminal score shapes deterministically', () => {
    expect(arenaRivalSeriesAfterGame({ winsA: 1, winsB: 0, draws: 0, winnerSeat: 'a' }))
      .toEqual({ winsA: 2, winsB: 0, draws: 0, gamesPlayed: 2, complete: true });
    expect(arenaRivalSeriesAfterGame({ winsA: 1, winsB: 1, draws: 0, winnerSeat: 'a' }))
      .toEqual({ winsA: 2, winsB: 1, draws: 0, gamesPlayed: 3, complete: true });
    expect(arenaRivalSeriesAfterGame({ winsA: 1, winsB: 1, draws: 0 }))
      .toEqual({ winsA: 1, winsB: 1, draws: 1, gamesPlayed: 3, complete: true });
  });

  test('keeps the shared series root sealed and account deletion identity-complete', () => {
    const rules = read('firestore.rules');
    const deletion = read('functions/src/account_delete.ts');

    expect(rules).toMatch(/match \/arena_v2_series\/\{seriesId\} \{[\s\S]*?allow read, write: if false;/);
    expect(deletion).toContain("collection: 'arena_v2_series', field: 'participantStableUids'");
    expect(deletion).toContain("collection: 'arena_v2_series', field: 'participantAuthUids'");
  });

  test('declares every composite index used by Rival queries', () => {
    const indexes = JSON.parse(read('firestore.indexes.json')) as {
      indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string; order?: string; arrayConfig?: string }> }>;
    };
    const series = indexes.indexes.filter((entry) => entry.collectionGroup === 'arena_v2_series');

    expect(series).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fields: expect.arrayContaining([
          expect.objectContaining({ fieldPath: 'pairId' }),
          expect.objectContaining({ fieldPath: 'dayKey' }),
        ]),
      }),
      expect.objectContaining({
        fields: expect.arrayContaining([
          expect.objectContaining({ fieldPath: 'participantStableUids', arrayConfig: 'CONTAINS' }),
          expect.objectContaining({ fieldPath: 'status' }),
        ]),
      }),
    ]));
  });

  test('exposes viewer-relative summaries without identity or bearer-token fields', () => {
    const clientContract = read('modules/arena/expansion_contract.ts');
    const start = clientContract.indexOf('export type ArenaRivalResponse');
    const end = clientContract.indexOf('export type ArenaCosmeticSlot', start);
    const response = clientContract.slice(start, end);

    expect(response).toContain('seriesId: string');
    expect(response).toContain("maxGames: 3");
    expect(response).toContain("viewerSeat?: 'a' | 'b'");
    expect(response).not.toMatch(/stableUid|authUid|token|answer|private/i);
  });

  test('lets an empty-state user create their first rivalry and never offers leave over a live game', () => {
    const route = read('app/arena_rivalries.tsx');

    expect(route).toMatch(/state\s*===\s*['"]empty['"]|\[['"]ready['"],\s*['"]empty['"]\]|\[['"]loading['"],\s*['"]unavailable['"],\s*['"]error['"]\]\.includes\(state\)/);
    expect(route).toMatch(/item\.leaveAllowed/);
    expect(route).toContain('arenaRivalMute');
  });
});
