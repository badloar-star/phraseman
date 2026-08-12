import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
  legacyWholeStarsToSubunits,
  projectRepeatRewardSubunits,
} from "../modules/learning-v2/contracts/wallet";
import {
  MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD,
  createWalletOperationAliasLedgerEntry,
  createWalletState,
  parseWalletOperationAliasLedgerEntry,
  parseWalletState,
  rebuildWalletStateFromAppliedReceipts,
  reduceAuthorizedWalletOperation,
  selectWalletPublicProjection,
} from "../modules/learning-v2/progress/wallet_reducer";
import { canonicalJsonV1, hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const hash = (character: string): string => character.repeat(64);
const accountScopeHash = "aaaaaaaaaaaaaaaa";
const accountGeneration = 4;
const SOURCE_TYPE_BY_REASON = {
  initial_required_session: "required_session_credit_settlement",
  repeat_session: "repeat_reward_settlement",
  plan_completion: "plan_reward_settlement",
  dictionary_activity: "dictionary_reward_settlement",
  irregular_verbs_activity: "irregular_verbs_reward_settlement",
  tournament_reward: "tournament_reward",
  coin_exchange: "coin_exchange_trade",
  legacy_opening_balance: "legacy_wallet_snapshot",
} as const;
const sourceTypeByReason = (reason: keyof typeof SOURCE_TYPE_BY_REASON) => SOURCE_TYPE_BY_REASON[reason];

const operation = (overrides: Partial<{
  operationId: string;
  semanticSubjectFingerprint: string;
  accountScopeHash: string;
  accountGeneration: number;
  kind: "earning_credit" | "external_credit" | "legacy_opening_import";
  amountSubunits: number;
  earningCategory: "lesson" | "repeat" | "plan" | "dictionary" | "irregular_verbs" | "tournament" | null;
  operationReason: "initial_required_session" | "repeat_session" | "plan_completion" | "dictionary_activity" | "irregular_verbs_activity" | "tournament_reward" | "coin_exchange" | "legacy_opening_balance";
  sourceReceiptFingerprint: string;
  sourceReceiptId: string;
  origin: Record<string, unknown>;
  walletRevisionBefore: number;
}> = {}) => {
  const operationReason = overrides.operationReason ?? "initial_required_session";
  const operationAccountScopeHash = overrides.accountScopeHash ?? accountScopeHash;
  const sourceReceiptRef = {
    receiptType: sourceTypeByReason(operationReason),
    receiptId: overrides.sourceReceiptId ?? `source-${overrides.semanticSubjectFingerprint ?? "wallet-operation-1"}`,
    receiptFingerprint: overrides.sourceReceiptFingerprint ?? hash("c"),
  } as const;
  return createWalletAuthorizedOperation({
  schemaVersion: "learning-v2-wallet-authorized-operation.v1",
  authority: "trusted_server_boundary",
  operationId: overrides.operationId ?? "wallet-operation-1",
  semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
    accountScopeHash: operationAccountScopeHash,
    operationReason,
    sourceReceiptRef,
  }),
  accountScopeHash: operationAccountScopeHash,
  accountGeneration: overrides.accountGeneration ?? accountGeneration,
  currency: "access_star",
  kind: overrides.kind ?? "earning_credit",
  amountSubunits: overrides.amountSubunits ?? 36 * WALLET_SUBUNITS_PER_STAR,
  earningCategory: overrides.earningCategory === undefined ? "lesson" : overrides.earningCategory,
  operationReason,
  sourceReceiptRef,
  walletRevisionBefore: overrides.walletRevisionBefore ?? 0,
  origin: overrides.origin ?? {
    kind: "course",
    courseId: "english-core",
    studyTarget: "en",
    requiredSessionOrdinal: 1,
  },
  });
};

const emptyLookup = () => ({
  currentAccountGeneration: accountGeneration,
});

