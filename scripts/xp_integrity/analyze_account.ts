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
  exactGaps: readonly ExactLedgerGap[];
  incompleteCauseIds: readonly string[];
};

export type ExactLedgerGap = {
  kind: "retained_boundary" | "current_state";
  eventId: string;
  beforeXp: number;
  afterXp: number;
  amount: number;
  atMs: number | null;
  intervalStartMs: number | null;
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
  event.normalizationValid === true &&
  event.totalXpBefore !== null &&
  Number.isFinite(event.totalXpBefore) &&
  Number.isFinite(event.totalXpAfter) &&
  Number.isFinite(event.xpDelta) &&
  event.totalXpAfter - event.totalXpBefore === event.xpDelta;

function uniqueExactOrder(
  events: readonly NormalizedAuditEvent[],
  initialXp: number,
): NormalizedAuditEvent[] | null {
  const indexedEvents = [...events];
  const times = [
    ...new Set(indexedEvents.map((event) => event.serverCreatedAtMs as number)),
  ].sort((left, right) => left - right);
  const groupForTime = new Map(times.map((time, index) => [time, index]));
  const groupRemaining = times.map(() => 0);
  const byBefore = times.map(() => new Map<number, number[]>());
  indexedEvents.forEach((event, eventIndex) => {
    const groupIndex = groupForTime.get(
      event.serverCreatedAtMs as number,
    ) as number;
    groupRemaining[groupIndex] += 1;
    const before = event.totalXpBefore as number;
    const candidates = byBefore[groupIndex].get(before) ?? [];
    candidates.push(eventIndex);
    byBefore[groupIndex].set(before, candidates);
  });

  type SearchFrame = {
    groupIndex: number;
    candidates: readonly number[];
    nextCandidate: number;
  };
  const used = new Uint8Array(indexedEvents.length);
  const path: number[] = [];
  const solutions: number[][] = [];
  const searchBudget = Math.min(
    250_000,
    Math.max(20_000, indexedEvents.length * 4),
  );
  let explored = 0;

  const frameFor = (expectedXp: number, fromGroup: number): SearchFrame => {
    let groupIndex = fromGroup;
    while (
      groupIndex < groupRemaining.length &&
      groupRemaining[groupIndex] === 0
    ) {
      groupIndex += 1;
    }
    const candidates =
      groupIndex < byBefore.length
        ? (byBefore[groupIndex].get(expectedXp) ?? []).filter(
            (eventIndex) => used[eventIndex] === 0,
          )
        : [];
    return { groupIndex, candidates, nextCandidate: 0 };
  };

  const frames: SearchFrame[] = [frameFor(initialXp, 0)];
  while (frames.length > 0) {
    if (path.length === indexedEvents.length) {
      solutions.push([...path]);
      if (solutions.length > 1) return null;
      frames.pop();
      const chosen = path.pop();
      if (chosen !== undefined) {
        used[chosen] = 0;
        const groupIndex = groupForTime.get(
          indexedEvents[chosen].serverCreatedAtMs as number,
        ) as number;
        groupRemaining[groupIndex] += 1;
      }
      continue;
    }

    const frame = frames[frames.length - 1];
    if (frame.nextCandidate >= frame.candidates.length) {
      frames.pop();
      const chosen = path.pop();
      if (chosen !== undefined) {
        used[chosen] = 0;
        const groupIndex = groupForTime.get(
          indexedEvents[chosen].serverCreatedAtMs as number,
        ) as number;
        groupRemaining[groupIndex] += 1;
      }
      continue;
    }

    const chosen = frame.candidates[frame.nextCandidate];
    frame.nextCandidate += 1;
    if (used[chosen] !== 0) continue;
    explored += 1;
    if (explored > searchBudget) return null;
    used[chosen] = 1;
    groupRemaining[frame.groupIndex] -= 1;
    path.push(chosen);
    frames.push(frameFor(indexedEvents[chosen].totalXpAfter, frame.groupIndex));
  }

  return solutions.length === 1
    ? solutions[0].map((eventIndex) => indexedEvents[eventIndex])
    : null;
}

const incompleteLedger = (
  baseline: LedgerBaselineEvidence,
  causeIds: readonly string[],
): LedgerContinuityResult => ({
  complete: false,
  baseline,
  exactInvalidXp: 0,
  invalidByEvent: new Map(),
  exactGaps: [],
  incompleteCauseIds: causeIds,
});

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
    const amount = invalidTotal(invalidByEvent);
    return {
      complete: authoritative && currentXp >= suppliedBaseline.xp,
      baseline: suppliedBaseline,
      exactInvalidXp: amount,
      invalidByEvent,
      exactGaps:
        authoritative && amount > 0
          ? [
              {
                kind: "current_state",
                eventId: "__current_xp__",
                beforeXp: suppliedBaseline.xp,
                afterXp: currentXp,
                amount,
                atMs: null,
                intervalStartMs: suppliedBaseline.atMs,
              },
            ]
          : [],
      incompleteCauseIds: authoritative
        ? currentXp < suppliedBaseline.xp
          ? ["ledger:current_decrease"]
          : []
        : ["ledger:empty_baseline"],
    };
  }

  const malformedEvents = events.filter(
    (event) =>
      event.serverCreatedAtMs === null ||
      !Number.isFinite(event.serverCreatedAtMs) ||
      !exactEvent(event),
  );
  if (malformedEvents.length > 0)
    return incompleteLedger(
      suppliedBaseline,
      malformedEvents.map((event) => `event:${event.eventId}`),
    );

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
  const first = byTime[0];
  if (tied) {
    const validRetained =
      suppliedBaseline.kind === "exact" &&
      suppliedBaseline.derivedFrom === "retained_cutover" &&
      Number.isFinite(suppliedBaseline.atMs) &&
      suppliedBaseline.atMs < (first.serverCreatedAtMs as number);
    if (validRetained) {
      const reconstructed = uniqueExactOrder(events, suppliedBaseline.xp);
      if (reconstructed) byTime.splice(0, byTime.length, ...reconstructed);
      else
        return incompleteLedger(suppliedBaseline, [
          `ledger:order:${events
            .map((event) => event.eventId)
            .sort()
            .join(",")}`,
        ]);
    } else {
      return incompleteLedger(suppliedBaseline, ["ledger:tied_baseline"]);
    }
  }

  const ordered = byTime;
  const orderedFirst = ordered[0];
  if (
    suppliedBaseline.kind === "exact" &&
    ((suppliedBaseline.derivedFrom === "retained_cutover" &&
      (!Number.isFinite(suppliedBaseline.atMs) ||
        suppliedBaseline.atMs >= (orderedFirst.serverCreatedAtMs as number))) ||
      (suppliedBaseline.derivedFrom === "first_ledger_result" &&
        (suppliedBaseline.xp !== orderedFirst.totalXpBefore ||
          suppliedBaseline.atMs !== orderedFirst.serverCreatedAtMs)))
  ) {
    return incompleteLedger(suppliedBaseline, ["ledger:baseline"]);
  }
  const baseline: LedgerBaselineEvidence =
    suppliedBaseline.kind === "exact" &&
    suppliedBaseline.derivedFrom === "retained_cutover"
      ? suppliedBaseline
      : {
          kind: "exact",
          xp: orderedFirst.totalXpBefore as number,
          derivedFrom: "first_ledger_result",
          atMs: orderedFirst.serverCreatedAtMs as number,
        };
  const invalidByEvent = new Map<string, number>();
  const exactGaps: ExactLedgerGap[] = [];
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
        return incompleteLedger(baseline, [`event:${ledgerEvent.eventId}`]);
      }
      const amount = before - expected;
      const boundaryEventId = `__ledger_boundary__:${ledgerEvent.eventId}`;
      addInvalid(invalidByEvent, boundaryEventId, amount);
      if (amount > 0) {
        exactGaps.push({
          kind: "retained_boundary",
          eventId: boundaryEventId,
          beforeXp: expected,
          afterXp: before,
          amount,
          atMs: ledgerEvent.serverCreatedAtMs,
          intervalStartMs: null,
        });
      }
      if (before < expected) unexplainedDecrease = true;
    }
    expected = ledgerEvent.totalXpAfter;
  }
  addInvalid(invalidByEvent, "__current_xp__", currentXp - expected);
  if (currentXp > expected) {
    exactGaps.push({
      kind: "current_state",
      eventId: "__current_xp__",
      beforeXp: expected,
      afterXp: currentXp,
      amount: currentXp - expected,
      atMs: null,
      intervalStartMs: ordered[ordered.length - 1].serverCreatedAtMs,
    });
  }
  if (currentXp < expected) unexplainedDecrease = true;

  return {
    complete: !unexplainedDecrease,
    baseline,
    exactInvalidXp: invalidTotal(invalidByEvent),
    invalidByEvent,
    exactGaps,
    incompleteCauseIds: unexplainedDecrease ? ["ledger:current_decrease"] : [],
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
  const nonExactCauseIds = new Set<string>();
  const causesByFamily = new Map<string, Set<string>>();
  const invalidByEvent = new Map<string, number>();
  let runtimeEvidenceComplete = true;
  const addNonExactCause = (family: string, causeId: string): void => {
    nonExactCauseIds.add(causeId);
    const causes = causesByFamily.get(family) ?? new Set<string>();
    causes.add(causeId);
    causesByFamily.set(family, causes);
  };

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
    ledger.incompleteCauseIds.forEach((causeId) =>
      addNonExactCause("ledger", causeId),
    );
    runtimeEvidenceComplete = false;
  }

  for (const claimed of input.canonicalEvents.filter(isAchievementEvent)) {
    const achievementId = achievementIdOf(claimed);
    if (achievementId === null) {
      reasons.add("catalog_unmapped");
      reasons.add("prerequisite_unmapped");
      addNonExactCause("catalog", `event:${claimed.eventId}`);
      addNonExactCause("prerequisites", `event:${claimed.eventId}`);
      runtimeEvidenceComplete = false;
      continue;
    }
    const match = resolveMatch(catalogMatches, claimed, achievementId);
    const historicalReward = rewardFromMatch(match, achievementId);
    if (!historicalReward) {
      reasons.add("catalog_unmapped");
      addNonExactCause("catalog", `event:${claimed.eventId}`);
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
      addNonExactCause("prerequisites", `event:${claimed.eventId}`);
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
      addNonExactCause("alias", `alias:${alias.uid}:linkage`);
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
        addNonExactCause("alias", `event:${aliasClaim.eventId}`);
        runtimeEvidenceComplete = false;
        continue;
      }
      const aliasReward = rewardFromMatch(
        resolveMatch(catalogMatches, aliasClaim, aliasId),
        aliasId,
      );
      if (!aliasReward) {
        reasons.add("alias_history_incomplete");
        addNonExactCause("alias", `event:${aliasClaim.eventId}`);
        runtimeEvidenceComplete = false;
        continue;
      }
      const rawCandidates = input.canonicalEvents.filter(
        (candidate) =>
          isClaim(candidate) && achievementIdOf(candidate) === aliasId,
      );
      for (const candidate of rawCandidates) {
        if (
          candidate.serverCreatedAtMs !== null &&
          Number.isFinite(candidate.serverCreatedAtMs) &&
          candidate.serverCreatedAtMs < mergeTime
        ) {
          continue;
        }
        const canonicalId = achievementIdOf(candidate) as string;
        const canonicalReward = rewardFromMatch(
          resolveMatch(catalogMatches, candidate, canonicalId),
          canonicalId,
        );
        const sameSemantic =
          canonicalReward !== null &&
          canonicalReward.achievementId === aliasReward.achievementId &&
          canonicalReward.xp === aliasReward.xp &&
          samePrerequisite(
            canonicalReward.prerequisite,
            aliasReward.prerequisite,
          );
        const provenReplay =
          sameSemantic &&
          candidate.ownerUid === input.uid &&
          exactEvent(candidate) &&
          candidate.serverCreatedAtMs !== null &&
          Number.isFinite(candidate.serverCreatedAtMs) &&
          candidate.serverCreatedAtMs > mergeTime;
        if (provenReplay) {
          reasons.add("achievement_alias_replay_exact");
          addInvalid(invalidByEvent, candidate.eventId, candidate.xpDelta);
        } else {
          reasons.add("alias_history_incomplete");
          addNonExactCause("alias", `event:${candidate.eventId}`);
          runtimeEvidenceComplete = false;
        }
      }
    }
  }

  if (input.migration.kind === "exact") {
    const migration = input.migration;
    reasons.add("migration_exact");
    const duplicatesLedgerGap =
      migration.source === "deterministic_ledger_discontinuity" &&
      ledger.exactGaps.some(
        (gap) =>
          (gap.kind === "retained_boundary"
            ? gap.atMs === migration.occurredAtMs
            : gap.intervalStartMs !== null &&
              Number.isFinite(gap.intervalStartMs) &&
              Number.isFinite(migration.occurredAtMs) &&
              migration.occurredAtMs >= gap.intervalStartMs) &&
          gap.beforeXp === migration.beforeXp &&
          gap.afterXp === migration.afterXp &&
          gap.amount === migration.exactInvalidDelta,
      );
    if (!duplicatesLedgerGap) {
      addInvalid(invalidByEvent, "__migration__", migration.exactInvalidDelta);
    }
  } else if (input.migration.kind === "pattern_only") {
    reasons.add("migration_pattern_only");
    addNonExactCause("migration", "migration:pattern");
    runtimeEvidenceComplete = false;
  } else if (input.migration.kind === "incomplete") {
    addNonExactCause("migration", "migration:incomplete");
    runtimeEvidenceComplete = false;
  }

  for (const [family, state] of Object.entries(input.completeness)) {
    if (state !== "incomplete") continue;
    if (!causesByFamily.has(family)) {
      addNonExactCause(family, `evidence:${family}`);
    }
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
  const anomalyFamilyCount = [...causesByFamily.values()].filter(
    (causeIds) => causeIds.size > 0,
  ).length;
  const classification =
    exactInvalidXp > 0
      ? "confirmed_damaged"
      : nonExactCauseIds.size >= 2 && anomalyFamilyCount >= 2
        ? "probable_damaged"
        : nonExactCauseIds.size > 0
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
