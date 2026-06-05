import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildGeneratedPlanAudioAssets,
  type GeneratedPlanAudioFile,
} from '../app/personal_plan_audio_generated_assets';
import {
  buildPersonalPlanRuntimeAudioGenerationPlan,
} from '../app/personal_plan_runtime_audio_generation_plan';

const outputPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'runtime-generated-audio-assets.json',
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

const plan = buildPersonalPlanRuntimeAudioGenerationPlan({
  voiceId: process.env.PERSONAL_PLAN_AUDIO_VOICE_ID || 'openai:alloy',
  outputRoot: process.env.PERSONAL_PLAN_RUNTIME_AUDIO_OUTPUT_ROOT || 'assets/audio/personal-plans-runtime',
});

const generatedFilesByOutputPath = Object.fromEntries(
  plan.jobs.map((job) => [
    job.outputPath,
    generatedFileForPath(job.outputPath),
  ]),
);
const generatedAssets = buildGeneratedPlanAudioAssets({
  jobs: plan.jobs,
  generatedFilesByOutputPath,
});
const report = {
  kind: 'personal_plan_runtime_generated_audio_assets',
  planSummary: plan.summary,
  planSummaries: plan.planSummaries,
  generatedAssets,
  approvalMayBeInferred: false,
  readyForLive: false,
  productionReady: false,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  jobs: generatedAssets.summary.jobs,
  assets: generatedAssets.summary.assets,
  blockers: generatedAssets.summary.blockers,
}, null, 2));
