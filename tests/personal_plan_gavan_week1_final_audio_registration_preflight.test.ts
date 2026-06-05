import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';

import {
  buildGavanWeek1FinalAudioRegistrationPreflight,
  GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH,
  writeGavanWeek1FinalAudioRegistrationPreflight,
} from '../tools/personal_plan_gavan_week1_final_audio_registration_preflight';

const GENERATED_AT = '2026-06-04T15:00:00.000Z';
const MISSING_OUTPUT_ROOT = path.join('.codex-tmp', 'personal-plans', 'audio-registration-missing-files');

const OPTIONS = {
  generatedAt: GENERATED_AT,
  ownerId: 'audio-handoff-owner',
  intakeOwnerId: 'audio-intake-owner',
  approvalOwnerId: 'audio-approval-owner',
  registrationOwnerId: 'audio-registration-owner',
  outputRoot: MISSING_OUTPUT_ROOT,
};

describe('Gavan week 1 final audio registration preflight', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH)) {
      rmSync(GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH, { force: true });
    }
    rmSync(MISSING_OUTPUT_ROOT, { recursive: true, force: true });
  });

  it('blocks live audio registry writes while generated MP3 files and explicit approvals are absent', () => {
    const result = buildGavanWeek1FinalAudioRegistrationPreflight(OPTIONS);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.report).toMatchObject({
      kind: 'gavan_week1_final_audio_registration_preflight',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'blocked_missing_generated_audio',
      readyForLive: false,
      audioProductionReady: false,
      audioAssetRegistrationAllowed: false,
      liveEditsAllowed: false,
      registryWritesUsed: false,
      sourceWritesUsed: false,
      audioFilesWritten: false,
    });
    expect(result.report.summary).toEqual({
      expectedMp3Count: 10,
      discoveredMp3FileCount: 0,
      missingGeneratedFileCount: 10,
      validGeneratedFileCount: 0,
      approvalRecordCount: 0,
      approvedFinalAudioCount: 0,
      registryReadyAssetCount: 0,
      blockedAssetCount: 10,
    });
    expect(result.report.rows).toHaveLength(10);
    expect(result.report.rows.every((row) => row.outputPath.startsWith(MISSING_OUTPUT_ROOT.replace(/\\/g, '/')))).toBe(true);
    expect(result.report.rows.every((row) => row.registrationStatus === 'blocked_missing_generated_file')).toBe(true);
    expect(result.report.rows.every((row) => row.registryWriteAllowed === false)).toBe(true);
    expect(result.report.rows.every((row) => row.productionReady === false)).toBe(true);
  });

  it('writes the non-live registration preflight under temp only', () => {
    const result = writeGavanWeek1FinalAudioRegistrationPreflight({
      ...OPTIONS,
      targetPath: GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    expect(existsSync(GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_final_audio_registration_preflight');
    expect(parsed.audioAssetRegistrationAllowed).toBe(false);
    expect(parsed.summary.blockedAssetCount).toBe(10);
  });

  it('rejects live asset source and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_asset_registry.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-final-audio-registration-preflight.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1FinalAudioRegistrationPreflight({
        ...OPTIONS,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Final audio registration preflight can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import runtime registries workers storage navigation scoring or UI', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_final_audio_registration_preflight.ts'),
      'utf8',
    );

    for (const forbidden of [
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
