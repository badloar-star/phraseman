import type { AccountAuditResult } from "../scripts/xp_integrity/types";
import {
  buildAggregateReport,
  renderAggregateReportMarkdown,
  validateAggregateReportPrivacy,
  writeAggregateReport,
} from "../scripts/xp_integrity/report";

const complete = {
  ledger: "complete",
  catalog: "complete",
  alias: "complete",
  migration: "complete",
  prerequisites: "complete",
} as const;

const result = (
  overrides: Partial<AccountAuditResult> = {},
): AccountAuditResult => ({
  classification: "consistent",
  reasons: [],
  completeness: complete,
  exactInvalidXp: 0,
  proposedXp: null,
  exactReductionIsComplete: true,
  projectionDrift: false,
  ...overrides,
});

describe("aggregate XP integrity report", () => {
  test("uses the exact aggregate shape and reconciles classes, documents, buckets, and dates", () => {
    const report = buildAggregateReport(
      [
        result({
          classification: "confirmed_damaged",
          reasons: ["ledger_discontinuity_exact"],
          exactInvalidXp: 125,
          projectionDrift: true,
        }),
        result({
          classification: "indeterminate",
          exactReductionIsComplete: false,
        }),
      ],
      {
        mode: "sample",
        startedAt: new Date("2026-07-11T10:00:00Z"),
        finishedAt: new Date("2026-07-11T10:01:00Z"),
        infrastructureComplete: true,
        evidenceComplete: false,
        userDocumentsSeen: 5,
        canonicalAccountsScanned: 2,
        aliasDocumentsCovered: 1,
        skippedAccounts: 1,
        failedAccounts: 1,
        earliestEventAtMs: 1000,
        latestEventAtMs: 2000,
        readCount: 44,
        calibration: {
          ran: true,
          resolved: true,
          matchedExpectedLevelNeighborhood: true,
          migrationIndicatorDetected: false,
          achievementIndicatorDetected: true,
        },
      },
    );

    expect(Object.keys(report)).toEqual([
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
    ]);
    expect(Object.values(report.classes).reduce((a, b) => a + b, 0)).toBe(2);
    expect(report.coverage.userDocumentsSeen).toBe(
      report.coverage.canonicalAccountsScanned +
        report.coverage.aliasDocumentsCovered +
        report.coverage.skippedAccounts +
        report.coverage.failedAccounts,
    );
    expect(
      Object.values(report.exactInvalidXpBuckets).reduce((a, b) => a + b, 0),
    ).toBe(report.exactInvalidXpTotal);
    expect(report.coverage.earliestEventAt).toBe("1970-01-01T00:00:01.000Z");
    expect(report.coverage.latestEventAt).toBe("1970-01-01T00:00:02.000Z");
    expect(report.projectionDriftUsers).toBe(1);
  });

  test("rejects PII, identity keys, raw event IDs, payloads, and a private denylist recursively", () => {
    const forbidden: unknown[] = [
      { note: "person@example.com" },
      { uid: "raw-user" },
      { nested: [{ eventId: "event-123" }] },
      { payload: { arbitrary: "free form" } },
      { harmless: "private-control-auth-uid" },
    ];
    for (const value of forbidden) {
      expect(() =>
        validateAggregateReportPrivacy(value, ["private-control-auth-uid"]),
      ).toThrow(/privacy/i);
    }
  });

  test.each([
    "ownerUid",
    "canonical_uid",
    "stable-uid",
    "firebaseAuthUid",
    "auth_uid",
    "providerUID",
    "event-id",
  ])("rejects identity key variant %s", (identityKey) => {
    expect(() =>
      validateAggregateReportPrivacy({ [identityKey]: "opaque" }),
    ).toThrow(/privacy/i);
  });

  test("rejects email syntax and private denylist fragments in keys", () => {
    expect(() =>
      validateAggregateReportPrivacy({ "private@example.com": true }),
    ).toThrow(/privacy/i);
    expect(() =>
      validateAggregateReportPrivacy(
        { "prefix-private-control-suffix": true },
        ["private-control"],
      ),
    ).toThrow(/privacy/i);
  });

  test("renders Russian safety language and labels exact XP as a lower bound", () => {
    const report = buildAggregateReport(
      [
        result({
          classification: "confirmed_damaged",
          reasons: ["ledger_discontinuity_exact"],
          exactInvalidXp: 10,
        }),
      ],
      {
        mode: "full",
        startedAt: new Date(0),
        finishedAt: new Date(1),
        infrastructureComplete: true,
        evidenceComplete: false,
        userDocumentsSeen: 1,
        canonicalAccountsScanned: 1,
        aliasDocumentsCovered: 0,
        skippedAccounts: 0,
        failedAccounts: 0,
        earliestEventAtMs: null,
        latestEventAtMs: null,
        readCount: 3,
        calibration: {
          ran: false,
          resolved: false,
          matchedExpectedLevelNeighborhood: null,
          migrationIndicatorDetected: null,
          achievementIndicatorDetected: null,
        },
      },
    );
    const markdown = renderAggregateReportMarkdown(report);
    expect(markdown).toContain("Находки и предложения");
    expect(markdown).toMatch(/нижн/i);
    expect(markdown).toMatch(/ноль записей.*Firestore/i);
    expect(markdown).toMatch(/ноль исправлений/i);
    expect(markdown).toMatch(/отдельн.*разрешен/i);
    expect(markdown).toContain("confirmed_damaged");
    expect(markdown).toContain("ledger_discontinuity_exact");
    expect(markdown).toMatch(/Пропущено.*0/i);
    expect(markdown).toMatch(/Ошибок.*0/i);
    expect(markdown).toContain("exactInvalidXpBuckets");
    expect(markdown).toMatch(/Расхождение проекций.*0/i);
    expect(markdown).toMatch(/Ранняя дата покрытия.*нет/i);
    expect(markdown).toMatch(/Поздняя дата покрытия.*нет/i);
  });

  test("writes only aggregate.json and decision.ru.md", () => {
    const report = buildAggregateReport([result()], {
      mode: "sample",
      startedAt: new Date(0),
      finishedAt: new Date(1),
      infrastructureComplete: true,
      evidenceComplete: true,
      userDocumentsSeen: 1,
      canonicalAccountsScanned: 1,
      aliasDocumentsCovered: 0,
      skippedAccounts: 0,
      failedAccounts: 0,
      earliestEventAtMs: 1000,
      latestEventAtMs: 2000,
      readCount: 1,
      calibration: {
        ran: false,
        resolved: false,
        matchedExpectedLevelNeighborhood: null,
        migrationIndicatorDetected: null,
        achievementIndicatorDetected: null,
      },
    });
    const paths = writeAggregateReport(
      process.cwd(),
      "20990101T000000Z",
      report,
    );
    expect(paths.jsonPath).toMatch(/[\\/]aggregate\.json$/);
    expect(paths.markdownPath).toMatch(/[\\/]decision\.ru\.md$/);
  });
});
