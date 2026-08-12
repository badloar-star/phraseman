import {
  createOwnerRepository,
  ownerRepositoryRootKey,
  type OwnerRepositoryCasStorage,
  type OwnerRepositoryScope,
} from "../modules/learning-v2/progress/owner_repository";
import { createCourseUnlockState } from "../modules/learning-v2/progress/course_unlock_reducer";
import { canonicalJsonV1, sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";

class MemoryCasStorage implements OwnerRepositoryCasStorage {
  readonly values = new Map<string, string>();
  activeOwner: { readonly accountScopeHash: string; readonly generation: number } | null = null;
  failSetAt: number | null = null;
  partialSetAt: number | null = null;
  throwAfterCommittedCas = false;
  acknowledgeCasWithoutWrite = false;
  pauseNextCas = false;
  private setCalls = 0;
  private casEnteredResolve: (() => void) | null = null;
  private casReleaseResolve: (() => void) | null = null;
  private casEntered = Promise.resolve();
  private casRelease = Promise.resolve();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.setCalls += 1;
    if (this.failSetAt === this.setCalls) throw new Error("injected_set_failure");
    if (this.partialSetAt === this.setCalls) {
      this.values.set(key, value.slice(0, Math.max(1, Math.floor(value.length / 2))));
      throw new Error("injected_partial_set_failure");
    }
    this.values.set(key, value);
  }

  async getCurrentOwnerFence(): Promise<{ readonly accountScopeHash: string; readonly generation: number } | null> {
    return this.activeOwner;
  }

  async compareAndSet(
    key: string,
    expected: string | null,
    next: string,
    fence: { readonly accountScopeHash: string; readonly generation: number },
  ): Promise<"committed" | "conflict" | "stale_generation"> {
    if (this.pauseNextCas) {
      this.pauseNextCas = false;
      this.casEnteredResolve?.();
      await this.casRelease;
    }
    if (this.activeOwner?.accountScopeHash !== fence.accountScopeHash ||
      this.activeOwner.generation !== fence.generation) return "stale_generation";
    const current = this.values.get(key) ?? null;
    if (current !== expected) return "conflict";
    if (this.acknowledgeCasWithoutWrite) return "committed";
    this.values.set(key, next);
    if (this.throwAfterCommittedCas) {
      this.throwAfterCommittedCas = false;
      throw new Error("lost_cas_response");
    }
    return "committed";
  }

  setOwner(accountScopeHash: string, generation: number): void {
    this.activeOwner = { accountScopeHash, generation };
  }

  deferNextCas(): void {
    this.pauseNextCas = true;
    this.casEntered = new Promise<void>((resolve) => { this.casEnteredResolve = resolve; });
    this.casRelease = new Promise<void>((resolve) => { this.casReleaseResolve = resolve; });
  }

  async waitForCasEntry(): Promise<void> {
    await this.casEntered;
  }

  releaseCas(): void {
    this.casReleaseResolve?.();
  }
}

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const scope = (generation: number, hash = accountScopeHash): OwnerRepositoryScope => ({
  accountScopeHash: hash,
  generation,
});

const rewriteRoot = (
  storage: MemoryCasStorage,
  mutate: (root: Record<string, unknown>) => void,
): string => {
  const key = ownerRepositoryRootKey(accountScopeHash);
  const parsed = JSON.parse(storage.values.get(key)!) as Record<string, unknown>;
  mutate(parsed);
  delete parsed.rootFingerprint;
  const rootFingerprint = sha256Utf8(canonicalJsonV1(parsed));
  const encoded = canonicalJsonV1({ ...parsed, rootFingerprint });
  storage.values.set(key, encoded);
  return encoded;
};

const createBlobFixture = (kind: string, payload: unknown) => {
  const encoded = canonicalJsonV1({
    schemaVersion: "learning-v2-owner-repository-blob.v1",
    accountScopeHash,
    kind,
    payload,
  });
  const blobFingerprint = sha256Utf8(encoded);
  return {
    encoded,
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
      kind,
      blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
      blobFingerprint,
    },
  };
};

