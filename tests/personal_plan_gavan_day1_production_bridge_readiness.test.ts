import { readFileSync } from 'fs';
import path from 'path';
import type {
  GavanDay1ApprovedExportReportRow,
} from '../app/personal_plan_gavan_day1_approved_export_report';
import {
  type GavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_approved_report_artifact';
import {
  generateGavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_generated_artifact';
import {
  buildGavanDay1ProductionBridgeReadiness,
} from '../tools/personal_plan_gavan_day1_production_bridge_readiness';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';
const GENERATED_AT = '2026-06-01T12:30:00.000Z';

function cleanArtifact(): GavanDay1ApprovedReportArtifact {
  return generateGavanDay1ApprovedReportArtifact({
    reviewerId: REVIEWER_ID,
    approvedAt: APPROVED_AT,
    generatedAt: GENERATED_AT,
  }).artifact;
}

function cloneArtifact(): GavanDay1ApprovedReportArtifact {
  return JSON.parse(JSON.stringify(cleanArtifact()));
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function rechecksum(row: GavanDay1ApprovedExportReportRow): GavanDay1ApprovedExportReportRow {
  return {
    ...row,
    textChecksum: fnv1a(`${row.snippetKind}|${row.snippetId}|${row.exactText}`),
  };
}

describe('Gavan day 1 non-live production bridge readiness gate', () => {
  it('accepts the regenerated clean artifact without editing live registries', () => {
    const readiness = buildGavanDay1ProductionBridgeReadiness(cleanArtifact());

    expect(readiness.kind).toBe('gavan_day1_production_bridge_readiness');
    expect(readiness.dayId).toBe('gavan-week1-day1');
    expect(readiness.liveIntegration).toBe(false);
    expect(readiness.status).toBe('ready');
    expect(readiness.canDraftProductionBridge).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.stages.approvedReport.status).toBe('ready');
    expect(readiness.stages.approvedArtifact.status).toBe('ready');
    expect(readiness.stages.productCopy.status).toBe('ready');
  });

  it('rejects invalid approved report rows', () => {
    const artifact = cloneArtifact();
    artifact.report.groups.quizPrompts[0].textChecksum = 'fnv1a:00000000';

    const readiness = buildGavanDay1ProductionBridgeReadiness(artifact);

    expect(readiness.status).toBe('blocked');
    expect(readiness.canDraftProductionBridge).toBe(false);
    expect(readiness.blockers).toContain('approved_report');
    expect(readiness.stages.approvedReport).toEqual(expect.objectContaining({
      status: 'blocked',
      issueCount: expect.any(Number),
    }));
    expect(readiness.stages.approvedReport.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'approved_report_invalid',
        sourceCode: 'checksum_mismatch',
      }),
    ]));
  });

  it('rejects invalid artifact shape and live integration', () => {
    const artifact = cloneArtifact();
    artifact.artifactKind = 'wrong_artifact_kind' as 'gavan_day1_approved_report_artifact';
    artifact.report.liveIntegration = true as false;

    const readiness = buildGavanDay1ProductionBridgeReadiness(artifact);

    expect(readiness.status).toBe('blocked');
    expect(readiness.blockers).toEqual(expect.arrayContaining([
      'approved_report',
      'approved_artifact',
      'product_copy',
    ]));
    expect(readiness.stages.approvedArtifact.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'approved_artifact_invalid',
        sourceCode: 'invalid_artifact_kind',
      }),
      expect.objectContaining({
        code: 'approved_artifact_invalid',
        sourceCode: 'live_integration_enabled',
      }),
    ]));
  });

  it('rejects product-copy audit failures even when report checksums match', () => {
    const artifact = cloneArtifact();
    artifact.report.groups.quizNotes[0] = rechecksum({
      ...artifact.report.groups.quizNotes[0],
      exactText: 'DEV placeholder: selected option.',
    });

    const readiness = buildGavanDay1ProductionBridgeReadiness(artifact);

    expect(readiness.status).toBe('blocked');
    expect(readiness.blockers).toContain('product_copy');
    expect(readiness.stages.approvedReport.status).toBe('ready');
    expect(readiness.stages.productCopy.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'product_copy_invalid',
        sourceCode: 'developer_or_robotic_copy',
      }),
    ]));
  });

  it('exposes a concise stage-level summary and blockers', () => {
    const artifact = cloneArtifact();
    artifact.report.groups.quizPrompts[0].textChecksum = 'fnv1a:00000000';

    const readiness = buildGavanDay1ProductionBridgeReadiness(artifact);

    expect(readiness.summary).toEqual({
      headline: 'Gavan day 1 is not ready for production bridge draft.',
      ready: expect.arrayContaining(['product_copy']),
      blockers: expect.arrayContaining(['approved_report', 'approved_artifact']),
    });
  });

  it('does not import live catalog live quizzes UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_day1_production_bridge_readiness.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from '../app/personal_plan_catalog'");
    expect(source).not.toContain("from '../app/personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
