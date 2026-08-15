import {
  createOwnerRepository,
  ownerRepositoryRootKey,
  type OwnerRepositoryActiveOwnerFence,
  type OwnerRepositoryCasStorage,
  type OwnerRepositoryScope,
} from "../modules/learning-v2/progress/owner_repository";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const accountB = "bbbbbbbbbbbbbbbb";
const scope = (generation: number, hash = accountScopeHash): OwnerRepositoryScope => ({
  accountScopeHash: hash,
  generation,
});

class MemoryV2Storage implements OwnerRepositoryCasStorage {
  readonly values = new Map<string, string>();
  activeOwner: OwnerRepositoryActiveOwnerFence | null = null;
  casCalls = 0;
  setCalls = 0;
  failNextSet = false;
  throwAfterCommittedCas = false;
  acknowledgeCasWithoutWrite = false;
  afterCommittedCas: (() => void) | null = null;
  private pauseNextCas = false;
  private enteredResolve: (() => void) | null = null;
  private releaseResolve: (() => void) | null = null;
  private entered = Promise.resolve();
  private release = Promise.resolve();

  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) {
    this.setCalls += 1;
    if (this.failNextSet) {
      this.failNextSet = false;
      this.values.set(key, value.slice(0, Math.max(1, Math.floor(value.length / 2))));
      throw new Error("injected_partial_write");
    }
    this.values.set(key, value);
  }
  async getCurrentOwnerFence() { return this.activeOwner; }
  async compareAndSet(
    key: string,
    expected: string | null,
    next: string,
    fence: OwnerRepositoryActiveOwnerFence,
  ): Promise<"committed" | "conflict" | "stale_generation"> {
    this.casCalls += 1;
    if (this.pauseNextCas) {
      this.pauseNextCas = false;
      this.enteredResolve?.();
      await this.release;
    }
    if (!this.activeOwner || canonicalJsonV1(this.activeOwner) !== canonicalJsonV1(fence)) {
      return "stale_generation";
    }
    if ((this.values.get(key) ?? null) !== expected) return "conflict";
    if (this.acknowledgeCasWithoutWrite) return "committed";
    this.values.set(key, next);
    this.afterCommittedCas?.();
    if (this.throwAfterCommittedCas) {
      this.throwAfterCommittedCas = false;
      throw new Error("lost_response");
    }
    return "committed";
  }
  setOwner(hash: string, generation: number) {
    this.activeOwner = { accountScopeHash: hash, generation };
  }
  deferNextCas() {
    this.pauseNextCas = true;
    this.entered = new Promise<void>((resolve) => { this.enteredResolve = resolve; });
    this.release = new Promise<void>((resolve) => { this.releaseResolve = resolve; });
  }
  waitForCasEntry() { return this.entered; }
  releaseCas() { this.releaseResolve?.(); }
}