describe("Learning V2 owner-current CAS repository root", () => {
  it("initializes immutable blobs and publishes exactly one root commit", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    let currentGeneration = 4;
    const repository = createOwnerRepository(storage, (candidate) =>
      candidate.accountScopeHash === accountScopeHash && candidate.generation === currentGeneration,
    );
    const snapshot = await repository.initialize(scope(4));
    expect(snapshot.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v1",
      accountScopeHash,
      currentGeneration: 4,
      repositoryRevision: 0,
      journalSequence: 0,
      previousRootFingerprint: null,
      journalHeadRef: null,
      courseStateRefs: [],
    });
    expect(snapshot.walletState.balanceSubunits).toBe(0);
    expect(storage.values.has(ownerRepositoryRootKey(accountScopeHash))).toBe(true);
    expect([...storage.values.keys()].filter((key) => key.includes(":blob:")).length).toBe(4);
  });

  it("uses account identity as the durable key and generation only as a writer fence", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    let currentGeneration = 4;
    const repository = createOwnerRepository(storage, (candidate) => candidate.generation === currentGeneration);
    const generation4 = await repository.initialize(scope(4));
    currentGeneration = 5;
    storage.setOwner(accountScopeHash, 5);
    const generation5 = await repository.initialize(scope(5));
    expect(ownerRepositoryRootKey(accountScopeHash)).not.toContain(":g4");
    expect(generation5.walletState).toEqual(generation4.walletState);
    expect(generation5.root).toMatchObject({
      currentGeneration: 5,
      repositoryRevision: 1,
      journalSequence: 0,
      previousRootFingerprint: generation4.root.rootFingerprint,
    });
  });

  it("serializes competing initializers through storage CAS rather than a process-local lock", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    const guard = (candidate: OwnerRepositoryScope) => candidate.generation === 4;
    const first = createOwnerRepository(storage, guard);
    const second = createOwnerRepository(storage, guard);
    const [left, right] = await Promise.all([first.initialize(scope(4)), second.initialize(scope(4))]);
    expect(left.root.rootFingerprint).toBe(right.root.rootFingerprint);
    expect(left.walletState).toEqual(right.walletState);
  });

  it("keeps pre-CAS orphan blobs invisible and succeeds on retry", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    storage.failSetAt = 2;
    const repository = createOwnerRepository(storage, () => true);
    await expect(repository.initialize(scope(4))).rejects.toThrow("owner_repository_write_failed");
    expect(storage.values.has(ownerRepositoryRootKey(accountScopeHash))).toBe(false);
    storage.failSetAt = null;
    const recovered = await repository.initialize(scope(4));
    expect(recovered.root.repositoryRevision).toBe(0);
  });

  it("repairs a truncated pre-commit content-addressed blob on retry", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    storage.partialSetAt = 2;
    const repository = createOwnerRepository(storage, () => true);
    await expect(repository.initialize(scope(4))).rejects.toThrow("owner_repository_write_failed");
    expect(storage.values.has(ownerRepositoryRootKey(accountScopeHash))).toBe(false);
    storage.partialSetAt = null;
    const recovered = await repository.initialize(scope(4));
    expect(recovered.root).toMatchObject({ repositoryRevision: 0, journalSequence: 0 });
  });

  it("recognizes commit-after-lost-response by re-reading the exact root", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    storage.throwAfterCommittedCas = true;
    const repository = createOwnerRepository(storage, () => true);
    const snapshot = await repository.initialize(scope(4));
    expect(snapshot.root.repositoryRevision).toBe(0);
    expect((await repository.load(scope(4)))?.root.rootFingerprint).toBe(snapshot.root.rootFingerprint);
  });

  it("does not trust a committed status unless the exact root is durably readable", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    storage.acknowledgeCasWithoutWrite = true;
    const repository = createOwnerRepository(storage, () => true);
    await expect(repository.initialize(scope(4))).rejects.toThrow("owner_repository_commit_indeterminate");
    expect(storage.values.has(ownerRepositoryRootKey(accountScopeHash))).toBe(false);
  });

  it("fails closed on corrupt root, missing blob and stale generation", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    let currentGeneration = 4;
    const repository = createOwnerRepository(storage, (candidate) => candidate.generation === currentGeneration);
    const initialized = await repository.initialize(scope(4));
    storage.values.set(ownerRepositoryRootKey(accountScopeHash), "{broken");
    await expect(repository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");

    storage.values.clear();
    const restored = await repository.initialize(scope(4));
    storage.values.delete(restored.root.walletStateRef.blobKey);
    await expect(repository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");

    currentGeneration = 5;
    storage.setOwner(accountScopeHash, 5);
    await expect(repository.load(scope(4))).rejects.toThrow("owner_repository_generation_stale");
    expect(initialized.root.accountScopeHash).toBe(accountScopeHash);
  });

  it("checks the durable generation at the same atomic point as root CAS", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    let currentGeneration = 4;
    const repository = createOwnerRepository(storage, (candidate) => candidate.generation === currentGeneration);
    storage.deferNextCas();
    const initializing = repository.initialize(scope(4));
    await storage.waitForCasEntry();
    currentGeneration = 5;
    storage.setOwner(accountScopeHash, 5);
    storage.releaseCas();
    await expect(initializing).rejects.toThrow("owner_repository_generation_stale");
    expect(storage.values.has(ownerRepositoryRootKey(accountScopeHash))).toBe(false);
  });

  it("uses one active-owner token across accounts and supports A to B to A with a higher generation", async () => {
    const storage = new MemoryCasStorage();
    const accountB = "bbbbbbbbbbbbbbbb";
    let active = scope(4);
    storage.setOwner(active.accountScopeHash, active.generation);
    const repository = createOwnerRepository(storage, (candidate) =>
      candidate.accountScopeHash === active.accountScopeHash && candidate.generation === active.generation,
    );
    storage.deferNextCas();
    const staleA = repository.initialize(scope(4));
    await storage.waitForCasEntry();
    active = scope(5, accountB);
    storage.setOwner(active.accountScopeHash, active.generation);
    storage.releaseCas();
    await expect(staleA).rejects.toThrow("owner_repository_generation_stale");
    expect(storage.values.has(ownerRepositoryRootKey(accountScopeHash))).toBe(false);

    const accountBSnapshot = await repository.initialize(active);
    expect(accountBSnapshot.root.accountScopeHash).toBe(accountB);
    active = scope(6);
    storage.setOwner(active.accountScopeHash, active.generation);
    const returnedA = await repository.initialize(active);
    expect(returnedA.root).toMatchObject({ accountScopeHash, currentGeneration: 6 });
  });

  it("detaches scope before the first await and never executes accessors", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    const repository = createOwnerRepository(storage, () => true);
    let getterCalled = false;
    const hostile = Object.defineProperty({ generation: 4 }, "accountScopeHash", {
      enumerable: true,
      get: () => {
        getterCalled = true;
        return accountScopeHash;
      },
    });
    await expect(repository.initialize(hostile as OwnerRepositoryScope)).rejects.toThrow("owner_repository_scope_invalid");
    expect(getterCalled).toBe(false);

    const mutable = scope(4) as { accountScopeHash: string; generation: number };
    const initializing = repository.initialize(mutable);
    mutable.accountScopeHash = "cccccccccccccccc";
    mutable.generation = 99;
    const snapshot = await initializing;
    expect(snapshot.root).toMatchObject({ accountScopeHash, currentGeneration: 4 });
  });

  it("rejects generation rollback and validates the complete old graph before rollover", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 5);
    let currentGeneration = 5;
    const repository = createOwnerRepository(storage, (candidate) => candidate.generation === currentGeneration);
    const generation5 = await repository.initialize(scope(5));
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const beforeRollback = storage.values.get(rootKey);
    currentGeneration = 4;
    storage.setOwner(accountScopeHash, 4);
    await expect(repository.initialize(scope(4))).rejects.toThrow("owner_repository_generation_stale");
    expect(storage.values.get(rootKey)).toBe(beforeRollback);

    currentGeneration = 6;
    storage.setOwner(accountScopeHash, 6);
    storage.values.delete(generation5.root.walletStateRef.blobKey);
    const beforeCorruptRollover = storage.values.get(rootKey);
    await expect(repository.initialize(scope(6))).rejects.toThrow("owner_repository_indeterminate");
    expect(storage.values.get(rootKey)).toBe(beforeCorruptRollover);
  });

  it("rejects impossible root state-machine tuples even when their fingerprint is recomputed", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    const repository = createOwnerRepository(storage, () => true);
    await repository.initialize(scope(4));
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const original = storage.values.get(rootKey)!;
    const mutations: Array<(root: Record<string, unknown>) => void> = [
      (root) => { root.journalSequence = 1; },
      (root) => {
        root.journalHeadRef = {
          schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
          kind: "journal_record",
          blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${"b".repeat(64)}`,
          blobFingerprint: "b".repeat(64),
        };
      },
      (root) => { root.previousRootFingerprint = "c".repeat(64); },
      (root) => { root.repositoryRevision = 1; },
      (root) => { root.repositoryRevision = 1; root.journalSequence = 2; root.previousRootFingerprint = "d".repeat(64); },
    ];
    for (const mutate of mutations) {
      storage.values.set(rootKey, original);
      rewriteRoot(storage, mutate);
      await expect(repository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");
    }
  });

  it("fails closed on every non-genesis journal until P2.2b installs its exact parser", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    const repository = createOwnerRepository(storage, () => true);
    const initial = await repository.initialize(scope(4));
    const bogusJournal = createBlobFixture("journal_record", { anything: "accepted" });
    storage.values.set(bogusJournal.ref.blobKey, bogusJournal.encoded);
    rewriteRoot(storage, (root) => {
      root.repositoryRevision = 1;
      root.journalSequence = 1;
      root.previousRootFingerprint = initial.root.rootFingerprint;
      root.journalHeadRef = bogusJournal.ref;
    });
    await expect(repository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");
  });

  it("classifies malformed durable-fence and CAS adapter results as indeterminate", async () => {
    const badFenceStorage = new MemoryCasStorage();
    badFenceStorage.getCurrentOwnerFence = async () => ({
      accountScopeHash,
      generation: 4.5,
    } as never);
    const badFenceRepository = createOwnerRepository(badFenceStorage, () => true);
    await expect(badFenceRepository.initialize(scope(4))).rejects.toThrow("owner_repository_indeterminate");

    let fenceGetterCalled = false;
    const accessorFenceStorage = new MemoryCasStorage();
    accessorFenceStorage.getCurrentOwnerFence = async () => Object.defineProperty(
      { generation: 4 },
      "accountScopeHash",
      {
        enumerable: true,
        get: () => {
          fenceGetterCalled = true;
          return accountScopeHash;
        },
      },
    ) as never;
    const accessorFenceRepository = createOwnerRepository(accessorFenceStorage, () => true);
    await expect(accessorFenceRepository.initialize(scope(4))).rejects.toThrow("owner_repository_indeterminate");
    expect(fenceGetterCalled).toBe(false);

    const badCasStorage = new MemoryCasStorage();
    badCasStorage.setOwner(accountScopeHash, 4);
    badCasStorage.compareAndSet = async () => "unknown" as never;
    const badCasRepository = createOwnerRepository(badCasStorage, () => true);
    await expect(badCasRepository.initialize(scope(4))).rejects.toThrow("owner_repository_indeterminate");
    expect(badCasStorage.values.has(ownerRepositoryRootKey(accountScopeHash))).toBe(false);
  });

  it("normalizes non-string and invalid-Unicode storage corruption", async () => {
    const nonStringStorage = new MemoryCasStorage();
    nonStringStorage.setOwner(accountScopeHash, 4);
    nonStringStorage.getItem = async () => 42 as never;
    const nonStringRepository = createOwnerRepository(nonStringStorage, () => true);
    await expect(nonStringRepository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");

    const unicodeStorage = new MemoryCasStorage();
    unicodeStorage.setOwner(accountScopeHash, 4);
    unicodeStorage.values.set(ownerRepositoryRootKey(accountScopeHash), "\ud800");
    const unicodeRepository = createOwnerRepository(unicodeStorage, () => true);
    await expect(unicodeRepository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");
  });

  it("resolves every course and index reference and normalizes nested corruption", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    const repository = createOwnerRepository(storage, () => true);
    const initial = await repository.initialize(scope(4));
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const original = storage.values.get(rootKey)!;

    const courseState = createCourseUnlockState({
      accountScopeHash,
      courseId: "course-en",
      studyTarget: "en",
    });
    const missingCourse = createBlobFixture("course_unlock_state", courseState);
    rewriteRoot(storage, (root) => {
      root.courseStateRefs = [{
        schemaVersion: "learning-v2-owner-repository-course-ref.v1",
        courseIdentityFingerprint: courseState.courseIdentityFingerprint,
        stateRef: missingCourse.ref,
      }];
    });
    await expect(repository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");

    storage.values.set(rootKey, original);
    for (const ref of [
      initial.root.operationIndexManifestRef,
      initial.root.subjectIndexManifestRef,
      initial.root.receiptIndexManifestRef,
    ]) {
      storage.values.delete(ref.blobKey);
      await expect(repository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");
      const snapshot = await repository.initialize(scope(4)).catch(() => undefined);
      expect(snapshot).toBeUndefined();
      storage.values.set(rootKey, original);
      const manifest = createBlobFixture(
        ref.kind,
        {
          schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
          indexKind: ref.kind.replace("_index_manifest", ""),
          shardBits: 8,
          shards: [],
        },
      );
      storage.values.set(ref.blobKey, manifest.encoded);
    }

    storage.values.set(rootKey, original);
    const invalidWallet = createBlobFixture("wallet_state", { schemaVersion: "invalid" });
    storage.values.set(invalidWallet.ref.blobKey, invalidWallet.encoded);
    rewriteRoot(storage, (root) => { root.walletStateRef = invalidWallet.ref; });
    await expect(repository.load(scope(4))).rejects.toThrow("owner_repository_indeterminate");
  });

  it("does not publish an unadvanceable max-safe root during generation rollover", async () => {
    const storage = new MemoryCasStorage();
    storage.setOwner(accountScopeHash, 4);
    let currentGeneration = 4;
    const repository = createOwnerRepository(storage, (candidate) => candidate.generation === currentGeneration);
    await repository.initialize(scope(4));
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    rewriteRoot(storage, (root) => {
      root.repositoryRevision = Number.MAX_SAFE_INTEGER;
      root.previousRootFingerprint = "e".repeat(64);
    });
    const maxRoot = storage.values.get(rootKey);
    currentGeneration = 5;
    storage.setOwner(accountScopeHash, 5);
    await expect(repository.initialize(scope(5))).rejects.toThrow("owner_repository_indeterminate");
    expect(storage.values.get(rootKey)).toBe(maxRoot);
  });
});
