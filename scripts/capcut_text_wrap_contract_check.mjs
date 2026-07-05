/**
 * CapCut text wrap QA gate.
 *
 * Checks root draft files and timeline mirrors. For source-backed runs, verifies
 * that timeline text equals the deterministic manual wrap from the source file.
 *
 * Example:
 *   node scripts/capcut_text_wrap_contract_check.mjs \
 *     --draft-dir "C:\...\LINGMAN_WEDNESDAY_INTERESTING_11LABS_STRICT_BG_202 (2)" \
 *     --track-index 6 \
 *     --source-psv content/lingman/quiz_attraction_two_word_phrases_20260703.psv \
 *     --source-column translation_ru \
 *     --max-chars 12 \
 *     --max-lines 3
 */
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

function argValue(name, fallback = '') {
  const eq = args.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function die(message) {
  console.error(message);
  process.exit(1);
}

const draftDir = path.resolve(argValue('--draft-dir'));
const trackIndexArg = Number(argValue('--track-index'));
const sourcePsv = argValue('--source-psv');
const sourceColumn = argValue('--source-column', 'translation_ru');
const maxChars = Number(argValue('--max-chars', '12'));
const maxLines = Number(argValue('--max-lines', '3'));
const reportPath = argValue('--report');

if (!draftDir || draftDir === process.cwd()) die('Missing --draft-dir');
if (!Number.isInteger(trackIndexArg) || trackIndexArg < 1) die('Missing valid 1-based --track-index');
if (!Number.isInteger(maxChars) || maxChars < 1) die('Missing valid --max-chars');
if (!Number.isInteger(maxLines) || maxLines < 1) die('Missing valid --max-lines');

const trackIndex = trackIndexArg - 1;

function parsePsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  const header = raw.shift()?.split('|') || [];
  const index = header.indexOf(sourceColumn);
  if (index < 0) die(`Source column not found: ${sourceColumn}`);
  return raw.map((line) => (line.split('|')[index] || '').trim());
}

function manualWrap(value) {
  const clean = value.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const words = clean.toUpperCase().split(' ');
  const tooLong = words.find((word) => word.length > maxChars);
  if (tooLong) {
    throw new Error(`source word too long (${tooLong.length}>${maxChars}): ${tooLong}`);
  }
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    throw new Error(`source text needs ${lines.length} lines>${maxLines}: ${value}`);
  }
  return lines.join('\n');
}

function draftJsonFiles(dir) {
  const files = [];
  for (const rel of ['draft_content.json', 'template-2.tmp']) {
    const filePath = path.join(dir, rel);
    if (fs.existsSync(filePath)) files.push({ rel, filePath });
  }
  const timelinesDir = path.join(dir, 'Timelines');
  if (fs.existsSync(timelinesDir)) {
    for (const name of fs.readdirSync(timelinesDir)) {
      const timelineDir = path.join(timelinesDir, name);
      if (!fs.statSync(timelineDir).isDirectory()) continue;
      for (const rel of ['draft_content.json', 'template-2.tmp']) {
        const filePath = path.join(timelineDir, rel);
        if (fs.existsSync(filePath)) files.push({ rel: path.join('Timelines', name, rel), filePath });
      }
    }
  }
  return files;
}

function sortedSegments(track) {
  return [...(track?.segments || [])].sort((a, b) => (a.target_timerange?.start || 0) - (b.target_timerange?.start || 0));
}

function textMaterial(payload, id) {
  return payload.materials?.texts?.find((item) => item.id === id);
}

function readText(material) {
  if (!material) return '';
  try {
    const content = JSON.parse(material.content || '{}');
    if (typeof content.text === 'string') return content.text.replace(/\r\n/g, '\n');
  } catch {}
  return String(material.base_content || '').replace(/\r\n/g, '\n');
}

const sourceRows = sourcePsv ? parsePsv(path.resolve(sourcePsv)) : null;
const expectedRows = sourceRows
  ? sourceRows.map((value, index) => {
      try {
        return { ok: true, text: manualWrap(value) };
      } catch (error) {
        return { ok: false, index: index + 1, message: error.message };
      }
    })
  : null;

const errors = [];
const files = draftJsonFiles(draftDir);
if (!files.length) die(`No CapCut draft JSON files found in ${draftDir}`);

for (const expected of expectedRows || []) {
  if (!expected.ok) {
    errors.push({ type: 'source-wrap-error', index: expected.index, message: expected.message });
  }
}

const fileReports = [];
for (const { rel, filePath } of files) {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push({ type: 'json-parse-error', file: rel, message: error.message });
    continue;
  }
  const track = payload.tracks?.[trackIndex];
  if (!track || track.type !== 'text') {
    errors.push({ type: 'track-error', file: rel, message: `track ${trackIndexArg} is not a text track` });
    continue;
  }
  const segments = sortedSegments(track);
  if (expectedRows && segments.length !== expectedRows.length) {
    errors.push({
      type: 'segment-count-mismatch',
      file: rel,
      expected: expectedRows.length,
      actual: segments.length,
    });
  }

  let checked = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const text = readText(textMaterial(payload, segments[i].material_id));
    const lines = text.split('\n');
    checked += 1;
    if (lines.length > maxLines) {
      errors.push({ type: 'too-many-lines', file: rel, index: i + 1, lines: lines.length, text });
    }
    for (const [lineIndex, line] of lines.entries()) {
      if (line.length > maxChars) {
        errors.push({
          type: 'line-too-long',
          file: rel,
          index: i + 1,
          line: lineIndex + 1,
          length: line.length,
          maxChars,
          text,
        });
      }
      if (/^\s|\s$/.test(line)) {
        errors.push({ type: 'edge-space', file: rel, index: i + 1, line: lineIndex + 1, text });
      }
    }
    if (expectedRows?.[i]?.ok && text !== expectedRows[i].text) {
      errors.push({
        type: 'source-wrap-mismatch',
        file: rel,
        index: i + 1,
        expected: expectedRows[i].text,
        actual: text,
      });
    }
  }
  fileReports.push({ file: rel, checked });
}

const report = {
  status: errors.length ? 'failed' : 'ready',
  draftDir,
  trackIndex: trackIndexArg,
  maxChars,
  maxLines,
  sourcePsv: sourcePsv ? path.resolve(sourcePsv) : null,
  sourceColumn: sourcePsv ? sourceColumn : null,
  files: fileReports,
  errorCount: errors.length,
  errors: errors.slice(0, 50),
};

if (reportPath) {
  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(path.resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
