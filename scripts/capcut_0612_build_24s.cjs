const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

const PROJECT_DIR = path.join(
  process.env.LOCALAPPDATA,
  'CapCut',
  'User Data',
  'Projects',
  'com.lveditor.draft',
  '0612',
);
const DURATION = 24_000_000;
const VOICE_PATH = path.join(PROJECT_DIR, 'Resources', 'phraseman_im_good_24s_voice.wav').replace(/\\/g, '/');
const GOOD_ROW_PATH = 'C:/Users/badlo/OneDrive/Desktop/New folder/reveal_row_good_empty.png';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertCapCutClosed() {
  const result = childProcess.spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      "Get-Process | Where-Object { $_.ProcessName -like '*CapCut*' -or $_.MainWindowTitle -like '*CapCut*' } | Select-Object -First 1 -ExpandProperty Id",
    ],
    { encoding: 'utf8' },
  );
  if (result.stdout.trim()) fail('CapCut is still running. Close it before writing the draft.');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value), 'utf8');
}

function micros(seconds) {
  return Math.round(seconds * 1_000_000);
}

function uuid() {
  return crypto.randomUUID().toUpperCase();
}

function allMaterials(draft) {
  return Object.values(draft.materials).flatMap((items) => (Array.isArray(items) ? items : []));
}

function findSegment(draft, prefix) {
  for (const track of draft.tracks) {
    for (const segment of track.segments) {
      if (segment.id.startsWith(prefix)) return { track, segment };
    }
  }
  fail(`Missing segment ${prefix}`);
}

function findMaterial(draft, id) {
  const found = allMaterials(draft).find((material) => material.id === id || material.id.startsWith(id));
  if (!found) fail(`Missing material ${id}`);
  return found;
}

function setSegmentTime(segment, startSeconds, endSeconds) {
  const start = micros(startSeconds);
  const duration = micros(endSeconds) - start;
  segment.target_timerange = { start, duration };
  if (segment.source_timerange) {
    segment.source_timerange.duration = duration;
    if (segment.source_timerange.start == null) segment.source_timerange.start = 0;
  }
}

function setTextMaterial(material, text, fontSize) {
  const content = JSON.parse(material.content);
  content.text = text;
  if (content.styles?.[0]) {
    content.styles[0].range = [0, text.length];
    if (fontSize) content.styles[0].size = fontSize;
  }
  material.content = JSON.stringify(content);
  material.recognize_text = '';
  material.base_content = '';
  material.font_size = fontSize ?? material.font_size;
  material.words = { start_time: [], end_time: [], text: [] };
  material.current_words = { start_time: [], end_time: [], text: [] };
}

function readTextMaterial(material) {
  if (!material?.content) return '';
  try {
    return JSON.parse(material.content).text || '';
  } catch {
    return '';
  }
}

function removeGeneratedTextTracks(draft) {
  const generatedTextIds = new Set(
    draft.materials.texts
      .filter((material) => {
        const text = readTextMaterial(material);
        return text.includes("I'm good =") || text.includes('которую разобрать');
      })
      .map((material) => material.id),
  );
  if (generatedTextIds.size === 0) return;

  const animationIds = new Set();
  draft.tracks = draft.tracks.filter((track) => {
    const generatedTrack = track.segments.some((segment) => generatedTextIds.has(segment.material_id));
    if (generatedTrack) {
      track.segments.forEach((segment) => (segment.extra_material_refs || []).forEach((id) => animationIds.add(id)));
    }
    return !generatedTrack;
  });
  draft.materials.texts = draft.materials.texts.filter((material) => !generatedTextIds.has(material.id));
  draft.materials.material_animations = draft.materials.material_animations.filter(
    (animation) => !animationIds.has(animation.id),
  );
}

function setTextTrackSegments(draft, segmentPrefix, ranges) {
  const { track, segment } = findSegment(draft, segmentPrefix);
  track.segments = ranges.map(([start, end], index) => {
    const next = JSON.parse(JSON.stringify(segment));
    if (index > 0) next.id = uuid();
    setSegmentTime(next, start, end);
    return next;
  });
}

function cloneTextTrack(draft, templateSegmentPrefix, text, startSeconds, endSeconds, transformY, fontSize) {
  const { segment: templateSegment } = findSegment(draft, templateSegmentPrefix);
  const templateTrack = draft.tracks.find((track) => track.segments.some((segment) => segment.id === templateSegment.id));
  const templateMaterial = findMaterial(draft, templateSegment.material_id);
  const templateAnimationId = templateSegment.extra_material_refs?.[0];
  const templateAnimation = templateAnimationId ? findMaterial(draft, templateAnimationId) : null;

  const material = JSON.parse(JSON.stringify(templateMaterial));
  material.id = uuid();
  setTextMaterial(material, text, fontSize);
  draft.materials.texts.push(material);

  let animationId = templateAnimationId;
  if (templateAnimation) {
    const animation = JSON.parse(JSON.stringify(templateAnimation));
    animation.id = uuid();
    animationId = animation.id;
    draft.materials.material_animations.push(animation);
  }

  const segment = JSON.parse(JSON.stringify(templateSegment));
  segment.id = uuid();
  segment.material_id = material.id;
  segment.extra_material_refs = animationId ? [animationId] : [];
  segment.track_render_index = draft.tracks.length;
  segment.render_index = 14000;
  segment.clip.transform.y = transformY;
  segment.clip.alpha = 1;
  setSegmentTime(segment, startSeconds, endSeconds);

  const track = JSON.parse(JSON.stringify(templateTrack));
  track.id = uuid();
  track.segments = [segment];
  draft.tracks.push(track);

  return { track, segment, material };
}

