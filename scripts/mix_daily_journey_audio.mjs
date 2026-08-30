import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { SOUND_PACKS, TIMELINE_MS } from './daily_journey_audio_catalog.mjs';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const stemsRoot = path.join(projectRoot, '.codex-tmp', 'daily-journey-audio', 'stems');
const outputRoot = path.join(projectRoot, 'docs', 'design', 'daily-journey-audio');
const manifestPath = path.join(outputRoot, 'manifest.json');

function hashFile(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

async function runFfmpeg(args) {
  try {
    await execFileAsync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    const detail = error?.stderr?.trim() || error?.message || String(error);
    throw new Error(`FFmpeg failed: ${detail}`);
  }
}

async function durationSeconds(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { windowsHide: true });
  return Number.parseFloat(stdout.trim());
}

async function describeFile(filePath) {
  const contents = await readFile(filePath);
  const details = await stat(filePath);
  return {
    bytes: details.size,
    sha256: hashFile(contents),
    durationSeconds: Number((await durationSeconds(filePath)).toFixed(6)),
  };
}

async function mixMaster(packId, outputPath) {
  const introPath = path.join(stemsRoot, `${packId}-intro.mp3`);
  const pulsePath = path.join(stemsRoot, `${packId}-pulse.mp3`);
  const revealPath = path.join(stemsRoot, `${packId}-reveal.mp3`);
  const [pulseOne, pulseTwo, pulseThree] = TIMELINE_MS.pulses;
  const filter = [
    '[0:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.78,afade=t=in:st=0:d=0.08,afade=t=out:st=2.3:d=0.3[intro]',
    '[1:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=3[p1s][p2s][p3s]',
    `[p1s]volume=0.72,adelay=${pulseOne}|${pulseOne}[p1]`,
    `[p2s]volume=0.86,adelay=${pulseTwo}|${pulseTwo}[p2]`,
    `[p3s]volume=1.00,adelay=${pulseThree}|${pulseThree}[p3]`,
    `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.92,adelay=${TIMELINE_MS.reveal}|${TIMELINE_MS.reveal}[reveal]`,
    '[intro][p1][p2][p3][reveal]amix=inputs=5:duration=longest:normalize=0,loudnorm=I=-18:TP=-1:LRA=7,apad,atrim=duration=6.2[out]',
  ].join(';');

  await runFfmpeg([
    '-i', introPath,
    '-i', pulsePath,
    '-i', revealPath,
    '-filter_complex', filter,
    '-map', '[out]',
    '-ar', '44100',
    '-ac', '2',
    '-b:a', '128k',
    outputPath,
  ]);
}

async function normalizeTap(packId, outputPath) {
  const sourcePath = path.join(stemsRoot, `${packId}-tap.mp3`);
  await runFfmpeg([
    '-i', sourcePath,
    '-af', 'loudnorm=I=-20:TP=-1:LRA=5,apad,atrim=duration=0.5',
    '-ar', '44100',
    '-ac', '2',
    '-b:a', '128k',
    outputPath,
  ]);
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const packs = [];

  for (const pack of SOUND_PACKS) {
    const masterFile = `${pack.id}-master.mp3`;
    const tapFile = `${pack.id}-tap.mp3`;
    const masterPath = path.join(outputRoot, masterFile);
    const tapPath = path.join(outputRoot, tapFile);
    await mixMaster(pack.id, masterPath);
    await normalizeTap(pack.id, tapPath);

    const [master, tap] = await Promise.all([
      describeFile(masterPath),
      describeFile(tapPath),
    ]);
    packs.push({
      id: pack.id,
      label: pack.label,
      master: { file: masterFile, ...master },
      tap: { file: tapFile, ...tap },
    });
    console.log(`OK ${pack.id} master=${master.durationSeconds}s tap=${tap.durationSeconds}s`);
  }

  const temporaryPath = `${manifestPath}.tmp`;
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    timelineMs: TIMELINE_MS,
    packs,
  };
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, manifestPath);
  console.log(`SUMMARY packs=${packs.length} masters=${packs.length} taps=${packs.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