describe("Learning V2 account-global wallet reducer", () => {
  it("binds a transport alias to its full authorized operation and canonical receipt", () => {
    const canonical = operation();
    const first = reduceAuthorizedWalletOperation(
      createWalletState({ accountScopeHash }),
      canonical,
      emptyLookup(),
    );
    const alias = operation({
      operationId: "wallet-operation-alias-1",
      sourceReceiptId: canonical.sourceReceiptRef.receiptId,
      sourceReceiptFingerprint:
        canonical.sourceReceiptRef.receiptFingerprint,
      walletRevisionBefore: 1,
    });
    const entry = createWalletOperationAliasLedgerEntry({
      authorizedAliasOperation: alias,
      appliedReceipt: first.appliedReceipt,
    });
    expect(parseWalletOperationAliasLedgerEntry(entry)).toEqual(entry);
    expect(entry).toMatchObject({
      operationId: alias.operationId,
      operationFingerprint: alias.operationFingerprint,
      canonicalOperationId: canonical.operationId,
      authorizedAliasOperation: alias,
    });
    const replay = reduceAuthorizedWalletOperation(first.state, alias, {
      currentAccountGeneration: accountGeneration,
      operationLedgerEntry: entry,
      subjectLedgerEntry: first.subjectLedgerEntry,
    });
    expect(replay).toMatchObject({
      changed: false,
      ledgerWriteRequired: false,
      appliedReceipt: first.appliedReceipt,
    });
    expect(() =>
      parseWalletOperationAliasLedgerEntry({
        ...entry,
        authorizedAliasOperation: operation({
          operationId: "different-alias",
          sourceReceiptId: canonical.sourceReceiptRef.receiptId,
          sourceReceiptFingerprint:
            canonical.sourceReceiptRef.receiptFingerprint,
          walletRevisionBefore: 1,
        }),
      }),
    ).toThrow("wallet_ledger_invalid");
  });

  it("keeps wallet identity account-global and language only in operation provenance", () => {
    let state = createWalletState({ accountScopeHash });
    const english = operation({ operationId: "earn-en", semanticSubjectFingerprint: hash("1") });
    const spanish = operation({
      operationId: "earn-es",
      semanticSubjectFingerprint: hash("2"),
      walletRevisionBefore: 1,
      origin: { kind: "course", courseId: "spanish-core", studyTarget: "es", requiredSessionOrdinal: 1 },
    });
    state = reduceAuthorizedWalletOperation(state, english, emptyLookup()).state;
    state = reduceAuthorizedWalletOperation(state, spanish, emptyLookup()).state;
    expect(state.accountScopeHash).toBe(accountScopeHash);
    expect(state).not.toHaveProperty("accountGeneration");
    expect(state).not.toHaveProperty("studyTarget");
    expect(state.balanceSubunits).toBe(72 * WALLET_SUBUNITS_PER_STAR);
    expect(state.earnedByCategorySubunits.lesson).toBe(72 * WALLET_SUBUNITS_PER_STAR);
  });

  it("keeps exactly six earnings categories and separates exchange/import counters", () => {
    let state = createWalletState({ accountScopeHash });
    state = reduceAuthorizedWalletOperation(state, operation({
      operationId: "coin-trade",
      semanticSubjectFingerprint: hash("3"),
      kind: "external_credit",
      amountSubunits: 5 * WALLET_SUBUNITS_PER_STAR,
      earningCategory: null,
      operationReason: "coin_exchange",
      origin: { kind: "coin_exchange", tradeId: "trade-1" },
    }), emptyLookup()).state;
    state = reduceAuthorizedWalletOperation(state, operation({
      operationId: "legacy-import",
      semanticSubjectFingerprint: hash("4"),
      walletRevisionBefore: 1,
      kind: "legacy_opening_import",
      amountSubunits: legacyWholeStarsToSubunits(100),
      earningCategory: null,
      operationReason: "legacy_opening_balance",
      origin: { kind: "legacy_opening", importVersion: 1, sourceSnapshotFingerprint: hash("d") },
    }), emptyLookup()).state;
    expect(Object.keys(state.earnedByCategorySubunits).sort()).toEqual([
      "dictionary", "irregular_verbs", "lesson", "plan", "repeat", "tournament",
    ]);
    expect(Object.values(state.earnedByCategorySubunits).every((value) => value === 0)).toBe(true);
    expect(state.externalCreditSubunits).toBe(5 * WALLET_SUBUNITS_PER_STAR);
    expect(state.importedOpeningSubunits).toBe(100 * WALLET_SUBUNITS_PER_STAR);
    expect(state.spentSubunits).toBe(0);
    expect(state.balanceSubunits).toBe(105 * WALLET_SUBUNITS_PER_STAR);
    const projection = selectWalletPublicProjection(state);
    expect(Object.keys(projection.earnedByCategorySubunits)).toHaveLength(6);
    expect(projection).not.toHaveProperty("externalCreditSubunits");
    expect(projection).not.toHaveProperty("importedOpeningSubunits");
    expect(projection).not.toHaveProperty("spentSubunits");
  });

  it("uses immutable operation and semantic ledgers for exact replay and conflict", () => {
    const state = createWalletState({ accountScopeHash });
    const authorized = operation();
    const first = reduceAuthorizedWalletOperation(state, authorized, emptyLookup());
    expect(first.ledgerWriteRequired).toBe(true);
    const exactLookup = {
      currentAccountGeneration: accountGeneration,
      operationLedgerEntry: first.operationLedgerEntry,
      subjectLedgerEntry: first.subjectLedgerEntry,
    };
    const replay = reduceAuthorizedWalletOperation(first.state, authorized, exactLookup);
    expect(replay.changed).toBe(false);
    expect(replay.ledgerWriteRequired).toBe(false);
    expect(replay.appliedReceipt).toEqual(first.appliedReceipt);
    const alias = operation({ operationId: "transport-alias" });
    const semanticReplay = reduceAuthorizedWalletOperation(first.state, alias, {
      currentAccountGeneration: accountGeneration,
      subjectLedgerEntry: first.subjectLedgerEntry,
    });
    expect(semanticReplay.changed).toBe(false);
    expect(semanticReplay.ledgerWriteRequired).toBe(true);
    expect(semanticReplay.operationLedgerEntry.operationId).toBe("transport-alias");
    expect(semanticReplay.operationLedgerEntry.canonicalOperationId).toBe(authorized.operationId);
    const missingSubject = reduceAuthorizedWalletOperation(first.state, authorized, {
      currentAccountGeneration: accountGeneration,
      operationLedgerEntry: first.operationLedgerEntry,
    });
    expect(missingSubject.ledgerWriteRequired).toBe(true);
    expect(() => reduceAuthorizedWalletOperation(first.state, operation({ amountSubunits: 35 * WALLET_SUBUNITS_PER_STAR }), exactLookup)).toThrow("wallet_operation_conflict");
    expect(() => reduceAuthorizedWalletOperation(first.state, operation({ semanticSubjectFingerprint: hash("e") }), exactLookup)).toThrow("wallet_operation_conflict");
  });

  it("rejects a canonical operation alias conflict and a poisoned canonical ledger key", () => {
    const initial = createWalletState({ accountScopeHash });
    const canonical = operation();
    const applied = reduceAuthorizedWalletOperation(initial, canonical, emptyLookup());
    const changedFingerprintForCanonicalId = operation({
      operationId: canonical.operationId,
      accountGeneration: accountGeneration + 1,
    });
    expect(() => reduceAuthorizedWalletOperation(applied.state, changedFingerprintForCanonicalId, {
      currentAccountGeneration: accountGeneration + 1,
      subjectLedgerEntry: applied.subjectLedgerEntry,
    })).toThrow("wallet_operation_conflict");

    expect(() => reduceAuthorizedWalletOperation(applied.state, canonical, {
      currentAccountGeneration: accountGeneration,
      operationLedgerEntry: {
        ...applied.operationLedgerEntry,
        operationFingerprint: hash("f"),
      },
    })).toThrow("wallet_ledger_invalid");
  });

  it("repairs a subject-ledger projection across generations and persists the transport alias", () => {
    const initial = createWalletState({ accountScopeHash });
    const canonical = operation({ operationId: "generation-4-canonical" });
    const applied = reduceAuthorizedWalletOperation(initial, canonical, emptyLookup());
    const nextGenerationAlias = operation({
      operationId: "generation-5-alias",
      accountGeneration: accountGeneration + 1,
    });
    const repaired = reduceAuthorizedWalletOperation(initial, nextGenerationAlias, {
      currentAccountGeneration: accountGeneration + 1,
      subjectLedgerEntry: applied.subjectLedgerEntry,
    });
    expect(repaired.changed).toBe(true);
    expect(repaired.state).toEqual(applied.state);
    expect(repaired.appliedReceipt).toEqual(applied.appliedReceipt);
    expect(repaired.ledgerWriteRequired).toBe(true);
    expect(repaired.operationLedgerEntry).toMatchObject({
      operationId: "generation-5-alias",
      canonicalOperationId: "generation-4-canonical",
      operationFingerprint: nextGenerationAlias.operationFingerprint,
    });
  });

  it("replays historical operations after later credits and repairs a ledger-first projection", () => {
    const initial = createWalletState({ accountScopeHash });
    const authorizedA = operation({ operationId: "history-a", semanticSubjectFingerprint: hash("1") });
    const appliedA = reduceAuthorizedWalletOperation(initial, authorizedA, emptyLookup());
    const authorizedB = operation({
      operationId: "history-b",
      semanticSubjectFingerprint: hash("2"),
      walletRevisionBefore: 1,
    });
    const appliedB = reduceAuthorizedWalletOperation(appliedA.state, authorizedB, emptyLookup());
    const lookupA = {
      currentAccountGeneration: accountGeneration,
      operationLedgerEntry: appliedA.operationLedgerEntry,
      subjectLedgerEntry: appliedA.subjectLedgerEntry,
    };
    const historical = reduceAuthorizedWalletOperation(appliedB.state, authorizedA, lookupA);
    expect(historical.changed).toBe(false);
    expect(historical.state).toEqual(appliedB.state);
    expect(historical.appliedReceipt).toEqual(appliedA.appliedReceipt);
    const alias = operation({ operationId: "history-a-alias", semanticSubjectFingerprint: hash("1") });
    const semanticReplay = reduceAuthorizedWalletOperation(appliedB.state, alias, {
      currentAccountGeneration: accountGeneration,
      subjectLedgerEntry: appliedA.subjectLedgerEntry,
    });
    expect(semanticReplay.changed).toBe(false);
    expect(semanticReplay.state).toEqual(appliedB.state);
    expect(semanticReplay.appliedReceipt).toEqual(appliedA.appliedReceipt);
    const repaired = reduceAuthorizedWalletOperation(initial, authorizedA, lookupA);
    expect(repaired.changed).toBe(true);
    expect(repaired.state).toEqual(appliedA.state);
    expect(repaired.appliedReceipt).toEqual(appliedA.appliedReceipt);
  });

  it("pins every earning reason to exactly one public category", () => {
    const mapping = [
      ["initial_required_session", "lesson"],
      ["repeat_session", "repeat"],
      ["plan_completion", "plan"],
      ["dictionary_activity", "dictionary"],
      ["irregular_verbs_activity", "irregular_verbs"],
      ["tournament_reward", "tournament"],
    ] as const;
    for (const [operationReason, earningCategory] of mapping) {
      const origin = operationReason === "tournament_reward"
        ? { kind: "tournament", tournamentId: "tournament-1" }
        : { kind: "course", courseId: "english-core", studyTarget: "en", requiredSessionOrdinal: 1 };
      expect(() => operation({ operationReason, earningCategory, origin })).not.toThrow();
      const wrongCategory = earningCategory === "lesson" ? "repeat" : "lesson";
      expect(() => operation({ operationReason, earningCategory: wrongCategory, origin })).toThrow("wallet_operation_invalid");
    }
  });

  it("rejects forged ledger receipts and keeps sufficient immutable audit provenance", () => {
    const state = createWalletState({ accountScopeHash });
    const authorized = operation();
    const first = reduceAuthorizedWalletOperation(state, authorized, emptyLookup());
    expect(first.appliedReceipt.authorizedOperation).toEqual(authorized);
    const forgedOperationEntry = {
      ...first.operationLedgerEntry,
      appliedReceipt: {
        ...first.appliedReceipt,
        amountSubunits: 1,
      },
    };
    expect(() => reduceAuthorizedWalletOperation(first.state, authorized, {
      currentAccountGeneration: accountGeneration,
      operationLedgerEntry: forgedOperationEntry,
      subjectLedgerEntry: first.subjectLedgerEntry,
    })).toThrow("wallet_ledger_invalid");
    let lookupGetterCalled = false;
    const hostileLookup = Object.defineProperty({ currentAccountGeneration: accountGeneration }, "operationLedgerEntry", {
      enumerable: true,
      get: () => {
        lookupGetterCalled = true;
        return first.operationLedgerEntry;
      },
    });
    expect(() => reduceAuthorizedWalletOperation(first.state, authorized,
      hostileLookup as Parameters<typeof reduceAuthorizedWalletOperation>[2])).toThrow("wallet_ledger_invalid");
    expect(lookupGetterCalled).toBe(false);
    expect(() => reduceAuthorizedWalletOperation(first.state, authorized, {
      currentAccountGeneration: accountGeneration,
      ["x".repeat(70_000)]: true,
    } as unknown as Parameters<typeof reduceAuthorizedWalletOperation>[2])).toThrow("wallet_ledger_invalid");
    for (const [field, malformed] of [
      ["operationLedgerEntry", null],
      ["operationLedgerEntry", false],
      ["subjectLedgerEntry", 0],
      ["subjectLedgerEntry", ""],
    ] as const) {
      expect(() => reduceAuthorizedWalletOperation(first.state, operation({
        operationId: `malformed-${String(malformed)}`,
        walletRevisionBefore: 1,
      }), {
        currentAccountGeneration: accountGeneration,
        [field]: malformed,
      })).toThrow("wallet_ledger_invalid");
    }

    const { semanticFingerprint: _semantic, operationFingerprint: _operation, ...bodyOnly } = first.appliedReceipt.authorizedOperation;
    const malformedReceiptBody = {
      ...first.appliedReceipt,
      authorizedOperation: bodyOnly,
    };
    const malformedReceipt = {
      ...malformedReceiptBody,
      appliedReceiptFingerprint: hashCanonicalBody(
        Object.fromEntries(Object.entries(malformedReceiptBody).filter(([key]) => key !== "appliedReceiptFingerprint")),
      ),
    };
    expect(() => reduceAuthorizedWalletOperation(first.state, authorized, {
      currentAccountGeneration: accountGeneration,
      operationLedgerEntry: {
        ...first.operationLedgerEntry,
        appliedReceipt: malformedReceipt as unknown as typeof first.appliedReceipt,
      },
    })).toThrow("wallet_ledger_invalid");
    expect(() => reduceAuthorizedWalletOperation(first.state, authorized, {
      currentAccountGeneration: accountGeneration,
      operationLedgerEntry: first.operationLedgerEntry,
      subjectLedgerEntry: { ...first.subjectLedgerEntry, canonicalOperationId: "other" },
    })).toThrow("wallet_ledger_invalid");
  });

  it("rejects stale generation, unsafe values and preserves revision/CAS handoff", () => {
    const state = createWalletState({ accountScopeHash });
    expect(() => reduceAuthorizedWalletOperation(state, operation(), { ...emptyLookup(), currentAccountGeneration: 5 })).toThrow("wallet_generation_stale");
    expect(() => createWalletAuthorizedOperation({ ...(operation() as unknown as Record<string, unknown>), amountSubunits: Number.MAX_SAFE_INTEGER })).toThrow("wallet_operation_invalid");
    expect(() => legacyWholeStarsToSubunits(-1)).toThrow("legacy_wallet_balance_invalid");
    expect(() => legacyWholeStarsToSubunits(1.5)).toThrow("legacy_wallet_balance_invalid");
    const first = reduceAuthorizedWalletOperation(state, operation(), emptyLookup());
    const competing = reduceAuthorizedWalletOperation(state, operation({ operationId: "competing", semanticSubjectFingerprint: hash("f") }), emptyLookup());
    expect(first).toMatchObject({ expectedRevision: 0, nextRevision: 1 });
    expect(competing).toMatchObject({ expectedRevision: 0, nextRevision: 1 });
    expect(parseWalletState(first.state).revision).toBe(1);
    expect(() => parseWalletState({ ...first.state, revision: 0 })).toThrow("wallet_state_invalid");
  });

  it("preserves approved repeat percentages exactly without classifying quality", () => {
    expect(WALLET_SUBUNITS_PER_STAR).toBe(10_000);
    const table = [
      [45, 2_000, 9], [45, 1_200, 5.4], [45, 500, 2.25], [45, 0, 0],
      [55, 2_000, 11], [55, 1_200, 6.6], [55, 500, 2.75],
      [65, 2_000, 13], [65, 1_200, 7.8], [65, 500, 3.25],
    ] as const;
    for (const [referenceNextPriceStars, rateBasisPoints, expectedStars] of table) {
      expect(projectRepeatRewardSubunits({
        referenceNextPriceStars,
        rateBasisPoints,
        policyFingerprint: hash("a"),
      })).toEqual(expect.objectContaining({
        rewardSubunits: expectedStars * WALLET_SUBUNITS_PER_STAR,
        referenceNextPriceStars,
        rateBasisPoints,
      }));
    }
    expect(() => projectRepeatRewardSubunits({ referenceNextPriceStars: 65, rateBasisPoints: 1_111, policyFingerprint: hash("a") })).toThrow("repeat_reward_rate_unapproved");
    expect(() => projectRepeatRewardSubunits({ referenceNextPriceStars: 0, rateBasisPoints: 2_000, policyFingerprint: hash("a") })).toThrow("repeat_reward_price_invalid");
    expect(projectRepeatRewardSubunits({ referenceNextPriceStars: 45, rateBasisPoints: 1_200, policyFingerprint: hash("a") })).not.toHaveProperty("qualityBand");
  });

  it("strictly validates kind/category/provenance combinations and zero rules", () => {
    expect(() => operation({ kind: "external_credit", earningCategory: "lesson", operationReason: "coin_exchange", origin: { kind: "coin_exchange", tradeId: "trade-1" } })).toThrow("wallet_operation_invalid");
    expect(() => operation({ amountSubunits: 0 })).toThrow("wallet_operation_invalid");
    expect(() => operation({ kind: "legacy_opening_import", amountSubunits: 0, earningCategory: null, operationReason: "legacy_opening_balance", origin: { kind: "legacy_opening", importVersion: 1, sourceSnapshotFingerprint: hash("d") } })).not.toThrow();
    expect(() => reduceAuthorizedWalletOperation(
      createWalletState({ accountScopeHash }),
      { candidateAuthority: "server_materialized", amountSubunits: WALLET_SUBUNITS_PER_STAR },
      emptyLookup(),
    )).toThrow("wallet_operation_invalid");
    let getterCalled = false;
    const hostile = Object.defineProperty({}, "schemaVersion", {
      enumerable: true,
      get: () => {
        getterCalled = true;
        return "learning-v2-wallet-authorized-operation.v1";
      },
    });
    expect(() => createWalletAuthorizedOperation(hostile)).toThrow("wallet_operation_invalid");
    expect(getterCalled).toBe(false);
    expect(() => createWalletAuthorizedOperation({ ...operation(), ["x".repeat(70_000)]: 1 })).toThrow("wallet_operation_invalid");
  });

  it("detaches and deep-freezes state, operation, receipt, ledgers and selector", () => {
    const state = createWalletState({ accountScopeHash });
    const authorized = operation();
    const result = reduceAuthorizedWalletOperation(state, authorized, emptyLookup());
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.earnedByCategorySubunits)).toBe(true);
    expect(Object.isFrozen(authorized)).toBe(true);
    expect(Object.isFrozen(authorized.origin)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.appliedReceipt)).toBe(true);
    expect(Object.isFrozen(result.operationLedgerEntry)).toBe(true);
    expect(Object.isFrozen(result.subjectLedgerEntry)).toBe(true);
    expect(Object.isFrozen(selectWalletPublicProjection(result.state))).toBe(true);
  });

  it("rebuilds the account-global projection from self-contained receipts in strict journal order", () => {
    const definitions = [
      { operationReason: "initial_required_session", earningCategory: "lesson", kind: "earning_credit", amountSubunits: 36_0000, origin: { kind: "course", courseId: "english-core", studyTarget: "en", requiredSessionOrdinal: 1 } },
      { operationReason: "repeat_session", earningCategory: "repeat", kind: "earning_credit", amountSubunits: 5_4000, origin: { kind: "course", courseId: "english-core", studyTarget: "en", requiredSessionOrdinal: 1 } },
      { operationReason: "plan_completion", earningCategory: "plan", kind: "earning_credit", amountSubunits: 2_0000, origin: { kind: "course", courseId: "english-core", studyTarget: "en", requiredSessionOrdinal: 2 } },
      { operationReason: "dictionary_activity", earningCategory: "dictionary", kind: "earning_credit", amountSubunits: 1_0000, origin: { kind: "course", courseId: "spanish-core", studyTarget: "es", requiredSessionOrdinal: 3 } },
      { operationReason: "irregular_verbs_activity", earningCategory: "irregular_verbs", kind: "earning_credit", amountSubunits: 1_0000, origin: { kind: "course", courseId: "english-core", studyTarget: "en", requiredSessionOrdinal: 4 } },
      { operationReason: "tournament_reward", earningCategory: "tournament", kind: "earning_credit", amountSubunits: 3_0000, origin: { kind: "tournament", tournamentId: "tournament-1" } },
      { operationReason: "coin_exchange", earningCategory: null, kind: "external_credit", amountSubunits: 4_0000, origin: { kind: "coin_exchange", tradeId: "trade-rebuild" } },
      { operationReason: "legacy_opening_balance", earningCategory: null, kind: "legacy_opening_import", amountSubunits: 7_0000, origin: { kind: "legacy_opening", importVersion: 1, sourceSnapshotFingerprint: hash("d") } },
    ] as const;
    let online = createWalletState({ accountScopeHash });
    const receipts = definitions.map((definition, index) => {
      const authorized = operation({
        ...definition,
        operationId: `rebuild-operation-${index}`,
        sourceReceiptId: `rebuild-source-${index}`,
        walletRevisionBefore: index,
      });
      const result = reduceAuthorizedWalletOperation(online, authorized, emptyLookup());
      online = result.state;
      return result.appliedReceipt;
    });

    const initial = createWalletState({ accountScopeHash });
    const rebuilt = rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: receipts,
    });
    expect(rebuilt).toEqual(online);
    expect(rebuilt.earnedByCategorySubunits).toEqual({
      lesson: 36_0000,
      repeat: 5_4000,
      plan: 2_0000,
      dictionary: 1_0000,
      irregular_verbs: 1_0000,
      tournament: 3_0000,
    });
    expect(rebuilt.externalCreditSubunits).toBe(4_0000);
    expect(rebuilt.importedOpeningSubunits).toBe(7_0000);
    expect(rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [...receipts].reverse(),
    })).toEqual(online);
    expect(canonicalJsonV1(rebuilt)).toBe(canonicalJsonV1(online));
    expect(rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [],
    })).toEqual(initial);
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [receipts[1]],
    })).toThrow("wallet_receipt_rebuild_out_of_order");
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [{
        ...receipts[0],
        balanceAfterSubunits: receipts[0].balanceAfterSubunits + 1,
      }],
    })).toThrow("wallet_ledger_invalid");
  });

  it("rebuilds histories longer than one bounded page from an exact checkpoint", () => {
    let state = createWalletState({ accountScopeHash });
    const initial = state;
    const receipts = Array.from({ length: MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD + 1 }, (_, index) => {
      const authorized = operation({
        operationId: `long-history-operation-${index}`,
        sourceReceiptId: `long-history-source-${index}`,
        accountGeneration: index < MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD ? accountGeneration : accountGeneration + 1,
        amountSubunits: WALLET_SUBUNITS_PER_STAR,
        walletRevisionBefore: index,
      });
      const result = reduceAuthorizedWalletOperation(state, authorized, {
        currentAccountGeneration: authorized.accountGeneration,
      });
      state = result.state;
      return result.appliedReceipt;
    });
    const page1 = rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: receipts.slice(0, MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD),
    });
    const page2 = rebuildWalletStateFromAppliedReceipts({
      startingState: page1,
      canonicalAppliedReceipts: receipts.slice(MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD),
    });
    expect(page2).toEqual(state);
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: receipts.slice(MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD),
    })).toThrow("wallet_receipt_rebuild_out_of_order");
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [receipts[0], receipts[0]],
    })).toThrow("wallet_receipt_history_invalid");
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [receipts[0], receipts[2]],
    })).toThrow("wallet_receipt_rebuild_out_of_order");
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: new Array(MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD + 1),
    })).toThrow("wallet_receipt_history_invalid");
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: receipts.slice(0, 1),
      [Symbol("hidden")]: true,
    })).toThrow("wallet_receipt_history_invalid");

    let envelopeGetterCalled = false;
    const hostileEnvelope = Object.defineProperty({ startingState: initial }, "canonicalAppliedReceipts", {
      enumerable: true,
      get: () => {
        envelopeGetterCalled = true;
        return [receipts[0]];
      },
    });
    expect(() => rebuildWalletStateFromAppliedReceipts(hostileEnvelope)).toThrow("wallet_receipt_history_invalid");
    expect(envelopeGetterCalled).toBe(false);

    const aliasOperation = operation({
      operationId: "long-history-semantic-alias",
      sourceReceiptId: "long-history-source-0",
      amountSubunits: WALLET_SUBUNITS_PER_STAR,
      walletRevisionBefore: 1,
    });
    const aliasReceipt = reduceAuthorizedWalletOperation(
      reduceAuthorizedWalletOperation(
        createWalletState({ accountScopeHash }),
        operation({
          operationId: "long-history-operation-0",
          sourceReceiptId: "long-history-source-0",
          amountSubunits: WALLET_SUBUNITS_PER_STAR,
        }),
        emptyLookup(),
      ).state,
      aliasOperation,
      emptyLookup(),
    ).appliedReceipt;
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [receipts[0], aliasReceipt],
    })).toThrow("wallet_receipt_history_invalid");

    const otherAccount = createWalletState({ accountScopeHash: "bbbbbbbbbbbbbbbb" });
    const otherOperation = operation({
      operationId: "other-account-operation",
      sourceReceiptId: "other-account-source",
      accountScopeHash: "bbbbbbbbbbbbbbbb",
    });
    const otherReceipt = reduceAuthorizedWalletOperation(otherAccount, otherOperation, emptyLookup()).appliedReceipt;
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [otherReceipt],
    })).toThrow("wallet_receipt_history_invalid");

    let receiptGetterCalled = false;
    const hostileReceipt = Object.defineProperty({ ...receipts[0] }, "schemaVersion", {
      enumerable: true,
      get: () => {
        receiptGetterCalled = true;
        return "learning-v2-wallet-applied-receipt.v1";
      },
    });
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [hostileReceipt],
    })).toThrow("wallet_ledger_invalid");
    expect(receiptGetterCalled).toBe(false);
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [{ ...receipts[0], ["x".repeat(70_000)]: true }],
    })).toThrow("wallet_ledger_invalid");
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [{
        schemaVersion: "learning-v2-wallet-operation-ledger-entry.v1",
        appliedReceipt: receipts[0],
      }],
    })).toThrow("wallet_ledger_invalid");

    const competingReceipt = reduceAuthorizedWalletOperation(initial, operation({
      operationId: "competing-revision-zero",
      sourceReceiptId: "competing-revision-zero-source",
    }), emptyLookup()).appliedReceipt;
    expect(() => rebuildWalletStateFromAppliedReceipts({
      startingState: initial,
      canonicalAppliedReceipts: [receipts[0], competingReceipt],
    })).toThrow("wallet_receipt_rebuild_out_of_order");
  });
});
