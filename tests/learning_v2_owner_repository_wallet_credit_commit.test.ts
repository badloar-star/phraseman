import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import {
  createOwnerRepository,
  ownerRepositoryRootHistoryKey,
  ownerRepositoryRootKey,
  type OwnerRepositoryActiveOwnerFence,
  type OwnerRepositoryCasStorage,
  type OwnerRepositoryScope,
  type OwnerRepositoryWalletCreditAuthorityInput,
} from "../modules/learning-v2/progress/owner_repository";
import { createOwnerRepositoryWalletCreditJournalRecord } from "../modules/learning-v2/progress/owner_repository_journal";
import {
  materializeOwnerRepositoryJournalRecordBlob,
  parseOwnerRepositoryJournalRecordBlob,
} from "../modules/learning-v2/progress/owner_repository_root_fold";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
const scope: OwnerRepositoryScope = { accountScopeHash, generation };
const hash = (character: string) => character.repeat(64);

interface CreditCandidate {
  readonly operationId: string;
  readonly sourceReceiptId: string;
  readonly sourceReceiptFingerprint: string;
  readonly amountSubunits: number;
}

const firstCandidate: CreditCandidate = {
  operationId: "wallet-credit-commit-1",
  sourceReceiptId: "required-session-credit-commit-1",
  sourceReceiptFingerprint: hash("c"),
  amountSubunits: 36 * WALLET_SUBUNITS_PER_STAR,
};

const secondCandidate: CreditCandidate = {
  operationId: "wallet-credit-commit-2",
  sourceReceiptId: "required-session-credit-commit-2",
  sourceReceiptFingerprint: hash("d"),
  amountSubunits: 40 * WALLET_SUBUNITS_PER_STAR,
};

const createAuthority = () => {
  return ({
    scope: ownerScope,
    walletState,
    canonicalAppliedReceipt,
    candidate,
  }: OwnerRepositoryWalletCreditAuthorityInput) => {
    if (typeof candidate !== "object" || candidate === null) throw new Error("candidate_invalid");
    const value = candidate as CreditCandidate;
    if (canonicalAppliedReceipt?.operationId === value.operationId) {
      const canonicalOperation = canonicalAppliedReceipt.authorizedOperation;
      if (canonicalOperation.amountSubunits !== value.amountSubunits ||
        canonicalOperation.sourceReceiptRef.receiptId !== value.sourceReceiptId ||
        canonicalOperation.sourceReceiptRef.receiptFingerprint !== value.sourceReceiptFingerprint) {
        throw new Error("candidate_conflict");
      }
      return canonicalOperation;
    }
    const sourceReceiptRef = {
      receiptType: "required_session_credit_settlement" as const,
      receiptId: value.sourceReceiptId,
      receiptFingerprint: value.sourceReceiptFingerprint,
    };
    const operation = createWalletAuthorizedOperation({
      schemaVersion: "learning-v2-wallet-authorized-operation.v1",
      authority: "trusted_server_boundary",
      operationId: value.operationId,
      semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
        accountScopeHash: ownerScope.accountScopeHash,
        operationReason: "initial_required_session",
        sourceReceiptRef,
      }),
      accountScopeHash: ownerScope.accountScopeHash,
      accountGeneration: ownerScope.generation,
      currency: "access_star",
      kind: "earning_credit",
      amountSubunits: value.amountSubunits,
      earningCategory: "lesson",
      operationReason: "initial_required_session",
      sourceReceiptRef,
      walletRevisionBefore: walletState.revision,
      origin: {
        kind: "course",
        courseId: "english-core",
        studyTarget: "en",
        requiredSessionOrdinal: 1,
      },
    });
    return operation;
  };
};

