import {
  WALLET_SUBUNITS_PER_STAR,
  type WalletAuthorizedOperationV1,
} from "../modules/learning-v2/contracts/wallet";
import {
  createRequiredSessionWalletCreditAuthority,
  materializeRequiredSessionCreditSettlementCandidate,
  parseRequiredSessionCreditSettlementRaw,
} from "../modules/learning-v2/progress/required_session_credit_settlement";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import {
  createOwnerRepository,
  type OwnerRepositoryCasStorage,
} from "../modules/learning-v2/progress/owner_repository";
import {
  hashCanonicalBody,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const settledCandidate = (stars = 36) => {
  const body = {
    schemaVersion:
      "learning-v2-required-session-task-slots-settled-candidate.v1" as const,
    candidateAuthority: "untrusted_local" as const,
    accountScopeHash,
    accountGeneration: 4,
    courseId: "english-core",
    studyTarget: "en",
    courseReleaseId: "english-core-release-1",
    sessionSetId: "english-core-set-1",
    sessionSetHash: sha256Utf8("session-set"),
    catalogFingerprint: sha256Utf8("catalog"),
    requiredSessionOrdinal: 1,
    sessionId: "english-core-session-1",
    sessionRunId: "english-core-run-1",
    runKindClaim: "initial" as const,
    taskCandidateFingerprints: Array.from({ length: 12 }, (_, index) =>
      sha256Utf8(`task-${index + 1}`),
    ),
    projectedBasePerformanceStars: stars,
    projectedLearnerErrorCount: 0,
    projectedHintCount: 0,
    skipCount: stars === 0 ? 12 : 0,
    initialCreditSubjectFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-initial-session-credit-subject.v1",
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
      requiredSessionOrdinal: 1,
    }),
  };
  return { ...body, candidateFingerprint: hashCanonicalBody(body) };
};

const materialized = (stars = 36) =>
  materializeRequiredSessionCreditSettlementCandidate({
    settlementId: "required-session-settlement-1",
    operationId: "required-session-credit-operation-1",
    walletRevisionBefore: 0,
    settledCandidate: settledCandidate(stars),
  });

const request = (candidateFingerprint: string) => ({
  schemaVersion: "learning-v2-required-session-credit-request.v1" as const,
  settlementId: "required-session-settlement-1",
  candidateFingerprint,
});

