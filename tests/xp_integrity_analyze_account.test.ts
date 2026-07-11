import {
  analyzeAccount,
  analyzeLedgerContinuity,
} from "../scripts/xp_integrity/analyze_account";
import type {
  AccountAuditInput,
  AliasEvidence,
  CatalogMatch,
  CatalogReward,
  CatalogSnapshot,
  NormalizedAuditEvent,
  PrerequisiteEvidence,
} from "../scripts/xp_integrity/types";

const event = (
  id: string,
  overrides: Partial<NormalizedAuditEvent> = {},
): NormalizedAuditEvent => ({
  ownerUid: "canonical",
  eventId: id,
  type: "achievement_claimed",
  xpDelta: 100,
  totalXpBefore: 100,
  totalXpAfter: 200,
  serverCreatedAtMs: 1_000,
  clientCreatedAtMs: 1_000,
  appVersion: "1.0.0",
  activeDate: "2026-07-11",
  weekKey: "2026-W28",
  weekXpAfter: 100,
  payload: { achievementId: "xp_500" },
  ...overrides,
});

const reward = (
  achievementId: string,
  xp: number,
  prerequisite: CatalogReward["prerequisite"],
): CatalogReward => ({ achievementId, xp, prerequisite });

const match = (catalogReward: CatalogReward): CatalogMatch => {
  const snapshot: CatalogSnapshot = {
    commit: "a".repeat(40),
    appVersion: "1.0.0",
    effective: {
      fromMsInclusive: 0,
      toMsExclusive: null,
      provenance: "build_manifest",
    },
    rewards: new Map([[catalogReward.achievementId, catalogReward]]),
    levelFormula: {
      sourceCommit: "a".repeat(40),
      formulaId: "formula",
      effective: {
        fromMsInclusive: 0,
        toMsExclusive: null,
        provenance: "build_manifest",
      },
      totalXpThresholds: [0],
      maxLevel: 1,
    },
    complete: true,
  };
  return { kind: "exact", snapshot, basis: "verified_server_window" };
};

const complete = {
  ledger: "complete",
  catalog: "complete",
  alias: "complete",
  migration: "complete",
  prerequisites: "complete",
} as const;

const input = (
  events: readonly NormalizedAuditEvent[],
  overrides: Partial<AccountAuditInput> = {},
): AccountAuditInput => ({
  uid: "canonical",
  currentXp: events.at(-1)?.totalXpAfter ?? 0,
  canonicalEvents: events,
  aliases: [],
  baseline:
    events[0]?.totalXpBefore === null || !events[0]
      ? { kind: "unknown", reason: "pre_cutover_unretained" }
      : {
          kind: "exact",
          xp: events[0].totalXpBefore,
          derivedFrom: "first_ledger_result",
          atMs: events[0].serverCreatedAtMs ?? 0,
        },
  migration: { kind: "none" },
  prerequisites: [],
  mirrors: { leaderboardXp: null, arenaXp: null, leagueXp: null },
  completeness: complete,
  ...overrides,
});

const byEvent = (...entries: readonly [string, CatalogMatch][]) =>
  new Map(entries);

