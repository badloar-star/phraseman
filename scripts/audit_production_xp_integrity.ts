import { analyzeAccount } from "./xp_integrity/analyze_account";
import { getLevelFromXP } from "../functions/src/xp_levels";
import {
  loadVerifiedCatalogHistory,
  matchCatalogForEvent,
} from "./xp_integrity/catalog_history";
import { createProductionXpAuditReader } from "./xp_integrity/firestore_reader";
import {
  buildAggregateReport,
  writeAggregateReport,
  type AggregateReport,
} from "./xp_integrity/report";
import type {
  AccountAuditInput,
  AccountAuditResult,
  EvidenceCompleteness,
  CatalogSnapshot,
  LedgerBaselineEvidence,
  MigrationEvidence,
  NormalizedAuditEvent,
  PrerequisiteEvidence,
  RawUser,
} from "./xp_integrity/types";

export type CliOptions = {
  mode: "sample" | "full";
  sampleSize: number;
  maximumReads: number;
  maximumReadsExplicit: boolean;
  concurrency: number;
  projectId: string;
};

const positiveInteger = (
  raw: string,
  name: string,
  minimum: number,
  maximum: number,
): number => {
  if (!/^\d+$/.test(raw)) throw new Error(`xp_audit_invalid_${name}`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`xp_audit_invalid_${name}`);
  }
  return value;
};

export function parseCliArgs(
  args: readonly string[],
  environment: Readonly<Record<string, string | undefined>> = process.env,
): CliOptions {
  let sampleSize = 25;
  let sampleExplicit = false;
  let full = false;
  let maximumReads = 5000;
  let maximumReadsExplicit = false;
  let concurrency = 4;
  let projectId =
    environment.GOOGLE_CLOUD_PROJECT ?? environment.GCLOUD_PROJECT ?? "";

  for (const argument of args) {
    if (["--apply", "--write", "--repair", "--send"].includes(argument)) {
      throw new Error("xp_audit_forbidden_read_only_flag");
    }
    if (argument === "--full") {
      full = true;
      continue;
    }
    const match = /^(--[a-z-]+)=(.*)$/.exec(argument);
    if (!match) throw new Error("xp_audit_unknown_flag");
    const [, name, raw] = match;
    if (name === "--sample") {
      sampleSize = positiveInteger(raw, "sample", 1, 250);
      sampleExplicit = true;
    } else if (name === "--max-reads") {
      maximumReads = positiveInteger(
        raw,
        "max-reads",
        1,
        Number.MAX_SAFE_INTEGER,
      );
      maximumReadsExplicit = true;
    } else if (name === "--concurrency") {
      concurrency = positiveInteger(raw, "concurrency", 1, 8);
    } else if (name === "--project") {
      if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(raw)) {
        throw new Error("xp_audit_invalid_project");
      }
      projectId = raw;
    } else {
      throw new Error("xp_audit_unknown_flag");
    }
  }
  if (full && sampleExplicit) throw new Error("xp_audit_mode_conflict");
  if (full && !maximumReadsExplicit) {
    throw new Error("xp_audit_full_requires_explicit_max-reads");
  }
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId)) {
    throw new Error("xp_audit_invalid_project");
  }
  return {
    mode: full ? "full" : "sample",
    sampleSize,
    maximumReads,
    maximumReadsExplicit,
    concurrency,
    projectId,
  };
}

const record = (value: unknown): Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};

const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const persistedXp = (value: unknown): number | null => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
};

const currentXpOf = (user: RawUser): number | null => {
  if (
    user.cutover.progressServerAuthoritative &&
    user.cutover.progressServerStateXp !== null
  ) {
    return user.cutover.progressServerStateXp;
  }
  const progress = record(user.progress);
  return (
    persistedXp(progress.user_total_xp) ??
    persistedXp(progress.totalXp) ??
    persistedXp(progress.totalXP) ??
    persistedXp(progress.xp)
  );
};

const isCanonical = (user: RawUser): boolean =>
  !user.identityHidden &&
  user.canonicalStableId === null &&
  user.duplicateOfStableId === null;

const eventTime = (event: NormalizedAuditEvent): number | null =>
  event.serverCreatedAtMs ?? event.clientCreatedAtMs;