describe("Learning V2 required-session durable credit settlement", () => {
  it("derives exact credited economics and strict canonical storage bytes", () => {
    const record = materialized();
    expect(record).toMatchObject({
      authority: "structural_candidate",
      settlement: {
        outcome: "credited",
        walletRevisionBefore: 0,
        authorizedOperation: {
          amountSubunits: 36 * WALLET_SUBUNITS_PER_STAR,
          operationReason: "initial_required_session",
          accountGeneration: 4,
          sourceReceiptRef: {
            receiptType: "required_session_credit_settlement",
            receiptId: "required-session-settlement-1",
          },
        },
      },
    });
    expect(
      record.settlement.authorizedOperation?.sourceReceiptRef
        .receiptFingerprint,
    ).toBe(record.settlement.settlementFingerprint);
    expect(parseRequiredSessionCreditSettlementRaw(record.encoded)).toEqual(
      record,
    );
    expect(Object.isFrozen(record.settlement.settledCandidate)).toBe(true);
  });

  it("keeps a zero-star settlement canonical but unable to mint a wallet effect", async () => {
    const record = materialized(0);
    expect(record.settlement).toMatchObject({
      outcome: "zero_credit",
      authorizedOperation: null,
    });
    const authority = createRequiredSessionWalletCreditAuthority({
      resolveSettlement: () => record.encoded,
    });
    await expect(
      authority({
        scope: { accountScopeHash, generation: 4 },
        walletState: createWalletState({ accountScopeHash }),
        canonicalAppliedReceipt: null,
        candidate: request(record.settlement.settledCandidate.candidateFingerprint),
      }),
    ).rejects.toThrow("required_session_credit_settlement_conflict");
  });

  it("rejects self-hashed settled summaries that contradict derived session coordinates", () => {
    const original = settledCandidate();
    const wrongSubjectBody = {
      ...original,
      initialCreditSubjectFingerprint: sha256Utf8("wrong-subject"),
    };
    delete (wrongSubjectBody as { candidateFingerprint?: string })
      .candidateFingerprint;
    const wrongSubject = {
      ...wrongSubjectBody,
      candidateFingerprint: hashCanonicalBody(wrongSubjectBody),
    };
    expect(() =>
      materializeRequiredSessionCreditSettlementCandidate({
        settlementId: "required-session-settlement-1",
        operationId: "required-session-credit-operation-1",
        walletRevisionBefore: 0,
        settledCandidate: wrongSubject,
      }),
    ).toThrow("required_session_credit_settlement_invalid");

    const zero = settledCandidate(0);
    const impossibleStarsBody = { ...zero, projectedBasePerformanceStars: 1 };
    delete (impossibleStarsBody as { candidateFingerprint?: string })
      .candidateFingerprint;
    expect(() =>
      materializeRequiredSessionCreditSettlementCandidate({
        settlementId: "required-session-settlement-1",
        operationId: "required-session-credit-operation-1",
        walletRevisionBefore: 0,
        settledCandidate: {
          ...impossibleStarsBody,
          candidateFingerprint: hashCanonicalBody(impossibleStarsBody),
        },
      }),
    ).toThrow("required_session_credit_settlement_invalid");
  });

  it("resolves only exact protected bytes and returns the same operation after restart", async () => {
    const record = materialized();
    const calls: unknown[] = [];
    const authority = createRequiredSessionWalletCreditAuthority({
      resolveSettlement: (input: unknown) => {
        calls.push(input);
        return record.encoded;
      },
    });
    const wallet = createWalletState({ accountScopeHash });
    const candidate = request(
      record.settlement.settledCandidate.candidateFingerprint,
    );
    const operation = (await authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: wallet,
      canonicalAppliedReceipt: null,
      candidate,
    })) as WalletAuthorizedOperationV1;
    const receipt = reduceAuthorizedWalletOperation(wallet, operation, {
      currentAccountGeneration: 4,
    }).appliedReceipt;
    const replayed = await createRequiredSessionWalletCreditAuthority({
      resolveSettlement: () => record.encoded,
    })({
      scope: { accountScopeHash, generation: 5 },
      walletState: createWalletState({ accountScopeHash }),
      canonicalAppliedReceipt: receipt,
      candidate,
    });
    expect(replayed).toEqual(operation);
    expect(calls).toEqual([
      { accountScopeHash, settlementId: "required-session-settlement-1" },
    ]);
  });

  it("authorizes a different durable settlement after an unrelated canonical receipt", async () => {
    const first = materialized();
    const firstWallet = createWalletState({ accountScopeHash });
    const firstOperation = first.settlement.authorizedOperation!;
    const firstReduction = reduceAuthorizedWalletOperation(
      firstWallet,
      firstOperation,
      { currentAccountGeneration: 4 },
    );
    const second = materializeRequiredSessionCreditSettlementCandidate({
      settlementId: "required-session-settlement-2",
      operationId: "required-session-credit-operation-2",
      walletRevisionBefore: 1,
      settledCandidate: settledCandidate(),
    });
    const authority = createRequiredSessionWalletCreditAuthority({
      resolveSettlement: ({ settlementId }: { settlementId: string }) => {
        if (settlementId !== "required-session-settlement-2") {
          throw new Error("unexpected settlement");
        }
        return second.encoded;
      },
    });
    const authorized = await authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: firstReduction.state,
      canonicalAppliedReceipt: firstReduction.appliedReceipt,
      candidate: {
        schemaVersion: "learning-v2-required-session-credit-request.v1",
        settlementId: "required-session-settlement-2",
        candidateFingerprint:
          second.settlement.settledCandidate.candidateFingerprint,
      },
    });
    expect(authorized).toEqual(second.settlement.authorizedOperation);
  });

  it("fails closed on candidate, scope, revision, stored-byte and receipt conflicts", async () => {
    const record = materialized();
    const wallet = createWalletState({ accountScopeHash });
    const exactRequest = request(
      record.settlement.settledCandidate.candidateFingerprint,
    );
    const cases: Array<{
      raw: unknown;
      candidate: unknown;
      generation?: number;
      walletRevision?: number;
    }> = [
      { raw: `${record.encoded} `, candidate: exactRequest },
      {
        raw: record.encoded,
        candidate: { ...exactRequest, candidateFingerprint: sha256Utf8("other") },
      },
      { raw: record.encoded, candidate: exactRequest, generation: 5 },
      { raw: record.encoded, candidate: exactRequest, walletRevision: 1 },
    ];
    for (const current of cases) {
      const authority = createRequiredSessionWalletCreditAuthority({
        resolveSettlement: () => current.raw,
      });
      await expect(
        authority({
          scope: {
            accountScopeHash,
            generation: current.generation ?? 4,
          },
          walletState: {
            ...wallet,
            revision: current.walletRevision ?? wallet.revision,
          },
          canonicalAppliedReceipt: null,
          candidate: current.candidate,
        }),
      ).rejects.toThrow(/required_session_credit_settlement/);
    }
  });

  it("does not execute hostile option or request accessors", async () => {
    let getterRuns = 0;
    const hostileOptions = Object.defineProperty({}, "resolveSettlement", {
      enumerable: true,
      get: () => {
        getterRuns += 1;
        return () => materialized().encoded;
      },
    });
    expect(() =>
      createRequiredSessionWalletCreditAuthority(hostileOptions),
    ).toThrow("required_session_credit_authority_invalid");
    expect(getterRuns).toBe(0);

    const record = materialized();
    const authority = createRequiredSessionWalletCreditAuthority({
      resolveSettlement: () => record.encoded,
    });
    const hostileRequest = Object.defineProperty(
      {
        schemaVersion: "learning-v2-required-session-credit-request.v1",
        settlementId: "required-session-settlement-1",
      },
      "candidateFingerprint",
      {
        enumerable: true,
        get: () => {
          getterRuns += 1;
          return record.settlement.settledCandidate.candidateFingerprint;
        },
      },
    );
    await expect(
      authority({
        scope: { accountScopeHash, generation: 4 },
        walletState: createWalletState({ accountScopeHash }),
        canonicalAppliedReceipt: null,
        candidate: hostileRequest,
      }),
    ).rejects.toThrow("required_session_credit_request_invalid");
    expect(getterRuns).toBe(0);
  });

  it("drives one durable repository credit and replays it write-free after restart", async () => {
    const record = materialized();
    const values = new Map<string, string>();
    let setCalls = 0;
    let casCalls = 0;
    const storage: OwnerRepositoryCasStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => {
        setCalls += 1;
        values.set(key, value);
      },
      getCurrentOwnerFence: async () => ({
        accountScopeHash,
        generation: 4,
      }),
      compareAndSet: async (key, expected, next, fence) => {
        casCalls += 1;
        if (
          fence.accountScopeHash !== accountScopeHash ||
          fence.generation !== 4
        )
          return "stale_generation";
        if ((values.get(key) ?? null) !== expected) return "conflict";
        values.set(key, next);
        return "committed";
      },
    };
    const authority = () =>
      createRequiredSessionWalletCreditAuthority({
        resolveSettlement: () => record.encoded,
      });
    const repository = createOwnerRepository(storage, () => true, {
      materializeWalletCredit: authority(),
    });
    const scope = { accountScopeHash, generation: 4 } as const;
    await repository.initialize(scope);
    await repository.ensureV2(scope);
    const candidate = request(
      record.settlement.settledCandidate.candidateFingerprint,
    );
    const applied = await repository.commitWalletCredit(scope, candidate);
    expect(applied).toMatchObject({
      status: "applied",
      snapshot: {
        walletState: {
          balanceSubunits: 36 * WALLET_SUBUNITS_PER_STAR,
          revision: 1,
        },
      },
    });
    const writesBeforeReplay = setCalls;
    const casBeforeReplay = casCalls;
    const restarted = createOwnerRepository(storage, () => true, {
      materializeWalletCredit: authority(),
    });
    const replayed = await restarted.commitWalletCredit(scope, candidate);
    expect(replayed.status).toBe("replayed");
    expect(replayed.appliedReceipt).toEqual(applied.appliedReceipt);
    expect(setCalls).toBe(writesBeforeReplay);
    expect(casCalls).toBe(casBeforeReplay);
  });
});