describe("analyzeAccount", () => {
  test("uses exact lifetime XP before the event and ignores payload counters", () => {
    const claimed = event("lifetime", {
      totalXpBefore: 100,
      totalXpAfter: 200,
      payload: { achievementId: "xp_500", lifetimeXp: 999_999 },
    });
    const result = analyzeAccount(
      input([claimed]),
      byEvent([
        "lifetime",
        match(reward("xp_500", 100, { kind: "lifetime_xp", minimum: 500 })),
      ]),
    );
    expect(result).toMatchObject({
      classification: "confirmed_damaged",
      exactInvalidXp: 100,
    });
    expect(result.reasons).toContain(
      "achievement_impossible_prerequisite_exact",
    );
  });

  test("uses weekly XP only from exact server result semantics", () => {
    const exact = event("weekly-exact", {
      weekXpAfter: 100,
      payload: { achievementId: "weekly_xp_500", weekXpBefore: 999_999 },
    });
    const missing = event("weekly-missing", {
      totalXpBefore: 200,
      totalXpAfter: 300,
      serverCreatedAtMs: 2_000,
      clientCreatedAtMs: 2_000,
      weekXpAfter: null,
      payload: { achievementId: "weekly_xp_500", weekXpBefore: 0 },
    });
    const catalogs = byEvent(
      [
        "weekly-exact",
        match(
          reward("weekly_xp_500", 100, { kind: "weekly_xp", minimum: 500 }),
        ),
      ],
      [
        "weekly-missing",
        match(
          reward("weekly_xp_500", 100, { kind: "weekly_xp", minimum: 500 }),
        ),
      ],
    );
    const exactResult = analyzeAccount(input([exact]), catalogs);
    const missingResult = analyzeAccount(input([missing]), catalogs);
    expect(exactResult.exactInvalidXp).toBe(100);
    expect(missingResult.exactInvalidXp).toBe(0);
    expect(missingResult.reasons).toContain("prerequisite_unmapped");
  });

  test("requires authoritative evidence for counter prerequisites", () => {
    const claimed = event("counter", {
      payload: { achievementId: "lesson_10", lessons_completed: 999 },
    });
    const catalog = byEvent([
      "counter",
      match(
        reward("lesson_10", 100, {
          kind: "counter",
          counterKey: "lessons_completed",
          minimum: 10,
        }),
      ),
    ]);
    const missing = analyzeAccount(input([claimed]), catalog);
    const evidence: PrerequisiteEvidence = {
      eventId: "counter",
      prerequisite: {
        kind: "counter",
        counterKey: "lessons_completed",
        minimum: 10,
      },
      state: "exact",
      valueBefore: 3,
      source: "immutable_event_chain",
    };
    const proven = analyzeAccount(
      input([claimed], { prerequisites: [evidence] }),
      catalog,
    );
    expect(missing.reasons).toContain("prerequisite_unmapped");
    expect(missing.exactInvalidXp).toBe(0);
    expect(proven.exactInvalidXp).toBe(100);
  });

  test("fails closed for unknown catalog IDs and unsupported rules", () => {
    const unknown = event("unknown", { payload: { achievementId: "unknown" } });
    const unsupported = event("unsupported", {
      totalXpBefore: 200,
      totalXpAfter: 300,
      serverCreatedAtMs: 2_000,
      clientCreatedAtMs: 2_000,
      payload: { achievementId: "mystery" },
    });
    const result = analyzeAccount(
      input([unknown, unsupported]),
      byEvent(
        ["unknown", { kind: "unmapped", reason: "unknown_version" }],
        [
          "unsupported",
          match(
            reward("mystery", 100, { kind: "unsupported", ruleId: "mystery" }),
          ),
        ],
      ),
    );
    expect(result.exactInvalidXp).toBe(0);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["catalog_unmapped", "prerequisite_unmapped"]),
    );
    expect(result.classification).toBe("probable_damaged");
  });

  test("subtracts only overpayment and counts each event once at its maximum proven amount", () => {
    const overpaid = event("overpaid", {
      xpDelta: 150,
      totalXpAfter: 250,
      payload: { achievementId: "xp_500" },
    });
    const result = analyzeAccount(
      input([overpaid], {
        prerequisites: [
          {
            eventId: "overpaid",
            prerequisite: { kind: "lifetime_xp", minimum: 500 },
            state: "exact",
            valueBefore: 0,
            source: "server_result",
          },
        ],
      }),
      byEvent([
        "overpaid",
        match(reward("xp_500", 100, { kind: "lifetime_xp", minimum: 500 })),
      ]),
    );
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "achievement_overpayment_exact",
        "achievement_impossible_prerequisite_exact",
      ]),
    );
    expect(result.exactInvalidXp).toBe(150);
  });

  test("sums distinct invalid events", () => {
    const first = event("first", {
      xpDelta: 120,
      totalXpAfter: 220,
      payload: { achievementId: "xp_50" },
    });
    const second = event("second", {
      xpDelta: 130,
      totalXpBefore: 220,
      totalXpAfter: 350,
      serverCreatedAtMs: 2_000,
      clientCreatedAtMs: 2_000,
      payload: { achievementId: "xp_50" },
    });
    const catalog = match(
      reward("xp_50", 100, { kind: "lifetime_xp", minimum: 50 }),
    );
    expect(
      analyzeAccount(
        input([first, second]),
        byEvent(["first", catalog], ["second", catalog]),
      ).exactInvalidXp,
    ).toBe(50);
  });

  test("classifies migration evidence conservatively", () => {
    const pattern = analyzeAccount(
      input([], {
        migration: {
          kind: "pattern_only",
          pattern: "250_to_400",
          markerPresent: true,
        },
      }),
      new Map(),
    );
    const probable = analyzeAccount(
      input([], {
        migration: {
          kind: "pattern_only",
          pattern: "250_to_400",
          markerPresent: true,
        },
        completeness: { ...complete, alias: "incomplete" },
      }),
      new Map(),
    );
    const exact = analyzeAccount(
      input([], {
        currentXp: 700,
        migration: {
          kind: "exact",
          source: "retained_provenance",
          beforeXp: 500,
          afterXp: 700,
          formulaVersion: "v1",
          exactInvalidDelta: 200,
          occurredAtMs: 10,
        },
      }),
      new Map(),
    );
    expect(pattern.classification).toBe("indeterminate");
    expect(probable.classification).toBe("probable_damaged");
    expect(exact).toMatchObject({
      classification: "confirmed_damaged",
      exactInvalidXp: 200,
      proposedXp: 500,
    });
  });

  test("keeps exact damage as a lower bound when unrelated evidence is incomplete", () => {
    const result = analyzeAccount(
      input([], {
        currentXp: 700,
        migration: {
          kind: "exact",
          source: "retained_provenance",
          beforeXp: 500,
          afterXp: 700,
          formulaVersion: "v1",
          exactInvalidDelta: 200,
          occurredAtMs: 10,
        },
        completeness: { ...complete, alias: "incomplete" },
      }),
      new Map(),
    );
    expect(result).toMatchObject({
      classification: "confirmed_damaged",
      exactInvalidXp: 200,
      proposedXp: null,
      exactReductionIsComplete: false,
    });
  });

  test("reports mirror projection drift separately from XP integrity", () => {
    const result = analyzeAccount(
      input([], {
        currentXp: 500,
        mirrors: { leaderboardXp: 500, arenaXp: 490, leagueXp: 500 },
      }),
      new Map(),
    );
    expect(result).toMatchObject({
      classification: "consistent",
      projectionDrift: true,
    });
    expect(result.reasons).toContain("projection_drift");
  });

  test("subtracts alias replay only when the full linkage and timing proof exists", () => {
    const aliasClaim = event("alias-claim", {
      ownerUid: "alias",
      serverCreatedAtMs: 1_000,
      clientCreatedAtMs: 1_000,
      payload: { achievementId: "xp_50" },
    });
    const canonicalClaim = event("canonical-claim", {
      serverCreatedAtMs: 3_000,
      clientCreatedAtMs: 3_000,
      payload: { achievementId: "xp_50" },
    });
    const alias: AliasEvidence = {
      uid: "alias",
      canonicalUid: "canonical",
      linkage: "canonical_pointer",
      identityMergedAtMs: 2_000,
      events: [aliasClaim],
      complete: true,
    };
    const catalog = match(
      reward("xp_50", 100, { kind: "lifetime_xp", minimum: 50 }),
    );
    const proven = analyzeAccount(
      input([canonicalClaim], { aliases: [alias] }),
      byEvent(["alias-claim", catalog], ["canonical-claim", catalog]),
    );
    const existenceOnly = analyzeAccount(
      input([canonicalClaim], {
        aliases: [{ ...alias, identityMergedAtMs: null }],
      }),
      byEvent(["alias-claim", catalog], ["canonical-claim", catalog]),
    );
    expect(proven.exactInvalidXp).toBe(100);
    expect(proven.reasons).toContain("achievement_alias_replay_exact");
    expect(existenceOnly.exactInvalidXp).toBe(0);
    expect(existenceOnly.reasons).toContain("alias_history_incomplete");
  });
});