describe("Learning V2 owner repository root-v2 CAS integration", () => {
  it("initializes a missing account directly as one fully reachable v2 genesis", async () => {
    const storage = new MemoryV2Storage();
    storage.setOwner(accountScopeHash, 4);
    const repository = createOwnerRepository(storage, () => true);
    const snapshot = await repository.ensureV2(scope(4));
    expect(snapshot.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v2",
      currentGeneration: 4,
      repositoryRevision: 0,
      journalSequence: 0,
    });
    expect(snapshot.courseStateManifest).toMatchObject({ entryCount: 0, rootNodeRef: null });
    expect(storage.casCalls).toBe(1);
    expect([...storage.values.keys()].filter((key) => key.includes(":blob:")).length).toBe(5);
    await expect(repository.loadV2(scope(4))).resolves.toEqual(snapshot);
    await expect(repository.load(scope(4))).resolves.toEqual(snapshot);
    await expect(repository.initialize(scope(4))).resolves.toEqual(snapshot);
  });

  it("keeps generic callers valid when initialize races ensureV2 on a missing root", async () => {
    const storage = new MemoryV2Storage();
    storage.setOwner(accountScopeHash, 4);
    const first = createOwnerRepository(storage, () => true);
    const second = createOwnerRepository(storage, () => true);
    await expect(Promise.all([
      first.initialize(scope(4)),
      second.ensureV2(scope(4)),
    ])).resolves.toHaveLength(2);
    await expect(first.load(scope(4))).resolves.toMatchObject({
      root: { schemaVersion: "learning-v2-owner-repository-root.v2" },
    });
  });

  it("migrates v1 gen4 straight into v2 gen5 with one successor CAS", async () => {
    const storage = new MemoryV2Storage();
    let active = scope(4);
    storage.setOwner(active.accountScopeHash, active.generation);
    const repository = createOwnerRepository(storage, (candidate) =>
      canonicalJsonV1(candidate) === canonicalJsonV1(active));
    const v1 = await repository.initialize(active);
    const callsBefore = storage.casCalls;
    active = scope(5);
    storage.setOwner(active.accountScopeHash, active.generation);
    const v2 = await repository.ensureV2(active);
    expect(v2.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v2",
      currentGeneration: 5,
      repositoryRevision: 1,
      previousRootFingerprint: v1.root.rootFingerprint,
    });
    expect(storage.casCalls - callsBefore).toBe(1);
    expect(v2.walletState).toEqual(v1.walletState);
  });

  it("verifies the complete v2 graph before a generation-only successor", async () => {
    const storage = new MemoryV2Storage();
    let active = scope(4);
    storage.setOwner(active.accountScopeHash, active.generation);
    const repository = createOwnerRepository(storage, (candidate) =>
      canonicalJsonV1(candidate) === canonicalJsonV1(active));
    const generation4 = await repository.ensureV2(active);
    active = scope(5);
    storage.setOwner(active.accountScopeHash, active.generation);
    const walletRaw = storage.values.get(generation4.root.walletStateRef.blobKey)!;
    storage.values.delete(generation4.root.walletStateRef.blobKey);
    const rootBefore = storage.values.get(ownerRepositoryRootKey(accountScopeHash));
    await expect(repository.ensureV2(active)).rejects.toThrow("owner_repository_indeterminate");
    expect(storage.values.get(ownerRepositoryRootKey(accountScopeHash))).toBe(rootBefore);
    storage.values.set(generation4.root.walletStateRef.blobKey, walletRaw);
    const generation5 = await repository.ensureV2(active);
    expect(generation5.root).toMatchObject({
      currentGeneration: 5,
      repositoryRevision: generation4.root.repositoryRevision + 1,
      previousRootFingerprint: generation4.root.rootFingerprint,
      walletStateRef: generation4.root.walletStateRef,
      courseStateManifestRef: generation4.root.courseStateManifestRef,
    });

    const fakeStorage = new MemoryV2Storage();
    let fakeActive = scope(4);
    fakeStorage.setOwner(fakeActive.accountScopeHash, fakeActive.generation);
    const fakeRepository = createOwnerRepository(fakeStorage, (candidate) =>
      canonicalJsonV1(candidate) === canonicalJsonV1(fakeActive));
    await fakeRepository.ensureV2(fakeActive);
    fakeActive = scope(5);
    fakeStorage.setOwner(fakeActive.accountScopeHash, fakeActive.generation);
    fakeStorage.acknowledgeCasWithoutWrite = true;
    await expect(fakeRepository.ensureV2(fakeActive))
      .rejects.toThrow("owner_repository_commit_indeterminate");
  });

  it("converges concurrent migration and a lost CAS response without a second revision", async () => {
    const storage = new MemoryV2Storage();
    storage.setOwner(accountScopeHash, 4);
    const first = createOwnerRepository(storage, () => true);
    const second = createOwnerRepository(storage, () => true);
    await first.initialize(scope(4));
    storage.throwAfterCommittedCas = true;
    const [left, right] = await Promise.all([
      first.ensureV2(scope(4)),
      second.ensureV2(scope(4)),
    ]);
    expect(left.root.rootFingerprint).toBe(right.root.rootFingerprint);
    expect(left.root.repositoryRevision).toBe(1);
    expect(right.root.repositoryRevision).toBe(1);
  });

  it("keeps loadV2 write-free and fails closed on v1 or a missing manifest", async () => {
    const storage = new MemoryV2Storage();
    storage.setOwner(accountScopeHash, 4);
    const repository = createOwnerRepository(storage, () => true);
    await repository.initialize(scope(4));
    const writesBefore = storage.setCalls;
    await expect(repository.loadV2(scope(4)))
      .rejects.toThrow("owner_repository_v2_migration_required");
    expect(storage.setCalls).toBe(writesBefore);
    const v2 = await repository.ensureV2(scope(4));
    storage.values.delete(v2.root.courseStateManifestRef.blobKey);
    await expect(repository.loadV2(scope(4))).rejects.toThrow("owner_repository_indeterminate");
  });

  it("does not publish when manifest staging fails and repairs the orphan on retry", async () => {
    const storage = new MemoryV2Storage();
    storage.setOwner(accountScopeHash, 4);
    const repository = createOwnerRepository(storage, () => true);
    const v1 = await repository.initialize(scope(4));
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const rootBefore = storage.values.get(rootKey);
    storage.failNextSet = true;
    await expect(repository.ensureV2(scope(4))).rejects.toThrow("owner_repository_write_failed");
    expect(storage.values.get(rootKey)).toBe(rootBefore);
    const recovered = await repository.ensureV2(scope(4));
    expect(recovered.root.previousRootFingerprint).toBe(v1.root.rootFingerprint);
  });

  it("rejects fake commits and atomically fences an account switch during CAS", async () => {
    const fakeStorage = new MemoryV2Storage();
    fakeStorage.setOwner(accountScopeHash, 4);
    fakeStorage.acknowledgeCasWithoutWrite = true;
    const fakeRepository = createOwnerRepository(fakeStorage, () => true);
    await expect(fakeRepository.ensureV2(scope(4)))
      .rejects.toThrow("owner_repository_commit_indeterminate");

    const storage = new MemoryV2Storage();
    let active = scope(4);
    storage.setOwner(active.accountScopeHash, active.generation);
    const repository = createOwnerRepository(storage, (candidate) =>
      canonicalJsonV1(candidate) === canonicalJsonV1(active));
    await repository.initialize(active);
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const rootBefore = storage.values.get(rootKey);
    storage.deferNextCas();
    const migrating = repository.ensureV2(active);
    await storage.waitForCasEntry();
    active = scope(5, accountB);
    storage.setOwner(active.accountScopeHash, active.generation);
    storage.releaseCas();
    await expect(migrating).rejects.toThrow("owner_repository_generation_stale");
    expect(storage.values.get(rootKey)).toBe(rootBefore);

    const lostStorage = new MemoryV2Storage();
    let lostActive = scope(4);
    lostStorage.setOwner(lostActive.accountScopeHash, lostActive.generation);
    const lostRepository = createOwnerRepository(lostStorage, (candidate) =>
      canonicalJsonV1(candidate) === canonicalJsonV1(lostActive));
    await lostRepository.initialize(lostActive);
    lostStorage.throwAfterCommittedCas = true;
    lostStorage.afterCommittedCas = () => {
      lostActive = scope(5, accountB);
      lostStorage.setOwner(lostActive.accountScopeHash, lostActive.generation);
    };
    await expect(lostRepository.ensureV2(scope(4)))
      .rejects.toThrow("owner_repository_generation_stale");
  });
});
