import { createHash } from 'node:crypto';
import type { TournamentTask } from './tournament_core';

// Immutable identifiers for the currently published Arena pool. They remain
// stable so existing Firestore tasks and Remote Config continue to verify.
export const NEW_TOURNAMENT_POOL_VERSION = 'tpool_20260801_v10' as const;
export const NEW_TOURNAMENT_POOL_CONTENT_SHA256 = '8ec778fef78045b148e077be7efdf2dcdc081a275005e4bcf713a1a3754a00e5' as const;
export const NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256 = 'ac0cf279e14c052854f90245fb5dae8da08a0a59bf806b1e63823c626024f999' as const;

type ArenaPublication = {
  readonly schemaVersion: 'tournament-task-merkle.v1';
  readonly poolContentSha256: string;
  readonly merkleRootSha256: string;
  readonly leafSha256: string;
  readonly proof: readonly Readonly<{ side: 'left' | 'right'; sha256: string }>[];
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function tournamentPoolTaskLeafSha256(task: TournamentTask & { arenaPublication?: unknown }): string {
  const { arenaPublication: _publication, ...content } = task;
  return sha256(`leaf:${canonicalJson(content)}`);
}

export function verifyTournamentPoolTaskProof(
  task: TournamentTask & { arenaPublication?: ArenaPublication },
  expectedRootSha256: string,
): boolean {
  const publication = task.arenaPublication;
  if (!publication || publication.schemaVersion !== 'tournament-task-merkle.v1'
    || publication.merkleRootSha256 !== expectedRootSha256
    || publication.leafSha256 !== tournamentPoolTaskLeafSha256(task)
    || !Array.isArray(publication.proof) || publication.proof.length > 16) return false;
  let current = publication.leafSha256;
  for (const sibling of publication.proof) {
    if (!sibling || !/^[a-f0-9]{64}$/.test(sibling.sha256)
      || (sibling.side !== 'left' && sibling.side !== 'right')) return false;
    current = sibling.side === 'left'
      ? sha256(`node:${sibling.sha256}:${current}`)
      : sha256(`node:${current}:${sibling.sha256}`);
  }
  return current === expectedRootSha256;
}
