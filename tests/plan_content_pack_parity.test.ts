import fs from 'fs';
import path from 'path';

import {
  PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
  validatePlanContentParityReport,
  type PlanContentParityReport,
} from '../app/plan_content_pack_parity';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function validReport(overrides: Partial<PlanContentParityReport> = {}): PlanContentParityReport {
  return {
    schemaVersion: PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
    manifestId: 'en.ru.plan_content.2026.06.26.1',
    manifestHash: HASH_A,
    sourceSnapshotId: 'git:abcdef1',
    generatedAt: '2026-06-26T00:00:00.000Z',
    comparedPlanDayCount: 1,
    addedShadowOnlyRows: [],
    missingRows: [],
    hashMismatches: [],
    adapterOutputMismatches: [],
    fallbackDecisionMismatches: [],
    reviewerSummary: {
      reviewedRowCount: 1,
      reviewStatusCounts: {
        approved: 1,
        shadow: 0,
        hold: 0,
        rejected: 0,
      },
      localeGateStatusCounts: {
        passed: 1,
        hold: 0,
        failed: 0,
      },
    },
    verdict: 'activation_candidate',
    ...overrides,
  };
}

describe('plan content parity report validators', () => {
  it('accepts a clean activation candidate report', () => {
    expect(validatePlanContentParityReport(validReport())).toEqual({ ok: true, errors: [] });
  });

  it('fails closed for invalid report identity and top-level counts', () => {
    const result = validatePlanContentParityReport(validReport({
      schemaVersion: 'plan-content-parity-report-v2' as never,
      manifestId: '../bad',
      manifestHash: 'not-a-hash',
      sourceSnapshotId: 'bad snapshot id',
      generatedAt: 'not-a-date',
      comparedPlanDayCount: 0,
      verdict: 'maybe' as never,
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'schemaVersion must be plan-content-parity-report-v1',
      'manifestId must be a non-empty stable token',
      'manifestHash must be a 64 character hex digest',
      'sourceSnapshotId must be a non-empty stable token',
      'generatedAt must be an ISO-compatible timestamp',
      'comparedPlanDayCount must be a positive safe integer',
      'verdict must be a known parity verdict',
    ]));
  });

  it('blocks activation candidates when any parity mismatch exists', () => {
    const result = validatePlanContentParityReport(validReport({
      addedShadowOnlyRows: [
        { planId: 'voyazh', dayIndex: 2, detail: 'new row not in bundled compatibility' },
      ],
      missingRows: [
        { planId: 'voyazh', dayIndex: 1, detail: 'missing from shadow pack' },
      ],
      hashMismatches: [
        {
          planId: 'voyazh',
          dayIndex: 1,
          detail: 'normalized row hash changed',
          expectedHash: HASH_A,
          actualHash: HASH_B,
        },
      ],
      adapterOutputMismatches: [
        {
          planId: 'voyazh',
          dayIndex: 1,
          detail: 'phrase adapter output changed',
          adapter: 'phrases',
        },
      ],
      fallbackDecisionMismatches: [
        {
          planId: 'voyazh',
          dayIndex: 999,
          detail: 'missing bundled day no longer falls back',
          expectedDecision: 'template_fallback',
          actualDecision: 'blocked',
        },
      ],
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'verdict activation_candidate requires no added shadow-only rows',
      'verdict activation_candidate requires no parity mismatches',
    ]));
  });

  it('blocks shadow parity pass verdict when blocking mismatches exist', () => {
    const result = validatePlanContentParityReport(validReport({
      verdict: 'shadow_parity_passed',
      reviewerSummary: {
        reviewedRowCount: 2,
        reviewStatusCounts: {
          approved: 1,
          shadow: 1,
          hold: 0,
          rejected: 0,
        },
        localeGateStatusCounts: {
          passed: 1,
          hold: 1,
          failed: 0,
        },
      },
      missingRows: [
        { planId: 'voyazh', dayIndex: 1, detail: 'missing from shadow pack' },
      ],
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'verdict shadow_parity_passed requires no missing/hash/adapter/fallback mismatches',
    ]));
  });

  it('requires approved review and passed locale gates for activation candidates', () => {
    const result = validatePlanContentParityReport(validReport({
      reviewerSummary: {
        reviewedRowCount: 1,
        reviewStatusCounts: {
          approved: 0,
          shadow: 1,
          hold: 0,
          rejected: 0,
        },
        localeGateStatusCounts: {
          passed: 0,
          hold: 1,
          failed: 0,
        },
      },
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'reviewerSummary.reviewStatusCounts.approved must equal comparedPlanDayCount for activation_candidate',
      'reviewerSummary.reviewStatusCounts must not include shadow/hold/rejected for activation_candidate',
      'reviewerSummary.localeGateStatusCounts.passed must equal comparedPlanDayCount for activation_candidate',
      'reviewerSummary.localeGateStatusCounts must not include hold/failed for activation_candidate',
    ]));
  });

  it('validates mismatch row metadata and summary count consistency', () => {
    const result = validatePlanContentParityReport(validReport({
      hashMismatches: [
        {
          planId: 'bad/id',
          dayIndex: -1,
          detail: '',
          expectedHash: 'not-a-hash',
          actualHash: 'also-bad',
        },
      ],
      adapterOutputMismatches: [
        {
          planId: 'voyazh',
          dayIndex: 1,
          detail: 'bad adapter',
          adapter: 'audio' as never,
        },
      ],
      fallbackDecisionMismatches: [
        {
          planId: 'voyazh',
          dayIndex: 1,
          detail: 'bad decision',
          expectedDecision: 'skip' as never,
          actualDecision: 'render' as never,
        },
      ],
      reviewerSummary: {
        reviewedRowCount: 2,
        reviewStatusCounts: {
          approved: 1,
          shadow: 0,
          hold: 0,
          rejected: 0,
        },
        localeGateStatusCounts: {
          passed: 1,
          hold: 0,
          failed: 0,
        },
      },
      verdict: 'hold',
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'hashMismatches[0].planId must be a stable plan id',
      'hashMismatches[0].dayIndex must be a positive safe integer',
      'hashMismatches[0].detail must be a non-empty detail',
      'hashMismatches[0].expectedHash must be a 64 character hex digest',
      'hashMismatches[0].actualHash must be a 64 character hex digest',
      'adapterOutputMismatches[0].adapter must be a known adapter surface',
      'fallbackDecisionMismatches[0].expectedDecision must be a known fallback decision',
      'fallbackDecisionMismatches[0].actualDecision must be a known fallback decision',
      'reviewerSummary.reviewStatusCounts must sum to reviewedRowCount',
      'reviewerSummary.localeGateStatusCounts must sum to reviewedRowCount',
    ]));
  });

  it('keeps parity validators disconnected from startup, Firebase, loader runtime and payloads', () => {
    const validatorSource = fs.readFileSync(path.join(ROOT, 'app', 'plan_content_pack_parity.ts'), 'utf8');
    expect(validatorSource).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|AsyncStorage|course_pack_loader|plan_content_registry|plan_content_(impuls|gavan|mitap|echo|voyazh)/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_pack_parity|PlanContentParityReport/i);
    }
  });
});
