import {
  advanceCreateOnlyPublication,
  createCreateOnlyPublicationPlan,
  type CreateOnlyPublicationPersistence,
} from './tournament_bundle_publication';

class MemoryPublicationPersistence implements CreateOnlyPublicationPersistence {
  readonly rows = new Map<string, unknown>();
  failNextCheckpoint = false;

  async get(path: string) { return this.rows.get(path) ?? null; }

  async create(path: string, value: unknown) {
    if (this.rows.has(path)) throw new Error('already_exists');
    this.rows.set(path, structuredClone(value));
  }

  async compareAndSet(path: string, expectedRevision: number, value: unknown) {
    if (this.failNextCheckpoint) {
      this.failNextCheckpoint = false;
      throw new Error('simulated_crash');
    }
    const current = this.rows.get(path) as { revision?: number } | undefined;
    if (!current || current.revision !== expectedRevision) throw new Error('publication_revision_conflict');
    this.rows.set(path, structuredClone(value));
  }
}

function plan() {
  const rootPath = 'tournament_pool_v11_bundles/tpool_test_v11';
  return createCreateOnlyPublicationPlan({
    publicationId: 'tpool_test_v11',
    checkpointPath: `${rootPath}/internal/publication_checkpoint`,
    entries: [0, 1, 2].map((index) => ({
      path: `${rootPath}/tasks/task-${index}`,
      value: { taskId: `task-${index}`, value: index },
    })),
    root: { path: rootPath, value: { kind: 'root', taskCount: 3 } },
  });
}

describe('advanceCreateOnlyPublication', () => {
  it('writes and verifies bounded batches, resumes after a pre-checkpoint crash, and publishes the root last', async () => {
    const persistence = new MemoryPublicationPersistence();
    const publication = plan();

    const first = await advanceCreateOnlyPublication({ publication, persistence, maxOperations: 1 });
    expect(first).toMatchObject({ state: 'writing', writeCursor: 1, verifyCursor: 0, continuation: true });
    expect(persistence.rows.has(publication.root.path)).toBe(false);

    await advanceCreateOnlyPublication({ publication, persistence, maxOperations: 1 });
    persistence.failNextCheckpoint = true;
    await expect(advanceCreateOnlyPublication({
      publication, persistence, maxOperations: 1,
    })).rejects.toThrow('simulated_crash');
    expect(persistence.rows.has(publication.entries[2].path)).toBe(true);
    expect(persistence.rows.has(publication.root.path)).toBe(false);

    const resumed = await advanceCreateOnlyPublication({ publication, persistence, maxOperations: 1 });
    expect(resumed).toMatchObject({ state: 'verifying', writeCursor: 3, verifyCursor: 0 });
    expect(resumed.reusedThisBatch).toBe(1);

    let result = resumed;
    while (result.continuation) {
      result = await advanceCreateOnlyPublication({ publication, persistence, maxOperations: 1 });
    }
    expect(result).toMatchObject({ state: 'ready', writeCursor: 3, verifyCursor: 3, continuation: false });
    expect(persistence.rows.get(publication.root.path)).toEqual({ kind: 'root', taskCount: 3 });

    const idempotent = await advanceCreateOnlyPublication({ publication, persistence, maxOperations: 1 });
    expect(idempotent).toMatchObject({ state: 'ready', createdThisBatch: 0, continuation: false });
  });

  it('fails closed if a create-only entry already contains different content', async () => {
    const persistence = new MemoryPublicationPersistence();
    const publication = plan();
    persistence.rows.set(publication.entries[0].path, { taskId: 'task-0', value: 'corrupt' });

    await expect(advanceCreateOnlyPublication({
      publication, persistence, maxOperations: 2,
    })).rejects.toThrow('publication_conflict');
    expect(persistence.rows.has(publication.root.path)).toBe(false);
  });

  it('binds the checkpoint to the exact immutable plan hash', async () => {
    const persistence = new MemoryPublicationPersistence();
    const publication = plan();
    await advanceCreateOnlyPublication({ publication, persistence, maxOperations: 1 });
    const changed = createCreateOnlyPublicationPlan({
      publicationId: publication.publicationId,
      checkpointPath: publication.checkpointPath,
      entries: publication.entries.map((entry, index) => index === 2
        ? { ...entry, value: { taskId: 'task-2', value: 99 } }
        : entry),
      root: publication.root,
    });

    await expect(advanceCreateOnlyPublication({
      publication: changed, persistence, maxOperations: 1,
    })).rejects.toThrow('publication_plan_conflict');
    const rebound = createCreateOnlyPublicationPlan({
      publicationId: 'tpool_test_v11_job_b',
      checkpointPath: publication.checkpointPath,
      entries: publication.entries,
      root: publication.root,
      binding: { jobId: 'job-b', queueSha256: 'b'.repeat(64) },
    });
    await expect(advanceCreateOnlyPublication({
      publication: rebound, persistence, maxOperations: 1,
    })).rejects.toThrow('publication_plan_conflict');
  });

  it('fails closed when a visible root predates a non-ready checkpoint', async () => {
    const persistence = new MemoryPublicationPersistence();
    const publication = plan();
    persistence.rows.set(publication.root.path, structuredClone(publication.root.value));

    await expect(advanceCreateOnlyPublication({
      publication, persistence, maxOperations: 1,
    })).rejects.toThrow('publication_root_premature');
    expect(persistence.rows.has(publication.entries[0].path)).toBe(false);
  });
});
