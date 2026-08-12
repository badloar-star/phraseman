import {
  createServerWalletRewardReceiptAuthority,
  materializeServerWalletRewardReceiptCandidate,
  parseServerWalletRewardReceiptRaw,
  type ServerWalletRewardReason,
} from "../modules/learning-v2/progress/server_wallet_reward_receipt";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const courseOrigin = {
  kind: "course" as const,
  courseId: "core-english-a1",
  studyTarget: "en",
  requiredSessionOrdinal: 2,
};
const variants: readonly [ServerWalletRewardReason, unknown, string, string | null][] = [
  ["initial_required_session", courseOrigin, "earning_credit", "lesson"],
  ["repeat_session", courseOrigin, "earning_credit", "repeat"],
  ["plan_completion", courseOrigin, "earning_credit", "plan"],
  ["dictionary_activity", courseOrigin, "earning_credit", "dictionary"],
  ["irregular_verbs_activity", courseOrigin, "earning_credit", "irregular_verbs"],
  ["tournament_reward", { kind: "tournament", tournamentId: "league-7" }, "earning_credit", "tournament"],
  ["coin_exchange", { kind: "coin_exchange", tradeId: "trade-7" }, "external_credit", null],
];

const reward = (
  reason: ServerWalletRewardReason = "coin_exchange",
  origin: unknown = { kind: "coin_exchange", tradeId: "trade-7" },
) => materializeServerWalletRewardReceiptCandidate({
  rewardId: `reward-${reason}`,
  operationId: `operation-${reason}`,
  accountScopeHash,
  accountGeneration: 4,
  amountSubunits: 120_000,
  operationReason: reason,
  origin,
});

