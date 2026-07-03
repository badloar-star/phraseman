#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const TEXT_TRACKS = new Set([5, 7, 8, 10, 11, 13, 15]);
const AUDIO_TRACKS = new Set([21, 22, 23, 24, 25, 26, 27, 28]);
const AUDIO_TOLERANCE_US = 50_000;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  if (!args['draft-dir']) {
    throw new Error('Usage: node scripts/chains_capcut_contract_check.mjs --draft-dir <CapCut draft dir> [--template-dir <source template dir>] [--report <path>]');
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listDraftFiles(draftDir) {
  const files = [
    path.join(draftDir, 'draft_content.json'),
    path.join(draftDir, 'template-2.tmp'),
  ];
  const timelinesDir = path.join(draftDir, 'Timelines');
  if (fs.existsSync(timelinesDir)) {
    for (const entry of fs.readdirSync(timelinesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const timelineDir = path.join(timelinesDir, entry.name);
      files.push(path.join(timelineDir, 'draft_content.json'));
      files.push(path.join(timelineDir, 'template-2.tmp'));
    }
  }
  return files.filter((file) => fs.existsSync(file));
}

function resolveDraftPath(draftDir, rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  if (fs.existsSync(rawPath)) return rawPath;
  const marker = '##/';
  if (rawPath.startsWith('##_draftpath_placeholder_') && rawPath.includes(marker)) {
    return path.join(draftDir, rawPath.slice(rawPath.indexOf(marker) + marker.length).replaceAll('/', path.sep));
  }
  return rawPath;
}

function wavDurationUs(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }
  let offset = 12;
  let byteRate = null;
  let dataSize = null;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'fmt ') {
      byteRate = bytes.readUInt32LE(start + 8);
    }
    if (id === 'data') {
      dataSize = size === 0xFFFFFFFF ? bytes.length - start : size;
      break;
    }
    offset = start + size + (size % 2);
  }
  if (!byteRate || !dataSize) return null;
  return Math.round((dataSize / byteRate) * 1_000_000);
}

function materialMap(draft, kind) {
  return new Map((draft.materials?.[kind] || []).map((material) => [material.id, material]));
}

function parseTextPayload(material, errors, context) {
  try {
    return JSON.parse(material.content || '{}');
  } catch (error) {
    errors.push({ ...context, type: 'text_payload_parse', message: error.message });
    return null;
  }
}

function withoutStyleRange(style) {
  const copy = JSON.parse(JSON.stringify(style || {}));
  delete copy.range;
  return copy;
}

function stable(value) {
  return JSON.stringify(value);
}

function textSegmentInvariant(segment) {
  return {
    target_timerange: segment.target_timerange,
    source_timerange: segment.source_timerange,
    render_timerange: segment.render_timerange,
    clip: segment.clip,
    uniform_scale: segment.uniform_scale,
    render_index: segment.render_index,
    track_render_index: segment.track_render_index,
    visible: segment.visible,
    responsive_layout: segment.responsive_layout,
  };
}

function checkText(draft, templateDraft, fileLabel, errors) {
  const texts = materialMap(draft, 'texts');
  const templateTexts = templateDraft ? materialMap(templateDraft, 'texts') : null;
  for (const [trackIndex, track] of (draft.tracks || []).entries()) {
    if (!TEXT_TRACKS.has(trackIndex)) continue;
    const templateTrack = templateDraft?.tracks?.[trackIndex];
    if (templateTrack && (templateTrack.segments || []).length !== (track.segments || []).length) {
      errors.push({ file: fileLabel, track: trackIndex, type: 'text_segment_count_changed' });
    }
    for (const [segmentIndex, segment] of (track.segments || []).entries()) {
      const material = texts.get(segment.material_id);
      const context = { file: fileLabel, track: trackIndex, segment: segmentIndex };
      if (!material) {
        errors.push({ ...context, type: 'missing_text_material', material_id: segment.material_id });
        continue;
      }
      const payload = parseTextPayload(material, errors, context);
      if (!payload) continue;
      const text = String(payload.text ?? '');
      if (/(\?{4,}|\uFFFD|Ð|Ñ|Ã)/u.test(text)) {
        errors.push({ ...context, type: 'text_mojibake_or_replacement', text });
      }
      const styles = Array.isArray(payload.styles) ? payload.styles : [];
      const firstStyle = styles[0];
      if (!firstStyle) {
        errors.push({ ...context, type: 'missing_text_style', text });
        continue;
      }
      const expectedRange = [0, text.length];
      if (!Array.isArray(firstStyle.range) || firstStyle.range[0] !== expectedRange[0] || firstStyle.range[1] !== expectedRange[1]) {
        errors.push({ ...context, type: 'style_range_not_full_text', text, range: firstStyle.range, expectedRange });
      }
      for (const [styleIndex, style] of styles.entries()) {
        if (styleIndex === 0) continue;
        if (Array.isArray(style.range) && style.range[1] > text.length) {
          errors.push({ ...context, type: 'extra_style_range_past_text', styleIndex, text, range: style.range });
        }
      }
      const templateSegment = templateTrack?.segments?.[segmentIndex];
      if (templateSegment) {
        if (stable(textSegmentInvariant(segment)) !== stable(textSegmentInvariant(templateSegment))) {
          errors.push({ ...context, type: 'text_timing_or_geometry_changed' });
        }
        const templateMaterial = templateTexts?.get(templateSegment.material_id);
        const templatePayload = templateMaterial ? parseTextPayload(templateMaterial, errors, { ...context, template: true }) : null;
        if (templatePayload?.styles?.[0] && stable(withoutStyleRange(templatePayload.styles[0])) !== stable(withoutStyleRange(firstStyle))) {
          errors.push({ ...context, type: 'text_style_changed_except_range' });
        }
      }
    }
  }
}

