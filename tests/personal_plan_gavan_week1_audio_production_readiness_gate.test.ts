import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import {
  buildGavanWeek1AudioProductionReadinessGate,
  GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH,
  writeGavanWeek1AudioProductionReadinessGate,
} from '../tools/personal_plan_gavan_week1_audio_production_readiness_gate';

const GENERATED_AT = '2026-06-04T16:10:00.000Z';

const OPTIONS = {
  generatedAt: GENERATED_AT,
  ownerId: 'audio-handoff-owner',
  intakeOwnerId: 'audio-intake-owner',
  approvalOwnerId: 'audio-approval-owner',
  registrationOwnerId: 'audio-registration-owner',
  recordPacketOwnerId: 'audio-record-packet-owner',
  readinessOwnerId: 'audio-production-readiness-owner',
  outputRoot: path.join('.codex-tmp', 'personal-plans', 'audio-production-readiness-missing-files'),
};
const GENERATED_OUTPUT_ROOT = path.join('.codex-tmp', 'personal-plans', 'audio-production-readiness-generated-files');

describe('Gavan week 1 audio production readiness gate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH)) {
      rmSync(GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH, { force: true });
    }
    rmSync(GENERATED_OUTPUT_ROOT, { recursive: true, force: true });
    rmSync(OPTIONS.outputRoot, { recursive: true, force: true });
  });

  it('holds production readiness when the audio evidence chain has no real MP3 assets', () => {
    const result = buildGavanWeek1AudioProductionReadinessGate(OPTIONS);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.gate).toMatchObject({
      kind: 'gavan_week1_audio_production_readiness_gate',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'hold_missing_generated_audio',
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: false,
      audioAssetRegistrationAllowed: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      registryWritesUsed: false,
      audioFilesWritten: false,
      approvalRecordsCreated: false,
      pronunciationReadinessMayBeInferred: false,
    });
    expect(result.gate.summary).toEqual({
      expectedMp3Count: 10,
      discoveredMp3FileCount: 0,
      missingGeneratedFileCount: 10,
      validGeneratedFileCount: 0,
      eligibleApprovalRecordCount: 0,
      approvalRecordCount: 0,
      checksumReadyCount: 0,
      approvedFinalAudioCount: 0,
      registryReadyAssetCount: 0,
      productionReadyAudioCount: 0,
      blockerCount: 5,
    });
    expect(result.gate.blockers.map((blocker) => blocker.code)).toEqual([
      'missing_generated_mp3_files',
      'missing_generated_file_checksums',
      'missing_explicit_approval_records',
      'missing_final_audio_promotion',
      'live_audio_registry_blocked',
    ]);
  });

  it('writes deterministic gate JSON only under temp or reports', () => {
    const result = writeGavanWeek1AudioProductionReadinessGate({
      ...OPTIONS,
      targetPath: GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    expect(existsSync(GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_audio_production_readiness_gate');
    expect(parsed.releaseDecision).toBe('hold');
    expect(parsed.productionReady).toBe(false);
    expect(parsed.summary.blockerCount).toBe(5);
  });

  it('reports discovered generated MP3 files before explicit approval records exist', () => {
    const plan = buildGavanWeek1AudioGenerationPlan({
      voiceId: 'openai:alloy',
      outputRoot: GENERATED_OUTPUT_ROOT,
    });
    for (const job of plan.generation.jobs) {
      mkdirSync(path.dirname(job.outputPath), { recursive: true });
      writeFileSync(job.outputPath, Buffer.concat([Buffer.from('ID3'), Buffer.alloc(128)]));
    }

    const result = buildGavanWeek1AudioProductionReadinessGate({
      ...OPTIONS,
      outputRoot: GENERATED_OUTPUT_ROOT,
    });

    expect(result.valid).toBe(true);
    expect(result.gate.status).toBe('hold_missing_explicit_approval_records');
    expect(result.gate.summary.discoveredMp3FileCount).toBe(10);
    expect(result.gate.summary.validGeneratedFileCount).toBe(10);
    expect(result.gate.summary.checksumReadyCount).toBe(10);
    expect(result.gate.summary.approvalRecordCount).toBe(0);
    expect(result.gate.blockers.map((blocker) => blocker.code)).toEqual([
      'missing_explicit_approval_records',
      'missing_final_audio_promotion',
      'live_audio_registry_blocked',
    ]);
  });

  it('rejects live source asset and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_asset_registry.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-audio-production-readiness-gate.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1AudioProductionReadinessGate({
        ...OPTIONS,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Audio production readiness gate can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import live registries approval mutators workers storage navigation scoring or UI', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_audio_production_readiness_gate.ts'),
      'utf8',
    );

    for (const forbidden of [
      'approvePlanAudioAssets',
      'buildPlanAudioApprovalInput',
      'registerPlanAudioAssetsForRuntime',
      'personal_plan_audio_asset_registry',
      'personal_plan_audio_openai_worker',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'react-native',
      'personal_plan_pronunciation',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
