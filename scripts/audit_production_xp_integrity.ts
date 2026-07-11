import { analyzeAccount } from "./xp_integrity/analyze_account";
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
  LedgerBaselineEvidence,
  MigrationEvidence,
  NormalizedAuditEvent,
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

const currentXpOf = (user: RawUser): number | null => {
  const progress = record(user.progress);
  return (
    finiteNumber(progress.totalXp) ??
    finiteNumber(progress.totalXP) ??
    finiteNumber(progress.xp)
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

const allEvidenceComplete = (result: AccountAuditResult): boolean =>
  result.exactReductionIsComplete &&
  Object.values(result.completeness).every((state) => state !== "incomplete");

const runIdFor = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

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
    }
    const catalogs = loadVerifiedCatalogHistory(root);
    catalogEvidenceComplete =
      catalogs.length > 0 && catalogs.every((catalog) => catalog.complete);
    let afterUid: string | null = null;
    let canonicalAttempts = 0;
    let collectionDone = false;

    while (
      !collectionDone &&
      (options.mode === "full" || canonicalAttempts < options.sampleSize)
    ) {
      let page;
      try {
        const pageSize =
          options.mode === "sample"
            ? Math.min(100, options.sampleSize - canonicalAttempts)
            : 100;
        page = await reader.pageUsers(afterUid, pageSize);
      } catch {
        infrastructureComplete = false;
        break;
      }
      collectionDone = page.done;
      afterUid = page.nextAfterUid;
      for (const user of page.users) {
        if (
          options.mode === "sample" &&
          canonicalAttempts >= options.sampleSize
        ) {
          break;
        }
        if (documentCategories.get(user.uid) === "alias") continue;
        if (!isCanonical(user)) {
          if (!documentCategories.has(user.uid)) {
            documentCategories.set(user.uid, "skipped");
          }
          continue;
        }
        canonicalAttempts += 1;
        const currentXp = currentXpOf(user);
        if (currentXp === null) {
          documentCategories.set(user.uid, "failed");
          infrastructureComplete = false;
          continue;
        }
        try {
          const events: NormalizedAuditEvent[] = [];
          let afterEventId: string | null = null;
          for (;;) {
            const eventPage = await reader.pageProgressEvents(
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
          const aliasRead = await reader.readAliases(user);
          for (const alias of aliasRead.aliases) {
            if (documentCategories.get(alias.uid) !== "canonical") {
              documentCategories.set(alias.uid, "alias");
            }
          }
          const mirrors = await reader.readMirrors(user);
          for (const event of [
            ...events,
            ...aliasRead.aliases.flatMap((alias) => alias.events),
          ]) {
            const time = eventTime(event);
            if (time !== null) {
              earliestEventAtMs =
                earliestEventAtMs === null
                  ? time
                  : Math.min(earliestEventAtMs, time);
              latestEventAtMs =
                latestEventAtMs === null
                  ? time
                  : Math.max(latestEventAtMs, time);
            }
          }
          const completeness: EvidenceCompleteness = {
            ledger: "complete",
            catalog: catalogEvidenceComplete ? "complete" : "incomplete",
            alias: aliasRead.complete ? "complete" : "incomplete",
            migration: "complete",
            prerequisites: "complete",
          };
          const input: AccountAuditInput = {
            uid: user.uid,
            currentXp,
            canonicalEvents: events,
            aliases: aliasRead.aliases,
            baseline: baselineFor(events),
            migration: migrationFor(user),
            prerequisites: [],
            mirrors,
            completeness,
          };
          const analyzed = analyzeAccount(input, (event, achievementId) =>
            matchCatalogForEvent(catalogs, event, achievementId),
          );
          results.push(analyzed);
          documentCategories.set(user.uid, "canonical");
          if (
            controlUid !== null &&
            (user.uid === controlUid || user.firebaseAuthUid === controlUid)
          ) {
            controlResult = analyzed;
            controlXp = currentXp;
          }
          if (!aliasRead.complete) infrastructureComplete = false;
        } catch {
          documentCategories.set(user.uid, "failed");
          infrastructureComplete = false;
        }
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
        controlResult === null || controlXp === null
          ? null
          : controlXp >= 250 && controlXp < 800,
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
