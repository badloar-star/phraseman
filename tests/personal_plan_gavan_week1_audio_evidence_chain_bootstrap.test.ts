import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import {
  buildGavanWeek1AudioEvidenceChainBootstrap,
  GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH,
  writeGavanWeek1AudioEvidenceChainBootstrap,
} from '../tools/personal_plan_gavan_week1_audio_evidence_chain_bootstrap';
import { GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH } from '../tools/personal_plan_gavan_week1_audio_generation_handoff_packet';
import { GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH } from '../tools/personal_plan_gavan_week1_audio_explicit_approval_intake_report';
import { GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH } from '../tools/personal_plan_gavan_week1_generated_audio_intake_report';

const GENERATED_AT = '2026-06-04T14:00:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

const CANONICAL_OUTPUTS = [
  GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH,
  GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH,
  GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH,
  GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH,
];
const MISSING_OUTPUT_ROOT = path.join('.codex-tmp', 'personal-plans', 'audio-bootstrap-missing-files');
const EXISTING_OUTPUT_ROOT = path.join('.codex-tmp', 'personal-plans', 'audio-bootstrap-existing-files');

describe('Gavan week 1 audio evidence chain bootstrap', () => {
  beforeEach(() => {
    for (const targetPath of CANONICAL_OUTPUTS) {
      rmSync(targetPath, { force: true });
    }
    rmSync(MISSING_OUTPUT_ROOT, { recursive: true, force: true });
    rmSync(EXISTING_OUTPUT_ROOT, { recursive: true, force: true });
  });

  it('builds a non-live blocked report from the exact P3.105 output paths when MP3 files are absent', () => {
    const result = buildGavanWeek1AudioEvidenceChainBootstrap({
      generatedAt: GENERATED_AT,
      ownerId: 'audio-producer',
      intakeOwnerId: 'audio-intake',
      approvalOwnerId: 'audio-approval-owner',
      outputRoot: MISSING_OUTPUT_ROOT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.report).toMatchObject({
      kind: 'gavan_week1_audio_evidence_chain_bootstrap',
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'blocked_missing_generated_audio',
      readyForLive: false,
      generatedAudioApproved: false,
      audioProductionReady: false,
      audioAssetRegistrationAllowed: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
    });
    expect(result.report?.summary).toEqual({
      expectedMp3Count: 10,
      discoveredMp3FileCount: 0,
      missingGeneratedFileCount: 10,
      invalidGeneratedFileCount: 0,
      validGeneratedFileCount: 0,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.report?.rows).toHaveLength(10);
    expect(result.report?.rows.every((row) =>
      row.outputPath.startsWith(MISSING_OUTPUT_ROOT.replace(/\\/g, '/')) &&
      row.generatedFileStatus === 'missing_generated_file' &&
      row.blocker === 'missing_generated_file' &&
      row.approvalStatus === 'not_applicable_until_generated' &&
      row.productionReady === false,
    )).toBe(true);
  });

  it('writes the handoff generated-intake approval-intake and bootstrap artifacts under temp only', () => {
    const result = writeGavanWeek1AudioEvidenceChainBootstrap({
      generatedAt: GENERATED_AT,
      ownerId: 'audio-producer',
      intakeOwnerId: 'audio-intake',
      approvalOwnerId: 'audio-approval-owner',
      outputRoot: MISSING_OUTPUT_ROOT,
      targetPath: GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    for (const targetPath of CANONICAL_OUTPUTS) {
      expect(existsSync(targetPath)).toBe(true);
    }

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_audio_evidence_chain_bootstrap');
    expect(parsed.summary.missingGeneratedFileCount).toBe(10);
    expect(JSON.stringify(parsed)).not.toMatch(BROKEN_ENCODING_RE);
  });

  it('treats existing generated files as generated and then blocks only on explicit approval records', () => {
    const plan = buildGavanWeek1AudioGenerationPlan({
      voiceId: 'openai:alloy',
      outputRoot: EXISTING_OUTPUT_ROOT,
    });

    for (const job of plan.generation.jobs) {
      mkdirSync(path.dirname(job.outputPath), { recursive: true });
      writeFileSync(job.outputPath, Buffer.concat([Buffer.from('ID3'), Buffer.alloc(128)]));
    }

    const result = buildGavanWeek1AudioEvidenceChainBootstrap({
      generatedAt: GENERATED_AT,
      ownerId: 'audio-producer',
      intakeOwnerId: 'audio-intake',
      approvalOwnerId: 'audio-approval-owner',
      outputRoot: EXISTING_OUTPUT_ROOT,
    });

    expect(result.valid).toBe(true);
    expect(result.report.status).toBe('blocked_missing_approval_records');
    expect(result.report.summary).toEqual({
      expectedMp3Count: 10,
      discoveredMp3FileCount: 10,
      missingGeneratedFileCount: 0,
      invalidGeneratedFileCount: 0,
      validGeneratedFileCount: 10,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    });
    expect(result.report.rows.every((row) =>
      row.generatedFileStatus === 'valid_generated_file' &&
      row.blocker === 'missing_approval_record' &&
      row.approvalStatus === 'missing_approval_record',
    )).toBe(true);
  });

  it('rejects source asset and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_audio_assets.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'bootstrap.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1AudioEvidenceChainBootstrap({
        generatedAt: GENERATED_AT,
        ownerId: 'audio-producer',
        intakeOwnerId: 'audio-intake',
        approvalOwnerId: 'audio-approval-owner',
        outputRoot: 'assets/audio/personal-plans',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Audio evidence chain bootstrap can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import generation workers runtime scoring storage navigation or live registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_audio_evidence_chain_bootstrap.ts'),
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
      'personal_plan_audio_openai_worker',
      'personal_plan_audio_asset_runtime_registry',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
