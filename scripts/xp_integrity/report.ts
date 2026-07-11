import { randomBytes } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { AccountAuditResult, IntegrityClass, ReasonCode } from "./types";

export type AggregateReport = {
  mode: "sample" | "full";
  startedAt: string;
  finishedAt: string;
  coverage: {
    infrastructureComplete: boolean;
    evidenceComplete: boolean;
    userDocumentsSeen: number;
    canonicalAccountsScanned: number;
    aliasDocumentsCovered: number;
    skippedAccounts: number;
    failedAccounts: number;
    earliestEventAt: string | null;
    latestEventAt: string | null;
  };
  readCount: number;
  classes: Record<IntegrityClass, number>;
  reasons: Partial<Record<ReasonCode, number>>;
  exactInvalidXpTotal: number;
  exactInvalidXpBuckets: Record<string, number>;
  projectionDriftUsers: number;
  calibration: {
    ran: boolean;
    resolved: boolean;
    matchedExpectedLevelNeighborhood: boolean | null;
    migrationIndicatorDetected: boolean | null;
    achievementIndicatorDetected: boolean | null;
  };
};

export type AggregateCoverage = {
  mode: AggregateReport["mode"];
  startedAt: Date | string;
  finishedAt: Date | string;
  infrastructureComplete: boolean;
  evidenceComplete: boolean;
  userDocumentsSeen: number;
  canonicalAccountsScanned: number;
  aliasDocumentsCovered: number;
  skippedAccounts: number;
  failedAccounts: number;
  earliestEventAtMs: number | null;
  latestEventAtMs: number | null;
  readCount: number;
  calibration: AggregateReport["calibration"];
};

const CLASSES: readonly IntegrityClass[] = [
  "confirmed_damaged",
  "probable_damaged",
  "indeterminate",
  "consistent",
];

const finiteNonNegativeInteger = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`xp_audit_invalid_aggregate:${name}`);
  }
};

const iso = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error("xp_audit_invalid_date");
  return date.toISOString();
};

const optionalIso = (value: number | null): string | null => {
  if (value === null) return null;
  if (!Number.isFinite(value)) throw new Error("xp_audit_invalid_event_date");
  return new Date(value).toISOString();
};

export function buildAggregateReport(
  results: readonly AccountAuditResult[],
  coverage: AggregateCoverage,
): AggregateReport {
  const countFields = [
    "userDocumentsSeen",
    "canonicalAccountsScanned",
    "aliasDocumentsCovered",
    "skippedAccounts",
    "failedAccounts",
    "readCount",
  ] as const;
  countFields.forEach((name) => finiteNonNegativeInteger(coverage[name], name));
  if (coverage.canonicalAccountsScanned !== results.length) {
    throw new Error("xp_audit_class_reconciliation_failed");
  }
  if (
    coverage.userDocumentsSeen !==
    coverage.canonicalAccountsScanned +
      coverage.aliasDocumentsCovered +
      coverage.skippedAccounts +
      coverage.failedAccounts
  ) {
    throw new Error("xp_audit_document_reconciliation_failed");
  }

  const classes = Object.fromEntries(
    CLASSES.map((classification) => [classification, 0]),
  ) as Record<IntegrityClass, number>;
  const reasons: Partial<Record<ReasonCode, number>> = {};
  const exactInvalidXpBuckets = Object.fromEntries(
    CLASSES.map((classification) => [classification, 0]),
  ) as Record<string, number>;
  let exactInvalidXpTotal = 0;
  let projectionDriftUsers = 0;
  for (const result of results) {
    if (!CLASSES.includes(result.classification)) {
      throw new Error("xp_audit_unknown_classification");
    }
    if (!Number.isFinite(result.exactInvalidXp) || result.exactInvalidXp < 0) {
      throw new Error("xp_audit_invalid_exact_xp");
    }
    classes[result.classification] += 1;
    exactInvalidXpBuckets[result.classification] += result.exactInvalidXp;
    exactInvalidXpTotal += result.exactInvalidXp;
    if (result.projectionDrift) projectionDriftUsers += 1;
    for (const reason of new Set(result.reasons)) {
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }
  }

  const report: AggregateReport = {
    mode: coverage.mode,
    startedAt: iso(coverage.startedAt),
    finishedAt: iso(coverage.finishedAt),
    coverage: {
      infrastructureComplete: coverage.infrastructureComplete,
      evidenceComplete: coverage.evidenceComplete,
      userDocumentsSeen: coverage.userDocumentsSeen,
      canonicalAccountsScanned: coverage.canonicalAccountsScanned,
      aliasDocumentsCovered: coverage.aliasDocumentsCovered,
      skippedAccounts: coverage.skippedAccounts,
      failedAccounts: coverage.failedAccounts,
      earliestEventAt: optionalIso(coverage.earliestEventAtMs),
      latestEventAt: optionalIso(coverage.latestEventAtMs),
    },
    readCount: coverage.readCount,
    classes,
    reasons,
    exactInvalidXpTotal,
    exactInvalidXpBuckets,
    projectionDriftUsers,
    calibration: { ...coverage.calibration },
  };
  validateAggregateReportPrivacy(report);
  return report;
}

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const IDENTITY_KEYS = new Set([
  "uid",
  "userid",
  "owneruid",
  "canonicaluid",
  "stableuid",
  "firebaseauthuid",
  "authuid",
  "provideruid",
  "accountid",
  "eventid",
  "email",
  "nickname",
  "displayname",
  "payload",
]);
const OPAQUE_ID_VALUE =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[A-Za-z0-9]{20,128})$/i;

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean => {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    [...expected].sort().every((key, index) => actual[index] === key)
  );
};