const baselineFor = (
  events: readonly NormalizedAuditEvent[],
): LedgerBaselineEvidence => {
  const ordered = events
    .filter(
      (event) =>
        event.serverCreatedAtMs !== null && event.totalXpBefore !== null,
    )
    .sort(
      (left, right) =>
        (left.serverCreatedAtMs as number) -
          (right.serverCreatedAtMs as number) ||
        left.eventId.localeCompare(right.eventId),
    );
  const first = ordered[0];
  return first
    ? {
        kind: "exact",
        xp: first.totalXpBefore as number,
        derivedFrom: "first_ledger_result",
        atMs: first.serverCreatedAtMs as number,
      }
    : { kind: "unknown", reason: "pre_cutover_unretained" };
};

const migrationFor = (user: RawUser): MigrationEvidence => {
  const cutover = user.cutover;
  if (
    cutover.xpLevelRestoreAtMs !== null ||
    cutover.migrationDocument.migrated === true
  ) {
    return {
      kind: "pattern_only",
      pattern: "250_to_400",
      markerPresent: true,
    };
  }
  return { kind: "none" };
};

const achievementIdOf = (event: NormalizedAuditEvent): string | null => {
  const value = event.payload.achievementId;
  return typeof value === "string" && value.length > 0 ? value : null;
};

export function buildPrerequisiteEvidence(
  events: readonly NormalizedAuditEvent[],
  catalogs: readonly CatalogSnapshot[],
): PrerequisiteEvidence[] {
  const evidence: PrerequisiteEvidence[] = [];
  for (const event of events) {
    if (
      event.type !== "achievement_reward" &&
      event.type !== "achievement_claimed"
    ) {
      continue;
    }
    const achievementId = achievementIdOf(event);
    if (achievementId === null) {
      evidence.push({
        eventId: event.eventId,
        prerequisite: {
          kind: "unsupported",
          ruleId: "missing_achievement_id",
        },
        state: "missing",
      });
      continue;
    }
    const match = matchCatalogForEvent(catalogs, event, achievementId);
    const rewards =
      match.kind === "exact"
        ? [match.snapshot.rewards.get(achievementId)]
        : match.kind === "consensus"
          ? match.candidates.map((candidate) =>
              candidate.rewards.get(achievementId),
            )
          : [];
    const first = rewards[0];
    if (
      !first ||
      rewards.some(
        (reward) =>
          !reward ||
          JSON.stringify(reward.prerequisite) !==
            JSON.stringify(first.prerequisite),
      )
    ) {
      evidence.push({
        eventId: event.eventId,
        prerequisite: {
          kind: "unsupported",
          ruleId: `unmapped_achievement:${achievementId}`,
        },
        state: "missing",
      });
      continue;
    }
    const prerequisite = first.prerequisite;
    if (
      prerequisite.kind === "lifetime_xp" &&
      event.normalizationValid &&
      event.totalXpBefore !== null &&
      Number.isFinite(event.totalXpBefore)
    ) {
      evidence.push({
        eventId: event.eventId,
        prerequisite,
        state: "exact",
        valueBefore: event.totalXpBefore,
        source: "server_result",
      });
    } else if (
      prerequisite.kind === "weekly_xp" &&
      event.normalizationValid &&
      event.weekXpAfter !== null &&
      Number.isFinite(event.weekXpAfter) &&
      Number.isFinite(event.xpDelta) &&
      event.xpDelta >= 0 &&
      event.weekXpAfter >= event.xpDelta
    ) {
      evidence.push({
        eventId: event.eventId,
        prerequisite,
        state: "exact",
        valueBefore: event.weekXpAfter - event.xpDelta,
        source: "server_result",
      });
    } else {
      evidence.push({
        eventId: event.eventId,
        prerequisite,
        state: "missing",
      });
    }
  }
  return evidence;
}

const allEvidenceComplete = (result: AccountAuditResult): boolean =>
  result.exactReductionIsComplete &&
  Object.values(result.completeness).every((state) => state !== "incomplete");

export const isExpectedControlLevel = (totalXp: number): boolean => {
  const level = getLevelFromXP(totalXp);
  return level >= 7 && level <= 9;
};

