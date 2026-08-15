import {
  createServerWalletCreditAuthority,
  materializeServerWalletCreditSettlementCandidate,
  parseServerWalletCreditSettlementRaw,
  type ServerWalletCreditReason,
} from "../modules/learning-v2/progress/server_wallet_credit_settlement";
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
const cases: readonly [
  ServerWalletCreditReason,
  unknown,
  string,
  string | null,
][] = [
  ["repeat_session", courseOrigin, "earning_credit", "repeat"],
  ["plan_completion", courseOrigin, "earning_credit", "plan"],
  ["dictionary_activity", courseOrigin, "earning_credit", "dictionary"],
  ["irregular_verbs_activity", courseOrigin, "earning_credit", "irregular_verbs"],
  ["tournament_reward", { kind: "tournament", tournamentId: "league-7" },
    "earning_credit", "tournament"],
  ["coin_exchange", { kind: "coin_exchange", tradeId: "trade-7" },
    "external_credit", null],
];

const settlement = (
  reason: ServerWalletCreditReason = "repeat_session",
  origin: unknown = courseOrigin,
) => materializeServerWalletCreditSettlementCandidate({
  settlementId: `settlement-${reason}`,
  operationId: `operation-${reason}`,
  accountScopeHash,
  accountGeneration: 4,
  walletRevisionBefore: 0,
  amountSubunits: 120_000,
  operationReason: reason,
  origin,
});

describe("Learning V2 server wallet credit settlements", () => {
  it.each(cases)("materializes and parses %s", (reason, origin, kind, category) => {
    const materialized = settlement(reason, origin);
    expect(parseServerWalletCreditSettlementRaw(materialized.encoded)).toEqual(
      materialized,
    );
    expect(materialized.settlement).toMatchObject({
      operationReason: reason,
      authorizedOperation: {
        kind,
        earningCategory: category,
        operationReason: reason,
        amountSubunits: 120_000,
      },
    });
    expect(Object.isFrozen(materialized.settlement.authorizedOperation)).toBe(true);
  });

  it("authorizes only exact protected bytes and replays the canonical receipt", async () => {
    const materialized = settlement();
    const authority = createServerWalletCreditAuthority({
      resolveSettlement: ({ settlementId }: { settlementId: string }) =>
        settlementId === materialized.settlement.settlementId
          ? materialized.encoded
          : null,
    });
    const candidate = {
      schemaVersion: "learning-v2-server-wallet-credit-request.v1",
      settlementId: materialized.settlement.settlementId,
      settlementFingerprint: materialized.settlement.settlementFingerprint,
    };
    const wallet = createWalletState({ accountScopeHash });
    const operation = await authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: wallet,
      canonicalAppliedReceipt: null,
      candidate,
    });
    expect(operation).toEqual(materialized.settlement.authorizedOperation);
    const applied = reduceAuthorizedWalletOperation(
      wallet,
      materialized.settlement.authorizedOperation,
      { currentAccountGeneration: 4 },
    );
    await expect(authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: applied.state,
      canonicalAppliedReceipt: applied.appliedReceipt,
      candidate,
    })).resolves.toEqual(materialized.settlement.authorizedOperation);
    await expect(authority({
      scope: { accountScopeHash, generation: 4 },
      walletState: applied.state,
      canonicalAppliedReceipt: null,
      candidate,
    })).rejects.toThrow("server_wallet_credit_settlement_stale");
  });

  it("rejects reason/origin mismatches and never executes option accessors", () => {
    expect(() => settlement("coin_exchange", courseOrigin)).toThrow(
      "server_wallet_credit_settlement_invalid",
    );
    expect(() => materializeServerWalletCreditSettlementCandidate({
      settlementId: "bad-initial",
      operationId: "bad-initial-op",
      accountScopeHash,
      accountGeneration: 4,
      walletRevisionBefore: 0,
      amountSubunits: 1,
      operationReason: "initial_required_session",
      origin: courseOrigin,
    })).toThrow("server_wallet_credit_settlement_invalid");
    let getterRuns = 0;
    expect(() => createServerWalletCreditAuthority(Object.defineProperty(
      {},
      "resolveSettlement",
      {
        enumerable: true,
        get: () => {
          getterRuns += 1;
          return () => null;
        },
      },
    ))).toThrow("server_wallet_credit_authority_invalid");
    expect(getterRuns).toBe(0);
  });
});
