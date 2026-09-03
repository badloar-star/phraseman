/**
 * Rebuild the 30x20 MAYMAY voice pack from the active CapCut phrase text.
 *
 * Folder 1 is Russian (FR-4, 0.80) and folder 2 is English (NOAH, 0.70).
 * The generator is resumable: verified files are never requested again.
 *
 * Run (PowerShell):
 *   $env:ELEVENLABS_API_KEY = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User')
 *   node scripts/generate_maymay_elevenlabs_audio.mjs --project "...\\MAYMAY(1)" --generate --sync-capcut
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MODEL_ID = 'eleven_multilingual_v2';
const RUSSIAN = Object.freeze({
  language: 'ru',
  folder: '1',
  voiceId: '3xiRNk1F6htZIe71aSoL', // FR-4 Русская женщина (для французского курса)
  speed: 0.8,
  voiceSettings: { stability: 0.42, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true, speed: 0.8 },
});
const ENGLISH = Object.freeze({
  language: 'en',
  folder: '2',
  voiceId: 'Opeqo5AyrxslHq7KyAj5', // NOAH
  speed: 0.7,
  voiceSettings: { stability: 0.42, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true, speed: 0.7 },
});
const EXPECTED_ITEMS = 600;
const AUDIO_TRACKS = Object.freeze({ ru: 24, en: 25 });
const rawArgs = process.argv.slice(2);
const flag = (name) => rawArgs.includes(name);
const option = (name, fallback = '') => {
  const inline = rawArgs.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] || fallback : fallback;
};
const projectPath = path.resolve(option('--project'));
const shouldGenerate = flag('--generate');
const shouldSync = flag('--sync-capcut');
const shouldVerify = flag('--verify');
const concurrency = Number(option('--concurrency', '4'));

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function posix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function assertProject() {
  if (!projectPath || projectPath === process.cwd()) fail('Pass --project with the native CapCut project folder.');
  const draftPath = path.join(projectPath, 'draft_content.json');
  if (!fs.existsSync(draftPath)) fail(`Missing CapCut draft: ${draftPath}`);
  return draftPath;
}

function materialText(material) {
  const text = String(JSON.parse(material.content).text || '').replace(/\r/g, '');
  if (/Ð|Ñ|�|\?\?\?\?/.test(text)) fail(`Mojibake in source text: ${text.slice(0, 80)}`);
  return text;
}

function extractItems(draft) {
  const texts = new Map((draft.materials?.texts || []).map((material) => [material.id, material]));
  const tracks = draft.tracks || [];
  const englishTrack = tracks[3];
  if (englishTrack?.type !== 'text' || englishTrack.segments?.length !== 30) {
    fail('Expected 30 English category text segments on track 3.');
  }
  const english = englishTrack.segments.flatMap((segment, categoryIndex) => {
    const material = texts.get(segment.material_id);
    if (!material) fail(`English category ${categoryIndex + 1} has no text material.`);
    const phrases = materialText(material).split('\n').map((value) => value.trim()).filter(Boolean);
    if (phrases.length !== 20) fail(`English category ${categoryIndex + 1} has ${phrases.length} phrases, expected 20.`);
    return phrases;
  });

  const russianTracks = Array.from({ length: 20 }, (_, offset) => tracks[4 + offset]);
  if (russianTracks.some((track) => track?.type !== 'text' || track.segments?.length !== 30)) {
    fail('Expected 20 Russian item tracks with 30 segments each on tracks 4..23.');
  }
  const russian = [];
  for (let categoryIndex = 0; categoryIndex < 30; categoryIndex += 1) {
    for (let itemIndex = 0; itemIndex < 20; itemIndex += 1) {
      const material = texts.get(russianTracks[itemIndex].segments[categoryIndex].material_id);
      if (!material) fail(`Russian item ${categoryIndex + 1}/${itemIndex + 1} has no text material.`);
      const text = materialText(material).trim();
      if (!text || text.includes('\n')) fail(`Russian item ${categoryIndex + 1}/${itemIndex + 1} is not one phrase.`);
      russian.push(text);
    }
  }
  if (english.length !== EXPECTED_ITEMS || russian.length !== EXPECTED_ITEMS) {
    fail(`Expected ${EXPECTED_ITEMS} phrases per language, got en=${english.length}, ru=${russian.length}.`);
  }
  return { english, russian };
}

function getAudioRoot(draft) {
  const track = draft.tracks?.[AUDIO_TRACKS.ru];
  const materials = new Map((draft.materials?.audios || []).map((material) => [material.id, material]));
  const first = materials.get(track?.segments?.[0]?.material_id);
  if (!first?.path) fail('Cannot derive the voice-pack root from Russian audio track 24.');
  const firstPath = first.path.replace(/\//g, path.sep);
  if (path.basename(path.dirname(firstPath)) !== RUSSIAN.folder) fail(`Track 24 must point into folder ${RUSSIAN.folder}.`);
  return path.dirname(path.dirname(firstPath));
}

function requiredFiles(audioRoot, config) {
  return Array.from({ length: EXPECTED_ITEMS }, (_, index) => path.join(audioRoot, config.folder, `${index + 1}.mp3`));
}

function validAudio(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size >= 1024;
}

function manifestPath(audioRoot) {
  return path.join(audioRoot, 'ELEVENLABS_GENERATION_MANIFEST.json');
}

function writeManifest(audioRoot, items) {
  const record = {
    generatedAt: new Date().toISOString(),
    modelId: MODEL_ID,
    languages: {
      russian: { voiceName: 'FR-4 Русская женщина (для французского курса)', voiceId: RUSSIAN.voiceId, speed: RUSSIAN.speed, count: items.russian.length },
      english: { voiceName: 'NOAH', voiceId: ENGLISH.voiceId, speed: ENGLISH.speed, count: items.english.length },
    },
    textSha256: { russian: sha256(items.russian.join('\n')), english: sha256(items.english.join('\n')) },
    layout: { folder1: 'Russian 1.mp3..600.mp3', folder2: 'English 1.mp3..600.mp3' },
  };
  fs.mkdirSync(audioRoot, { recursive: true });
  fs.writeFileSync(manifestPath(audioRoot), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

async function synthesize(apiKey, text, config, destination) {
  let lastError = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: { 'xi-api-key': apiKey, Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: config.voiceSettings }),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1024) throw new Error(`audio is too small (${bytes.length} bytes)`);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const temporary = `${destination}.partial`;
      fs.writeFileSync(temporary, bytes);
      fs.renameSync(temporary, destination);
      return;
    } catch (error) {
      lastError = error?.message || String(error);
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`TTS failed for ${path.basename(destination)}: ${lastError}`);
}

async function generateLanguage(apiKey, audioRoot, config, texts) {
  const files = requiredFiles(audioRoot, config);
  const pending = files.map((filePath, index) => ({ filePath, text: texts[index], index: index + 1 })).filter(({ filePath }) => !validAudio(filePath));
  console.log(`[${config.language}] existing=${EXPECTED_ITEMS - pending.length} pending=${pending.length} voice=${config.voiceId} speed=${config.speed}`);
  let completed = EXPECTED_ITEMS - pending.length;
  let cursor = 0;
  const workerCount = Math.min(concurrency, pending.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < pending.length) {
      const job = pending[cursor];
      cursor += 1;
      await synthesize(apiKey, job.text, config, job.filePath);
      completed += 1;
      if (completed % 25 === 0 || completed === EXPECTED_ITEMS) console.log(`[${config.language}] ${completed}/${EXPECTED_ITEMS}`);
    }
  }));
  const invalid = files.filter((filePath) => !validAudio(filePath));
  if (invalid.length) fail(`${config.language} output incomplete: ${invalid.slice(0, 4).join(', ')}`);
}

function isCapCutRunning() {
  if (process.platform !== 'win32') return false;
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command', '@(Get-Process -Name CapCut -ErrorAction SilentlyContinue).Count'], { encoding: 'utf8' }).trim() !== '0';
  } catch {
    return false;
  }
}

function durationUs(filePath) {
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], { encoding: 'utf8' }).trim());
  if (!Number.isFinite(seconds) || seconds <= 0) fail(`Cannot read audio duration: ${filePath}`);
  return Math.round(seconds * 1_000_000);
}

function mirrorPaths(draft) {
  const id = String(draft.id || '');
  if (!id) fail('CapCut draft has no ID.');
  const paths = [
    path.join(projectPath, 'draft_content.json'),
    path.join(projectPath, 'template-2.tmp'),
    path.join(projectPath, 'Timelines', id, 'draft_content.json'),
    path.join(projectPath, 'Timelines', id, 'template-2.tmp'),
  ];
  if (paths.some((filePath) => !fs.existsSync(filePath))) fail('One or more required CapCut timeline mirrors are missing.');
  const original = fs.readFileSync(paths[0]);
  if (paths.some((filePath) => !fs.readFileSync(filePath).equals(original))) fail('CapCut timeline mirrors differ; refusing to update.');
  return { paths, original };
}

function capcutSnapshot(draft, editableAudioIds) {
  const copy = structuredClone(draft);
  for (const material of copy.materials.audios) {
    if (editableAudioIds.has(material.id)) {
      material.path = '__VOICE_PATH__';
      material.name = '__VOICE_NAME__';
      material.duration = '__VOICE_DURATION__';
    }
  }
  for (const trackIndex of Object.values(AUDIO_TRACKS)) {
    for (const segment of copy.tracks[trackIndex].segments) {
      segment.source_timerange.duration = '__VOICE_DURATION__';
      segment.target_timerange.duration = '__VOICE_DURATION__';
    }
  }
  return JSON.stringify(copy);
}

function backupMirrors(paths) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const root = path.join(projectPath, '_codex_backups', `elevenlabs-noah-fr4-${stamp}`);
  for (const source of paths) {
    const destination = path.join(root, path.relative(projectPath, source));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return root;
}

function writeAtomic(filePath, payload) {
  const temporary = `${filePath}.elevenlabs-new`;
  fs.writeFileSync(temporary, payload);
  if (!fs.readFileSync(temporary).equals(payload)) fail(`Temporary write mismatch: ${filePath}`);
  fs.renameSync(temporary, filePath);
}

function syncCapCut(draft, audioRoot) {
  if (isCapCutRunning()) fail('CapCut is running. Close it before --sync-capcut.');
  const { paths, original } = mirrorPaths(draft);
  const tracks = draft.tracks;
  const audioMaterials = new Map((draft.materials.audios || []).map((material) => [material.id, material]));
  const expected = [
    [AUDIO_TRACKS.ru, RUSSIAN],
    [AUDIO_TRACKS.en, ENGLISH],
  ];
  const editableIds = new Set();
  for (const [trackIndex, config] of expected) {
    const track = tracks[trackIndex];
    if (track?.type !== 'audio' || track.segments?.length !== EXPECTED_ITEMS) fail(`Audio track ${trackIndex} is not a 600-item track.`);
    for (const segment of track.segments) {
      if (!segment.material_id || !audioMaterials.has(segment.material_id)) fail(`Audio track ${trackIndex} has an invalid material binding.`);
      editableIds.add(segment.material_id);
    }
    if (editableIds.size % EXPECTED_ITEMS !== 0) fail(`Audio track ${trackIndex} has duplicate material bindings.`);
  }
  const before = capcutSnapshot(draft, editableIds);
  for (const [trackIndex, config] of expected) {
    const files = requiredFiles(audioRoot, config);
    for (let index = 0; index < EXPECTED_ITEMS; index += 1) {
      const filePath = files[index];
      const material = audioMaterials.get(tracks[trackIndex].segments[index].material_id);
      const duration = durationUs(filePath);
      material.path = posix(filePath);
      material.name = path.basename(filePath);
      material.duration = duration;
      tracks[trackIndex].segments[index].source_timerange.duration = duration;
      tracks[trackIndex].segments[index].target_timerange.duration = duration;
    }
  }
  if (before !== capcutSnapshot(draft, editableIds)) fail('CapCut guard failed: the update touches fields outside the two voice tracks.');
  const payload = Buffer.from(JSON.stringify(draft));
  const backup = backupMirrors(paths);
  try {
    for (const filePath of paths) writeAtomic(filePath, payload);
  } catch (error) {
    for (const filePath of paths) writeAtomic(filePath, original);
    throw error;
  }
  if (paths.some((filePath) => !fs.readFileSync(filePath).equals(payload))) fail('CapCut mirrors do not match after update.');
  console.log(`[capcut] updated 1200 audio durations; backup=${backup}`);
}

function verifyCapCut(draft, audioRoot) {
  const { paths } = mirrorPaths(draft);
  const audioMaterials = new Map((draft.materials.audios || []).map((material) => [material.id, material]));
  let durationMismatches = 0;
  for (const [trackIndex, config] of [[AUDIO_TRACKS.ru, RUSSIAN], [AUDIO_TRACKS.en, ENGLISH]]) {
    const track = draft.tracks[trackIndex];
    if (track?.type !== 'audio' || track.segments?.length !== EXPECTED_ITEMS) fail(`Track ${trackIndex} no longer has 600 audio segments.`);
    const files = requiredFiles(audioRoot, config);
    for (let index = 0; index < EXPECTED_ITEMS; index += 1) {
      const material = audioMaterials.get(track.segments[index].material_id);
      const expectedDuration = durationUs(files[index]);
      if (
        !material ||
        material.path !== posix(files[index]) ||
        material.name !== path.basename(files[index]) ||
        material.duration !== expectedDuration ||
        track.segments[index].source_timerange.duration !== expectedDuration ||
        track.segments[index].target_timerange.duration !== expectedDuration
      ) durationMismatches += 1;
    }
  }
  const backupsRoot = path.join(projectPath, '_codex_backups');
  const backup = fs.readdirSync(backupsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('elevenlabs-noah-fr4-'))
    .map((entry) => path.join(backupsRoot, entry.name))
    .sort()
    .at(-1);
  if (!backup) fail('No ElevenLabs CapCut backup exists for the no-other-fields comparison.');
  const before = readJson(path.join(backup, 'draft_content.json'));
  const editableIds = new Set([...draft.tracks[AUDIO_TRACKS.ru].segments, ...draft.tracks[AUDIO_TRACKS.en].segments].map((segment) => segment.material_id));
  if (capcutSnapshot(before, editableIds) !== capcutSnapshot(draft, editableIds)) {
    fail('Verification failed: content outside the two voice-track paths/durations changed.');
  }
  if (durationMismatches) fail(`Verification failed: ${durationMismatches} audio duration/path mismatches.`);
  console.log(`[verify] 1200 files, 1200 CapCut durations, and ${paths.length} byte-identical mirrors verified; no fields outside voice paths/durations changed.`);
}

async function main() {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) fail('--concurrency must be an integer from 1 to 8.');
  const draftPath = assertProject();
  const draft = readJson(draftPath);
  const items = extractItems(draft);
  const audioRoot = getAudioRoot(draft);
  console.log(`[plan] audioRoot=${audioRoot}`);
  console.log(`[plan] ru=${items.russian.length} voice=FR-4 speed=${RUSSIAN.speed}; en=${items.english.length} voice=NOAH speed=${ENGLISH.speed}; model=${MODEL_ID}`);
  if (!shouldGenerate && !shouldSync && !shouldVerify) return;
  if (shouldGenerate) {
    const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
    if (!apiKey) fail('ELEVENLABS_API_KEY is missing from the current process.');
    await generateLanguage(apiKey, audioRoot, RUSSIAN, items.russian);
    await generateLanguage(apiKey, audioRoot, ENGLISH, items.english);
    writeManifest(audioRoot, items);
    console.log(`[generate] complete; manifest=${manifestPath(audioRoot)}`);
  }
  if (shouldSync) {
    const allFiles = [...requiredFiles(audioRoot, RUSSIAN), ...requiredFiles(audioRoot, ENGLISH)];
    if (allFiles.some((filePath) => !validAudio(filePath))) fail('Cannot sync CapCut before all 1,200 audio files are complete.');
    syncCapCut(draft, audioRoot);
  }
  if (shouldVerify) verifyCapCut(readJson(draftPath), audioRoot);
}

main().catch((error) => {
  console.error(`[failed] ${error?.message || error}`);
  process.exitCode = 1;
});