function checkAudio(draft, draftDir, fileLabel, errors) {
  const audios = materialMap(draft, 'audios');
  for (const [trackIndex, track] of (draft.tracks || []).entries()) {
    if (!AUDIO_TRACKS.has(trackIndex) || track.type !== 'audio') continue;
    for (const [segmentIndex, segment] of (track.segments || []).entries()) {
      const material = audios.get(segment.material_id);
      const rawPath = material?.path || material?.local_material_path || material?.imported_path || material?.file_path || '';
      const audioPath = resolveDraftPath(draftDir, rawPath);
      if (!audioPath.includes('chains_') && !audioPath.includes('openai_audio')) continue;
      const context = { file: fileLabel, track: trackIndex, segment: segmentIndex, material_id: segment.material_id, audioPath };
      if (!fs.existsSync(audioPath)) {
        errors.push({ ...context, type: 'missing_audio_file' });
        continue;
      }
      const realDuration = wavDurationUs(audioPath);
      const sourceDuration = segment.source_timerange?.duration;
      const targetDuration = segment.target_timerange?.duration;
      const materialDuration = material?.duration;
      if (segment.speed !== 1) {
        errors.push({ ...context, type: 'audio_speed_not_one', speed: segment.speed });
      }
      if (segment.is_tone_modify) {
        errors.push({ ...context, type: 'audio_tone_modify_enabled' });
      }
      if (!sourceDuration || !targetDuration || Math.abs(sourceDuration - targetDuration) > 1) {
        errors.push({ ...context, type: 'audio_source_target_duration_mismatch', sourceDuration, targetDuration });
      }
      if (targetDuration > sourceDuration + 1) {
        errors.push({ ...context, type: 'audio_would_stretch_or_slow_down', sourceDuration, targetDuration });
      }
      if (realDuration && Math.abs(realDuration - sourceDuration) > AUDIO_TOLERANCE_US) {
        errors.push({ ...context, type: 'audio_source_duration_not_real_wav', realDuration, sourceDuration });
      }
      if (realDuration && materialDuration && Math.abs(realDuration - materialDuration) > AUDIO_TOLERANCE_US) {
        errors.push({ ...context, type: 'audio_material_duration_not_real_wav', realDuration, materialDuration });
      }
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const draftDir = path.resolve(String(args['draft-dir']));
  const templateDir = args['template-dir'] ? path.resolve(String(args['template-dir'])) : null;
  const reportPath = args.report ? path.resolve(String(args.report)) : null;
  const templateDraft = templateDir && fs.existsSync(path.join(templateDir, 'draft_content.json'))
    ? readJson(path.join(templateDir, 'draft_content.json'))
    : null;
  const files = listDraftFiles(draftDir);
  const errors = [];
  for (const file of files) {
    const draft = readJson(file);
    const fileLabel = path.relative(draftDir, file) || path.basename(file);
    checkText(draft, templateDraft, fileLabel, errors);
    checkAudio(draft, draftDir, fileLabel, errors);
  }
  const report = {
    status: errors.length ? 'failed' : 'ready',
    draftDir,
    templateDir,
    checkedFiles: files,
    errorCount: errors.length,
    styleRangeErrorCount: errors.filter((error) => error.type.includes('style_range')).length,
    audioStretchErrorCount: errors.filter((error) => error.type.includes('audio_')).length,
    errors,
  };
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exit(1);
}

main();
