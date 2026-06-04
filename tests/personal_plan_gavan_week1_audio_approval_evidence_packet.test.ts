import { readFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import { buildGeneratedPlanAudioAssets } from '../app/personal_plan_audio_generated_assets';
import {
  buildGavanWeek1AudioApprovalEvidencePacket,
  GAVAN_WEEK1_AUDIO_APPROVAL_EVIDENCE_PACKET_PATH,
  isGavanWeek1AudioApprovalEvidencePacketTargetAllowed,
  writeGavanWeek1AudioApprovalEvidencePacket,
} from '../tools/personal_plan_gavan_week1_audio_approval_evidence_packet';

function generationPlan() {
  return buildGavanWeek1AudioGenerationPlan({
    voiceId: 'openai:alloy',
    outputRoot: 'assets/audio/personal-plans',
  });
}

function missingGeneratedAssets() {
  return buildGeneratedPlanAudioAssets({
    jobs: generationPlan().generation.jobs,
    generatedFilesByOutputPath: {},
  });
}

function readJson<T>(targetPath: string): T {
  return JSON.parse(readFileSync(targetPath, 'utf8')) as T;
}

describe('Gavan week 1 audio approval evidence packet', () => {
  beforeAll(() => {
    writeGavanWeek1AudioApprovalEvidencePacket(generationPlan(), missingGeneratedAssets(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      reviewerId: 'audio-reviewer',
      approvedAt: '2026-06-04T00:00:00.000Z',
      targetPath: GAVAN_WEEK1_AUDIO_APPROVAL_EVIDENCE_PACKET_PATH,
    });
  });

  it('builds a non-live audio approval evidence packet without pretending generated audio is approved', () => {
    const result = buildGavanWeek1AudioApprovalEvidencePacket(
      generationPlan(),
      missingGeneratedAssets(),
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        reviewerId: 'audio-reviewer',
        approvedAt: '2026-06-04T00:00:00.000Z',
      },
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.packet).toMatchObject({
      kind: 'gavan_week1_audio_approval_evidence_packet',
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceAudioWeekId: 'week1',
      status: 'audio_approval_blocked_missing_generated_assets',
      blockerStillOpen: 'missing_approved_audio_assets',
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: false,
      approvalStillMissing: true,
      approvalMayBeInferred: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      audioGenerationAllowedInThisPass: false,
      audioAssetRegistrationAllowed: false,
      pronunciationReadinessMayBeInferred: false,
    });
    expect(result.packet?.summary).toEqual({
      expectedGenerationJobCount: 10,
      generatedAssetCount: 0,
      generatedBlockerCount: 10,
      approvalReportRows: 10,
      approvalReadyRows: 0,
      approvedAudioCount: 0,
      productionReadyAudioCount: 0,
      missingGeneratedFileCount: 10,
    });
    expect(result.packet?.approvalReportEvidence).toMatchObject({
      releaseReady: false,
      reviewReady: false,
      approvalInputCreated: false,
    });
    expect(result.packet?.requiredNextActions).toEqual([
      'Generate or provide the 10 expected MP3 assets for the Gavan week 1 listening jobs.',
      'Run generated audio asset validation and reviewer approval with explicit approval records.',
      'Register only approved final audio assets after release approval; do not infer pronunciation readiness from placeholders.',
    ]);
  });

  it('rejects mismatched generated assets instead of making the approval packet look complete', () => {
    const generatedAssets = missingGeneratedAssets();
    const result = buildGavanWeek1AudioApprovalEvidencePacket(
      generationPlan(),
      {
        ...generatedAssets,
        summary: {
          ...generatedAssets.summary,
          jobs: generatedAssets.summary.jobs - 1,
        },
      },
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        reviewerId: 'audio-reviewer',
        approvedAt: '2026-06-04T00:00:00.000Z',
      },
    );

    expect(result.valid).toBe(false);
    expect(result.packet).toBeUndefined();
    expect(result.issues).toContainEqual({
      code: 'generated_assets_job_count_mismatch',
      detail: 'Audio approval evidence requires generated-assets summary to match the generation plan jobs.',
    });
  });

  it('blocks fake final audio claims in generated asset evidence', () => {
    const plan = generationPlan();
    const generatedAssets = buildGeneratedPlanAudioAssets({
      jobs: plan.generation.jobs.slice(0, 1),
      generatedFilesByOutputPath: {
        [plan.generation.jobs[0].outputPath]: {
          uri: plan.generation.jobs[0].outputPath,
          bytes: 4096,
          durationMs: 1200,
        },
      },
    });
    const result = buildGavanWeek1AudioApprovalEvidencePacket(
      plan,
      {
        ...generatedAssets,
        assets: generatedAssets.assets.map((asset) => ({
          ...asset,
          status: 'approved',
          finalAssetReady: true,
        })),
        summary: {
          ...generatedAssets.summary,
          jobs: plan.generation.jobs.length,
        },
      },
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        reviewerId: 'audio-reviewer',
        approvedAt: '2026-06-04T00:00:00.000Z',
      },
    );

    expect(result.valid).toBe(false);
    expect(result.packet).toBeUndefined();
    expect(result.issues).toContainEqual({
      code: 'fake_final_audio_claim',
      detail: 'Audio approval evidence cannot contain approved or final-ready assets; approval must come from explicit approval records.',
    });
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-audio-approval-evidence-packet.test.json',
    );

    const result = writeGavanWeek1AudioApprovalEvidencePacket(
      generationPlan(),
      missingGeneratedAssets(),
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        reviewerId: 'audio-reviewer',
        approvedAt: '2026-06-04T00:00:00.000Z',
        targetPath,
      },
    );

    expect(result.valid).toBe(true);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(result.targetPath).toBe(targetPath);
    expect(isGavanWeek1AudioApprovalEvidencePacketTargetAllowed(targetPath)).toBe(true);

    const parsed = readJson<ReturnType<typeof buildGavanWeek1AudioApprovalEvidencePacket>['packet']>(targetPath);
    expect(parsed?.kind).toBe('gavan_week1_audio_approval_evidence_packet');
    expect(parsed?.writePolicy).toEqual({
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      audioFilesWritten: false,
    });
  });

  it('rejects source audio and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_assets.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1.mp3'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1AudioApprovalEvidencePacket(
        generationPlan(),
        missingGeneratedAssets(),
        {
          generatedAt: '2026-06-04T00:00:00.000Z',
          reviewerId: 'audio-reviewer',
          approvedAt: '2026-06-04T00:00:00.000Z',
          targetPath,
        },
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Audio approval evidence packet can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import generation workers audio runtime scoring storage or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_audio_approval_evidence_packet.ts'),
      'utf8',
    );

    for (const forbidden of [
      'child_process',
      'ffprobe',
      'openai',
      'expo-av',
      'expo-audio',
      'react-native',
      'AsyncStorage',
      'navigation',
      'pronunciation_score',
      'personal_plan_audio_openai_worker',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