const REASON_KEYS = new Set([
  "ledger_discontinuity_exact",
  "achievement_overpayment_exact",
  "achievement_impossible_prerequisite_exact",
  "achievement_alias_replay_exact",
  "migration_exact",
  "migration_pattern_only",
  "catalog_unmapped",
  "prerequisite_unmapped",
  "alias_history_incomplete",
  "ledger_history_incomplete",
  "projection_drift",
]);

const aggregateSchemaValid = (value: unknown): value is AggregateReport => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const root = value as Record<string, unknown>;
  if (
    !exactKeys(root, [
      "mode",
      "startedAt",
      "finishedAt",
      "coverage",
      "readCount",
      "classes",
      "reasons",
      "exactInvalidXpTotal",
      "exactInvalidXpBuckets",
      "projectionDriftUsers",
      "calibration",
    ]) ||
    (root.mode !== "sample" && root.mode !== "full") ||
    typeof root.startedAt !== "string" ||
    !Number.isFinite(Date.parse(root.startedAt)) ||
    typeof root.finishedAt !== "string" ||
    !Number.isFinite(Date.parse(root.finishedAt))
  ) {
    return false;
  }
  const coverage = root.coverage as Record<string, unknown> | null;
  const classes = root.classes as Record<string, unknown> | null;
  const reasons = root.reasons as Record<string, unknown> | null;
  const buckets = root.exactInvalidXpBuckets as Record<string, unknown> | null;
  const calibration = root.calibration as Record<string, unknown> | null;
  const classKeys = [...CLASSES];
  const count = (candidate: unknown): boolean =>
    Number.isSafeInteger(candidate) && (candidate as number) >= 0;
  return Boolean(
    coverage &&
    exactKeys(coverage, [
      "infrastructureComplete",
      "evidenceComplete",
      "userDocumentsSeen",
      "canonicalAccountsScanned",
      "aliasDocumentsCovered",
      "skippedAccounts",
      "failedAccounts",
      "earliestEventAt",
      "latestEventAt",
    ]) &&
    typeof coverage.infrastructureComplete === "boolean" &&
    typeof coverage.evidenceComplete === "boolean" &&
    [
      coverage.userDocumentsSeen,
      coverage.canonicalAccountsScanned,
      coverage.aliasDocumentsCovered,
      coverage.skippedAccounts,
      coverage.failedAccounts,
    ].every(count) &&
    [coverage.earliestEventAt, coverage.latestEventAt].every(
      (date) =>
        date === null ||
        (typeof date === "string" && Number.isFinite(Date.parse(date))),
    ) &&
    classes &&
    exactKeys(classes, classKeys) &&
    Object.values(classes).every(count) &&
    reasons &&
    !Array.isArray(reasons) &&
    Object.keys(reasons).every((key) => REASON_KEYS.has(key)) &&
    Object.values(reasons).every(count) &&
    buckets &&
    exactKeys(buckets, classKeys) &&
    Object.values(buckets).every(
      (candidate) => typeof candidate === "number" && candidate >= 0,
    ) &&
    count(root.readCount) &&
    typeof root.exactInvalidXpTotal === "number" &&
    Number.isFinite(root.exactInvalidXpTotal) &&
    root.exactInvalidXpTotal >= 0 &&
    count(root.projectionDriftUsers) &&
    calibration &&
    exactKeys(calibration, [
      "ran",
      "resolved",
      "matchedExpectedLevelNeighborhood",
      "migrationIndicatorDetected",
      "achievementIndicatorDetected",
    ]) &&
    typeof calibration.ran === "boolean" &&
    typeof calibration.resolved === "boolean" &&
    [
      calibration.matchedExpectedLevelNeighborhood,
      calibration.migrationIndicatorDetected,
      calibration.achievementIndicatorDetected,
    ].every(
      (candidate) => candidate === null || typeof candidate === "boolean",
    ),
  );
};

