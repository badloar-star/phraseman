import { mkdirSync, writeFileSync } from "node:fs";
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
  "eventid",
  "email",
  "nickname",
  "displayname",
  "payload",
]);
const RAW_ID_VALUE = /^(?:event|user|auth|uid)[_:-][A-Za-z0-9_-]{3,}$/i;

export function validateAggregateReportPrivacy(
  value: unknown,
  privateDenylist: readonly string[] = [],
): void {
  const denied = privateDenylist.filter((item) => item.length > 0);
  const visit = (current: unknown): void => {
    if (typeof current === "string") {
      if (
        EMAIL.test(current) ||
        RAW_ID_VALUE.test(current) ||
        denied.some((secret) => current.includes(secret))
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
          denied.some((secret) => key.includes(secret))
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
  const outputDir = path.join(root, ".codex-tmp", "xp-integrity-audit", runId);
  const jsonPath = path.join(outputDir, "aggregate.json");
  const markdownPath = path.join(outputDir, "decision.ru.md");
  mkdirSync(assertAuditOutputPath(root, outputDir), { recursive: true });
  writeFileSync(
    assertAuditOutputPath(root, jsonPath),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    assertAuditOutputPath(root, markdownPath),
    renderAggregateReportMarkdown(report),
    "utf8",
  );
  return { jsonPath, markdownPath };
}