const runIdFor = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  operation: (item: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      output[index] = await operation(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return output;
}

export type AuditRunResult = {
  exitCode: 0 | 1 | 2;
  report: AggregateReport;
  principalReadOnlyVerified: boolean;
};

export async function runProductionAudit(
  options: CliOptions,
  environment: Readonly<Record<string, string | undefined>> = process.env,
  root = process.cwd(),
): Promise<AuditRunResult> {
  const startedAt = new Date();
  const abortController = new AbortController();
  const abort = (): void => abortController.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  let reader: Awaited<ReturnType<typeof createProductionXpAuditReader>> | null =
    null;
  let principalReadOnlyVerified = false;
  const results: AccountAuditResult[] = [];
  const documentCategories = new Map<
    string,
    "canonical" | "alias" | "skipped" | "failed"
  >();
  let infrastructureComplete = true;
  let catalogEvidenceComplete = true;
  let earliestEventAtMs: number | null = null;
  let latestEventAtMs: number | null = null;
  const controlEmail = environment.XP_AUDIT_CONTROL_EMAIL?.trim() || null;
  let controlUid: string | null = null;
  let controlUser: RawUser | null = null;
  let controlResult: AccountAuditResult | null = null;
  let controlXp: number | null = null;

  try {
    reader = await createProductionXpAuditReader({
      projectId: options.projectId,
      maximumReads: options.maximumReads,
      signal: abortController.signal,
    });
    principalReadOnlyVerified = true;
    if (controlEmail !== null) {
      controlUid = await reader.resolveControlEmail(controlEmail);
      controlUser = await reader.readControlAccount(controlEmail);
      controlXp = controlUser === null ? null : currentXpOf(controlUser);
    }
    const catalogs = loadVerifiedCatalogHistory(root);
    catalogEvidenceComplete =
      catalogs.length > 0 && catalogs.every((catalog) => catalog.complete);
    let afterUid: string | null = null;
    let collectionDone = false;

    const auditUser = async (user: RawUser) => {
      const currentXp = currentXpOf(user);
      if (currentXp === null) return { kind: "skipped" as const, user };
      let stage = "events";
      try {
        const events: NormalizedAuditEvent[] = [];
        let afterEventId: string | null = null;
        for (;;) {
          const eventPage = await reader!.pageProgressEvents(
            user.uid,
            afterEventId,
            100,
          );
          events.push(...eventPage.events);
          if (eventPage.done) break;
          if (eventPage.nextAfterEventId === null) {
            throw new Error("xp_audit_incomplete_event_page");
          }
          afterEventId = eventPage.nextAfterEventId;
        }
        stage = "aliases";
        const aliasRead = await reader!.readAliases(user);
        stage = "mirrors";
        const mirrors = await reader!.readMirrors(user);
        const completeness: EvidenceCompleteness = {
          ledger: "complete",
          catalog: catalogEvidenceComplete ? "complete" : "incomplete",
          alias: aliasRead.complete ? "complete" : "incomplete",
          migration: "complete",
          prerequisites: "complete",
        };
        const prerequisites = buildPrerequisiteEvidence(events, catalogs);
        if (prerequisites.some((item) => item.state !== "exact")) {
          completeness.prerequisites = "incomplete";
        }
        const input: AccountAuditInput = {
          uid: user.uid,
          currentXp,
          canonicalEvents: events,
          aliases: aliasRead.aliases,
          baseline: baselineFor(events),
          migration: migrationFor(user),
          prerequisites,
          mirrors,
          completeness,
        };
        stage = "analysis";
        return {
          kind: "success" as const,
          user,
          currentXp,
          aliasRead,
          events,
          analyzed: analyzeAccount(input, (event, achievementId) =>
            matchCatalogForEvent(catalogs, event, achievementId),
          ),
        };
      } catch (error) {
        if (environment.XP_AUDIT_DEBUG_AGGREGATE === "1") {
          const rawCode = record(error).code;
          const code =
            typeof rawCode === "string"
              ? rawCode.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80)
              : "unknown";
          console.error(`xp_audit_account_failure=${stage}:${code}`);
        }
        return { kind: "failed" as const, user };
      }
    };

    while (
      !collectionDone &&
      (options.mode === "full" || results.length < options.sampleSize)
    ) {
      let page;
      try {
        const pageSize =
          options.mode === "sample"
            ? Math.min(100, options.sampleSize - results.length)
            : 100;
        page = await reader.pageUsers(afterUid, pageSize);
      } catch {
        infrastructureComplete = false;
        break;
      }
      collectionDone = page.done;
      afterUid = page.nextAfterUid;
      const candidates: RawUser[] = [];
      const pageAuthUids = new Set<string>();
      for (const user of page.users) {
        if (documentCategories.get(user.uid) === "alias") continue;
        if (!isCanonical(user)) {
          if (!documentCategories.has(user.uid)) {
            documentCategories.set(user.uid, "skipped");
          }
          continue;
        }
        if (
          user.firebaseAuthUid !== null &&
          pageAuthUids.has(user.firebaseAuthUid)
        ) {
          documentCategories.set(user.uid, "alias");
          continue;
        }
        if (user.firebaseAuthUid !== null) {
          pageAuthUids.add(user.firebaseAuthUid);
        }
        candidates.push(user);
      }
      const outcomes = await mapWithConcurrency(
        candidates,
        options.concurrency,
        auditUser,
      );
      for (const outcome of outcomes) {
        if (outcome.kind === "skipped") {
          documentCategories.set(outcome.user.uid, "skipped");
          continue;
        }
        if (outcome.kind === "failed") {
          documentCategories.set(outcome.user.uid, "failed");
          infrastructureComplete = false;
          continue;
        }
        if (documentCategories.get(outcome.user.uid) === "alias") continue;
        for (const alias of outcome.aliasRead.aliases) {
          if (documentCategories.get(alias.uid) !== "canonical") {
            documentCategories.set(alias.uid, "alias");
          }
        }
        for (const coveredEvent of [
          ...outcome.events,
          ...outcome.aliasRead.aliases.flatMap((alias) => alias.events),
        ]) {
          const time = eventTime(coveredEvent);
          if (time !== null) {
            earliestEventAtMs =
              earliestEventAtMs === null
                ? time
                : Math.min(earliestEventAtMs, time);
            latestEventAtMs =
              latestEventAtMs === null ? time : Math.max(latestEventAtMs, time);
          }
        }
        results.push(outcome.analyzed);
        documentCategories.set(outcome.user.uid, "canonical");
        if (
          controlUid !== null &&
          (outcome.user.uid === controlUid ||
            outcome.user.firebaseAuthUid === controlUid)
        ) {
          controlResult = outcome.analyzed;
          controlXp = outcome.currentXp;
        }
        if (!outcome.aliasRead.complete) infrastructureComplete = false;
      }
      if (!page.done && page.nextAfterUid === null) {
        infrastructureComplete = false;
        break;
      }
    }
    if (options.mode === "full" && !collectionDone)
      infrastructureComplete = false;
  } catch {
    infrastructureComplete = false;
  } finally {
    if (reader !== null) {
      try {
        await reader.close();
      } catch {
        infrastructureComplete = false;
      }
    }
    process.removeListener("SIGINT", abort);
    process.removeListener("SIGTERM", abort);
  }

  const counts = { canonical: 0, alias: 0, skipped: 0, failed: 0 };
  documentCategories.forEach((category) => {
    counts[category] += 1;
  });
  const evidenceComplete =
    catalogEvidenceComplete && results.every(allEvidenceComplete);
  const report = buildAggregateReport(results, {
    mode: options.mode,
    startedAt,
    finishedAt: new Date(),
    infrastructureComplete,
    evidenceComplete,
    userDocumentsSeen: documentCategories.size,
    canonicalAccountsScanned: counts.canonical,
    aliasDocumentsCovered: counts.alias,
    skippedAccounts: counts.skipped,
    failedAccounts: counts.failed,
    earliestEventAtMs,
    latestEventAtMs,
    readCount: reader?.getReadCount() ?? 0,
    calibration: {
      ran: controlEmail !== null,
      resolved: controlUid !== null,
      matchedExpectedLevelNeighborhood:
        controlXp === null ? null : isExpectedControlLevel(controlXp),
      migrationIndicatorDetected:
        controlResult === null
          ? null
          : controlResult.reasons.some((reason) =>
              reason.startsWith("migration_"),
            ),
      achievementIndicatorDetected:
        controlResult === null
          ? null
          : controlResult.reasons.some((reason) =>
              reason.startsWith("achievement_"),
            ),
    },
  });
  writeAggregateReport(root, runIdFor(startedAt), report, [
    controlEmail ?? "",
    controlUid ?? "",
  ]);
  const exitCode: 0 | 1 | 2 = !infrastructureComplete
    ? 1
    : !evidenceComplete
      ? 2
      : 0;
  return { exitCode, report, principalReadOnlyVerified };
}

async function main(): Promise<void> {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const outcome = await runProductionAudit(options);
    console.log(
      `project=${options.projectId} mode=${options.mode} principal=${outcome.principalReadOnlyVerified ? "scoped-read-permissions-verified" : "unverified"}`,
    );
    console.log(
      `accounts=${outcome.report.coverage.canonicalAccountsScanned} reads=${outcome.report.readCount} infrastructureComplete=${outcome.report.coverage.infrastructureComplete} evidenceComplete=${outcome.report.coverage.evidenceComplete}`,
    );
    process.exitCode = outcome.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : "xp_audit_failed";
    console.error(message);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