assertCapCutClosed();

const rootContentPath = path.join(PROJECT_DIR, 'draft_content.json');
const draft = readJson(rootContentPath);
removeGeneratedTextTracks(draft);
draft.duration = DURATION;

setSegmentTime(findSegment(draft, '319E922D').segment, 0, 24);
setSegmentTime(findSegment(draft, 'D3FE73E9').segment, 0, 24);
setSegmentTime(findSegment(draft, '3D87DBBA').segment, 1.8, 20.2);
setSegmentTime(findSegment(draft, 'C21CFFCF').segment, 0, 3.25);
setTextTrackSegments(draft, 'D7F8665C', [
  [1.8, 7.8],
  [7.8, 13.9],
  [13.9, 20.2],
]);
setSegmentTime(findSegment(draft, 'C801B16F').segment, 4.35, 7.75);
setSegmentTime(findSegment(draft, '9AF789BF').segment, 0, 24);
setSegmentTime(findSegment(draft, '260CA912').segment, 4.35, 7.75);
setSegmentTime(findSegment(draft, 'FDA8F4D6').segment, 7.35, 12.25);
setSegmentTime(findSegment(draft, '9C3817E2').segment, 4.35, 7.75);
setSegmentTime(findSegment(draft, '30318F1F').segment, 7.35, 12.25);
setSegmentTime(findSegment(draft, 'D99DB09B').segment, 0, 3.25);
setSegmentTime(findSegment(draft, '0EBE5972').segment, 4.35, 7.75);
setSegmentTime(findSegment(draft, 'B3883ED7').segment, 7.35, 12.25);
setSegmentTime(findSegment(draft, '85A06AA7').segment, 10.85, 15.3);

setTextMaterial(findMaterial(draft, 'FBF78E9F'), "I'm good", 26);
setTextMaterial(findMaterial(draft, '3ED9AB99'), 'дословно: «я хороший» — ошибка', 8);
setTextMaterial(findMaterial(draft, '1683C5D2'), 'Эта фраза не\nзначит то, что ты\nдумаешь', 15);
setTextMaterial(findMaterial(draft, 'FBBA9B1C'), 'я хороший', 10);
setTextMaterial(findMaterial(draft, 'AB640D8C'), 'нет, спасибо', 10);
setTextMaterial(findMaterial(draft, '1ABF262A'), "— Want some coffee?\n— I'm good.", 10);

const goodRowMaterial = findMaterial(draft, '32448B49');
goodRowMaterial.path = GOOD_ROW_PATH;
goodRowMaterial.material_name = 'reveal_row_good_empty.png';

cloneTextTrack(
  draft,
  '85A06AA7',
  "В живом английском:\nI'm good = вежливый отказ",
  15.2,
  20.2,
  -0.49,
  9,
);
cloneTextTrack(
  draft,
  'C21CFFCF',
  'Напиши фразу,\nкоторую разобрать\nследующей',
  20.2,
  24,
  0.06,
  13,
);

const audio = findMaterial(draft, '15934845');
audio.name = 'phraseman_im_good_24s_voice.wav';
audio.path = VOICE_PATH;
audio.duration = DURATION;
audio.type = 'extract_music';
const audioSegment = findSegment(draft, '36D413A7').segment;
audioSegment.source_timerange = { start: 0, duration: DURATION };
audioSegment.target_timerange = { start: 0, duration: DURATION };
audioSegment.volume = 1;
audioSegment.last_nonzero_volume = 1;

writeJson(rootContentPath, draft);
writeJson(path.join(PROJECT_DIR, 'template-2.tmp'), draft);
const timelineDir = path.join(PROJECT_DIR, 'Timelines', draft.id);
writeJson(path.join(timelineDir, 'draft_content.json'), draft);
writeJson(path.join(timelineDir, 'template-2.tmp'), draft);

const metaPath = path.join(PROJECT_DIR, 'draft_meta_info.json');
const meta = readJson(metaPath);
meta.tm_duration = DURATION;
meta.tm_draft_modified = Date.now() * 1000;
writeJson(metaPath, meta);

console.log(JSON.stringify({
  project: PROJECT_DIR,
  timelineId: draft.id,
  duration: draft.duration,
  tracks: draft.tracks.length,
  texts: draft.materials.texts.length,
  voice: VOICE_PATH,
}, null, 2));
