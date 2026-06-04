import fs from 'node:fs';
import path from 'node:path';
import {
  buildGavanWeek1AudioGenerationPlan,
} from '../app/personal_plan_gavan_week1_audio_generation_plan';

const outputPath = path.join(
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-generation-plan.json',
);

const plan = buildGavanWeek1AudioGenerationPlan({
  voiceId: process.env.PERSONAL_PLAN_AUDIO_VOICE_ID || 'openai:alloy',
  outputRoot: 'assets/audio/personal-plans',
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  jobs: plan.generation.summary.jobs,
  blockers: plan.generation.summary.blockers,
  audioProductionReady: plan.audioManifest.summary.productionReady,
  audioProductionBlocked: plan.audioManifest.summary.productionBlocked,
}, null, 2));
