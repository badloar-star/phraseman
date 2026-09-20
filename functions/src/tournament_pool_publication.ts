import { createHash } from 'node:crypto';
import type { TournamentTask } from './tournament_core';

// Immutable identifiers for the currently published Arena pool. They remain
// stable so existing Firestore tasks and Remote Config continue to verify.
export const NEW_TOURNAMENT_POOL_VERSION = 'tpool_20260801_v10' as const;
export const NEW_TOURNAMENT_POOL_CONTENT_SHA256 = '8ec778fef78045b148e077be7efdf2dcdc081a275005e4bcf713a1a3754a00e5' as const;
export const NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256 = 'ac0cf279e14c052854f90245fb5dae8da08a0a59bf806b1e63823c626024f999' as const;

export type ArenaPublication = {
  readonly schemaVersion: 'tournament-task-merkle.v1';
  readonly poolContentSha256: string;
  readonly merkleRootSha256: string;
  readonly leafSha256: string;
  readonly proof: readonly Readonly<{ side: 'left' | 'right'; sha256: string }>[];
  readonly manifestSha256?: string;
  readonly publicationFingerprint?: string;
};

export type ArenaPublicationProof = Readonly<{
  leafSha256: string;
  proof: readonly Readonly<{ side: 'left' | 'right'; sha256: string }>[];
}>;

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
  // Publication identity is derived from the Merkle root. Keeping both the
  // proof envelope and the derived fingerprint out of the leaf prevents a
  // self-referential hash cycle while all authored/runtime task data remains
  // sealed by the tree.
  const {
    arenaPublication: _publication,
    publicationFingerprint: _publicationFingerprint,
    ...content
  } = task as TournamentTask & { arenaPublication?: unknown; publicationFingerprint?: unknown };
  return sha256(`leaf:${canonicalJson(content)}`);
}

/** Deterministically builds a duplicate-last-leaf Merkle tree and one bounded proof per task. */
export function buildTournamentPoolTaskProofs(
  tasks: readonly (TournamentTask & { arenaPublication?: unknown; publicationFingerprint?: unknown })[],
): Readonly<{ merkleRootSha256: string; byTaskId: ReadonlyMap<string, ArenaPublicationProof> }> {
  if (!Array.isArray(tasks) || tasks.length < 1 || tasks.length > 4_000) {
    throw new Error('arena_merkle_tasks_invalid');
  }
  const ordered = [...tasks].sort((left, right) => left.taskId.localeCompare(right.taskId));
  if (new Set(ordered.map((task) => task.taskId)).size !== ordered.length) {
    throw new Error('arena_merkle_task_id_duplicate');
  }
  const leaves = ordered.map((task) => tournamentPoolTaskLeafSha256(task));
  const proofs = ordered.map(() => [] as Array<{ side: 'left' | 'right'; sha256: string }>);
  let nodes = leaves.map((digest, index) => ({ digest, indices: [index] }));
  while (nodes.length > 1) {
    const next: typeof nodes = [];
    for (let index = 0; index < nodes.length; index += 2) {
      const left = nodes[index];
      const right = nodes[index + 1] ?? left;
      for (const leafIndex of left.indices) proofs[leafIndex].push({ side: 'right', sha256: right.digest });
      if (right !== left) {
        for (const leafIndex of right.indices) proofs[leafIndex].push({ side: 'left', sha256: left.digest });
      }
      next.push({
        digest: sha256(`node:${left.digest}:${right.digest}`),
        indices: right === left ? [...left.indices] : [...left.indices, ...right.indices],
      });
    }
    nodes = next;
  }
  const byTaskId = new Map<string, ArenaPublicationProof>();
  ordered.forEach((task, index) => byTaskId.set(task.taskId, Object.freeze({
    leafSha256: leaves[index],
    proof: Object.freeze(proofs[index].map((step) => Object.freeze({ ...step }))),
  })));
  return Object.freeze({ merkleRootSha256: nodes[0].digest, byTaskId });
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
