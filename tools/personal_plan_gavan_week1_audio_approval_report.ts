import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildPlanAudioApprovalReport,
} from '../app/personal_plan_audio_approval_report';
import {
  buildGeneratedPlanAudioAssets,
  type GeneratedPlanAudioFile,
} from '../app/personal_plan_audio_generated_assets';
import {
  buildGavanWeek1AudioGenerationPlan,
} from '../app/personal_plan_gavan_week1_audio_generation_plan';

const outputPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-approval-report.json',
);

function probeDurationMs(filePath: string): number {
  try {
    const raw = execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { encoding: 'utf8' },
    ).trim();
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0
      ? Math.round(seconds * 1000)
      : 0;
  } catch {
    return 0;
  }
}

function generatedFileForPath(outputFilePath: string): GeneratedPlanAudioFile | undefined {
  if (!fs.existsSync(outputFilePath)) return undefined;
  const stat = fs.statSync(outputFilePath);
  return {
    uri: outputFilePath.replace(/\\/g, '/'),
    durationMs: probeDurationMs(outputFilePath),
    bytes: stat.size,
  };
}

const plan = buildGavanWeek1AudioGenerationPlan({
  voiceId: process.env.PERSONAL_PLAN_AUDIO_VOICE_ID || 'openai:alloy',
  outputRoot: 'assets/audio/personal-plans',
});

const generatedFilesByOutputPath = Object.fromEntries(
  plan.generation.jobs.map((job) => [
    job.outputPath,
    generatedFileForPath(job.outputPath),
  ]),
);

const generatedAssets = buildGeneratedPlanAudioAssets({
  jobs: plan.generation.jobs,
  generatedFilesByOutputPath,
});

const report = buildPlanAudioApprovalReport({
  planId: plan.planId,
  weekId: plan.weekId,
  generatedAssets,
  reviewerId: process.env.PERSONAL_PLAN_AUDIO_REVIEWER_ID || 'audio-reviewer-pending',
  approvedAt: process.env.PERSONAL_PLAN_AUDIO_APPROVED_AT || new Date(0).toISOString(),
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  releaseReady: report.releaseReady,
  reviewReady: report.reviewReady,
  ...report.summary,
}, null, 2));