export function validateAggregateReportPrivacy(
  value: unknown,
  privateDenylist: readonly string[] = [],
): void {
  const denied = privateDenylist.filter((item) => item.length > 0);
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "mode" in value &&
    !aggregateSchemaValid(value)
  ) {
    throw new Error("xp_audit_report_privacy_violation");
  }
  const visit = (current: unknown): void => {
    if (typeof current === "string") {
      if (
        EMAIL.test(current) ||
        OPAQUE_ID_VALUE.test(current) ||
        denied.some((secret) =>
          current.toLowerCase().includes(secret.toLowerCase()),
        )
      ) {
        throw new Error("xp_audit_report_privacy_violation");
      }
      return;
    }
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (current !== null && typeof current === "object") {
      for (const [key, nested] of Object.entries(current)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (
          IDENTITY_KEYS.has(normalizedKey) ||
          EMAIL.test(key) ||
          denied.some((secret) =>
            key.toLowerCase().includes(secret.toLowerCase()),
          )
        ) {
          throw new Error("xp_audit_report_privacy_violation");
        }
        visit(nested);
      }
    }
  };
  visit(value);
}

export function renderAggregateReportMarkdown(report: AggregateReport): string {
  const lowerBound =
    !report.coverage.infrastructureComplete ||
    !report.coverage.evidenceComplete;
  return [
    "# Аудит целостности XP",
    "",
    `Режим: ${report.mode}.`,
    `Инфраструктурное покрытие полное: ${report.coverage.infrastructureComplete ? "да" : "нет"}.`,
    `Доказательства полные: ${report.coverage.evidenceComplete ? "да" : "нет"}.`,
    `Проверено канонических аккаунтов: ${report.coverage.canonicalAccountsScanned}.`,
    `Покрыто документов-псевдонимов: ${report.coverage.aliasDocumentsCovered}.`,
    `Пропущено аккаунтов: ${report.coverage.skippedAccounts}.`,
    `Ошибок аккаунтов: ${report.coverage.failedAccounts}.`,
    `Ранняя дата покрытия: ${report.coverage.earliestEventAt ?? "нет"}.`,
    `Поздняя дата покрытия: ${report.coverage.latestEventAt ?? "нет"}.`,
    `Точно подтверждённый лишний XP${lowerBound ? " (нижняя граница)" : ""}: ${report.exactInvalidXpTotal}.`,
    `exactInvalidXpBuckets: ${JSON.stringify(report.exactInvalidXpBuckets)}.`,
    `Расхождение проекций, пользователей: ${report.projectionDriftUsers}.`,
    `Чтений: ${report.readCount}.`,
    "",
    "Классы:",
    ...Object.entries(report.classes).map(
      ([name, count]) => `- ${name}: ${count}`,
    ),
    "",
    "Причины:",
    ...(Object.keys(report.reasons).length === 0
      ? ["- нет"]
      : Object.entries(report.reasons).map(
          ([name, count]) => `- ${name}: ${count}`,
        )),
    "",
    "В ходе аудита выполнено ноль записей в Firestore и ноль исправлений.",
    "Любая коррекция требует отдельного разрешения.",
    "",
    "## Находки и предложения",
    "",
    lowerBound
      ? "Неполное покрытие не позволяет считать нижнюю границу полной массой исправления."
      : "Покрытие отчёта полное; решение об исправлении всё равно принимается отдельно.",
    "",
  ].join("\n");
}