class CommitStorage implements OwnerRepositoryCasStorage {
  readonly values = new Map<string, string>();
  activeOwner: OwnerRepositoryActiveOwnerFence | null = null;
  setCalls = 0;
  casCalls = 0;
  failNextSet = false;
  failSetAt: number | null = null;
  corruptNextSetWithoutThrow = false;
  throwAfterCommittedCas = false;
  acknowledgeCasWithoutWrite = false;
  private pauseNextCas = false;
  private enteredResolve: (() => void) | null = null;
  private releaseResolve: (() => void) | null = null;
  private entered = Promise.resolve();
  private release = Promise.resolve();
  private pauseNextFence = false;
  private fenceEnteredResolve: (() => void) | null = null;
  private fenceReleaseResolve: (() => void) | null = null;
  private fenceEntered = Promise.resolve();
  private fenceRelease = Promise.resolve();

  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) {
    this.setCalls += 1;
    if (this.failNextSet || this.failSetAt === this.setCalls) {
      this.failNextSet = false;
      this.failSetAt = null;
      this.values.set(key, value.slice(0, Math.max(1, Math.floor(value.length / 2))));
      throw new Error("injected_partial_write");
    }
    if (this.corruptNextSetWithoutThrow) {
      this.corruptNextSetWithoutThrow = false;
      this.values.set(key, `${value} `);
      return;
    }
    this.values.set(key, value);
  }
  async getCurrentOwnerFence() {
    if (this.pauseNextFence) {
      this.pauseNextFence = false;
      this.fenceEnteredResolve?.();
      await this.fenceRelease;
    }
    return this.activeOwner;
  }
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
    if (this.throwAfterCommittedCas) {
      this.throwAfterCommittedCas = false;
      throw new Error("lost_response");
    }
    return "committed";
  }
  setOwner(owner: OwnerRepositoryActiveOwnerFence) { this.activeOwner = owner; }
  deferNextCas() {
    this.pauseNextCas = true;
    this.entered = new Promise<void>((resolve) => { this.enteredResolve = resolve; });
    this.release = new Promise<void>((resolve) => { this.releaseResolve = resolve; });
  }
  waitForCasEntry() { return this.entered; }
  releaseCas() { this.releaseResolve?.(); }
  deferNextFenceRead() {
    this.pauseNextFence = true;
    this.fenceEntered = new Promise<void>((resolve) => { this.fenceEnteredResolve = resolve; });
    this.fenceRelease = new Promise<void>((resolve) => { this.fenceReleaseResolve = resolve; });
  }
  waitForFenceEntry() { return this.fenceEntered; }
  releaseFence() { this.fenceReleaseResolve?.(); }
}

const createFixture = async () => {
  const storage = new CommitStorage();
  storage.setOwner(scope);
  const authority = createAuthority();
  const repository = createOwnerRepository(storage, () => true, {
    materializeWalletCredit: authority,
  });
  await repository.ensureV2(scope);
  return { storage, repository, authority };
};

