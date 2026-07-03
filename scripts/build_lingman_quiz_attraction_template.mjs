#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const SOURCE_DRAFT =
  'C:/Users/badlo/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/LINGMAN_WEDNESDAY_INTERESTING_11LABS_STRICT_BG_202 (1)';
const TEMPLATE_DRAFT =
  'C:/Users/badlo/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/LINGMAN_WEDNESDAY_INTERESTING_11LABS_STRICT_QUIZ_ATTRACTION_TEMPLATE_20260702_175257';
const TEMPLATE_NAME = path.basename(TEMPLATE_DRAFT);
const KIT_ROOT = 'C:/Users/badlo/OneDrive/Desktop/LINGMAN_QUIZ_ATTRACTION_TEMPLATE_20260702_175257';
const ASSETS_DIR = path.join(KIT_ROOT, 'assets');
const PROJECT_ASSETS_DIR = path.join(TEMPLATE_DRAFT, 'quiz_style_assets');
const OFFICE_BG = 'C:/appsprojects/phraseman/.codex-tmp/collectibles-dalli/sources/uncategorized/ig_0f841023565124db016a4696c139c48191932b7397d104c2dc.png';
const GRAPHITE_BG = 'C:/appsprojects/phraseman/.codex-tmp/collectibles-dalli/sources/uncategorized/ig_0f841023565124db016a4697072f008191a0f4a34436f1f178.png';
const LOCAL_DISPLAY_FONT = fs.existsSync('C:/Users/badlo/AppData/Local/Microsoft/Windows/Fonts/20973.ttf')
  ? 'C:/Users/badlo/AppData/Local/Microsoft/Windows/Fonts/20973.ttf'
  : 'C:/Windows/Fonts/arialbd.ttf';
const LOCAL_BODY_FONT = 'C:/Windows/Fonts/segoeui.ttf';

const COLORS = {
  bgBlack: '#050908',
  teal: '#0F3437',
  cyanSoft: '#A8F4F2',
  ivory: '#F7DEC8',
  taupe: '#A69C93',
  white: '#EEF5F3',
  smoke: '#101A1A',
  shadow: '#000000',
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
}