function assertAuditOutputPath(root: string, candidate: string) {
  const approvedRoot = path.resolve(root, ".codex-tmp", "xp-integrity-audit");
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(approvedRoot, resolvedCandidate);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("xp_audit_output_path_outside_approved_root");
  return resolvedCandidate;
}

export function writeAggregateReport(
  root: string,
  runId: string,
  report: AggregateReport,
  privateDenylist: readonly string[] = [],
): { jsonPath: string; markdownPath: string } {
  if (!/^\d{8}T\d{6}Z$/.test(runId)) throw new Error("xp_audit_invalid_run_id");
  validateAggregateReportPrivacy(report, privateDenylist);
  const auditRoot = path.join(root, ".codex-tmp", "xp-integrity-audit");
  mkdirSync(assertAuditOutputPath(root, auditRoot), { recursive: true });
  const rootStat = lstatSync(assertAuditOutputPath(root, auditRoot));
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    realpathSync(assertAuditOutputPath(root, auditRoot)) !==
      path.resolve(auditRoot)
  ) {
    throw new Error("xp_audit_output_root_not_real_directory");
  }
  const suffix = randomBytes(12).toString("hex");
  const outputDir = path.join(auditRoot, `${runId}-${suffix}`);
  const tempDir = path.join(auditRoot, `.${runId}-${suffix}.tmp`);
  const jsonPath = path.join(outputDir, "aggregate.json");
  const markdownPath = path.join(outputDir, "decision.ru.md");
  const tempJsonPath = path.join(tempDir, "aggregate.json");
  const tempMarkdownPath = path.join(tempDir, "decision.ru.md");
  let tempCreated = false;
  try {
    mkdirSync(assertAuditOutputPath(root, tempDir));
    tempCreated = true;
    const tempStat = lstatSync(assertAuditOutputPath(root, tempDir));
    if (
      !tempStat.isDirectory() ||
      tempStat.isSymbolicLink() ||
      realpathSync(assertAuditOutputPath(root, tempDir)) !==
        path.resolve(tempDir)
    ) {
      throw new Error("xp_audit_temp_not_real_directory");
    }
    writeFileSync(
      assertAuditOutputPath(root, tempJsonPath),
      `${JSON.stringify(report, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", flush: true },
    );
    writeFileSync(
      assertAuditOutputPath(root, tempMarkdownPath),
      renderAggregateReportMarkdown(report),
      { encoding: "utf8", flag: "wx", flush: true },
    );
    let finalExists = true;
    try {
      lstatSync(assertAuditOutputPath(root, outputDir));
    } catch (error) {
      const code =
        error !== null && typeof error === "object" && "code" in error
          ? error.code
          : null;
      if (code === "ENOENT") finalExists = false;
      else throw error;
    }
    if (finalExists) throw new Error("xp_audit_output_collision");
    renameSync(
      assertAuditOutputPath(root, tempDir),
      assertAuditOutputPath(root, outputDir),
    );
    tempCreated = false;
  } catch (error) {
    if (tempCreated) {
      try {
        rmSync(assertAuditOutputPath(root, tempDir), {
          recursive: true,
          force: true,
        });
      } catch {
        // Preserve the publishing failure after best-effort temp cleanup.
      }
    }
    throw error;
  }
  return { jsonPath, markdownPath };
}
