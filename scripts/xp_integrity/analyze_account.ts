import type {
  AccountAuditInput,
  AccountAuditResult,
  AchievementPrerequisite,
  CatalogMatch,
  CatalogReward,
  EvidenceCompleteness,
  LedgerBaselineEvidence,
  NormalizedAuditEvent,
  ReasonCode,
} from "./types";

export type CatalogMatchSource =
  | ReadonlyMap<string, CatalogMatch>
  | ((event: NormalizedAuditEvent, achievementId: string) => CatalogMatch);

export type LedgerContinuityResult = {
  complete: boolean;
  baseline: LedgerBaselineEvidence;
  exactInvalidXp: number;
  invalidByEvent: ReadonlyMap<string, number>;
};

const achievementIdOf = (event: NormalizedAuditEvent): string | null => {
  const value = event.payload.achievementId;
  return typeof value === "string" && value.length > 0 ? value : null;
};

const addInvalid = (
  invalidByEvent: Map<string, number>,
  eventId: string,
  amount: number,
): void => {
  if (!Number.isFinite(amount) || amount <= 0) return;
  invalidByEvent.set(
    eventId,
    Math.max(invalidByEvent.get(eventId) ?? 0, amount),
  );
};

const invalidTotal = (invalidByEvent: ReadonlyMap<string, number>): number =>
  [...invalidByEvent.values()].reduce((sum, amount) => sum + amount, 0);

const exactEvent = (event: NormalizedAuditEvent): boolean =>
  event.totalXpBefore !== null &&
  Number.isFinite(event.totalXpBefore) &&
  Number.isFinite(event.totalXpAfter) &&
  Number.isFinite(event.xpDelta) &&
  event.totalXpAfter - event.totalXpBefore === event.xpDelta;

function chainFromRetainedBaseline(
  events: readonly NormalizedAuditEvent[],
  initialXp: number,
): NormalizedAuditEvent[] | null {
  const remaining = [...events];
  const ordered: NormalizedAuditEvent[] = [];
  let expected = initialXp;
  while (remaining.length > 0) {
    const candidates = remaining.filter(
      (candidate) => candidate.totalXpBefore === expected,
    );
    if (candidates.length !== 1) return null;
    const [next] = candidates;
    ordered.push(next);
    remaining.splice(remaining.indexOf(next), 1);
    expected = next.totalXpAfter;
  }
  return ordered;
}

export function analyzeLedgerContinuity(
  events: readonly NormalizedAuditEvent[],
  currentXp: number,
  suppliedBaseline: LedgerBaselineEvidence,
): LedgerContinuityResult {
  if (events.length === 0) {
    return {
      complete: true,
      baseline: suppliedBaseline,
      exactInvalidXp: 0,
      invalidByEvent: new Map(),
    };
  }

  if (
    events.some(
      (event) =>
        event.serverCreatedAtMs === null ||
        !Number.isFinite(event.serverCreatedAtMs) ||
        !exactEvent(event),
    )
  ) {
    return {
      complete: false,
      baseline: suppliedBaseline,
      exactInvalidXp: 0,
      invalidByEvent: new Map(),
    };
  }

  const byTime = [...events].sort(
    (left, right) =>
      (left.serverCreatedAtMs as number) -
        (right.serverCreatedAtMs as number) ||
      left.eventId.localeCompare(right.eventId),
  );
  const tied = byTime.some(
    (event, index) =>
      index > 0 &&
      event.serverCreatedAtMs === byTime[index - 1].serverCreatedAtMs,
  );
  let ordered = byTime;
  if (tied) {
    if (
      suppliedBaseline.kind !== "exact" ||
      suppliedBaseline.derivedFrom !== "retained_cutover"
    ) {
      return {
        complete: false,
        baseline: suppliedBaseline,
        exactInvalidXp: 0,
        invalidByEvent: new Map(),
      };
    }
    const resolved = chainFromRetainedBaseline(events, suppliedBaseline.xp);
    if (!resolved) {
      return {
        complete: false,
        baseline: suppliedBaseline,
        exactInvalidXp: 0,
        invalidByEvent: new Map(),
      };
    }
    ordered = resolved;
  }

  const first = ordered[0];
  const baseline: LedgerBaselineEvidence =
    suppliedBaseline.kind === "exact" &&
    suppliedBaseline.derivedFrom === "retained_cutover"
      ? suppliedBaseline
      : {
          kind: "exact",
          xp: first.totalXpBefore as number,
          derivedFrom: "first_ledger_result",
          atMs: first.serverCreatedAtMs as number,
        };
  const invalidByEvent = new Map<string, number>();
  let expected = baseline.xp;
  let unexplainedDecrease = false;
  for (const ledgerEvent of ordered) {
    const before = ledgerEvent.totalXpBefore as number;
    addInvalid(invalidByEvent, ledgerEvent.eventId, before - expected);
    if (before < expected) unexplainedDecrease = true;
    expected = ledgerEvent.totalXpAfter;
  }
  addInvalid(invalidByEvent, "__current_xp__", currentXp - expected);
  if (currentXp < expected) unexplainedDecrease = true;

  return {
    complete: !unexplainedDecrease,
    baseline,
    exactInvalidXp: invalidTotal(invalidByEvent),
    invalidByEvent,
  };
}