function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${text.trimEnd()}\n`, 'utf8');
}

function id() {
  return crypto.randomUUID().toUpperCase();
}

function hexToRgb01(hex) {
  const raw = hex.replace(/^#/, '');
  return [
    parseInt(raw.slice(0, 2), 16) / 255,
    parseInt(raw.slice(2, 4), 16) / 255,
    parseInt(raw.slice(4, 6), 16) / 255,
  ];
}

function parseText(textMaterial) {
  try {
    return JSON.parse(textMaterial.content);
  } catch {
    return { text: textMaterial.content || '', styles: [] };
  }
}

function setTextMaterialStyle(textMaterial, style) {
  const content = parseText(textMaterial);
  const text = String(content.text || '');
  const range = [0, text.length];
  const styles = Array.isArray(content.styles) && content.styles.length ? content.styles : [{}];
  const fontPath = style.fontPath || LOCAL_DISPLAY_FONT;

  content.styles = styles.map((entry) => {
    const next = { ...entry };
    delete next.effectStyle;
    next.fill = {
      content: {
        render_type: 'solid',
        solid: { color: hexToRgb01(style.color) },
      },
    };
    next.font = { path: fontPath, id: '' };
    next.size = style.richSize;
    next.useLetterColor = true;
    next.range = range;
    return next;
  });

  textMaterial.content = JSON.stringify(content);
  textMaterial.text_color = style.color;
  textMaterial.text_alpha = style.alpha ?? 1;
  textMaterial.font_path = fontPath;
  textMaterial.font_name = '';
  textMaterial.font_title = 'none';
  textMaterial.font_size = style.fontSize;
  textMaterial.text_size = style.textSize;
  textMaterial.use_effect_default_color = false;
  textMaterial.has_shadow = true;
  textMaterial.shadow_color = style.shadowColor || COLORS.shadow;
  textMaterial.shadow_alpha = style.shadowAlpha ?? 0.72;
  textMaterial.shadow_distance = style.shadowDistance ?? 4;
  textMaterial.shadow_smoothing = style.shadowSmoothing ?? 0.55;
  textMaterial.shadow_angle = -45;
  textMaterial.shadow_point = { x: 0.6363961030678928, y: -0.6363961030678928 };
  textMaterial.border_alpha = style.borderAlpha ?? 0.8;
  textMaterial.border_color = style.borderColor || COLORS.bgBlack;
  textMaterial.border_width = style.borderWidth ?? 0.035;
  textMaterial.background_alpha = 0;
  textMaterial.background_style = 0;
  textMaterial.background_width = 0;
  textMaterial.background_height = 0;
  textMaterial.fixed_width = style.fixedWidth ?? textMaterial.fixed_width;
  textMaterial.line_max_width = style.lineMaxWidth ?? 0.92;
  textMaterial.force_apply_line_max_width = true;
  textMaterial.oneline_cutoff = false;
  textMaterial.line_spacing = style.lineSpacing ?? 0.02;
  textMaterial.alignment = 1;
}

function materialKindMap(draft) {
  const map = new Map();
  for (const [kind, list] of Object.entries(draft.materials || {})) {
    if (!Array.isArray(list)) continue;
    for (const item of list) map.set(item.id, kind);
  }
  return map;
}

function textMap(draft) {
  return new Map((draft.materials.texts || []).map((text) => [text.id, text]));
}

function styleTrack(draft, trackIndex, style, segmentStyle = {}) {
  const texts = textMap(draft);
  const kinds = materialKindMap(draft);
  const track = draft.tracks[trackIndex];
  if (!track || track.type !== 'text') return 0;
  let count = 0;
  for (const segment of track.segments || []) {
    const text = texts.get(segment.material_id);
    if (!text) continue;
    setTextMaterialStyle(text, style);
    if (Array.isArray(segment.extra_material_refs)) {
      segment.extra_material_refs = segment.extra_material_refs.filter((ref) => kinds.get(ref) !== 'effects');
    }
    if (segment.clip) {
      if (segmentStyle.scale) segment.clip.scale = { ...segment.clip.scale, ...segmentStyle.scale };
      if (segmentStyle.transform) segment.clip.transform = { ...segment.clip.transform, ...segmentStyle.transform };
      if (typeof segmentStyle.alpha === 'number') segment.clip.alpha = segmentStyle.alpha;
    }
    count += 1;
  }
  return count;
}

function cloneTextMaterial(source, text, style) {
  const next = JSON.parse(JSON.stringify(source));
  next.id = id();
  const parsed = parseText(next);
  parsed.text = text;
  parsed.styles = Array.isArray(parsed.styles) && parsed.styles.length ? parsed.styles : [{}];
  next.content = JSON.stringify(parsed);
  next.base_content = text;
  next.recognize_text = '';
  next.name = 'Lingman quiz level badge';
  setTextMaterialStyle(next, style);
  return next;
}

function addLevelBadge(draft) {
  const existing = (draft.materials.texts || []).some((text) => {
    const parsed = parseText(text);
    return String(parsed.text || '').trim().toUpperCase() === 'A1-A2';
  });
  if (existing) return false;

  const sourceTrack = draft.tracks[10];
  const sourceSegment = sourceTrack?.segments?.[0];
  const sourceText = (draft.materials.texts || []).find((item) => item.id === sourceSegment?.material_id);
  if (!sourceTrack || !sourceSegment || !sourceText) throw new Error('Cannot clone question text layer for A1-A2 badge');

  const levelStyle = {
    color: COLORS.taupe,
    fontPath: LOCAL_DISPLAY_FONT,
    fontSize: 8,
    textSize: 26,
    richSize: 8,
    alpha: 0.9,
    shadowAlpha: 0.5,
    shadowDistance: 2,
    borderAlpha: 0.55,
    borderWidth: 0.025,
    lineMaxWidth: 0.6,
  };
  const text = cloneTextMaterial(sourceText, 'A1-A2', levelStyle);
  draft.materials.texts.push(text);

  const segment = JSON.parse(JSON.stringify(sourceSegment));
  segment.id = id();
  segment.material_id = text.id;
  segment.render_index = 999;
  segment.track_render_index = draft.tracks.length;
  segment.extra_material_refs = Array.isArray(segment.extra_material_refs)
    ? segment.extra_material_refs.filter((ref) => materialKindMap(draft).get(ref) !== 'effects')
    : [];
  segment.clip = {
    ...(segment.clip || {}),
    scale: { x: 1.1, y: 1.1 },
    transform: { x: 0, y: -0.72 },
    alpha: 0.92,
  };
  segment.target_timerange = { start: 0, duration: draft.duration };

  const track = JSON.parse(JSON.stringify(sourceTrack));
  track.id = id();
  track.name = 'QUIZ TEMPLATE LEVEL BADGE';
  track.is_default_name = false;
  track.segments = [segment];
  draft.tracks.push(track);
  return true;
}

function applyDraftStyle(draft) {
  const newDraftId = id();
  draft.id = newDraftId;
  draft.name = TEMPLATE_NAME;

  const counts = {
    english: styleTrack(draft, 4, {
      color: COLORS.ivory,
      fontPath: LOCAL_DISPLAY_FONT,
      fontSize: 10,
      textSize: 32,
      richSize: 10,
      shadowAlpha: 0.86,
      shadowDistance: 5,
      borderAlpha: 0.95,
      borderWidth: 0.055,
      lineMaxWidth: 0.9,
    }),
    ipa: styleTrack(draft, 5, {
      color: '#B8C7C7',
      fontPath: LOCAL_BODY_FONT,
      fontSize: 5.8,
      textSize: 18,
      richSize: 5.8,
      alpha: 0.72,
      shadowAlpha: 0.5,
      shadowDistance: 2,
      borderAlpha: 0.25,
      borderWidth: 0.01,
      lineMaxWidth: 0.82,
    }),
    russianAnswer: styleTrack(draft, 6, {
      color: COLORS.ivory,
      fontPath: LOCAL_DISPLAY_FONT,
      fontSize: 11.4,
      textSize: 38,
      richSize: 11.4,
      shadowAlpha: 0.9,
      shadowDistance: 7,
      shadowSmoothing: 0.62,
      borderAlpha: 1,
      borderWidth: 0.07,
      lineMaxWidth: 0.88,
    }),
    prompt: styleTrack(draft, 10, {
      color: COLORS.white,
      fontPath: LOCAL_BODY_FONT,
      fontSize: 6.8,
      textSize: 22,
      richSize: 6.8,
      alpha: 0.9,
      shadowAlpha: 0.62,
      shadowDistance: 2,
      borderAlpha: 0.2,
      borderWidth: 0.015,
      lineMaxWidth: 0.8,
    }),
  };
  counts.levelBadgeAdded = addLevelBadge(draft);

  const filterTrack = draft.tracks[7];
  if (filterTrack) filterTrack.name = 'QUIZ TEMPLATE COLOR GRADE - teal dark cinematic';
  const bgTrack = draft.tracks[1];
  if (bgTrack) bgTrack.name = 'Phrase background video - preserved, audio untouched';
  return { newDraftId, counts };
}

function walkStrings(obj, visitor) {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      obj[key] = visitor(value, key);
    } else if (value && typeof value === 'object') {
      walkStrings(value, visitor);
    }
  }
}

function updateMeta(meta, newDraftId) {
  meta.draft_fold_path = TEMPLATE_DRAFT;
  meta.draft_id = newDraftId;
  meta.draft_root_path = TEMPLATE_DRAFT;
  if ('draft_name' in meta) meta.draft_name = TEMPLATE_NAME;
  walkStrings(meta, (value, key) => {
    if (key === 'draft_fold_path' || key === 'draft_root_path') return TEMPLATE_DRAFT;
    return value
      .replaceAll('LINGMAN_WEDNESDAY_INTERESTING_11LABS_STRICT_BG_202 (1)', TEMPLATE_NAME)
      .replaceAll('LINGMAN_WEDNESDAY_INTERESTING_11LABS_STRICT_BG_20260601', TEMPLATE_NAME);
  });
}

function collectAudioSignature(draft) {
  const audios = [];
  for (const [trackIndex, track] of (draft.tracks || []).entries()) {
    if (track.type !== 'audio') continue;
    for (const segment of track.segments || []) {
      audios.push({
        trackIndex,
        id: segment.id,
        material_id: segment.material_id,
        start: segment.target_timerange?.start,
        duration: segment.target_timerange?.duration,
        speed: segment.speed,
        is_tone_modify: segment.is_tone_modify,
      });
    }
  }
  return audios;
}

function compareAudio(source, target) {
  const a = collectAudioSignature(source);
  const b = collectAudioSignature(target);
  const errors = [];
  if (a.length !== b.length) errors.push({ type: 'audio_segment_count_changed', source: a.length, target: b.length });
  const count = Math.min(a.length, b.length);
  for (let i = 0; i < count; i += 1) {
    for (const key of ['material_id', 'start', 'duration', 'speed', 'is_tone_modify']) {
      if (a[i][key] !== b[i][key]) errors.push({ type: 'audio_changed', index: i, key, source: a[i][key], target: b[i][key] });
    }
  }
  return { sourceCount: a.length, targetCount: b.length, errors };
}

async function copyBackgrounds() {
  ensureDir(ASSETS_DIR);
  ensureDir(PROJECT_ASSETS_DIR);
  const out = [
    [OFFICE_BG, 'dalle_dark_office_master.png'],
    [GRAPHITE_BG, 'dalle_graphite_studio_master.png'],
  ];
  for (const [src, name] of out) {
    if (!fs.existsSync(src)) throw new Error(`Missing generated background: ${src}`);
    const kitFile = path.join(ASSETS_DIR, name);
    const projectFile = path.join(PROJECT_ASSETS_DIR, name);
    await sharp(src).resize(1080, 1920, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(kitFile);
    fs.copyFileSync(kitFile, projectFile);
  }
}

function svgFrame({ width = 1080, height = 1920 } = {}) {
  const sx = width / 1080;
  const sy = height / 1920;
  const s = Math.min(sx, sy);
  const x = (value) => Math.round(value * sx);
  const y = (value) => Math.round(value * sy);
  const f = (value) => Math.round(value * s);
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="${0 * s}" dy="${7 * s}" stdDeviation="${6 * s}" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
    <linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#020504" stop-opacity="0.78"/>
      <stop offset="1" stop-color="#020504" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottomfade" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#020504" stop-opacity="0.88"/>
      <stop offset="1" stop-color="#020504" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${y(420)}" fill="url(#topfade)"/>
  <rect y="${y(1390)}" width="${width}" height="${y(530)}" fill="url(#bottomfade)"/>
  <text x="${x(540)}" y="${y(380)}" text-anchor="middle" font-family="Manrope, Segoe UI, Arial" font-size="${f(44)}" font-weight="500" fill="${COLORS.white}" opacity="0.92" filter="url(#shadow)">как это переводится?</text>
  <text x="${x(540)}" y="${y(610)}" text-anchor="middle" font-family="Unbounded, Arial Black, Arial" font-size="${f(82)}" font-weight="900" letter-spacing="0" fill="${COLORS.ivory}" stroke="#050908" stroke-width="${f(5)}" paint-order="stroke" filter="url(#shadow)">Я В ПОРЯДКЕ</text>
  <text x="${x(540)}" y="${y(1715)}" text-anchor="middle" font-family="Unbounded, Arial Black, Arial" font-size="${f(54)}" font-weight="900" fill="${COLORS.taupe}" opacity="0.9" stroke="#050908" stroke-width="${f(4)}" paint-order="stroke" filter="url(#shadow)">A1-A2</text>
</svg>`;
}