describe("Learning V2 owner repository wallet-credit durable commit", () => {
  it("requires a server-owned authority seam and never accepts a raw operation directly", async () => {
    const storage = new CommitStorage();
    storage.setOwner(scope);
    const repository = createOwnerRepository(storage, () => true);
    await repository.ensureV2(scope);
    const writesBefore = storage.setCalls;
    await expect(repository.commitWalletCredit(scope, firstCandidate))
      .rejects.toThrow("owner_repository_wallet_credit_authorizer_required");
    expect(storage.setCalls).toBe(writesBefore);
    expect(() => createOwnerRepository(storage, () => true, {
      materializeWalletCredit: undefined,
    })).toThrow("owner_repository_options_invalid");
  });

  it("detaches the candidate and freezes the authorized operation before post-authority awaits", async () => {
    const storage = new CommitStorage();
    storage.setOwner(scope);
    const canonicalAuthority = createAuthority();
    let mutableOperation: Record<string, unknown> | undefined;
    let authorityReturnedResolve: (() => void) | undefined;
    const authorityReturned = new Promise<void>((resolve) => { authorityReturnedResolve = resolve; });
    const repository = createOwnerRepository(storage, () => true, {
      materializeWalletCredit: async (input) => {
        const operation = await canonicalAuthority(input);
        mutableOperation = JSON.parse(canonicalJsonV1(operation)) as Record<string, unknown>;
        storage.deferNextFenceRead();
        authorityReturnedResolve?.();
        return mutableOperation;
      },
    });
    const genesis = await repository.ensureV2(scope);
    const alternate = await canonicalAuthority({
      scope,
      walletState: genesis.walletState,
      canonicalAppliedReceipt: null,
      candidate: secondCandidate,
    });
    const committing = repository.commitWalletCredit(scope, firstCandidate);
    await authorityReturned;
    await storage.waitForFenceEntry();
    if (!mutableOperation) throw new Error("authority did not return a mutable fixture");
    Object.assign(mutableOperation, JSON.parse(canonicalJsonV1(alternate)));
    storage.releaseFence();
    const applied = await committing;
    expect(applied.appliedReceipt.operationId).toBe(firstCandidate.operationId);
    expect(applied.appliedReceipt.amountSubunits).toBe(firstCandidate.amountSubunits);

    let getterRuns = 0;
    let authorityRuns = 0;
    const strictRepository = createOwnerRepository(storage, () => true, {
      materializeWalletCredit: () => { authorityRuns += 1; return alternate; },
    });
    const hostileCandidate = { ...firstCandidate } as Record<string, unknown>;
    Object.defineProperty(hostileCandidate, "operationId", {
      enumerable: true,
      get() { getterRuns += 1; return firstCandidate.operationId; },
    });
    await expect(strictRepository.commitWalletCredit(scope, hostileCandidate))
      .rejects.toThrow("owner_repository_wallet_credit_candidate_invalid");
    expect(getterRuns).toBe(0);
    expect(authorityRuns).toBe(0);
  });

  it("publishes one fully reachable credit root-last and replays with zero writes", async () => {
    const { storage, repository } = await createFixture();
    const applied = await repository.commitWalletCredit(scope, firstCandidate);
    expect(applied).toMatchObject({
      status: "applied",
      appliedReceipt: { balanceAfterSubunits: 36 * WALLET_SUBUNITS_PER_STAR },
      snapshot: { root: { repositoryRevision: 1, journalSequence: 1 } },
    });
    expect(applied.snapshot.walletState.balanceSubunits).toBe(36 * WALLET_SUBUNITS_PER_STAR);
    await expect(repository.loadV2(scope)).resolves.toEqual(applied.snapshot);
    await expect(repository.load(scope)).resolves.toEqual(applied.snapshot);
    const writesBeforeReplay = storage.setCalls;
    const casBeforeReplay = storage.casCalls;
    const replay = await repository.commitWalletCredit(scope, firstCandidate);
    expect(replay.status).toBe("replayed");
    expect(replay.appliedReceipt).toEqual(applied.appliedReceipt);
    expect(storage.setCalls).toBe(writesBeforeReplay);
    expect(storage.casCalls).toBe(casBeforeReplay);

    const restartedRepository = createOwnerRepository(storage, () => true, {
      materializeWalletCredit: createAuthority(),
    });
    const coldWritesBefore = storage.setCalls;
    const coldCasBefore = storage.casCalls;
    const coldReplay = await restartedRepository.commitWalletCredit(scope, firstCandidate);
    expect(coldReplay.status).toBe("replayed");
    expect(coldReplay.appliedReceipt).toEqual(applied.appliedReceipt);
    expect(storage.setCalls).toBe(coldWritesBefore);
    expect(storage.casCalls).toBe(coldCasBefore);
    await expect(restartedRepository.commitWalletCredit(scope, {
      ...firstCandidate,
      amountSubunits: firstCandidate.amountSubunits + 1,
    })).rejects.toThrow("owner_repository_wallet_credit_authorization_failed");
    expect(storage.setCalls).toBe(coldWritesBefore);
    expect(storage.casCalls).toBe(coldCasBefore);
  });

  it("credits a verified migrated V1 genesis without assuming repository revision equals journal sequence", async () => {
    const storage = new CommitStorage();
    storage.setOwner(scope);
    const repository = createOwnerRepository(storage, () => true, {
      materializeWalletCredit: createAuthority(),
    });
    const v1 = await repository.initialize(scope);
    expect(v1.root.schemaVersion).toBe("learning-v2-owner-repository-root.v1");
    const migrated = await repository.ensureV2(scope);
    expect(migrated.root).toMatchObject({ repositoryRevision: 1, journalSequence: 0 });
    const applied = await repository.commitWalletCredit(scope, firstCandidate);
    expect(applied.snapshot.root).toMatchObject({ repositoryRevision: 2, journalSequence: 1 });
    await expect(repository.loadV2(scope)).resolves.toEqual(applied.snapshot);
  });

  it("keeps the old root authoritative at every child-write cut and repairs on retry", async () => {
    const baseline = await createFixture();
    const baselineWrites = baseline.storage.setCalls;
    await baseline.repository.commitWalletCredit(scope, firstCandidate);
    const effectBlobWrites = baseline.storage.setCalls - baselineWrites;
    expect(effectBlobWrites).toBeGreaterThan(4);
    for (let offset = 1; offset <= effectBlobWrites; offset += 1) {
      const { storage, repository } = await createFixture();
      const rootKey = ownerRepositoryRootKey(accountScopeHash);
      const rootBefore = storage.values.get(rootKey);
      storage.failSetAt = storage.setCalls + offset;
      await expect(repository.commitWalletCredit(scope, firstCandidate))
        .rejects.toThrow("owner_repository_write_failed");
      expect(storage.values.get(rootKey)).toBe(rootBefore);
      const recovered = await repository.commitWalletCredit(scope, firstCandidate);
      expect(recovered.status).toBe("applied");
      expect(recovered.snapshot.root.journalSequence).toBe(1);
    }
    const silent = await createFixture();
    const silentRootKey = ownerRepositoryRootKey(accountScopeHash);
    const silentRootBefore = silent.storage.values.get(silentRootKey);
    const casBefore = silent.storage.casCalls;
    silent.storage.corruptNextSetWithoutThrow = true;
    await expect(silent.repository.commitWalletCredit(scope, firstCandidate))
      .rejects.toThrow("owner_repository_write_failed");
    expect(silent.storage.values.get(silentRootKey)).toBe(silentRootBefore);
    expect(silent.storage.casCalls).toBe(casBefore);
  });

  it("reconciles a lost CAS response and rejects a fake committed disposition", async () => {
    const lost = await createFixture();
    lost.storage.throwAfterCommittedCas = true;
    await expect(lost.repository.commitWalletCredit(scope, firstCandidate))
      .resolves.toMatchObject({ status: "applied", snapshot: { root: { journalSequence: 1 } } });

    const fake = await createFixture();
    const rootBefore = fake.storage.values.get(ownerRepositoryRootKey(accountScopeHash));
    fake.storage.acknowledgeCasWithoutWrite = true;
    await expect(fake.repository.commitWalletCredit(scope, firstCandidate))
      .rejects.toThrow("owner_repository_commit_indeterminate");
    expect(fake.storage.values.get(ownerRepositoryRootKey(accountScopeHash))).toBe(rootBefore);
  });

  it("fails cold load closed on every reachable projection, journal and selected radix node", async () => {
    const { storage, repository } = await createFixture();
    const applied = await repository.commitWalletCredit(scope, firstCandidate);
    const directKeys = [
      applied.snapshot.root.walletStateRef.blobKey,
      applied.snapshot.root.operationIndexManifestRef.blobKey,
      applied.snapshot.root.subjectIndexManifestRef.blobKey,
      applied.snapshot.root.receiptIndexManifestRef.blobKey,
      applied.snapshot.root.courseStateManifestRef.blobKey,
      applied.snapshot.root.journalHeadRef?.blobKey,
      applied.snapshot.root.previousRootFingerprint
        ? ownerRepositoryRootHistoryKey(
          accountScopeHash,
          applied.snapshot.root.previousRootFingerprint,
        )
        : undefined,
    ].filter((key): key is string => typeof key === "string");
    for (const key of directKeys) {
      const raw = storage.values.get(key);
      if (raw === undefined) throw new Error("missing reachable fixture");
      storage.values.delete(key);
      await expect(repository.loadV2(scope)).rejects.toThrow("owner_repository_indeterminate");
      storage.values.set(key, raw);
    }
    const radixKeys = [...storage.values.entries()]
      .filter(([, raw]) => {
        try { return JSON.parse(raw).kind === "index_radix_node"; } catch { return false; }
      })
      .map(([key]) => key);
    expect(radixKeys.length).toBeGreaterThan(0);
    for (const key of radixKeys) {
      const raw = storage.values.get(key)!;
      storage.values.delete(key);
      await expect(repository.loadV2(scope)).rejects.toThrow("owner_repository_indeterminate");
      storage.values.set(key, raw);
    }
  });

  it("rejects a self-consistent journal/root pair that cannot resolve its claimed parent root", async () => {
    const { storage, repository } = await createFixture();
    const applied = await repository.commitWalletCredit(scope, firstCandidate);
    const headRef = applied.snapshot.root.journalHeadRef;
    if (headRef === null) throw new Error("missing journal head fixture");
    const headRaw = storage.values.get(headRef.blobKey);
    if (headRaw === undefined) throw new Error("missing journal raw fixture");
    const parsed = parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash,
      ref: headRef,
      raw: headRaw,
    });
    if (parsed.record.recordKind !== "wallet_credit") throw new Error("wrong fixture kind");
    const record = parsed.record;
    const forgedParentFingerprint = hash("f");
    const forgedRecord = createOwnerRepositoryWalletCreditJournalRecord({
      accountScopeHash,
      journalSequence: record.journalSequence,
      repositoryRevisionBefore: record.repositoryRevisionBefore,
      rootBeforeFingerprint: forgedParentFingerprint,
      previousJournalRecordRef: record.previousJournalRecordRef,
      walletStateBeforeRef: record.walletStateBeforeRef,
      walletStateAfterRef: record.walletStateAfterRef,
      operationIndexManifestBeforeRef: record.operationIndexManifestBeforeRef,
      operationIndexManifestAfterRef: record.operationIndexManifestAfterRef,
      subjectIndexManifestBeforeRef: record.subjectIndexManifestBeforeRef,
      subjectIndexManifestAfterRef: record.subjectIndexManifestAfterRef,
      receiptIndexManifestBeforeRef: record.receiptIndexManifestBeforeRef,
      receiptIndexManifestAfterRef: record.receiptIndexManifestAfterRef,
      appliedReceipt: record.appliedReceipt,
    });
    const forgedHead = materializeOwnerRepositoryJournalRecordBlob(forgedRecord);
    storage.values.set(forgedHead.ref.blobKey, forgedHead.encoded);
    const { rootFingerprint: _discarded, ...rootBody } = applied.snapshot.root;
    const forgedRootBody = {
      ...rootBody,
      previousRootFingerprint: forgedParentFingerprint,
      journalHeadRef: forgedHead.ref,
    };
    const forgedRoot = {
      ...forgedRootBody,
      rootFingerprint: sha256Utf8(canonicalJsonV1(forgedRootBody)),
    };
    storage.values.set(ownerRepositoryRootKey(accountScopeHash), canonicalJsonV1(forgedRoot));
    await expect(repository.loadV2(scope)).rejects.toThrow("owner_repository_indeterminate");
  });

  it("classifies unsupported multi-record history and nonzero generation rollover explicitly", async () => {
    const { storage, repository } = await createFixture();
    const applied = await repository.commitWalletCredit(scope, firstCandidate);
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const { rootFingerprint: _oldFingerprint, ...currentBody } = applied.snapshot.root;
    const unsupportedBody = {
      ...currentBody,
      repositoryRevision: currentBody.repositoryRevision + 1,
      journalSequence: 2,
      previousRootFingerprint: applied.snapshot.root.rootFingerprint,
    };
    const unsupportedRoot = {
      ...unsupportedBody,
      rootFingerprint: sha256Utf8(canonicalJsonV1(unsupportedBody)),
    };
    storage.values.set(rootKey, canonicalJsonV1(unsupportedRoot));
    await expect(repository.loadV2(scope))
      .rejects.toThrow("owner_repository_history_upgrade_required");

    storage.values.set(rootKey, canonicalJsonV1(applied.snapshot.root));
    const nextScope = { accountScopeHash, generation: generation + 1 };
    storage.setOwner(nextScope);
    await expect(repository.ensureV2(nextScope))
      .rejects.toThrow("owner_repository_history_upgrade_required");
    expect(storage.values.get(rootKey)).toBe(canonicalJsonV1(applied.snapshot.root));
  });

  it("converges concurrent exact retries and reauthorizes a stale competing credit", async () => {
    const storage = new CommitStorage();
    storage.setOwner(scope);
    const authority = createAuthority();
    const first = createOwnerRepository(storage, () => true, { materializeWalletCredit: authority });
    const second = createOwnerRepository(storage, () => true, { materializeWalletCredit: authority });
    await first.ensureV2(scope);
    const exact = await Promise.all([
      first.commitWalletCredit(scope, firstCandidate),
      second.commitWalletCredit(scope, firstCandidate),
    ]);
    expect(exact.map((result) => result.status).sort()).toEqual(["applied", "replayed"]);
    expect(exact[0].appliedReceipt).toEqual(exact[1].appliedReceipt);

    const otherStorage = new CommitStorage();
    otherStorage.setOwner(scope);
    const otherAuthority = createAuthority();
    const left = createOwnerRepository(otherStorage, () => true, {
      materializeWalletCredit: otherAuthority,
    });
    const right = createOwnerRepository(otherStorage, () => true, {
      materializeWalletCredit: otherAuthority,
    });
    await left.ensureV2(scope);
    otherStorage.deferNextCas();
    const stale = left.commitWalletCredit(scope, firstCandidate);
    await otherStorage.waitForCasEntry();
    const winner = await right.commitWalletCredit(scope, secondCandidate);
    otherStorage.releaseCas();
    expect(winner.status).toBe("applied");
    await expect(stale).rejects.toThrow("owner_repository_wallet_credit_plan_reauthorize_required");
    const snapshot = await right.loadV2(scope);
    expect(snapshot?.walletState.balanceSubunits).toBe(secondCandidate.amountSubunits);
  });

  it("keeps alias replay write-free and atomically rejects an owner switch during CAS", async () => {
    const fixture = await createFixture();
    await fixture.repository.commitWalletCredit(scope, firstCandidate);
    const aliasCandidate = { ...firstCandidate, operationId: "wallet-credit-commit-alias" };
    const writesBeforeAlias = fixture.storage.setCalls;
    const casBeforeAlias = fixture.storage.casCalls;
    await expect(fixture.repository.commitWalletCredit(scope, aliasCandidate))
      .resolves.toMatchObject({ status: "alias_repair_required" });
    expect(fixture.storage.setCalls).toBe(writesBeforeAlias);
    expect(fixture.storage.casCalls).toBe(casBeforeAlias);

    const switched = await createFixture();
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const rootBefore = switched.storage.values.get(rootKey);
    switched.storage.deferNextCas();
    const committing = switched.repository.commitWalletCredit(scope, firstCandidate);
    await switched.storage.waitForCasEntry();
    switched.storage.setOwner({ accountScopeHash: "bbbbbbbbbbbbbbbb", generation: 5 });
    switched.storage.releaseCas();
    await expect(committing).rejects.toThrow("owner_repository_generation_stale");
    expect(switched.storage.values.get(rootKey)).toBe(rootBefore);
  });
});
