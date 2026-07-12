/**
 * In-place patcher for the user's openable WEDNESDAY BG CapCut project.
 *
 * It does not clone from an older generated draft and does not rewrite sidecar stores.
 * It only replaces phrase text/audio in the current project's own root/timeline JSON.
 *
 * Run:
 *   PHRASEMAN_ALLOW_ELEVENLABS_DEV_SPEND=1 node scripts/patch_lingman_two_word_with_elevenlabs.mjs --draft-name PULSE_7
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CAPCUT_ROOT = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
  'CapCut',
  'User Data',
  'Projects',
  'com.lveditor.draft',
);
const DEFAULT_PHRASES_PATH = path.join(ROOT, 'content', 'lingman', 'quiz_attraction_two_word_phrases_20260703.psv');
const ENV_PATH = path.join(ROOT, '.env.local');
const FORMAT = 'mp3';
const DEFAULT_MODEL = 'eleven_multilingual_v2';
const DEFAULT_RU_VOICE_ID = 'dH2EgYIVjY7q84hZZrSF'; // ALINA BEAUTY
const DEFAULT_EN_VOICE_ID = 'kqVT88a5QfII1HNAEPTJ'; // Declan Sage
const RU_HERO_MAX_CHARS_PER_LINE = 12;
const RU_HERO_MAX_LINES = 3;
const EN_AUDIO_GAP_US = 50_000;
const MAX_EN_SEGMENT_SPEED = 1.4;

const rawArgs = process.argv.slice(2);
function argValue(name, fallback = '') {
  const eq = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] || fallback : fallback;
}

const DRAFT_NAME = argValue('--draft-name', 'LINGMAN_WEDNESDAY_INTERESTING_11LABS_STRICT_BG_202 (2)');
const PHRASES_PATH = path.resolve(argValue('--phrases', DEFAULT_PHRASES_PATH));
const AUDIO_SUBDIR = argValue('--audio-subdir', 'lingman_two_word_60x5_audio');
const DRAFT_DIR = path.join(CAPCUT_ROOT, DRAFT_NAME);
const AUDIO_ROOT = path.join(DRAFT_DIR, 'Resources', AUDIO_SUBDIR);
const SKIP_TTS = rawArgs.includes('--skip-tts');
const NO_BACKUP = rawArgs.includes('--no-backup');
const MODEL = argValue('--model-id', DEFAULT_MODEL);
const RU_VOICE_ID = argValue('--ru-voice-id', DEFAULT_RU_VOICE_ID);
const EN_VOICE_ID = argValue('--en-voice-id', DEFAULT_EN_VOICE_ID);
const RU_VOICE_SETTINGS = { stability: 0.32, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.96 };
const EN_VOICE_SETTINGS = { stability: 0.4, similarity_boost: 0.82, style: 0.2, use_speaker_boost: true, speed: 0.95 };

const TRACKS = {
  enText: trackArg('--en-text-track', 7),
  ipa: trackArg('--ipa-track', 8),
  ruText: trackArg('--ru-text-track', 9),
  ruAudio: trackArg('--ru-audio-track', 15),
  enAudio: trackArg('--en-audio-track', 16),
};

function die(message) {
  console.error(message);
  process.exit(1);
}

function trackArg(name, fallbackOneBased) {
  const value = Number(argValue(name, String(fallbackOneBased)));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid ${name}; pass a 1-based CapCut track number`);
  }
  return value - 1;
}

function posix(value) {
  return value.replace(/\\/g, '/');
}

function readEnvValue(name) {
  const direct = (process.env[name] || '').trim();
  if (direct) return direct;
  if (!fs.existsSync(ENV_PATH)) return '';
  for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    if (key.trim() === name) return rest.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function parseRows() {
  const lines = fs.readFileSync(PHRASES_PATH, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  const header = lines.shift().split('|');
  const idx = Object.fromEntries(header.map((name, index) => [name, index]));
  const rows = lines.map((line, index) => {
    const parts = line.split('|');
    return {
      index: index + 1,
      line: index + 2,
      video: Number(parts[idx.video]),
      slot: Number(parts[idx.slot]),
      role: parts[idx.role],
      phraseEn: parts[idx.phrase_en],
      translationRu: parts[idx.translation_ru],
    };
  });
  const errors = [];
  if (rows.length !== 300) errors.push(`expected 300 rows, got ${rows.length}`);
  const seen = new Set();
  for (const row of rows) {
    const words = row.phraseEn.trim().split(/\s+/);
    if (words.length < 2 || words.length > 3) {
      errors.push(`line ${row.line}: expected 2-3 words: ${row.phraseEn}`);
    }
    if (row.slot === 1 && row.role !== 'hook') errors.push(`line ${row.line}: slot 1 must be hook`);
    if (row.slot === 3 && row.role !== 'bait') errors.push(`line ${row.line}: slot 3 must be bait`);
    try {
      russianHeroLines(row.translationRu);
    } catch (error) {
      errors.push(`line ${row.line}: ${error.message}`);
    }
    const key = row.phraseEn.toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
    if (seen.has(key)) errors.push(`line ${row.line}: duplicate phrase: ${row.phraseEn}`);
    seen.add(key);
  }
  if (errors.length) die(errors.slice(0, 40).join('\n'));
  return rows;
}

function displayEnglish(text) {
  return text.trim().replace(/\s+/g, ' ').toUpperCase();
}

function russianHeroLines(text) {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return [''];
  const words = clean.toUpperCase().split(' ');
  const tooLong = words.find((word) => word.length > RU_HERO_MAX_CHARS_PER_LINE);
  if (tooLong) {
    throw new Error(
      `Russian hero word is too long for the CapCut box (${tooLong.length}>${RU_HERO_MAX_CHARS_PER_LINE}): ${tooLong}`,
    );
  }
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= RU_HERO_MAX_CHARS_PER_LINE) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > RU_HERO_MAX_LINES) {
    throw new Error(`Russian hero text needs ${lines.length} lines; shorten it before CapCut`);
  }
  return lines;
}

function wrapRussian(text) {
  return russianHeroLines(text).join('\n');
}

async function elevenLabsTts(apiKey, { text, voiceId, voiceSettings, outPath }) {
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        {
        method: 'POST',
          headers: { 'xi-api-key': apiKey, Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, model_id: MODEL, voice_settings: voiceSettings }),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 600)}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024) throw new Error(`small audio (${buffer.length} bytes)`);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(`${outPath}.tmp`, buffer);
      fs.renameSync(`${outPath}.tmp`, outPath);
      return buffer.length;
    } catch (error) {
      last = error?.message || String(error);
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`TTS failed for "${text}": ${last}`);
}

async function ensureAudio(rows) {
  if (SKIP_TTS) return { generated: 0, skipped: 0 };
  if (process.env.PHRASEMAN_ALLOW_ELEVENLABS_DEV_SPEND !== '1') {
    die('Set PHRASEMAN_ALLOW_ELEVENLABS_DEV_SPEND=1 to generate ElevenLabs TTS.');
  }
  const apiKey = readEnvValue('ELEVENLABS_API_KEY');
  if (!apiKey) die('ELEVENLABS_API_KEY missing');
  let generated = 0;
  let skipped = 0;
  for (const row of rows) {
    const number = String(row.index).padStart(3, '0');
    const ruPath = path.join(AUDIO_ROOT, 'ru', `${number}.mp3`);
    const enPath = path.join(AUDIO_ROOT, 'en', `${number}.mp3`);
    if (fs.existsSync(ruPath) && fs.statSync(ruPath).size > 1024) skipped += 1;
    else {
      console.log(`[tts-ru] ${number}/300 ${row.translationRu}`);
      await elevenLabsTts(apiKey, { text: row.translationRu, voiceId: RU_VOICE_ID, voiceSettings: RU_VOICE_SETTINGS, outPath: ruPath });
      generated += 1;
    }
    if (fs.existsSync(enPath) && fs.statSync(enPath).size > 1024) skipped += 1;
    else {
      console.log(`[tts-en] ${number}/300 ${row.phraseEn}`);
      await elevenLabsTts(apiKey, { text: row.phraseEn, voiceId: EN_VOICE_ID, voiceSettings: EN_VOICE_SETTINGS, outPath: enPath });
      generated += 1;
    }
  }
  return { generated, skipped };
}

function durationUs(filePath) {
  const out = execFileSync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { encoding: 'utf8' }).trim();
  const seconds = Number(out);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Bad duration: ${filePath}`);
  return Math.round(seconds * 1_000_000);
}

function audioPath(kind, index) {
  return path.join(AUDIO_ROOT, kind, `${String(index).padStart(3, '0')}.mp3`);
}

function collectDurations(rows) {
  return {
    ru: rows.map((row) => durationUs(audioPath('ru', row.index))),
    en: rows.map((row) => durationUs(audioPath('en', row.index))),
  };
}

function sortedSegments(track) {
  return [...(track.segments || [])].sort((a, b) => (a.target_timerange?.start || 0) - (b.target_timerange?.start || 0));
}

function materialById(draft, group, id) {
  const material = draft.materials?.[group]?.find((item) => item.id === id);
  if (!material) throw new Error(`Missing material ${group}:${id}`);
  return material;
}

function findMaterial(draft, id) {
  for (const [group, arr] of Object.entries(draft.materials || {})) {
    if (Array.isArray(arr)) {
      const material = arr.find((item) => item.id === id);
      if (material) return { group, material };
    }
  }
  return null;
}

function updateTextMaterial(material, text) {
  let content = {};
  try {
    content = JSON.parse(material.content || '{}');
  } catch {}
  content.text = text;
  if (!Array.isArray(content.styles)) content.styles = [];
  for (const style of content.styles) style.range = [0, text.length];
  material.content = JSON.stringify(content);
  material.base_content = text;
  material.recognize_text = '';
  if (material.words) material.words = { start_time: [], end_time: [], text: [] };
  if (material.current_words) material.current_words = { start_time: [], end_time: [], text: [] };
}

function patchDraftPayload(draft, rows, durations) {
  const tracks = draft.tracks || [];
  for (const [label, index, type] of [
    ['EN text', TRACKS.enText, 'text'],
    ['IPA text', TRACKS.ipa, 'text'],
    ['RU text', TRACKS.ruText, 'text'],
    ['RU audio', TRACKS.ruAudio, 'audio'],
    ['EN audio', TRACKS.enAudio, 'audio'],
  ]) {
    const track = tracks[index];
    if (!track || track.type !== type || (track.segments || []).length !== 300) {
      throw new Error(`${label} track mismatch at index ${index + 1}`);
    }
  }

  const enTextSegments = sortedSegments(tracks[TRACKS.enText]);
  const ipaSegments = sortedSegments(tracks[TRACKS.ipa]);
  const ruTextSegments = sortedSegments(tracks[TRACKS.ruText]);
  const ruAudioSegments = sortedSegments(tracks[TRACKS.ruAudio]);
  const enAudioSegments = sortedSegments(tracks[TRACKS.enAudio]);

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    updateTextMaterial(materialById(draft, 'texts', enTextSegments[i].material_id), displayEnglish(row.phraseEn));
    updateTextMaterial(materialById(draft, 'texts', ipaSegments[i].material_id), '');
    updateTextMaterial(materialById(draft, 'texts', ruTextSegments[i].material_id), wrapRussian(row.translationRu));

    for (const [kind, segment, duration] of [
      ['ru', ruAudioSegments[i], durations.ru[i]],
      ['en', enAudioSegments[i], durations.en[i]],
    ]) {
      let targetDuration = duration;
      let speed = 1;
      if (kind === 'en') {
        const nextRuStart = ruAudioSegments[i + 1]?.target_timerange.start;
        if (nextRuStart) {
          const available = nextRuStart - segment.target_timerange.start - EN_AUDIO_GAP_US;
          if (available <= 0) throw new Error(`row ${i + 1}: no room for English audio`);
          if (duration > available) {
            speed = duration / available;
            if (speed > MAX_EN_SEGMENT_SPEED) {
              throw new Error(`row ${i + 1}: English audio needs unsupported speed ${speed.toFixed(3)}`);
            }
            targetDuration = available;
            enTextSegments[i].target_timerange.duration = targetDuration;
            ipaSegments[i].target_timerange.duration = targetDuration;
          }
        }
      }
      const material = materialById(draft, 'audios', segment.material_id);
      material.name = `${String(i + 1).padStart(3, '0')}_${kind}.mp3`;
      material.path = posix(audioPath(kind, i + 1));
      material.duration = duration;
      material.category_name = 'local';
      material.wave_points = [];
      segment.source_timerange = { start: 0, duration };
      segment.target_timerange.duration = targetDuration;
      segment.speed = speed;
      segment.is_tone_modify = false;
      segment.volume = 1;
      segment.last_nonzero_volume = 1;
      for (const refId of segment.extra_material_refs || []) {
        const found = findMaterial(draft, refId);
        if (found?.group === 'speeds') {
          found.material.speed = speed;
          found.material.mode = 0;
          found.material.curve_speed = null;
        }
      }
    }
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function stamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function capCutIsRunning() {
  try {
    const output = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        "Get-Process | Where-Object { $_.ProcessName -like '*CapCut*' -or $_.ProcessName -like '*lveditor*' } | Select-Object -ExpandProperty ProcessName",
      ],
      { encoding: 'utf8' },
    );
    return output.trim().split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function draftJsonFiles() {
  const files = ['draft_content.json', 'template-2.tmp'];
  const timelinesDir = path.join(DRAFT_DIR, 'Timelines');
  if (fs.existsSync(timelinesDir)) {
    for (const timelineName of fs.readdirSync(timelinesDir)) {
      const timelineDir = path.join(timelinesDir, timelineName);
      if (!fs.statSync(timelineDir).isDirectory()) continue;
      for (const rel of ['draft_content.json', 'template-2.tmp']) {
        const filePath = path.join(timelineDir, rel);
        if (fs.existsSync(filePath)) files.push(path.join('Timelines', timelineName, rel));
      }
    }
  }
  return files;
}

function backupDraftJsonFiles() {
  if (NO_BACKUP) return '';
  const backupDir = path.join(ROOT, '.codex-tmp', 'capcut-backups', `${DRAFT_NAME}_BEFORE_TEXT_AUDIO_${stamp()}`);
  for (const rel of draftJsonFiles()) {
    const src = path.join(DRAFT_DIR, rel);
    const dest = path.join(backupDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  return backupDir;
}

function patchFile(filePath, rows, durations) {
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  patchDraftPayload(payload, rows, durations);
  writeJson(filePath, payload);
}

function qa(rows) {
  const payload = JSON.parse(fs.readFileSync(path.join(DRAFT_DIR, 'draft_content.json'), 'utf8'));
  const enText = sortedSegments(payload.tracks[TRACKS.enText]);
  const ruAudio = sortedSegments(payload.tracks[TRACKS.ruAudio]);
  const enAudio = sortedSegments(payload.tracks[TRACKS.enAudio]);
  const firstText = JSON.parse(materialById(payload, 'texts', enText[0].material_id).content).text;
  const firstRu = materialById(payload, 'audios', ruAudio[0].material_id).path;
  const firstEn = materialById(payload, 'audios', enAudio[0].material_id).path;
  const syncFailures = [];
  for (let i = 0; i < rows.length; i += 1) {
    const ruEnd = ruAudio[i].target_timerange.start + ruAudio[i].target_timerange.duration;
    const enStart = enAudio[i].target_timerange.start;
    if (ruEnd > enStart) syncFailures.push(`row ${i + 1}: Russian audio overlaps English audio`);
    const nextRuStart = ruAudio[i + 1]?.target_timerange.start;
    const enEnd = enAudio[i].target_timerange.start + enAudio[i].target_timerange.duration;
    if (nextRuStart && enEnd > nextRuStart) syncFailures.push(`row ${i + 1}: English audio overlaps next phrase`);
  }
  if (syncFailures.length) throw new Error(syncFailures.slice(0, 20).join('\n'));
  return {
    status: 'ready',
    draftName: DRAFT_NAME,
    rows: rows.length,
    firstText,
    firstRu,
    firstEn,
    ruMp3: fs.readdirSync(path.join(AUDIO_ROOT, 'ru')).filter((name) => name.endsWith('.mp3')).length,
    enMp3: fs.readdirSync(path.join(AUDIO_ROOT, 'en')).filter((name) => name.endsWith('.mp3')).length,
    model: MODEL,
    ruVoiceId: RU_VOICE_ID,
    enVoiceId: EN_VOICE_ID,
    size: fs.statSync(path.join(DRAFT_DIR, 'draft_content.json')).size,
  };
}

async function main() {
  if (!fs.existsSync(path.join(DRAFT_DIR, 'draft_content.json'))) die(`Draft not found: ${DRAFT_DIR}`);
  const rows = parseRows();
  console.log(`[phrases] ${rows.length}`);
  const tts = await ensureAudio(rows);
  console.log(`[tts] generated=${tts.generated} skipped=${tts.skipped}`);
  const durations = collectDurations(rows);
  const running = capCutIsRunning();
  if (running.length) die(`CapCut is running (${[...new Set(running)].join(', ')}). Close it before patching draft files.`);
  const backupDir = backupDraftJsonFiles();
  if (backupDir) console.log(`[backup] ${backupDir}`);
  for (const rel of ['draft_content.json', 'template-2.tmp']) {
    patchFile(path.join(DRAFT_DIR, rel), rows, durations);
  }
  const timelinesDir = path.join(DRAFT_DIR, 'Timelines');
  if (fs.existsSync(timelinesDir)) {
    for (const timelineName of fs.readdirSync(timelinesDir)) {
      const timelineDir = path.join(timelinesDir, timelineName);
      if (!fs.statSync(timelineDir).isDirectory()) continue;
      for (const rel of ['draft_content.json', 'template-2.tmp']) {
        const filePath = path.join(timelineDir, rel);
        if (fs.existsSync(filePath)) patchFile(filePath, rows, durations);
      }
    }
  }
  console.log(JSON.stringify({ ...qa(rows), tts, tracks: TRACKS, backupDir }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