function resolveMatch(
  source: CatalogMatchSource,
  event: NormalizedAuditEvent,
  achievementId: string,
): CatalogMatch {
  if (typeof source === "function") return source(event, achievementId);
  return source.get(event.eventId) ?? { kind: "unmapped", reason: "gap" };
}

function rewardFromMatch(
  match: CatalogMatch,
  achievementId: string,
): CatalogReward | null {
  if (match.kind === "unmapped") return null;
  if (match.kind === "exact") {
    return match.snapshot.rewards.get(achievementId) ?? null;
  }
  const rewards = match.candidates.map((candidate) =>
    candidate.rewards.get(achievementId),
  );
  const first = rewards[0];
  if (!first || rewards.some((candidate) => !candidate)) return null;
  return rewards.every(
    (candidate) =>
      candidate?.xp === first.xp &&
      JSON.stringify(candidate.prerequisite) ===
        JSON.stringify(first.prerequisite),
  )
    ? first
    : null;
}

const samePrerequisite = (
  left: AchievementPrerequisite,
  right: AchievementPrerequisite,
): boolean => JSON.stringify(left) === JSON.stringify(right);

function prerequisiteValue(
  input: AccountAuditInput,
  event: NormalizedAuditEvent,
  prerequisite: AchievementPrerequisite,
): number | null {
  if (prerequisite.kind === "lifetime_xp") return event.totalXpBefore;
  if (prerequisite.kind === "weekly_xp") {
    return event.weekXpAfter === null
      ? null
      : event.weekXpAfter - event.xpDelta;
  }
  if (prerequisite.kind === "unsupported") return null;
  const evidence = input.prerequisites.find(
    (candidate) =>
      candidate.eventId === event.eventId &&
      samePrerequisite(candidate.prerequisite, prerequisite),
  );
  return evidence?.state === "exact" ? evidence.valueBefore : null;
}

const evidenceComplete = (completeness: EvidenceCompleteness): boolean =>
  Object.values(completeness).every((state) => state !== "incomplete");

const isClaim = (event: NormalizedAuditEvent): boolean =>
  event.type === "achievement_claimed" && achievementIdOf(event) !== null;