describe("analyzeLedgerContinuity", () => {
  test("derives an exact first-event baseline and accepts a continuous chain", () => {
    const first = event("first", {
      type: "xp",
      xpDelta: 50,
      totalXpBefore: 100,
      totalXpAfter: 150,
    });
    const second = event("second", {
      type: "xp",
      xpDelta: 25,
      totalXpBefore: 150,
      totalXpAfter: 175,
      serverCreatedAtMs: 2_000,
      clientCreatedAtMs: 2_000,
    });
    expect(
      analyzeLedgerContinuity([first, second], 175, {
        kind: "unknown",
        reason: "pre_cutover_unretained",
      }),
    ).toMatchObject({
      complete: true,
      baseline: { kind: "exact", xp: 100, derivedFrom: "first_ledger_result" },
      exactInvalidXp: 0,
    });
  });

  test("keeps an unknown baseline when pre-cutover history is not reconstructible", () => {
    const first = event("first", { type: "xp", totalXpBefore: null });
    expect(
      analyzeLedgerContinuity([first], 200, {
        kind: "unknown",
        reason: "pre_cutover_unretained",
      }),
    ).toMatchObject({ complete: false, baseline: { kind: "unknown" } });
  });

  test("proves a discontinuity from an exact retained cutover baseline", () => {
    const first = event("first", {
      type: "xp",
      xpDelta: 100,
      totalXpBefore: 150,
      totalXpAfter: 250,
    });
    const result = analyzeLedgerContinuity([first], 250, {
      kind: "exact",
      xp: 100,
      derivedFrom: "retained_cutover",
      atMs: 900,
    });
    expect(result).toMatchObject({ complete: true, exactInvalidXp: 50 });
  });

  test("tied timestamps are ambiguous unless a retained cutover fixes the chain", () => {
    const first = event("a", {
      type: "xp",
      xpDelta: 50,
      totalXpBefore: 100,
      totalXpAfter: 150,
    });
    const second = event("b", {
      type: "xp",
      xpDelta: 50,
      totalXpBefore: 150,
      totalXpAfter: 200,
    });
    expect(
      analyzeLedgerContinuity([first, second], 200, {
        kind: "unknown",
        reason: "ambiguous_chain",
      }).complete,
    ).toBe(false);
    expect(
      analyzeLedgerContinuity([first, second], 200, {
        kind: "exact",
        xp: 100,
        derivedFrom: "retained_cutover",
        atMs: 900,
      }).complete,
    ).toBe(true);
  });

  test("compares current XP with the final exact ledger total", () => {
    const final = event("final", {
      type: "xp",
      xpDelta: 100,
      totalXpBefore: 100,
      totalXpAfter: 200,
    });
    expect(
      analyzeLedgerContinuity([final], 250, {
        kind: "unknown",
        reason: "pre_cutover_unretained",
      }),
    ).toMatchObject({ complete: true, exactInvalidXp: 50 });
  });
});
