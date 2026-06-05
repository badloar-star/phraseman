import fs from 'node:fs';
import path from 'node:path';

import {
  defaultFetchOpenAiSpeech,
  runOpenAiPlanAudioGeneration,
} from '../app/personal_plan_audio_openai_worker';
import {
  buildPersonalPlanRuntimeAudioGenerationPlan,
} from '../app/personal_plan_runtime_audio_generation_plan';

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
const modelArg = process.argv.find((arg) => arg.startsWith('--model='));
const model = modelArg?.split('=')[1]?.trim() || process.env.PERSONAL_PLAN_AUDIO_MODEL || 'gpt-4o-mini-tts';
const outputRootArg = process.argv.find((arg) => arg.startsWith('--output-root='));
const outputRoot = outputRootArg?.split('=').slice(1).join('=').trim() || 'assets/audio/personal-plans-runtime';
const reportPath = path.join(
  '.codex-tmp',
  'personal-plans',
  execute
    ? 'runtime-openai-audio-generation-execute.json'
    : 'runtime-openai-audio-generation-dry-run.json',
);

async function writeFile(outputFilePath: string, bytes: Uint8Array): Promise<void> {
  fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
  fs.writeFileSync(outputFilePath, bytes);
}

function fileExists(outputFilePath: string): boolean {
  return fs.existsSync(outputFilePath);
}

async function main(): Promise<void> {
  const plan = buildPersonalPlanRuntimeAudioGenerationPlan({
    voiceId: process.env.PERSONAL_PLAN_AUDIO_VOICE_ID || 'openai:alloy',
    outputRoot,
  });
  const jobs = Number.isFinite(limit) && limit && limit > 0
    ? plan.jobs.slice(0, limit)
    : plan.jobs;
  const result = await runOpenAiPlanAudioGeneration({
    jobs,
    apiKey: process.env.OPENAI_API_KEY,
    execute,
    model,
    fetchSpeech: defaultFetchOpenAiSpeech,
    writeFile,
    fileExists,
  });
  const report = {
    mode: execute ? 'execute' : 'dry_run',
    model,
    outputRoot,
    fullPlanSummary: plan.summary,
    planSummaries: plan.planSummaries,
    jobsRequested: jobs.length,
    result,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    reportPath,
    mode: report.mode,
    model,
    outputRoot,
    fullPlanSummary: plan.summary,
    jobsRequested: jobs.length,
    ...result.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