describe("Learning V2 revision-independent server wallet reward receipts", () => {
  it.each(variants)("materializes strict %s source bytes", (reason, origin) => {
    const materialized = reward(reason, origin);
    expect(parseServerWalletRewardReceiptRaw(materialized.encoded)).toEqual(materialized);
    expect(materialized.receipt).toMatchObject({
      operationReason: reason,
      amountSubunits: 120_000,
    });
    expect(materialized.receipt).not.toHaveProperty("walletRevisionBefore");
    expect(Object.isFrozen(materialized.receipt.origin)).toBe(true);
  });

  it.each(variants)("binds %s only at protected redemption", async (
    reason,
    origin,
    kind,
    category,
  ) => {
    const materialized = reward(reason, origin);
    const authority = createServerWalletRewardReceiptAuthority({
      resolveRewardReceipt: () => materialized.encoded,
    });
    const wallet = createWalletState({ accountScopeHash });
    const operation = await authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: wallet,
      canonicalAppliedReceipt: null,
      candidate: {
        schemaVersion: "learning-v2-server-wallet-reward-request.v1",
        rewardId: materialized.receipt.rewardId,
        rewardFingerprint: materialized.receipt.rewardFingerprint,
      },
    });
    expect(operation).toMatchObject({
      walletRevisionBefore: 0,
      kind,
      earningCategory: category,
      operationReason: reason,
    });
  });

  it("survives delayed redemption and replays the repository canonical operation", async () => {
    const materialized = reward();
    const authority = createServerWalletRewardReceiptAuthority({
      resolveRewardReceipt: () => materialized.encoded,
    });
    const candidate = {
      schemaVersion: "learning-v2-server-wallet-reward-request.v1",
      rewardId: materialized.receipt.rewardId,
      rewardFingerprint: materialized.receipt.rewardFingerprint,
    };
    const wallet0 = createWalletState({ accountScopeHash });
    const firstOperation = await authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: wallet0,
      canonicalAppliedReceipt: null,
      candidate,
    });
    const applied = reduceAuthorizedWalletOperation(wallet0, firstOperation as never, {
      currentAccountGeneration: 4,
    });
    const replay = await authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: applied.state,
      canonicalAppliedReceipt: applied.appliedReceipt,
      candidate,
    });
    expect(replay).toEqual(firstOperation);
  });

  it("redeems an older protected entitlement after an account-generation rollover", async () => {
    const materialized = reward();
    const authority = createServerWalletRewardReceiptAuthority({
      resolveRewardReceipt: () => materialized.encoded,
    });
    const operation = await authority({
      scope: { accountScopeHash, generation: 5 },
      walletState: createWalletState({ accountScopeHash }),
      canonicalAppliedReceipt: null,
      candidate: {
        schemaVersion: "learning-v2-server-wallet-reward-request.v1",
        rewardId: materialized.receipt.rewardId,
        rewardFingerprint: materialized.receipt.rewardFingerprint,
      },
    });
    expect(operation).toMatchObject({
      accountGeneration: 5,
      operationReason: "coin_exchange",
      sourceReceiptRef: {
        receiptFingerprint: materialized.receipt.rewardFingerprint,
      },
    });
  });

  it("does not mistake an unrelated verified journal head for this reward replay", async () => {
    const first = materializeServerWalletRewardReceiptCandidate({
      rewardId: "reward-first-settlement",
      operationId: "operation-first-settlement",
      accountScopeHash,
      accountGeneration: 4,
      amountSubunits: 100_000,
      operationReason: "coin_exchange",
      origin: { kind: "coin_exchange", tradeId: "trade-first-settlement" },
    });
    const second = materializeServerWalletRewardReceiptCandidate({
      rewardId: "reward-second-settlement",
      operationId: "operation-second-settlement",
      accountScopeHash,
      accountGeneration: 4,
      amountSubunits: 200_000,
      operationReason: "coin_exchange",
      origin: { kind: "coin_exchange", tradeId: "trade-second-settlement" },
    });
    const wallet0 = createWalletState({ accountScopeHash });
    const firstOperation = await createServerWalletRewardReceiptAuthority({
      resolveRewardReceipt: () => first.encoded,
    })({
      scope: { accountScopeHash, generation: 4 },
      walletState: wallet0,
      canonicalAppliedReceipt: null,
      candidate: {
        schemaVersion: "learning-v2-server-wallet-reward-request.v1",
        rewardId: first.receipt.rewardId,
        rewardFingerprint: first.receipt.rewardFingerprint,
      },
    });
    const firstApplied = reduceAuthorizedWalletOperation(
      wallet0,
      firstOperation as never,
      { currentAccountGeneration: 4 },
    );
    const secondOperation = await createServerWalletRewardReceiptAuthority({
      resolveRewardReceipt: () => second.encoded,
    })({
      scope: { accountScopeHash, generation: 4 },
      walletState: firstApplied.state,
      canonicalAppliedReceipt: firstApplied.appliedReceipt,
      candidate: {
        schemaVersion: "learning-v2-server-wallet-reward-request.v1",
        rewardId: second.receipt.rewardId,
        rewardFingerprint: second.receipt.rewardFingerprint,
      },
    });
    expect(secondOperation).toMatchObject({
      operationId: second.receipt.operationId,
      walletRevisionBefore: 1,
      amountSubunits: 200_000,
    });
  });

  it("rejects foreign, stale, tampered and hostile inputs", async () => {
    const materialized = materializeServerWalletRewardReceiptCandidate({
      rewardId: "future-reward",
      operationId: "future-operation",
      accountScopeHash,
      accountGeneration: 5,
      amountSubunits: 120_000,
      operationReason: "coin_exchange",
      origin: { kind: "coin_exchange", tradeId: "future-trade" },
    });
    const authority = createServerWalletRewardReceiptAuthority({
      resolveRewardReceipt: () => materialized.encoded,
    });
    const wallet = createWalletState({ accountScopeHash });
    await expect(authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: wallet,
      canonicalAppliedReceipt: null,
      candidate: {
        schemaVersion: "learning-v2-server-wallet-reward-request.v1",
        rewardId: materialized.receipt.rewardId,
        rewardFingerprint: materialized.receipt.rewardFingerprint,
      },
    })).rejects.toThrow("server_wallet_reward_receipt_stale");
    expect(() => parseServerWalletRewardReceiptRaw(
      `${materialized.encoded} `,
    )).toThrow("server_wallet_reward_receipt_indeterminate");
    expect(() => reward("coin_exchange", courseOrigin)).toThrow(
      "server_wallet_reward_receipt_invalid",
    );
    let getterRuns = 0;
    expect(() => createServerWalletRewardReceiptAuthority(Object.defineProperty(
      {},
      "resolveRewardReceipt",
      { enumerable: true, get: () => { getterRuns += 1; return () => null; } },
    ))).toThrow("server_wallet_reward_authority_invalid");
    expect(getterRuns).toBe(0);
  });
});
