import { readFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import { buildGavanWeek1AudioGenerationHandoffPacket } from '../tools/personal_plan_gavan_week1_audio_generation_handoff_packet';
import {
  buildGavanWeek1GeneratedAudioIntakeReport,
  GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH,
  isGavanWeek1GeneratedAudioIntakeReportTargetAllowed,
  writeGavanWeek1GeneratedAudioIntakeReport,
} from '../tools/personal_plan_gavan_week1_generated_audio_intake_report';

function generationPlan() {
  return buildGavanWeek1AudioGenerationPlan({
    voiceId: 'openai:alloy',
    outputRoot: 'assets/audio/personal-plans',
  });
}

function handoffPacket() {
  const result = buildGavanWeek1AudioGenerationHandoffPacket(generationPlan(), {
    generatedAt: '2026-06-04T00:00:00.000Z',
    ownerId: 'audio-producer',
  });
  if (!result.packet) throw new Error('expected handoff packet');
  return result.packet;
}

function readJson<T>(targetPath: string): T {
  return JSON.parse(readFileSync(targetPath, 'utf8')) as T;
}

describe('Gavan week 1 generated audio intake report', () => {
  beforeAll(() => {
    writeGavanWeek1GeneratedAudioIntakeReport(handoffPacket(), {}, {
      generatedAt: '2026-06-04T00:00:00.000Z',
      intakeOwnerId: 'audio-intake',
      targetPath: GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH,
    });
  });

  it('maps every expected MP3 output path to a missing row without making audio ready', () => {
    const result = buildGavanWeek1GeneratedAudioIntakeReport(handoffPacket(), {}, {
      generatedAt: '2026-06-04T00:00:00.000Z',
      intakeOwnerId: 'audio-intake',
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.report).toMatchObject({
      kind: 'gavan_week1_generated_audio_intake_report',
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceAudioWeekId: 'week1',
      status: 'blocked_missing_generated_audio',
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: false,
      approvalMayBeInferred: false,
      liveEditsAllowed: false,
      audioAssetRegistrationAllowed: false,
      pronunciationReadinessMayBeInferred: false,
    });
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      providedFileCount: 0,
      validGeneratedFileCount: 0,
      invalidGeneratedFileCount: 0,
      missingGeneratedFileCount: 10,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.report?.rows).toHaveLength(10);
    expect(result.report?.rows.every((row) => row.status === 'missing_generated_file')).toBe(true);
    expect(result.report?.generatedAssetsEvidence.summary).toEqual({
      jobs: 10,
      assets: 0,
      blockers: 10,
    });
  });

  it('separates valid generated files from invalid files without approving either', () => {
    const handoff = handoffPacket();
    const firstPath = handoff.generationRequests[0].outputPath;
    const secondPath = handoff.generationRequests[1].outputPath;

    const result = buildGavanWeek1GeneratedAudioIntakeReport(
      handoff,
      {
        [firstPath]: {
          uri: firstPath,
          durationMs: 1400,
          bytes: 4096,
        },
        [secondPath]: {
          uri: secondPath,
          durationMs: 0,
          bytes: 4096,
        },
      },
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        intakeOwnerId: 'audio-intake',
      },
    );

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('blocked_incomplete_generated_audio');
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      providedFileCount: 2,
      validGeneratedFileCount: 1,
      invalidGeneratedFileCount: 1,
      missingGeneratedFileCount: 8,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.report?.rows[0]).toEqual(expect.objectContaining({
      outputPath: firstPath,
      status: 'valid_generated_file',
      approvalStatus: 'not_approved',
    }));
    expect(result.report?.rows[0]).not.toHaveProperty('blocker');
    expect(result.report?.rows[1]).toEqual(expect.objectContaining({
      outputPath: secondPath,
      status: 'invalid_generated_file',
      blocker: 'invalid_generated_file',
      approvalStatus: 'not_approved',
    }));
    expect(result.report?.generatedAssetsEvidence.assets[0]).toEqual(expect.objectContaining({
      status: 'generated',
      finalAssetReady: false,
    }));
  });

  it('reports review-ready intake only when all expected generated files validate', () => {
    const handoff = handoffPacket();
    const generatedFilesByOutputPath = Object.fromEntries(
      handoff.generationRequests.map((request, index) => [
        request.outputPath,
        {
          uri: request.outputPath,
          durationMs: 1200 + index,
          bytes: 4096 + index,
        },
      ]),
    );

    const result = buildGavanWeek1GeneratedAudioIntakeReport(
      handoff,
      generatedFilesByOutputPath,
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        intakeOwnerId: 'audio-intake',
      },
    );

    expect(result.valid).toBe(true);
    expect(result.report?.status).toBe('ready_for_explicit_audio_approval');
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      providedFileCount: 10,
      validGeneratedFileCount: 10,
      invalidGeneratedFileCount: 0,
      missingGeneratedFileCount: 0,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.report?.readyForLive).toBe(false);
    expect(result.report?.audioApprovalReady).toBe(false);
    expect(result.report?.requiredNextActions).toContain(
      'Create explicit approval records for every valid generated file before any final audio registration.',
    );
  });

  it('rejects fake final audio claims in the intake file map', () => {
    const handoff = handoffPacket();
    const firstPath = handoff.generationRequests[0].outputPath;
    const result = buildGavanWeek1GeneratedAudioIntakeReport(
      handoff,
      {
        [firstPath]: {
          uri: firstPath,
          durationMs: 1400,
          bytes: 4096,
          status: 'approved',
          finalAssetReady: true,
        },
      },
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        intakeOwnerId: 'audio-intake',
      },
    );

    expect(result.valid).toBe(false);
    expect(result.report).toBeUndefined();
    expect(result.issues).toContainEqual({
      code: 'fake_final_audio_claim',
      detail: 'Generated audio intake cannot include approved/final-ready file claims; approval must be a separate record.',
    });
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-generated-audio-intake-report.test.json',
    );

    const result = writeGavanWeek1GeneratedAudioIntakeReport(handoffPacket(), {}, {
      generatedAt: '2026-06-04T00:00:00.000Z',
      intakeOwnerId: 'audio-intake',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(result.targetPath).toBe(targetPath);
    expect(isGavanWeek1GeneratedAudioIntakeReportTargetAllowed(targetPath)).toBe(true);

    const parsed = readJson<ReturnType<typeof buildGavanWeek1GeneratedAudioIntakeReport>['report']>(targetPath);
    expect(parsed?.kind).toBe('gavan_week1_generated_audio_intake_report');
    expect(parsed?.rows).toHaveLength(10);
  });

  it('rejects source audio and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_assets.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1.mp3'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1GeneratedAudioIntakeReport(handoffPacket(), {}, {
        generatedAt: '2026-06-04T00:00:00.000Z',
        intakeOwnerId: 'audio-intake',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Generated audio intake report can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import generation workers audio runtime scoring storage or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_generated_audio_intake_report.ts'),
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
