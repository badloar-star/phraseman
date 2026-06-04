import fs from 'node:fs';
import path from 'node:path';
import {
  defaultFetchOpenAiSpeech,
  runOpenAiPlanAudioGeneration,
} from '../app/personal_plan_audio_openai_worker';
import {
  buildGavanWeek1AudioGenerationPlan,
} from '../app/personal_plan_gavan_week1_audio_generation_plan';

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
const modelArg = process.argv.find((arg) => arg.startsWith('--model='));
const model = modelArg?.split('=')[1]?.trim() || process.env.PERSONAL_PLAN_AUDIO_MODEL || 'gpt-4o-mini-tts';
const outputPath = path.join(
  '.codex-tmp',
  'personal-plans',
  execute
    ? 'gavan-week1-openai-audio-generation-execute.json'
    : 'gavan-week1-openai-audio-generation-dry-run.json',
);

async function writeFile(outputFilePath: string, bytes: Uint8Array): Promise<void> {
  fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
  fs.writeFileSync(outputFilePath, bytes);
}

function fileExists(outputFilePath: string): boolean {
  return fs.existsSync(outputFilePath);
}

async function main(): Promise<void> {
  const plan = buildGavanWeek1AudioGenerationPlan({
    voiceId: process.env.PERSONAL_PLAN_AUDIO_VOICE_ID || 'openai:alloy',
    outputRoot: 'assets/audio/personal-plans',
  });
  const jobs = Number.isFinite(limit) && limit && limit > 0
    ? plan.generation.jobs.slice(0, limit)
    : plan.generation.jobs;

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
    jobsRequested: jobs.length,
    result,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    outputPath,
    mode: report.mode,
    model,
    ...result.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
