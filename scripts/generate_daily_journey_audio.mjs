import { createHash } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUDIO_CUES,
  MODEL_ID,
  PROMPT_INFLUENCE,
  SOUND_PACKS,
} from './daily_journey_audio_catalog.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = path.join(projectRoot, '.codex-tmp', 'daily-journey-audio');
const stemsRoot = path.join(outputRoot, 'stems');
const manifestPath = path.join(outputRoot, 'generation-manifest.json');
const endpoint = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128';
const retryDelaysMs = [2000, 5000];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function loadManifest() {
  try {
    const parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
    return parsed?.version === 1 && parsed.jobs ? parsed : { version: 1, jobs: {} };
  } catch (error) {
    if (error?.code === 'ENOENT') return { version: 1, jobs: {} };
    throw error;
  }
}

async function saveManifest(manifest) {
  const temporaryPath = `${manifestPath}.tmp`;
  const contents = `${JSON.stringify({
    ...manifest,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`;
  await writeFile(temporaryPath, contents, 'utf8');
  await rename(temporaryPath, manifestPath);
}

function loadEnvValue(name) {
  const runtimeValue = process.env[name]?.trim();
  if (runtimeValue) return runtimeValue;
  return readFile(path.join(projectRoot, '.env.local'), 'utf8').then((contents) => {
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || match[1] !== name) continue;
      return match[2].replace(/^['"]|['"]$/g, '').trim();
    }
    return '';
  });
}

function jobs() {
  return SOUND_PACKS.flatMap((pack) => AUDIO_CUES.map((cue) => ({
    id: `${pack.id}-${cue.kind}`,
    packId: pack.id,
    packLabel: pack.label,
    kind: cue.kind,
    durationSeconds: cue.durationSeconds,
    prompt: pack.prompts[cue.kind],
    fileName: `${pack.id}-${cue.kind}.mp3`,
  })));
}

async function fileMatches(job, entry) {
  if (!entry || entry.prompt !== job.prompt || entry.modelId !== MODEL_ID) return false;
  if (entry.durationSeconds !== job.durationSeconds) return false;
  const filePath = path.join(stemsRoot, job.fileName);
  try {
    const contents = await readFile(filePath);
    return contents.length > 0 && sha256(contents) === entry.sha256;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function requestSound(apiKey, job) {
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: job.prompt,
        duration_seconds: job.durationSeconds,
        prompt_influence: PROMPT_INFLUENCE,
        loop: false,
        model_id: MODEL_ID,
      }),
    });

    if (response.ok) {
      return {
        audio: Buffer.from(await response.arrayBuffer()),
        requestId: response.headers.get('request-id') ?? '',
        characterCost: response.headers.get('character-cost') ?? '',
      };
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === retryDelaysMs.length) {
      throw new Error(`ElevenLabs sound generation failed for ${job.id}: HTTP ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
  }
  throw new Error(`ElevenLabs sound generation exhausted retries for ${job.id}`);
}

async function writeAudio(job, audio) {
  if (audio.length === 0) throw new Error(`Empty audio response for ${job.id}`);
  const filePath = path.join(stemsRoot, job.fileName);
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, audio);
  const details = await stat(temporaryPath);
  if (details.size === 0) {
    await unlink(temporaryPath).catch(() => {});
    throw new Error(`Empty temporary audio file for ${job.id}`);
  }
  await rename(temporaryPath, filePath);
  return { filePath, bytes: details.size, sha256: sha256(audio) };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await mkdir(stemsRoot, { recursive: true });
  const manifest = await loadManifest();
  const allJobs = jobs();

  if (dryRun) {
    for (const job of allJobs) {
      console.log(`DRY ${job.id} ${job.durationSeconds.toFixed(1)}s`);
    }
    console.log(`SUMMARY planned=${allJobs.length} generated=0 skipped=0`);
    return;
  }

  const apiKey = await loadEnvValue('ELEVENLABS_API_KEY');
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is missing');

  let generated = 0;
  let skipped = 0;
  for (const job of allJobs) {
    if (await fileMatches(job, manifest.jobs[job.id])) {
      skipped += 1;
      console.log(`SKIP ${job.id}`);
      continue;
    }

    const result = await requestSound(apiKey, job);
    const written = await writeAudio(job, result.audio);
    manifest.jobs[job.id] = {
      packId: job.packId,
      packLabel: job.packLabel,
      kind: job.kind,
      file: path.relative(projectRoot, written.filePath).replaceAll('\\', '/'),
      prompt: job.prompt,
      durationSeconds: job.durationSeconds,
      modelId: MODEL_ID,
      promptInfluence: PROMPT_INFLUENCE,
      requestId: result.requestId,
      characterCost: result.characterCost,
      bytes: written.bytes,
      sha256: written.sha256,
      generatedAt: new Date().toISOString(),
    };
    await saveManifest(manifest);
    generated += 1;
    console.log(`OK ${job.id} bytes=${written.bytes} cost=${result.characterCost || 'unknown'}`);
  }

  console.log(`SUMMARY planned=${allJobs.length} generated=${generated} skipped=${skipped}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
