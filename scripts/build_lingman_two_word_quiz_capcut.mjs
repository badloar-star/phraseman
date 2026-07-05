/**
 * Builds a native editable CapCut draft for the WEDNESDAY quiz-attraction template.
 *
 * Input: 60 videos x 5 two-word phrase rows in content/lingman/*.psv.
 * Output: cloned CapCut draft with refreshed EN/RU text and matching OpenAI TTS audio.
 *
 * Spending guard:
 *   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/build_lingman_two_word_quiz_capcut.mjs --build
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const TEMPLATE_DRAFT =
  'LINGMAN_WEDNESDAY_INTERESTING_11LABS_STRICT_QUIZ_ATTRACTION_TEMPLATE_20260702_175257';
const SOURCE_DRAFT_DIR = path.join(CAPCUT_ROOT, TEMPLATE_DRAFT);
const PHRASES_PATH = path.join(ROOT, 'content', 'lingman', 'quiz_attraction_two_word_phrases_20260703.psv');
const EXPORTS_ROOT = path.join(ROOT, 'exports');
const ENV_PATH = path.join(ROOT, '.env.local');
const MODEL = 'gpt-4o-mini-tts';
const FORMAT = 'mp3';
const RU_VOICE = 'marin';
const EN_VOICE = 'coral';
const RU_HERO_MAX_CHARS_PER_LINE = 12;
const RU_HERO_MAX_LINES = 3;
const RU_TRACK_INDEX = 11; // 0-based: track 12
const EN_TRACK_INDEX = 12; // 0-based: track 13
const EN_TEXT_TRACK_INDEX = 4; // 0-based: track 5
const IPA_TRACK_INDEX = 5; // 0-based: track 6; blanked to avoid stale wrong IPA
const RU_TEXT_TRACK_INDEX = 6; // 0-based: track 7
const SLOT_US = 6_333_333;
const TOTAL_US = 1_900_000_000;

const RU_INSTRUCTIONS =
  'Speak in Russian with a warm, calm language-teacher tone. Use clear native pronunciation and a confident short-video pace. Say only the phrase exactly as written, then stop cleanly.';
const EN_INSTRUCTIONS =
  'Speak English with a warm, calm language-teacher tone. Use clear pronunciation for learners and a confident short-video pace. Say only the phrase exactly as written, then stop cleanly.';

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const shouldBuild = args.has('--build');
const shouldGenerateTts = !args.has('--skip-tts');
const force = args.has('--force');
const resume = args.has('--resume');
const noAudioSpeed = args.has('--no-audio-speed');
const skipSidecars = args.has('--skip-sidecars');

function argValue(name) {
  const equals = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  if (index >= 0) return rawArgs[index + 1] || '';
  return '';
}

function posixPath(value) {
  return value.replace(/\\/g, '/');
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const STAMP = nowStamp();
const TARGET_DRAFT_NAME = argValue('--target-name') || `LINGMAN_TWO_WORD_60X5_${STAMP}`;
const TARGET_DRAFT_DIR = path.join(CAPCUT_ROOT, TARGET_DRAFT_NAME);
const REPORT_DIR = path.join(EXPORTS_ROOT, `lingman-two-word-quiz-${STAMP}`);
const AUDIO_REL_ROOT = './Resources/lingman_two_word_60x5_audio';
const AUDIO_ROOT = path.join(TARGET_DRAFT_DIR, 'Resources', 'lingman_two_word_60x5_audio');

function uuid() {
  return crypto.randomUUID().toUpperCase();
}

function die(message) {
  console.error(message);
  process.exit(1);
}

function readEnvValue(name) {
  const direct = (process.env[name] || '').trim();
  if (direct) return direct;
  if (!fs.existsSync(ENV_PATH)) return '';
  const text = fs.readFileSync(ENV_PATH, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    if (key.trim() !== name) continue;
    return rest.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function parsePsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = lines.shift()?.split('|') || [];
  const required = ['video', 'slot', 'role', 'phrase_en', 'translation_ru', 'note'];
  for (const name of required) {
    if (!header.includes(name)) die(`Missing column in phrase file: ${name}`);
  }
  const idx = Object.fromEntries(header.map((name, i) => [name, i]));
  return lines.map((line, lineIndex) => {
    const parts = line.split('|');
    const row = {};
    for (const name of header) row[name] = (parts[idx[name]] || '').trim();
    row.line = lineIndex + 2;
    row.videoNumber = Number(row.video);
    row.slotNumber = Number(row.slot);
    row.index = lineIndex + 1;
    return row;
  });
}

function normalizeWords(value) {
  return value
    .replace(/[â€œâ€]/g, '"')
    .replace(/[â€˜â€™]/g, "'")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function validateRows(rows) {
  const errors = [];
  if (rows.length !== 300) errors.push(`expected 300 rows, found ${rows.length}`);
  const seen = new Set();
  const byVideo = new Map();
  for (const row of rows) {
    const words = normalizeWords(row.phrase_en);
    if (words.length !== 2) errors.push(`line ${row.line}: phrase_en is not two words: ${row.phrase_en}`);
    try {
      russianHeroLines(row.translation_ru);
    } catch (error) {
      errors.push(`line ${row.line}: ${error.message}`);
    }
    if (!Number.isInteger(row.videoNumber) || row.videoNumber < 1 || row.videoNumber > 60) {
      errors.push(`line ${row.line}: invalid video number ${row.video}`);
    }
    if (!Number.isInteger(row.slotNumber) || row.slotNumber < 1 || row.slotNumber > 5) {
      errors.push(`line ${row.line}: invalid slot ${row.slot}`);
    }
    const key = row.phrase_en.toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
    if (seen.has(key)) errors.push(`line ${row.line}: duplicate phrase ${row.phrase_en}`);
    seen.add(key);
    const list = byVideo.get(row.videoNumber) || [];
    list.push(row);
    byVideo.set(row.videoNumber, list);
    if (row.slotNumber === 1 && row.role !== 'hook') errors.push(`line ${row.line}: slot 1 must be hook`);
    if (row.slotNumber === 3 && row.role !== 'bait') errors.push(`line ${row.line}: slot 3 must be bait`);
  }
  for (let video = 1; video <= 60; video += 1) {
    const list = byVideo.get(video) || [];
    const slots = list.map((row) => row.slotNumber).sort((a, b) => a - b).join(',');
    if (list.length !== 5 || slots !== '1,2,3,4,5') {
      errors.push(`video ${String(video).padStart(2, '0')}: expected slots 1..5, found [${slots}]`);
    }
  }
  if (errors.length) die(`Phrase validation failed:\n${errors.slice(0, 30).join('\n')}`);
}

function displayEnglish(phrase) {
  return phrase.trim().replace(/\s+/g, ' ').toUpperCase();
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
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= RU_HERO_MAX_CHARS_PER_LINE) current = candidate;
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

function updateTextMaterial(material, text) {
  let content;
  try {
    content = JSON.parse(material.content || '{}');
  } catch {
    content = {};
  }
  content.text = text;
  if (!Array.isArray(content.styles)) content.styles = [];
  for (const style of content.styles) style.range = [0, text.length];
  material.content = JSON.stringify(content);
  material.base_content = text;
  material.recognize_text = '';
  if (material.words) material.words = { start_time: [], end_time: [], text: [] };
  if (material.current_words) material.current_words = { start_time: [], end_time: [], text: [] };
  if ('text_size' in material && text.length > 28) material.text_size = Math.min(Number(material.text_size) || 18, 18);
  if ('translate_original_text' in material) material.translate_original_text = '';
}

function cloneDraft() {
  if (!fs.existsSync(SOURCE_DRAFT_DIR)) die(`Source draft not found: ${SOURCE_DRAFT_DIR}`);
  if (resume) {
    if (!fs.existsSync(TARGET_DRAFT_DIR)) die(`Cannot resume missing target draft: ${TARGET_DRAFT_DIR}`);
    return TARGET_DRAFT_DIR;
  }
  if (fs.existsSync(TARGET_DRAFT_DIR)) {
    if (!force) die(`Target draft already exists: ${TARGET_DRAFT_DIR}`);
    fs.rmSync(TARGET_DRAFT_DIR, { recursive: true, force: true });
  }
  fs.cpSync(SOURCE_DRAFT_DIR, TARGET_DRAFT_DIR, { recursive: true, dereference: false });
  return TARGET_DRAFT_DIR;
}

async function openaiTts(apiKey, { text, voice, instructions, outPath }) {
  const payload = {
    model: MODEL,
    voice,
    input: text,
    instructions,
    response_format: FORMAT,
  };
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        last = `HTTP ${response.status}: ${(await response.text()).slice(0, 800)}`;
        throw new Error(last);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024) throw new Error(`TTS returned suspiciously small file (${buffer.length} bytes)`);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(`${outPath}.tmp`, buffer);
      fs.renameSync(`${outPath}.tmp`, outPath);
      return buffer.length;
    } catch (error) {
      last = error?.message || String(error);
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw new Error(`OpenAI TTS failed for "${text}": ${last}`);
}

async function generateAudio(rows) {
  if (!shouldGenerateTts) return { generated: 0, skipped: 0 };
  if (process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND !== '1') {
    die('Refusing OpenAI TTS spend. Set PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 or pass --skip-tts.');
  }
  const apiKey = readEnvValue('OPENAI_TTS_API_KEY');
  if (!apiKey) die('OPENAI_TTS_API_KEY is missing in environment and .env.local');
  let generated = 0;
  let skipped = 0;
  for (const row of rows) {
    const index = String(row.index).padStart(3, '0');
    const ruOut = path.join(AUDIO_ROOT, 'ru', `${index}.mp3`);
    const enOut = path.join(AUDIO_ROOT, 'en', `${index}.mp3`);
    if (fs.existsSync(ruOut) && fs.statSync(ruOut).size > 1024) skipped += 1;
    else {
      console.log(`[tts-ru] ${index}/300 ${row.translation_ru}`);
      await openaiTts(apiKey, {
        text: row.translation_ru,
        voice: RU_VOICE,
        instructions: RU_INSTRUCTIONS,
        outPath: ruOut,
      });
      generated += 1;
    }
    if (fs.existsSync(enOut) && fs.statSync(enOut).size > 1024) skipped += 1;
    else {
      console.log(`[tts-en] ${index}/300 ${row.phrase_en}`);
      await openaiTts(apiKey, {
        text: row.phrase_en,
        voice: EN_VOICE,
        instructions: EN_INSTRUCTIONS,
        outPath: enOut,
      });
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
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Cannot read duration: ${filePath}`);
  return Math.round(seconds * 1_000_000);
}

function mediaPath(kind, index) {
  const padded = String(index).padStart(3, '0');
  return path.join(AUDIO_ROOT, kind, `${padded}.mp3`);
}

function mediaRelPath(kind, index) {
  const padded = String(index).padStart(3, '0');
  return `${AUDIO_REL_ROOT}/${kind}/${padded}.mp3`;
}

function mediaCapCutPath(kind, index) {
  return posixPath(mediaPath(kind, index));
}

function audioBudgetUs(kind) {
  return kind === 'en' ? 1_800_000 : 4_000_000;
}

function audioTiming(kind, sourceDuration) {
  if (noAudioSpeed) return { targetDuration: sourceDuration, speed: 1 };
  const targetDuration = Math.min(sourceDuration, audioBudgetUs(kind));
  const speed = targetDuration === sourceDuration ? 1 : Number((sourceDuration / targetDuration).toFixed(6));
  return { targetDuration, speed };
}

function materialById(draft, id, groupName) {
  const group = draft.materials?.[groupName];
  if (!Array.isArray(group)) throw new Error(`Missing materials.${groupName}`);
  const material = group.find((item) => item.id === id);
  if (!material) throw new Error(`Missing material ${id} in ${groupName}`);
  return material;
}

function sortedSegments(track) {
  return [...(track.segments || [])].sort((a, b) => (a.target_timerange?.start || 0) - (b.target_timerange?.start || 0));
}

function patchDraftContent(draft, rows, durations, draftId) {
  draft.id = draftId;
  draft.name = TARGET_DRAFT_NAME;
  draft.duration = TOTAL_US;
  draft.update_time = Math.floor(Date.now() / 1000);

  const tracks = draft.tracks || [];
  const enTextTrack = tracks[EN_TEXT_TRACK_INDEX];
  const ipaTrack = tracks[IPA_TRACK_INDEX];
  const ruTextTrack = tracks[RU_TEXT_TRACK_INDEX];
  const ruAudioTrack = tracks[RU_TRACK_INDEX];
  const enAudioTrack = tracks[EN_TRACK_INDEX];
  for (const [label, track] of [
    ['EN text', enTextTrack],
    ['IPA text', ipaTrack],
    ['RU text', ruTextTrack],
    ['RU audio', ruAudioTrack],
    ['EN audio', enAudioTrack],
  ]) {
    if (!track || (track.segments || []).length !== 300) throw new Error(`${label} track must have 300 segments`);
  }

  const enTextSegments = sortedSegments(enTextTrack);
  const ipaSegments = sortedSegments(ipaTrack);
  const ruTextSegments = sortedSegments(ruTextTrack);
  const ruAudioSegments = sortedSegments(ruAudioTrack);
  const enAudioSegments = sortedSegments(enAudioTrack);

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    updateTextMaterial(materialById(draft, enTextSegments[i].material_id, 'texts'), displayEnglish(row.phrase_en));
    updateTextMaterial(materialById(draft, ipaSegments[i].material_id, 'texts'), '');
    updateTextMaterial(materialById(draft, ruTextSegments[i].material_id, 'texts'), wrapRussian(row.translation_ru));

    for (const [kind, segment, duration] of [
      ['ru', ruAudioSegments[i], durations.ru[i]],
      ['en', enAudioSegments[i], durations.en[i]],
    ]) {
      const timing = audioTiming(kind, duration);
      const material = materialById(draft, segment.material_id, 'audios');
      const capcutPath = mediaCapCutPath(kind, i + 1);
      material.name = `${String(i + 1).padStart(3, '0')}_${kind}.mp3`;
      material.path = capcutPath;
      material.duration = duration;
      material.category_name = 'local';
      material.wave_points = [];
      material.music_id = material.music_id || uuid();
      material.local_material_id = material.local_material_id || uuid().toLowerCase();
      segment.source_timerange = { start: 0, duration };
      segment.target_timerange.duration = timing.targetDuration;
      segment.speed = timing.speed;
      segment.is_tone_modify = false;
      segment.volume = 1;
      segment.last_nonzero_volume = 1;
    }
  }
}

function walkStrings(value, replacer) {
  if (typeof value === 'string') return replacer(value);
  if (Array.isArray(value)) return value.map((item) => walkStrings(item, replacer));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = walkStrings(value[key], replacer);
  }
  return value;
}

function patchMeta(meta, draftId) {
  const nowUs = Date.now() * 1000;
  meta.draft_id = draftId;
  meta.draft_name = TARGET_DRAFT_NAME;
  meta.draft_fold_path = posixPath(TARGET_DRAFT_DIR);
  meta.draft_root_path = posixPath(TARGET_DRAFT_DIR);
  meta.draft_is_invisible = false;
  meta.tm_duration = TOTAL_US;
  meta.tm_draft_modified = nowUs;
  meta.tm_draft_create = meta.tm_draft_create || nowUs;
  return walkStrings(meta, (text) =>
    text
      .replaceAll(posixPath(SOURCE_DRAFT_DIR), posixPath(TARGET_DRAFT_DIR))
      .replaceAll(SOURCE_DRAFT_DIR, TARGET_DRAFT_DIR)
      .replaceAll(TEMPLATE_DRAFT, TARGET_DRAFT_NAME),
  );
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function patchJsonFiles(rows, durations) {
  const rootContentPath = path.join(TARGET_DRAFT_DIR, 'draft_content.json');
  const rootTemplatePath = path.join(TARGET_DRAFT_DIR, 'template-2.tmp');
  const rootMetaPath = path.join(TARGET_DRAFT_DIR, 'draft_meta_info.json');
  const rootContent = JSON.parse(fs.readFileSync(path.join(SOURCE_DRAFT_DIR, 'draft_content.json'), 'utf8'));
  const draftId = uuid();
  patchDraftContent(rootContent, rows, durations, draftId);
  writeJson(rootContentPath, rootContent);
  writeJson(rootTemplatePath, rootContent);

  if (fs.existsSync(rootMetaPath)) {
    const sourceMetaPath = path.join(SOURCE_DRAFT_DIR, 'draft_meta_info.json');
    const meta = JSON.parse(fs.readFileSync(fs.existsSync(sourceMetaPath) ? sourceMetaPath : rootMetaPath, 'utf8'));
    writeJson(rootMetaPath, patchMeta(meta, draftId));
  }

  const timelinesDir = path.join(TARGET_DRAFT_DIR, 'Timelines');
  if (fs.existsSync(timelinesDir)) {
    for (const name of fs.readdirSync(timelinesDir)) {
      const dir = path.join(timelinesDir, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const fileName of ['draft_content.json', 'template-2.tmp']) {
        const p = path.join(dir, fileName);
        if (!fs.existsSync(p)) continue;
        const sourceTimelinePath = path.join(SOURCE_DRAFT_DIR, 'Timelines', name, fileName);
        const timelineContent = JSON.parse(
          fs.readFileSync(fs.existsSync(sourceTimelinePath) ? sourceTimelinePath : p, 'utf8'),
        );
        patchDraftContent(timelineContent, rows, durations, draftId);
        writeJson(p, timelineContent);
      }
    }
  }

  if (!skipSidecars) {
    for (const fileName of ['attachment_pc_common.json', 'draft_virtual_store.json', 'key_value.json']) {
      const p = path.join(TARGET_DRAFT_DIR, fileName);
      if (!fs.existsSync(p)) continue;
      try {
        const sourceSidecarPath = path.join(SOURCE_DRAFT_DIR, fileName);
        const payload = JSON.parse(fs.readFileSync(fs.existsSync(sourceSidecarPath) ? sourceSidecarPath : p, 'utf8'));
        const patched = walkStrings(payload, (text) =>
          text
            .replaceAll(posixPath(SOURCE_DRAFT_DIR), posixPath(TARGET_DRAFT_DIR))
            .replaceAll(SOURCE_DRAFT_DIR, TARGET_DRAFT_DIR)
            .replaceAll(TEMPLATE_DRAFT, TARGET_DRAFT_NAME),
        );
        writeJson(p, patched);
      } catch {
        // Some CapCut sidecar files are not essential JSON for the timeline gate.
      }
    }
  }
  return draftId;
}

function collectDurations(rows) {
  const durations = { ru: [], en: [] };
  const speedAdjusted = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (const kind of ['ru', 'en']) {
      const p = mediaPath(kind, i + 1);
      if (!fs.existsSync(p)) throw new Error(`Missing audio: ${p}`);
      const us = durationUs(p);
      durations[kind].push(us);
      const timing = audioTiming(kind, us);
      if (timing.speed !== 1) {
        speedAdjusted.push({
          index: i + 1,
          kind,
          sourceUs: us,
          targetUs: timing.targetDuration,
          speed: timing.speed,
          phrase: rows[i].phrase_en,
        });
      }
    }
  }
  durations.speedAdjusted = speedAdjusted;
  return durations;
}

function qaDraft(rows, draftId) {
  const content = JSON.parse(fs.readFileSync(path.join(TARGET_DRAFT_DIR, 'draft_content.json'), 'utf8'));
  const errors = [];
  if (content.id !== draftId) errors.push('draft_content id mismatch');
  if (content.duration !== TOTAL_US) errors.push(`duration mismatch: ${content.duration}`);
  const tracks = content.tracks || [];
  for (const [label, index, type] of [
    ['EN text', EN_TEXT_TRACK_INDEX, 'text'],
    ['IPA text', IPA_TRACK_INDEX, 'text'],
    ['RU text', RU_TEXT_TRACK_INDEX, 'text'],
    ['RU audio', RU_TRACK_INDEX, 'audio'],
    ['EN audio', EN_TRACK_INDEX, 'audio'],
  ]) {
    const track = tracks[index];
    if (!track) errors.push(`${label} missing`);
    else if (track.type !== type) errors.push(`${label} type ${track.type} != ${type}`);
    else if ((track.segments || []).length !== 300) errors.push(`${label} segments != 300`);
  }
  const enTextSegments = sortedSegments(tracks[EN_TEXT_TRACK_INDEX]);
  const ipaSegments = sortedSegments(tracks[IPA_TRACK_INDEX]);
  const ruTextSegments = sortedSegments(tracks[RU_TEXT_TRACK_INDEX]);
  const ruAudioSegments = sortedSegments(tracks[RU_TRACK_INDEX]);
  const enAudioSegments = sortedSegments(tracks[EN_TRACK_INDEX]);
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const enMat = materialById(content, enTextSegments[i].material_id, 'texts');
    const ipaMat = materialById(content, ipaSegments[i].material_id, 'texts');
    const ruMat = materialById(content, ruTextSegments[i].material_id, 'texts');
    const readText = (m) => {
      try {
        return JSON.parse(m.content || '{}').text || '';
      } catch {
        return '';
      }
    };
    if (readText(enMat) !== displayEnglish(row.phrase_en)) errors.push(`EN text mismatch ${i + 1}`);
    if (readText(ipaMat) !== '') errors.push(`IPA text not blank ${i + 1}`);
    if (readText(ruMat) !== wrapRussian(row.translation_ru)) errors.push(`RU text mismatch ${i + 1}`);
    for (const [kind, segment] of [
      ['ru', ruAudioSegments[i]],
      ['en', enAudioSegments[i]],
    ]) {
      const mat = materialById(content, segment.material_id, 'audios');
      const expected = mediaCapCutPath(kind, i + 1);
      if (mat.path !== expected) errors.push(`${kind} path mismatch ${i + 1}: ${mat.path}`);
      if (String(mat.path).includes('MySADfolder')) errors.push(`${kind} old path remains ${i + 1}`);
      const timing = audioTiming(kind, mat.duration);
      if (segment.speed !== timing.speed || segment.is_tone_modify !== false) errors.push(`${kind} speed/tone mismatch ${i + 1}`);
      if (segment.source_timerange?.duration !== mat.duration) errors.push(`${kind} source duration mismatch ${i + 1}`);
      if (segment.target_timerange?.duration !== timing.targetDuration) errors.push(`${kind} target duration mismatch ${i + 1}`);
      const consumed = Math.round(segment.target_timerange.duration * segment.speed);
      if (Math.abs(consumed - mat.duration) > 3) errors.push(`${kind} speed math mismatch ${i + 1}`);
    }
  }
  const timelineDir = path.join(TARGET_DRAFT_DIR, 'Timelines');
  if (fs.existsSync(timelineDir)) {
    for (const name of fs.readdirSync(timelineDir)) {
      const p = path.join(timelineDir, name, 'draft_content.json');
      if (fs.existsSync(p)) {
        const mirrored = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (mirrored.id !== draftId) errors.push(`timeline mirror id mismatch: ${name}`);
        const firstText = readFirstText(mirrored, EN_TEXT_TRACK_INDEX);
        if (firstText !== displayEnglish(rows[0].phrase_en)) errors.push(`timeline mirror first text mismatch: ${name}`);
      }
    }
  }
  if (errors.length) throw new Error(`QA failed:\n${errors.slice(0, 60).join('\n')}`);
  return {
    status: 'ready',
    draftId,
    draftName: TARGET_DRAFT_NAME,
    draftDir: TARGET_DRAFT_DIR,
    rows: rows.length,
    tracks: {
      enText: enTextSegments.length,
      ipaText: ipaSegments.length,
      ruText: ruTextSegments.length,
      ruAudio: ruAudioSegments.length,
      enAudio: enAudioSegments.length,
    },
  };
}

function readFirstText(draft, trackIndex) {
  const seg = sortedSegments(draft.tracks?.[trackIndex] || { segments: [] })[0];
  if (!seg) return '';
  const mat = materialById(draft, seg.material_id, 'texts');
  try {
    return JSON.parse(mat.content || '{}').text || '';
  } catch {
    return '';
  }
}

function copySourceList(rows) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.copyFileSync(PHRASES_PATH, path.join(REPORT_DIR, 'source_phrases.psv'));
  fs.writeFileSync(
    path.join(REPORT_DIR, 'phrases.json'),
    `${JSON.stringify(rows, null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  const rows = parsePsv(fs.readFileSync(PHRASES_PATH, 'utf8'));
  validateRows(rows);
  console.log(`[phrases] rows=${rows.length} videos=60 slots=5`);
  if (!shouldBuild) {
    console.log('Validation only. Pass --build to clone and write the CapCut draft.');
    return;
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  cloneDraft();
  copySourceList(rows);
  console.log(`[draft] cloned to ${TARGET_DRAFT_DIR}`);
  const ttsStats = await generateAudio(rows);
  console.log(`[tts] generated=${ttsStats.generated} skipped=${ttsStats.skipped}`);
  const durations = collectDurations(rows);
  const draftId = patchJsonFiles(rows, durations);
  const qa = qaDraft(rows, draftId);
  const manifest = {
    ...qa,
    createdAt: new Date().toISOString(),
    sourceDraft: SOURCE_DRAFT_DIR,
    phraseFile: PHRASES_PATH,
    reportDir: REPORT_DIR,
    audioRoot: AUDIO_ROOT,
    tts: {
      model: MODEL,
      format: FORMAT,
      ruVoice: RU_VOICE,
      enVoice: EN_VOICE,
      ...ttsStats,
    },
    audioDurationsUs: {
      ruMax: Math.max(...durations.ru),
      enMax: Math.max(...durations.en),
      ruMin: Math.min(...durations.ru),
      enMin: Math.min(...durations.en),
      speedAdjustedCount: durations.speedAdjusted.length,
      speedAdjustedMax: Math.max(1, ...durations.speedAdjusted.map((item) => item.speed)),
    },
    speedAdjustedAudio: durations.speedAdjusted,
    note: 'Track 6 original IPA layer is intentionally blanked to prevent stale pronunciation from the template.',
  };
  fs.writeFileSync(path.join(REPORT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
