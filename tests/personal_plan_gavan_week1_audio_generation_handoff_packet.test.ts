import { readFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import {
  buildGavanWeek1AudioGenerationHandoffPacket,
  GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH,
  isGavanWeek1AudioGenerationHandoffPacketTargetAllowed,
  writeGavanWeek1AudioGenerationHandoffPacket,
} from '../tools/personal_plan_gavan_week1_audio_generation_handoff_packet';

function generationPlan() {
  return buildGavanWeek1AudioGenerationPlan({
    voiceId: 'openai:alloy',
    outputRoot: 'assets/audio/personal-plans',
  });
}

function readJson<T>(targetPath: string): T {
  return JSON.parse(readFileSync(targetPath, 'utf8')) as T;
}

describe('Gavan week 1 audio generation handoff packet', () => {
  beforeAll(() => {
    writeGavanWeek1AudioGenerationHandoffPacket(generationPlan(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      ownerId: 'audio-producer',
      targetPath: GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH,
    });
  });

  it('builds a complete non-live generation handoff with exact MP3 inputs and approval guardrails', () => {
    const result = buildGavanWeek1AudioGenerationHandoffPacket(generationPlan(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      ownerId: 'audio-producer',
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.packet).toMatchObject({
      kind: 'gavan_week1_audio_generation_handoff_packet',
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceAudioWeekId: 'week1',
      status: 'ready_for_audio_generation_inputs',
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: false,
      approvalMayBeInferred: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      audioAssetRegistrationAllowed: false,
      pronunciationReadinessMayBeInferred: false,
    });
    expect(result.packet?.summary).toEqual({
      manifestItems: 5,
      expectedGenerationJobCount: 10,
      expectedMp3Count: 10,
      uniqueOutputPathCount: 10,
      generationBlockerCount: 0,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.packet?.generationRequests).toHaveLength(10);
    expect(result.packet?.generationRequests[0]).toEqual(expect.objectContaining({
      jobId: 'audio-job:gavan:week1:gavan-week1-day2-gavan-week1-day2-block-2:gavan-w1-d2-p1',
      expectedAssetId: 'audio:gavan:week1:gavan-week1-day2-gavan-week1-day2-block-2:gavan-w1-d2-p1',
      contentUnitId: 'gavan-w1-d2-p1',
      targetText: 'Could you repeat that?',
      provider: 'openai',
      voiceId: 'openai:alloy',
      outputPath: 'assets/audio/personal-plans/gavan/week1/gavan-week1-day2-gavan-week1-day2-block-2/gavan-w1-d2-p1.mp3',
      expectedFileType: 'mp3',
      requiredMetadata: {
        uri: 'assets/audio/personal-plans/gavan/week1/gavan-week1-day2-gavan-week1-day2-block-2/gavan-w1-d2-p1.mp3',
        durationMs: 'positive_number_after_generation',
        bytes: 'positive_number_after_generation',
      },
    }));
    expect(result.packet?.approvalChecklist).toEqual([
      'Generate or provide every expected MP3 before creating approval records.',
      'Validate each generated file has a playable URI, positive duration, positive bytes, provider, and voice id.',
      'Create one explicit approval record per generated asset with reviewer id, ISO approvedAt, and checksum.',
      'Only after explicit approval may assets be promoted to approved/final in a separate guarded pass.',
    ]);
    expect(result.packet?.writePolicy).toEqual({
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      audioFilesWritten: false,
    });
  });

  it('rejects incomplete generation plans instead of handing off vague audio work', () => {
    const result = buildGavanWeek1AudioGenerationHandoffPacket(
      buildGavanWeek1AudioGenerationPlan({
        voiceId: '',
        outputRoot: 'assets/audio/personal-plans',
      }),
      {
        generatedAt: '2026-06-04T00:00:00.000Z',
        ownerId: 'audio-producer',
      },
    );

    expect(result.valid).toBe(false);
    expect(result.packet).toBeUndefined();
    expect(result.issues).toContainEqual({
      code: 'generation_plan_not_ready',
      detail: 'Audio generation handoff requires a blocker-free ready-to-generate Gavan week 1 plan.',
    });
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-audio-generation-handoff-packet.test.json',
    );

    const result = writeGavanWeek1AudioGenerationHandoffPacket(generationPlan(), {
      generatedAt: '2026-06-04T00:00:00.000Z',
      ownerId: 'audio-producer',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(result.targetPath).toBe(targetPath);
    expect(isGavanWeek1AudioGenerationHandoffPacketTargetAllowed(targetPath)).toBe(true);

    const parsed = readJson<ReturnType<typeof buildGavanWeek1AudioGenerationHandoffPacket>['packet']>(targetPath);
    expect(parsed?.kind).toBe('gavan_week1_audio_generation_handoff_packet');
    expect(parsed?.generationRequests).toHaveLength(10);
  });

  it('rejects source audio and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_assets.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1.mp3'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1AudioGenerationHandoffPacket(generationPlan(), {
        generatedAt: '2026-06-04T00:00:00.000Z',
        ownerId: 'audio-producer',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Audio generation handoff packet can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import generation workers audio runtime scoring storage or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_audio_generation_handoff_packet.ts'),
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
