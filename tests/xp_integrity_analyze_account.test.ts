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
  type: "achievement_reward",
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
  normalizationValid: true,
  ...overrides,
});

test("malformed normalized events cannot become exact ledger evidence", () => {
  const malformed = event("malformed-zero", {
    normalizationValid: false,
    xpDelta: 0,
    totalXpBefore: 0,
    totalXpAfter: 0,
  });
  const result = analyzeLedgerContinuity([malformed], 0, {
    kind: "exact",
    xp: 0,
    derivedFrom: "first_ledger_result",
    atMs: 1_000,
  });
  expect(result.complete).toBe(false);
  expect(result.exactInvalidXp).toBe(0);
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
    expect(result.classification).toBe("indeterminate");
  });

  test("keeps two independent catalog defects in one family indeterminate", () => {
    const first = event("first", { payload: { achievementId: "unknown-a" } });
    const second = event("second", {
      totalXpBefore: 200,
      totalXpAfter: 300,
      serverCreatedAtMs: 2_000,
      clientCreatedAtMs: 2_000,
      payload: { achievementId: "unknown-b" },
    });
    const result = analyzeAccount(
      input([first, second]),
      byEvent(
        ["first", { kind: "unmapped", reason: "unknown_version" }],
        ["second", { kind: "unmapped", reason: "unknown_version" }],
      ),
    );
    expect(result.classification).toBe("indeterminate");
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
        baseline: {
          kind: "exact",
          xp: 0,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
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
        baseline: {
          kind: "exact",
          xp: 0,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
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
        baseline: {
          kind: "exact",
          xp: 700,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
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
    expect(probable.classification).toBe("indeterminate");
    expect(exact).toMatchObject({
      classification: "confirmed_damaged",
      exactInvalidXp: 200,
      proposedXp: 500,
    });
  });

  test("deduplicates migration evidence for the same deterministic ledger gap", () => {
    const first = event("first", {
      type: "xp",
      xpDelta: 100,
      totalXpBefore: 150,
      totalXpAfter: 250,
    });
    const result = analyzeAccount(
      input([first], {
        baseline: {
          kind: "exact",
          xp: 100,
          derivedFrom: "retained_cutover",
          atMs: 900,
        },
        migration: {
          kind: "exact",
          source: "deterministic_ledger_discontinuity",
          beforeXp: 100,
          afterXp: 150,
          formulaVersion: "v1",
          exactInvalidDelta: 50,
          occurredAtMs: 1_000,
        },
      }),
      new Map(),
    );
    expect(result.exactInvalidXp).toBe(50);
  });

  test("adds independent retained migration evidence to a ledger gap", () => {
    const first = event("first", {
      type: "xp",
      xpDelta: 100,
      totalXpBefore: 150,
      totalXpAfter: 250,
    });
    const result = analyzeAccount(
      input([first], {
        baseline: {
          kind: "exact",
          xp: 100,
          derivedFrom: "retained_cutover",
          atMs: 900,
        },
        migration: {
          kind: "exact",
          source: "retained_provenance",
          beforeXp: 40,
          afterXp: 80,
          formulaVersion: "v1",
          exactInvalidDelta: 40,
          occurredAtMs: 500,
        },
      }),
      new Map(),
    );
    expect(result.exactInvalidXp).toBe(90);
  });

  test("deduplicates a deterministic migration against an exact current-state gap", () => {
    const result = analyzeAccount(
      input([], {
        currentXp: 150,
        baseline: {
          kind: "exact",
          xp: 100,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
        migration: {
          kind: "exact",
          source: "deterministic_ledger_discontinuity",
          beforeXp: 100,
          afterXp: 150,
          formulaVersion: "v1",
          exactInvalidDelta: 50,
          occurredAtMs: 999,
        },
      }),
      new Map(),
    );
    expect(result.exactInvalidXp).toBe(50);
  });

  test("keeps a matching migration before an empty-ledger interval independent", () => {
    const result = analyzeAccount(
      input([], {
        currentXp: 150,
        baseline: {
          kind: "exact",
          xp: 100,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
        migration: {
          kind: "exact",
          source: "deterministic_ledger_discontinuity",
          beforeXp: 100,
          afterXp: 150,
          formulaVersion: "v1",
          exactInvalidDelta: 50,
          occurredAtMs: 5,
        },
      }),
      new Map(),
    );
    expect(result.exactInvalidXp).toBe(100);
  });

  test("uses the final retained event timestamp as current-gap interval start", () => {
    const final = event("final", {
      type: "xp",
      xpDelta: 100,
      totalXpBefore: 100,
      totalXpAfter: 200,
      serverCreatedAtMs: 1_000,
    });
    const audit = (occurredAtMs: number) =>
      analyzeAccount(
        input([final], {
          currentXp: 250,
          migration: {
            kind: "exact",
            source: "deterministic_ledger_discontinuity",
            beforeXp: 200,
            afterXp: 250,
            formulaVersion: "v1",
            exactInvalidDelta: 50,
            occurredAtMs,
          },
        }),
        new Map(),
      );
    expect(audit(999).exactInvalidXp).toBe(100);
    expect(audit(1_000).exactInvalidXp).toBe(50);
  });

  test("keeps a distinct deterministic migration separate from current-state drift", () => {
    const result = analyzeAccount(
      input([], {
        currentXp: 150,
        baseline: {
          kind: "exact",
          xp: 100,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
        migration: {
          kind: "exact",
          source: "deterministic_ledger_discontinuity",
          beforeXp: 50,
          afterXp: 100,
          formulaVersion: "v1",
          exactInvalidDelta: 50,
          occurredAtMs: 999,
        },
      }),
      new Map(),
    );
    expect(result.exactInvalidXp).toBe(100);
  });

  test("keeps a boundary gap independent from first-event invalid reward", () => {
    const first = event("first", {
      xpDelta: 100,
      totalXpBefore: 150,
      totalXpAfter: 250,
      payload: { achievementId: "xp_500" },
    });
    const result = analyzeAccount(
      input([first], {
        baseline: {
          kind: "exact",
          xp: 100,
          derivedFrom: "retained_cutover",
          atMs: 900,
        },
      }),
      byEvent([
        "first",
        match(reward("xp_500", 100, { kind: "lifetime_xp", minimum: 500 })),
      ]),
    );
    expect(result.exactInvalidXp).toBe(150);
  });

  test("keeps exact damage as a lower bound when unrelated evidence is incomplete", () => {
    const result = analyzeAccount(
      input([], {
        currentXp: 700,
        baseline: {
          kind: "exact",
          xp: 700,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
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
        baseline: {
          kind: "exact",
          xp: 500,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
        mirrors: { leaderboardXp: 500, arenaXp: 490, leagueXp: 500 },
      }),
      new Map(),
    );
    expect(result).toMatchObject({
      classification: "consistent",
      projectionDrift: true,
      proposedXp: null,
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

  test("subtracts every distinct exact post-merge alias replay", () => {
    const aliasClaim = event("alias-claim", {
      ownerUid: "alias",
      serverCreatedAtMs: 1_000,
      payload: { achievementId: "xp_50" },
    });
    const firstReplay = event("replay-1", {
      serverCreatedAtMs: 3_000,
      clientCreatedAtMs: 3_000,
      payload: { achievementId: "xp_50" },
    });
    const secondReplay = event("replay-2", {
      totalXpBefore: 200,
      totalXpAfter: 300,
      serverCreatedAtMs: 4_000,
      clientCreatedAtMs: 4_000,
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
    const result = analyzeAccount(
      input([firstReplay, secondReplay], { aliases: [alias] }),
      byEvent(
        ["alias-claim", catalog],
        ["replay-1", catalog],
        ["replay-2", catalog],
      ),
    );
    expect(result.exactInvalidXp).toBe(200);
  });

  test("keeps a valid replay but marks another malformed candidate incomplete", () => {
    const aliasClaim = event("alias-claim", {
      ownerUid: "alias",
      serverCreatedAtMs: 1_000,
      payload: { achievementId: "xp_50" },
    });
    const valid = event("valid", {
      serverCreatedAtMs: 3_000,
      clientCreatedAtMs: 3_000,
      payload: { achievementId: "xp_50" },
    });
    const malformed = event("malformed", {
      totalXpBefore: 200,
      totalXpAfter: 350,
      serverCreatedAtMs: 4_000,
      clientCreatedAtMs: 4_000,
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
    const result = analyzeAccount(
      input([valid, malformed], { aliases: [alias] }),
      byEvent(
        ["alias-claim", catalog],
        ["valid", catalog],
        ["malformed", catalog],
      ),
    );
    expect(result.exactInvalidXp).toBe(100);
    expect(result.reasons).toContain("alias_history_incomplete");
    expect(result.exactReductionIsComplete).toBe(false);
  });

  test("requires alias ownership and canonical linkage to match the audited account", () => {
    const aliasClaim = event("alias-claim", {
      ownerUid: "wrong-alias-owner",
      serverCreatedAtMs: 1_000,
      clientCreatedAtMs: 1_000,
      payload: { achievementId: "xp_50" },
    });
    const canonicalClaim = event("canonical-claim", {
      ownerUid: "wrong-canonical-owner",
      serverCreatedAtMs: 3_000,
      clientCreatedAtMs: 3_000,
      payload: { achievementId: "xp_50" },
    });
    const alias: AliasEvidence = {
      uid: "alias",
      canonicalUid: "another-account",
      linkage: "canonical_pointer",
      identityMergedAtMs: 2_000,
      events: [aliasClaim],
      complete: true,
    };
    const catalog = match(
      reward("xp_50", 100, { kind: "lifetime_xp", minimum: 50 }),
    );
    const result = analyzeAccount(
      input([canonicalClaim], { aliases: [alias] }),
      byEvent(["alias-claim", catalog], ["canonical-claim", catalog]),
    );
    expect(result.exactInvalidXp).toBe(0);
    expect(result.reasons).toContain("alias_history_incomplete");
    expect(result.classification).toBe("indeterminate");
  });

  test("requires finite, exact and strictly ordered alias replay timestamps", () => {
    const aliasClaim = event("alias-claim", {
      ownerUid: "alias",
      serverCreatedAtMs: Number.NaN,
      payload: { achievementId: "xp_50" },
    });
    const canonicalClaim = event("canonical-claim", {
      serverCreatedAtMs: 2_000,
      totalXpAfter: 250,
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
    const result = analyzeAccount(
      input([canonicalClaim], { aliases: [alias] }),
      byEvent(["alias-claim", catalog], ["canonical-claim", catalog]),
    );
    expect(result.exactInvalidXp).toBe(0);
    expect(result.reasons).toContain("alias_history_incomplete");
  });

  test("marks a malformed canonical replay candidate as alias-incomplete", () => {
    const aliasClaim = event("alias-claim", {
      ownerUid: "alias",
      serverCreatedAtMs: 1_000,
      payload: { achievementId: "xp_50" },
    });
    const canonicalClaim = event("canonical-claim", {
      serverCreatedAtMs: 3_000,
      totalXpBefore: 100,
      totalXpAfter: 250,
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
    const result = analyzeAccount(
      input([canonicalClaim], { aliases: [alias] }),
      byEvent(["alias-claim", catalog], ["canonical-claim", catalog]),
    );
    expect(result.exactInvalidXp).toBe(0);
    expect(result.reasons).toContain("alias_history_incomplete");
  });

  test("marks an unmapped canonical replay catalog as alias-incomplete", () => {
    const aliasClaim = event("alias-claim", {
      ownerUid: "alias",
      serverCreatedAtMs: 1_000,
      payload: { achievementId: "xp_50" },
    });
    const canonicalClaim = event("canonical-claim", {
      serverCreatedAtMs: 3_000,
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
    const result = analyzeAccount(
      input([canonicalClaim], { aliases: [alias] }),
      byEvent(
        ["alias-claim", catalog],
        ["canonical-claim", { kind: "unmapped", reason: "gap" }],
      ),
    );
    expect(result.exactInvalidXp).toBe(0);
    expect(result.reasons).toContain("alias_history_incomplete");
  });

  test("counts malformed achievement IDs as one non-exact anomaly family", () => {
    const missing = event("missing", { payload: {} });
    const result = analyzeAccount(input([missing]), new Map());
    expect(result.exactInvalidXp).toBe(0);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["catalog_unmapped", "prerequisite_unmapped"]),
    );
    expect(result.classification).toBe("indeterminate");
  });

  test("counts ledger and catalog symptoms from one event defect as one cause", () => {
    const broken = event("broken", { serverCreatedAtMs: null });
    const result = analyzeAccount(
      input([broken]),
      byEvent(["broken", { kind: "unmapped", reason: "missing_server_time" }]),
    );
    expect(result.reasons).toEqual(
      expect.arrayContaining(["ledger_history_incomplete", "catalog_unmapped"]),
    );
    expect(result.classification).toBe("indeterminate");
  });

  test("does not count aggregate completeness for the same event as a new cause", () => {
    const broken = event("broken", { serverCreatedAtMs: null });
    const result = analyzeAccount(
      input([broken], {
        completeness: {
          ...complete,
          ledger: "incomplete",
          catalog: "incomplete",
        },
      }),
      byEvent(["broken", { kind: "unmapped", reason: "missing_server_time" }]),
    );
    expect(result.classification).toBe("indeterminate");
  });

  test("does not turn unrelated evidence gaps into probable damage", () => {
    const result = analyzeAccount(
      input([], {
        baseline: {
          kind: "exact",
          xp: 0,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
        completeness: {
          ...complete,
          catalog: "incomplete",
          alias: "incomplete",
        },
      }),
      new Map(),
    );
    expect(result.classification).toBe("indeterminate");
  });

  test("correlates migration pattern and migration completeness as one cause", () => {
    const result = analyzeAccount(
      input([], {
        baseline: {
          kind: "exact",
          xp: 0,
          derivedFrom: "retained_cutover",
          atMs: 10,
        },
        migration: {
          kind: "pattern_only",
          pattern: "250_to_400",
          markerPresent: true,
        },
        completeness: { ...complete, migration: "incomplete" },
      }),
      new Map(),
    );
    expect(result.classification).toBe("indeterminate");
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

  test("reconstructs a unique tied order from an exact retained baseline", () => {
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

  test("keeps tied timestamps incomplete when multiple exact orders exist", () => {
    const first = event("a", {
      type: "xp",
      xpDelta: 0,
      totalXpBefore: 100,
      totalXpAfter: 100,
    });
    const second = event("b", {
      type: "xp",
      xpDelta: 0,
      totalXpBefore: 100,
      totalXpAfter: 100,
    });
    expect(
      analyzeLedgerContinuity([first, second], 100, {
        kind: "exact",
        xp: 100,
        derivedFrom: "retained_cutover",
        atMs: 900,
      }).complete,
    ).toBe(false);
  });

  test("finds the globally unique tied path beyond a locally ambiguous step", () => {
    const selfLoop = event("self-loop", {
      type: "xp",
      xpDelta: 0,
      totalXpBefore: 100,
      totalXpAfter: 100,
    });
    const advance = event("advance", {
      type: "xp",
      xpDelta: 50,
      totalXpBefore: 100,
      totalXpAfter: 150,
    });
    expect(
      analyzeLedgerContinuity([advance, selfLoop], 150, {
        kind: "exact",
        xp: 100,
        derivedFrom: "retained_cutover",
        atMs: 900,
      }).complete,
    ).toBe(true);
  });

  test("reconstructs 5000 uniquely chained tied events iteratively", () => {
    const events = Array.from({ length: 5_000 }, (_, index) =>
      event(`bulk-${index}`, {
        type: "xp",
        xpDelta: 1,
        totalXpBefore: index,
        totalXpAfter: index + 1,
        serverCreatedAtMs: 1_000,
        clientCreatedAtMs: 1_000,
      }),
    ).reverse();
    expect(
      analyzeLedgerContinuity(events, 5_000, {
        kind: "exact",
        xp: 0,
        derivedFrom: "retained_cutover",
        atMs: 900,
      }).complete,
    ).toBe(true);
  });

  test("does not use first-result baseline to resolve tied first-event identity", () => {
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
        kind: "exact",
        xp: 100,
        derivedFrom: "first_ledger_result",
        atMs: 1_000,
      }).complete,
    ).toBe(false);
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

  test("does not convert an unexplained inter-event gap into exact damage", () => {
    const first = event("first", {
      type: "xp",
      xpDelta: 50,
      totalXpBefore: 100,
      totalXpAfter: 150,
    });
    const second = event("second", {
      type: "xp",
      xpDelta: 50,
      totalXpBefore: 200,
      totalXpAfter: 250,
      serverCreatedAtMs: 2_000,
      clientCreatedAtMs: 2_000,
    });
    expect(
      analyzeLedgerContinuity([first, second], 250, {
        kind: "unknown",
        reason: "pre_cutover_unretained",
      }),
    ).toMatchObject({ complete: false, exactInvalidXp: 0 });
  });

  test("evaluates an empty ledger against an authoritative retained baseline", () => {
    expect(
      analyzeLedgerContinuity([], 100, {
        kind: "unknown",
        reason: "pre_cutover_unretained",
      }),
    ).toMatchObject({ complete: false, exactInvalidXp: 0 });
    expect(
      analyzeLedgerContinuity([], 100, {
        kind: "exact",
        xp: 100,
        derivedFrom: "retained_cutover",
        atMs: 10,
      }),
    ).toMatchObject({ complete: true, exactInvalidXp: 0 });
    expect(
      analyzeLedgerContinuity([], 150, {
        kind: "exact",
        xp: 100,
        derivedFrom: "retained_cutover",
        atMs: 10,
      }),
    ).toMatchObject({ complete: true, exactInvalidXp: 50 });
  });

  test("rejects retained baselines that do not precede the first event", () => {
    const first = event("first", {
      type: "xp",
      serverCreatedAtMs: 1_000,
      totalXpBefore: 100,
      totalXpAfter: 200,
    });
    expect(
      analyzeLedgerContinuity([first], 200, {
        kind: "exact",
        xp: 100,
        derivedFrom: "retained_cutover",
        atMs: 1_000,
      }),
    ).toMatchObject({ complete: false, exactInvalidXp: 0 });
  });
});
