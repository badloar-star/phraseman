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

export function analyzeLedgerContinuity(
  events: readonly NormalizedAuditEvent[],
  currentXp: number,
  suppliedBaseline: LedgerBaselineEvidence,
): LedgerContinuityResult {
  if (events.length === 0) {
    const invalidByEvent = new Map<string, number>();
    const authoritative =
      suppliedBaseline.kind === "exact" &&
      suppliedBaseline.derivedFrom === "retained_cutover" &&
      Number.isFinite(suppliedBaseline.atMs);
    if (authoritative) {
      addInvalid(
        invalidByEvent,
        "__current_xp__",
        currentXp - suppliedBaseline.xp,
      );
    }
    return {
      complete: authoritative && currentXp >= suppliedBaseline.xp,
      baseline: suppliedBaseline,
      exactInvalidXp: invalidTotal(invalidByEvent),
      invalidByEvent,
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
  if (tied) {
    return {
      complete: false,
      baseline: suppliedBaseline,
      exactInvalidXp: 0,
      invalidByEvent: new Map(),
    };
  }

  const ordered = byTime;
  const first = ordered[0];
  if (
    suppliedBaseline.kind === "exact" &&
    ((suppliedBaseline.derivedFrom === "retained_cutover" &&
      (!Number.isFinite(suppliedBaseline.atMs) ||
        suppliedBaseline.atMs >= (first.serverCreatedAtMs as number))) ||
      (suppliedBaseline.derivedFrom === "first_ledger_result" &&
        (suppliedBaseline.xp !== first.totalXpBefore ||
          suppliedBaseline.atMs !== first.serverCreatedAtMs)))
  ) {
    return {
      complete: false,
      baseline: suppliedBaseline,
      exactInvalidXp: 0,
      invalidByEvent: new Map(),
    };
  }
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
  for (const [index, ledgerEvent] of ordered.entries()) {
    const before = ledgerEvent.totalXpBefore as number;
    if (before !== expected) {
      const retainedFirstBoundary =
        index === 0 &&
        baseline.kind === "exact" &&
        baseline.derivedFrom === "retained_cutover";
      if (!retainedFirstBoundary) {
        return {
          complete: false,
          baseline,
          exactInvalidXp: 0,
          invalidByEvent: new Map(),
        };
      }
      addInvalid(invalidByEvent, ledgerEvent.eventId, before - expected);
      if (before < expected) unexplainedDecrease = true;
    }
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

const isAchievementEvent = (event: NormalizedAuditEvent): boolean =>
  event.type === "achievement_reward" || event.type === "achievement_claimed";

const isClaim = (event: NormalizedAuditEvent): boolean =>
  isAchievementEvent(event) && achievementIdOf(event) !== null;

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

  for (const claimed of input.canonicalEvents.filter(isAchievementEvent)) {
    const achievementId = achievementIdOf(claimed);
    if (achievementId === null) {
      reasons.add("catalog_unmapped");
      reasons.add("prerequisite_unmapped");
      nonExactFamilies.add("catalog");
      nonExactFamilies.add("prerequisites");
      runtimeEvidenceComplete = false;
      continue;
    }
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
    if (
      !alias.complete ||
      alias.canonicalUid !== input.uid ||
      alias.identityMergedAtMs === null ||
      !Number.isFinite(alias.identityMergedAtMs)
    ) {
      reasons.add("alias_history_incomplete");
      nonExactFamilies.add("alias");
      runtimeEvidenceComplete = false;
      continue;
    }
    for (const aliasClaim of alias.events.filter(isAchievementEvent)) {
      const aliasId = achievementIdOf(aliasClaim);
      const mergeTime = alias.identityMergedAtMs;
      if (
        aliasId === null ||
        aliasClaim.ownerUid !== alias.uid ||
        !exactEvent(aliasClaim) ||
        aliasClaim.serverCreatedAtMs === null ||
        !Number.isFinite(aliasClaim.serverCreatedAtMs) ||
        aliasClaim.serverCreatedAtMs >= mergeTime
      ) {
        reasons.add("alias_history_incomplete");
        nonExactFamilies.add("alias");
        runtimeEvidenceComplete = false;
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
      const rawCandidates = input.canonicalEvents.filter(
        (candidate) =>
          isClaim(candidate) && achievementIdOf(candidate) === aliasId,
      );
      const semanticCandidates = rawCandidates.filter((candidate) => {
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
      const replay = semanticCandidates.find(
        (candidate) =>
          candidate.ownerUid === input.uid &&
          exactEvent(candidate) &&
          candidate.serverCreatedAtMs !== null &&
          Number.isFinite(candidate.serverCreatedAtMs) &&
          candidate.serverCreatedAtMs > mergeTime,
      );
      if (replay) {
        reasons.add("achievement_alias_replay_exact");
        addInvalid(invalidByEvent, replay.eventId, replay.xpDelta);
      } else if (
        rawCandidates.some(
          (candidate) =>
            candidate.serverCreatedAtMs === null ||
            !Number.isFinite(candidate.serverCreatedAtMs) ||
            candidate.serverCreatedAtMs >= mergeTime,
        )
      ) {
        reasons.add("alias_history_incomplete");
        nonExactFamilies.add("alias");
        runtimeEvidenceComplete = false;
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
    proposedXp:
      classification === "confirmed_damaged" && exactReductionIsComplete
        ? Math.max(0, input.currentXp - exactInvalidXp)
        : null,
    exactReductionIsComplete,
    projectionDrift,
  };
}