async function buildAssets() {
  await copyBackgrounds();
  const office = path.join(ASSETS_DIR, 'dalle_dark_office_master.png');
  const graphite = path.join(ASSETS_DIR, 'dalle_graphite_studio_master.png');

  const overlays = [
    ['question_label.svg', `<svg width="1080" height="180" viewBox="0 0 1080 180" xmlns="http://www.w3.org/2000/svg"><text x="540" y="105" text-anchor="middle" font-family="Manrope, Segoe UI, Arial" font-size="44" font-weight="500" fill="${COLORS.white}" opacity="0.92">как это переводится?</text></svg>`],
    ['answer_style.svg', `<svg width="1080" height="260" viewBox="0 0 1080 260" xmlns="http://www.w3.org/2000/svg"><text x="540" y="160" text-anchor="middle" font-family="Unbounded, Arial Black, Arial" font-size="82" font-weight="900" fill="${COLORS.ivory}" stroke="#050908" stroke-width="5" paint-order="stroke">Я В ПОРЯДКЕ</text></svg>`],
    ['level_badge.svg', `<svg width="1080" height="160" viewBox="0 0 1080 160" xmlns="http://www.w3.org/2000/svg"><text x="540" y="104" text-anchor="middle" font-family="Unbounded, Arial Black, Arial" font-size="54" font-weight="900" fill="${COLORS.taupe}" stroke="#050908" stroke-width="4" paint-order="stroke">A1-A2</text></svg>`],
    ['safe_area_guides.svg', `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg"><rect width="1080" height="1920" fill="none"/><rect x="90" y="230" width="900" height="1320" fill="none" stroke="#A8F4F2" stroke-width="4" stroke-dasharray="18 18" opacity="0.85"/><line x1="0" y1="380" x2="1080" y2="380" stroke="#F7DEC8" stroke-width="3" opacity="0.75"/><line x1="0" y1="610" x2="1080" y2="610" stroke="#F7DEC8" stroke-width="3" opacity="0.75"/><line x1="0" y1="1715" x2="1080" y2="1715" stroke="#F7DEC8" stroke-width="3" opacity="0.75"/></svg>`],
  ];
  for (const [name, svg] of overlays) {
    const file = path.join(ASSETS_DIR, name);
    writeText(file, svg);
    await sharp(Buffer.from(svg)).png().toFile(file.replace(/\.svg$/, '.png'));
  }

  await sharp(office)
    .composite([{ input: Buffer.from(svgFrame()), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(ASSETS_DIR, 'layout_mockup_1080x1920.png'));
  await sharp(office)
    .resize(2160, 3840, { fit: 'cover' })
    .composite([{ input: Buffer.from(svgFrame({ width: 2160, height: 3840 })), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(ASSETS_DIR, 'layout_mockup_2160x3840.png'));
  await sharp(graphite)
    .composite([{ input: Buffer.from(svgFrame()), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(ASSETS_DIR, 'layout_mockup_graphite_1080x1920.png'));
}

function writeGuide(report) {
  writeText(path.join(KIT_ROOT, 'CAPCUT_STYLE_GUIDE.md'), `# Lingman Quiz Attraction Template

## Formula

Use this for short quiz-attraction videos:

- 9:16, 1080x1920.
- Dark cinematic/OLED background, teal practical light, no clutter.
- Top prompt: small, calm, white.
- Main answer/question: one huge cream phrase, centered and readable in one second.
- Bottom level mark: muted taupe, not a loud sticker.
- No cards, no school blocks, no emoji, no random bright colors.

## CapCut Text Settings

### Top prompt

- Text: \`как это переводится?\`
- Font: Manrope Medium. Fallback in the draft: \`Segoe UI\`.
- Size: 22-24 visual px / CapCut font_size about 6.8.
- Color: \`${COLORS.white}\`
- Shadow: black, opacity 60%, blur/smoothing ~55%, distance 2.
- Position: top center, around y=380 on 1080x1920.

### Main phrase

- Font: Unbounded Black or ExtraBold. Fallback in the draft: installed local Cyrillic-safe font \`${LOCAL_DISPLAY_FONT}\`.
- Size: 76-88 visual px / CapCut font_size about 11-12.
- Color: \`${COLORS.ivory}\`
- Stroke/border: \`#050908\`, width 5-7px visual.
- Shadow: black, opacity 85-90%, distance 6-8, soft.
- Position: center upper third, around y=610 on 1080x1920.
- Manual line breaks only at spaces. Never allow mid-word breaks.

### IPA/small helper text

- Font: Manrope or Segoe UI.
- Color: \`#B8C7C7\`
- Alpha: 70-75%.
- Keep it quiet. It must not compete with the main phrase.

### Level badge

- Text: \`A1-A2\`
- Font: Unbounded Black.
- Color: \`${COLORS.taupe}\`
- Position: bottom center, around y=1715 on 1080x1920.

## CapCut Adjust Recipe

Use these as concrete starting values for backgrounds:

- Exposure: -12 to -18
- Contrast: +8 to +14
- Saturation: -8 to -14
- Temperature: -6 to -10
- Highlights: -18
- Shadows: -8
- Sharpen: +8
- Vignette: +35 to +45
- Fade: 0

## Motion

- Text intro: Fade In, 0.25-0.35s.
- Text outro: Fade Out, 0.18-0.25s.
- Background: very slow scale 100% to 104% if you want motion.
- Do not retime audio. All audio speed must stay \`1\`; tone modify must stay false.

## Why These Choices

From the UI/UX pass, OLED dark mode gives maximum contrast and lowest visual noise for vertical mobile viewing. The premium sans direction avoids childish education fonts. Cream-on-teal creates a warm adult palette similar to the provided reference while keeping Russian text legible.
`);

  writeText(path.join(KIT_ROOT, 'FONTS_TO_DOWNLOAD.md'), `# Fonts

Recommended downloadable fonts:

1. Unbounded: https://fonts.google.com/specimen/Unbounded
   - Use Black/ExtraBold for the main phrase and A1-A2.
   - Strong Cyrillic support, adult YouTube-short presence.

2. Manrope: https://fonts.google.com/specimen/Manrope
   - Use Medium/SemiBold for the top prompt and small helper text.
   - Clean Cyrillic, modern, not childish.

3. Inter as safe alternative: https://fonts.google.com/specimen/Inter

Draft fallback used now:

- Display fallback: \`${LOCAL_DISPLAY_FONT}\`
- Body fallback: \`${LOCAL_BODY_FONT}\`
`);

  writeText(path.join(KIT_ROOT, 'README.md'), `# Lingman Quiz Attraction Template

CapCut editable project:
\`${TEMPLATE_DRAFT}\`

Source backup:
\`C:\\appsprojects\\phraseman\\.codex-tmp\\capcut-backups\\LINGMAN_WEDNESDAY_INTERESTING_11LABS_STRICT_BG_202_1_SOURCE_BACKUP_20260702_175257\`

Assets:
\`${ASSETS_DIR}\`

What is inside:

- DALL-E dark office and graphite studio backgrounds.
- Separate PNG/SVG elements for prompt, main phrase, level badge, and safe-area guides.
- 1080x1920 and 2160x3840 layout mockups.
- CapCut settings and font links.
- Verification report proving audio timing/speed was not changed.

Open the CapCut project named:
\`${TEMPLATE_NAME}\`
`);

  writeText(path.join(KIT_ROOT, 'VERIFICATION_REPORT.json'), JSON.stringify(report, null, 2));
  writeText(path.join(KIT_ROOT, 'ASSET_MANIFEST.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    kit_root: KIT_ROOT,
    capcut_project: TEMPLATE_DRAFT,
    assets: fs.readdirSync(ASSETS_DIR).sort().map((name) => path.join(ASSETS_DIR, name)),
    dalle_sources: [
      { id: 'ig_0f841023565124db016a4696c139c48191932b7397d104c2dc', file: path.join(ASSETS_DIR, 'dalle_dark_office_master.png') },
      { id: 'ig_0f841023565124db016a4697072f008191a0f4a34436f1f178', file: path.join(ASSETS_DIR, 'dalle_graphite_studio_master.png') },
    ],
  }, null, 2));
}

async function main() {
  if (!fs.existsSync(TEMPLATE_DRAFT)) throw new Error(`Missing copied template draft: ${TEMPLATE_DRAFT}`);
  const sourceDraft = readJson(path.join(SOURCE_DRAFT, 'draft_content.json'));
  const draftFile = path.join(TEMPLATE_DRAFT, 'draft_content.json');
  const templateFile = path.join(TEMPLATE_DRAFT, 'template-2.tmp');
  const metaFile = path.join(TEMPLATE_DRAFT, 'draft_meta_info.json');
  const draft = readJson(draftFile);
  const beforeAudio = compareAudio(sourceDraft, draft);
  if (beforeAudio.errors.length) throw new Error(`Copied draft audio already differs from source: ${JSON.stringify(beforeAudio.errors.slice(0, 3))}`);

  const styleResult = applyDraftStyle(draft);
  const afterAudio = compareAudio(sourceDraft, draft);
  if (afterAudio.errors.length) throw new Error(`Audio changed during styling: ${JSON.stringify(afterAudio.errors.slice(0, 3))}`);

  writeJson(draftFile, draft);
  writeJson(templateFile, draft);

  const meta = readJson(metaFile);
  updateMeta(meta, styleResult.newDraftId);
  writeJson(metaFile, meta);

  await buildAssets();

  const report = {
    status: 'ready',
    source_draft: SOURCE_DRAFT,
    template_draft: TEMPLATE_DRAFT,
    template_name: TEMPLATE_NAME,
    kit_root: KIT_ROOT,
    changed_files: [draftFile, templateFile, metaFile],
    audio_check: {
      sourceCount: afterAudio.sourceCount,
      targetCount: afterAudio.targetCount,
      errorCount: afterAudio.errors.length,
    },
    text_style_counts: styleResult.counts,
    design_formula: 'dark_cinematic_quiz_attraction_v1',
    fonts: {
      recommended: ['Unbounded Black/ExtraBold', 'Manrope Medium/SemiBold'],
      draft_display_fallback: LOCAL_DISPLAY_FONT,
      draft_body_fallback: LOCAL_BODY_FONT,
    },
  };
  writeGuide(report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
