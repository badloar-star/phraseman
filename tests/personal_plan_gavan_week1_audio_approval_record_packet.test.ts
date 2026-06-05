import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';

import {
  buildGavanWeek1AudioApprovalRecordPacket,
  GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH,
  writeGavanWeek1AudioApprovalRecordPacket,
} from '../tools/personal_plan_gavan_week1_audio_approval_record_packet';

const GENERATED_AT = '2026-06-04T15:40:00.000Z';
const MISSING_OUTPUT_ROOT = path.join('.codex-tmp', 'personal-plans', 'audio-approval-record-missing-files');

const OPTIONS = {
  generatedAt: GENERATED_AT,
  ownerId: 'audio-handoff-owner',
  intakeOwnerId: 'audio-intake-owner',
  approvalOwnerId: 'audio-approval-owner',
  registrationOwnerId: 'audio-registration-owner',
  recordPacketOwnerId: 'audio-record-packet-owner',
  outputRoot: MISSING_OUTPUT_ROOT,
};

describe('Gavan week 1 audio approval record packet', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH)) {
      rmSync(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH, { force: true });
    }
    rmSync(MISSING_OUTPUT_ROOT, { recursive: true, force: true });
  });

  it('builds a non-live approval-record packet without creating records when MP3 files are absent', () => {
    const result = buildGavanWeek1AudioApprovalRecordPacket(OPTIONS);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.packet).toMatchObject({
      kind: 'gavan_week1_audio_approval_record_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'blocked_missing_generated_audio',
      readyForLive: false,
      audioProductionReady: false,
      audioAssetRegistrationAllowed: false,
      approvalRecordsCreated: false,
      approvalMayBeInferred: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      registryWritesUsed: false,
    });
    expect(result.packet.summary).toEqual({
      expectedMp3Count: 10,
      eligibleForApprovalRecordCount: 0,
      blockedBeforeApprovalRecordCount: 10,
      checksumReadyCount: 0,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.packet.rows).toHaveLength(10);
    expect(result.packet.rows.every((row) => row.outputPath.startsWith(MISSING_OUTPUT_ROOT.replace(/\\/g, '/')))).toBe(true);
    expect(result.packet.rows.every((row) => row.approvalRecordTemplateStatus === 'blocked_until_generated_file_valid')).toBe(true);
    expect(result.packet.rows.every((row) => row.checksumStatus === 'blocked_missing_generated_file')).toBe(true);
    expect(result.packet.rows.map((row) => row.requiredApprovalFields).every((fields) =>
      fields.includes('reviewerId') &&
      fields.includes('approvedAt') &&
      fields.includes('audioChecksum')
    )).toBe(true);
  });

  it('writes deterministic packet JSON only under temp or reports', () => {
    const result = writeGavanWeek1AudioApprovalRecordPacket({
      ...OPTIONS,
      targetPath: GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    expect(existsSync(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_audio_approval_record_packet');
    expect(parsed.approvalRecordsCreated).toBe(false);
    expect(parsed.summary.blockedBeforeApprovalRecordCount).toBe(10);
  });

  it('rejects approval runtime asset and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_approval_gate.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-audio-approval-record-packet.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1AudioApprovalRecordPacket({
        ...OPTIONS,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Audio approval record packet can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import approval mutators runtime registries workers storage navigation scoring or UI', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_audio_approval_record_packet.ts'),
      'utf8',
    );

    for (const forbidden of [
      'buildPlanAudioApprovalInput',
      'approvePlanAudioAssets',
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
