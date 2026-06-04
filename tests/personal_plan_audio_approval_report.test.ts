import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import type { GeneratedPlanAudioAssetsResult } from '../app/personal_plan_audio_generated_assets';
import {
  buildPlanAudioApprovalReport,
} from '../app/personal_plan_audio_approval_report';

function generatedAsset(overrides: Partial<PlanAudioAsset> = {}): PlanAudioAsset {
  return {
    id: 'audio:gavan:week1:block-1:unit-1',
    blockId: 'gavan-week1-day2:block-2',
    contentUnitIds: ['gavan-w1-d2-p1'],
    targetText: 'Could you repeat that?',
    locale: 'en',
    status: 'generated',
    assetId: 'audio:gavan:week1:block-1:unit-1',
    uri: 'assets/audio/personal-plans/gavan/week1/block-1/unit-1.mp3',
    durationMs: 1420,
    voiceId: 'openai:alloy',
    provider: 'openai',
    finalAssetReady: false,
    ...overrides,
  };
}

describe('personal plan audio approval report', () => {
  it('builds a reviewer-facing report with approval input for generated assets', () => {
    const generatedAssets: GeneratedPlanAudioAssetsResult = {
      assets: [generatedAsset()],
      blockers: [],
      summary: {
        jobs: 1,
        assets: 1,
        blockers: 0,
      },
    };

    const report = buildPlanAudioApprovalReport({
      planId: 'gavan',
      weekId: 'week1',
      generatedAssets,
      reviewerId: 'audio-reviewer-1',
      approvedAt: '2026-06-02T12:00:00.000Z',
    });

    expect(report.kind).toBe('plan_audio_approval_report');
    expect(report.releaseReady).toBe(false);
    expect(report.reviewReady).toBe(true);
    expect(report.approvalInput?.approvals).toHaveLength(1);
    expect(report.rows).toEqual([
      expect.objectContaining({
        assetId: 'audio:gavan:week1:block-1:unit-1',
        reviewStatus: 'ready_for_review',
        targetText: 'Could you repeat that?',
        durationMs: 1420,
      }),
    ]);
    expect(report.summary).toEqual({
      jobs: 1,
      generatedAssets: 1,
      generatedBlockers: 0,
      readyForReview: 1,
      blocked: 0,
      approvalIssues: 0,
    });
  });

  it('keeps missing files blocked and does not produce fake approvals', () => {
    const generatedAssets: GeneratedPlanAudioAssetsResult = {
      assets: [],
      blockers: [
        {
          jobId: 'audio-job:gavan:week1:block-1:unit-1',
          outputPath: 'assets/audio/personal-plans/gavan/week1/block-1/unit-1.mp3',
          reason: 'missing_generated_file',
        },
      ],
      summary: {
        jobs: 1,
        assets: 0,
        blockers: 1,
      },
    };

    const report = buildPlanAudioApprovalReport({
      planId: 'gavan',
      weekId: 'week1',
      generatedAssets,
      reviewerId: 'audio-reviewer-1',
      approvedAt: '2026-06-02T12:00:00.000Z',
    });

    expect(report.releaseReady).toBe(false);
    expect(report.reviewReady).toBe(false);
    expect(report.approvalInput).toBeUndefined();
    expect(report.rows).toEqual([
      expect.objectContaining({
        jobId: 'audio-job:gavan:week1:block-1:unit-1',
        reviewStatus: 'blocked',
        issueCodes: ['missing_generated_file'],
      }),
    ]);
    expect(report.summary).toEqual({
      jobs: 1,
      generatedAssets: 0,
      generatedBlockers: 1,
      readyForReview: 0,
      blocked: 1,
      approvalIssues: 0,
    });
  });

  it('surfaces approval issues for invalid generated assets', () => {
    const generatedAssets: GeneratedPlanAudioAssetsResult = {
      assets: [generatedAsset({ targetText: '' })],
      blockers: [],
      summary: {
        jobs: 1,
        assets: 1,
        blockers: 0,
      },
    };

    const report = buildPlanAudioApprovalReport({
      planId: 'gavan',
      weekId: 'week1',
      generatedAssets,
      reviewerId: 'audio-reviewer-1',
      approvedAt: '2026-06-02T12:00:00.000Z',
    });

    expect(report.reviewReady).toBe(false);
    expect(report.rows[0]).toEqual(expect.objectContaining({
      reviewStatus: 'blocked',
      issueCodes: expect.arrayContaining(['audio_asset_readiness_failed']),
    }));
    expect(report.summary.approvalIssues).toBeGreaterThan(0);
  });
});