export function analyzeAccount(
  input: AccountAuditInput,
  catalogMatches: CatalogMatchSource,
): AccountAuditResult {
  const reasons = new Set<ReasonCode>();
  const nonExactFamilies = new Set<string>();
  const invalidByEvent = new Map<string, number>();
  let runtimeEvidenceComplete = true;

  const ledger = analyzeLedgerContinuity(
    input.canonicalEvents,
    input.currentXp,
    input.baseline,
  );
  for (const [eventId, amount] of ledger.invalidByEvent) {
    addInvalid(invalidByEvent, eventId, amount);
  }
  if (ledger.exactInvalidXp > 0) reasons.add("ledger_discontinuity_exact");
  if (!ledger.complete) {
    reasons.add("ledger_history_incomplete");
    nonExactFamilies.add("ledger");
    runtimeEvidenceComplete = false;
  }

  for (const claimed of input.canonicalEvents.filter(isClaim)) {
    const achievementId = achievementIdOf(claimed) as string;
    const match = resolveMatch(catalogMatches, claimed, achievementId);
    const historicalReward = rewardFromMatch(match, achievementId);
    if (!historicalReward) {
      reasons.add("catalog_unmapped");
      nonExactFamilies.add("catalog");
      runtimeEvidenceComplete = false;
      continue;
    }

    const overpayment = Math.max(0, claimed.xpDelta - historicalReward.xp);
    if (overpayment > 0) {
      reasons.add("achievement_overpayment_exact");
      addInvalid(invalidByEvent, claimed.eventId, overpayment);
    }

    const valueBefore = prerequisiteValue(
      input,
      claimed,
      historicalReward.prerequisite,
    );
    if (valueBefore === null) {
      reasons.add("prerequisite_unmapped");
      nonExactFamilies.add("prerequisites");
      runtimeEvidenceComplete = false;
    } else if (
      historicalReward.prerequisite.kind !== "unsupported" &&
      valueBefore < historicalReward.prerequisite.minimum
    ) {
      reasons.add("achievement_impossible_prerequisite_exact");
      addInvalid(invalidByEvent, claimed.eventId, claimed.xpDelta);
    }
  }

  for (const alias of input.aliases) {
    if (!alias.complete || alias.identityMergedAtMs === null) {
      reasons.add("alias_history_incomplete");
      nonExactFamilies.add("alias");
      runtimeEvidenceComplete = false;
      continue;
    }
    for (const aliasClaim of alias.events.filter(isClaim)) {
      const aliasId = achievementIdOf(aliasClaim) as string;
      const mergeTime = alias.identityMergedAtMs;
      if (
        aliasClaim.serverCreatedAtMs === null ||
        aliasClaim.serverCreatedAtMs >= mergeTime
      ) {
        continue;
      }
      const aliasReward = rewardFromMatch(
        resolveMatch(catalogMatches, aliasClaim, aliasId),
        aliasId,
      );
      if (!aliasReward) {
        reasons.add("alias_history_incomplete");
        nonExactFamilies.add("alias");
        runtimeEvidenceComplete = false;
        continue;
      }
      const replay = input.canonicalEvents.find((candidate) => {
        if (!isClaim(candidate) || !exactEvent(candidate)) return false;
        if (
          candidate.serverCreatedAtMs === null ||
          candidate.serverCreatedAtMs <= mergeTime
        ) {
          return false;
        }
        const canonicalId = achievementIdOf(candidate) as string;
        const canonicalReward = rewardFromMatch(
          resolveMatch(catalogMatches, candidate, canonicalId),
          canonicalId,
        );
        return (
          canonicalReward !== null &&
          canonicalReward.achievementId === aliasReward.achievementId &&
          canonicalReward.xp === aliasReward.xp &&
          samePrerequisite(
            canonicalReward.prerequisite,
            aliasReward.prerequisite,
          )
        );
      });
      if (replay) {
        reasons.add("achievement_alias_replay_exact");
        addInvalid(invalidByEvent, replay.eventId, replay.xpDelta);
      }
    }
  }

  if (input.migration.kind === "exact") {
    reasons.add("migration_exact");
    addInvalid(
      invalidByEvent,
      "__migration__",
      input.migration.exactInvalidDelta,
    );
  } else if (input.migration.kind === "pattern_only") {
    reasons.add("migration_pattern_only");
    nonExactFamilies.add("migration");
    runtimeEvidenceComplete = false;
  } else if (input.migration.kind === "incomplete") {
    nonExactFamilies.add("migration");
    runtimeEvidenceComplete = false;
  }

  for (const [family, state] of Object.entries(input.completeness)) {
    if (state !== "incomplete") continue;
    nonExactFamilies.add(family);
    if (family === "ledger") reasons.add("ledger_history_incomplete");
    if (family === "catalog") reasons.add("catalog_unmapped");
    if (family === "alias") reasons.add("alias_history_incomplete");
    if (family === "prerequisites") reasons.add("prerequisite_unmapped");
  }

  const mirrorValues = [
    input.mirrors.leaderboardXp,
    input.mirrors.arenaXp,
    input.mirrors.leagueXp,
  ].filter((value): value is number => value !== null);
  const projectionDrift = mirrorValues.some(
    (value) => value !== input.currentXp,
  );
  if (projectionDrift) reasons.add("projection_drift");

  const exactInvalidXp = invalidTotal(invalidByEvent);
  const classification =
    exactInvalidXp > 0
      ? "confirmed_damaged"
      : nonExactFamilies.size >= 2
        ? "probable_damaged"
        : nonExactFamilies.size === 1
          ? "indeterminate"
          : "consistent";
  const exactReductionIsComplete =
    runtimeEvidenceComplete && evidenceComplete(input.completeness);

  return {
    classification,
    reasons: [...reasons],
    completeness: input.completeness,
    exactInvalidXp,
    proposedXp: exactReductionIsComplete
      ? Math.max(0, input.currentXp - exactInvalidXp)
      : null,
    exactReductionIsComplete,
    projectionDrift,
  };
}
