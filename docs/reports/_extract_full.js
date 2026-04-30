// Extract all phrases from lesson_data_*.ts (handles 3 ID formats)
const fs = require('fs');
const path = require('path');

const FILES = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

const ROOT = path.resolve(__dirname, '..', '..');

function processEscapes(s) {
  if (!s) return s;
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function findBlockEnd(text, startIdx) {
  // Walk forward from { at startIdx, balance braces, ignoring those inside strings
  let depth = 0;
  let inStr = null; // ', ", or null
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (inStr) {
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function extractFile(relPath) {
  const abs = path.join(ROOT, relPath);
  const text = fs.readFileSync(abs, 'utf8');
  // Build line-offset table
  const lineOffsets = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineOffsets.push(i + 1);
  const offToLine = (off) => {
    // binary search
    let lo = 0, hi = lineOffsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineOffsets[mid] <= off) lo = mid; else hi = mid - 1;
    }
    return lo + 1; // 1-based
  };

  const phrases = [];
  // Three patterns. We capture lesson# and phrase#
  // Pattern A: id:'lesson12_phrase_3'
  // Pattern B: id:'l25p1'
  // Pattern C: id: 1   (need surrounding LESSON_N_PHRASES context)
  const patternUnion = /id\s*:\s*(?:'lesson(\d+)_phrase_(\d+)'|"lesson(\d+)_phrase_(\d+)"|'l(\d+)p(\d+)'|"l(\d+)p(\d+)"|(\d+))/g;
  // For pattern C, we need to know which lesson section we're in. Walk through file, mark each LESSON_N_PHRASES start.
  const lessonHdrRe = /export\s+const\s+LESSON_(\d+)_PHRASES/g;
  const lessonRanges = []; // {lesson, start}
  let h;
  while ((h = lessonHdrRe.exec(text)) !== null) {
    lessonRanges.push({ lesson: parseInt(h[1], 10), start: h.index });
  }
  function lessonAt(off) {
    let cur = 0;
    for (const r of lessonRanges) {
      if (r.start <= off) cur = r.lesson; else break;
    }
    return cur;
  }

  let m;
  while ((m = patternUnion.exec(text)) !== null) {
    let lessonNum = 0, phraseNum = 0;
    if (m[1]) { lessonNum = +m[1]; phraseNum = +m[2]; }
    else if (m[3]) { lessonNum = +m[3]; phraseNum = +m[4]; }
    else if (m[5]) { lessonNum = +m[5]; phraseNum = +m[6]; }
    else if (m[7]) { lessonNum = +m[7]; phraseNum = +m[8]; }
    else if (m[9]) { lessonNum = lessonAt(m.index); phraseNum = +m[9]; }
    if (!lessonNum || !phraseNum) continue;

    // Find the surrounding object: walk back from m.index to find the nearest "{" not inside a string at the right depth.
    // Simpler: scan back to find "{" before m.index where depth becomes 0 starting after that {.
    // We approximate: find nearest "{" before m.index.
    let braceStart = -1;
    for (let i = m.index; i >= 0; i--) {
      if (text[i] === '{') {
        // Check this is the immediate enclosing object: try findBlockEnd from here and ensure m.index is inside
        const end = findBlockEnd(text, i);
        if (end > m.index) {
          braceStart = i;
          break;
        }
      }
    }
    if (braceStart < 0) continue;
    const blockEnd = findBlockEnd(text, braceStart);
    if (blockEnd < 0) continue;
    const block = text.slice(braceStart, blockEnd + 1);

    if (!/english\s*:/.test(block) || !/russian\s*:/.test(block)) continue;

    // Extract fields - allow both ' and "
    const eng = block.match(/english\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/);
    const rus = block.match(/russian\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/);
    const uk = block.match(/ukrainian\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/);
    const correctRe = /correct\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    const correctWords = [];
    let cm;
    while ((cm = correctRe.exec(block)) !== null) correctWords.push(processEscapes(cm[2]));

    phrases.push({
      id: `lesson${lessonNum}_phrase_${phraseNum}`,
      lesson: lessonNum,
      file: relPath,
      line: offToLine(m.index),
      english: processEscapes(eng ? eng[2] : ''),
      russian: processEscapes(rus ? rus[2] : ''),
      ukrainian: processEscapes(uk ? uk[2] : ''),
      correct: correctWords,
    });

    // Advance past this block
    patternUnion.lastIndex = blockEnd + 1;
  }
  return phrases;
}

const all = [];
for (const f of FILES) {
  const ph = extractFile(f);
  console.error(`${f}: ${ph.length} phrases`);
  all.push(...ph);
}

const byLesson = {};
for (const p of all) byLesson[p.lesson] = (byLesson[p.lesson] || 0) + 1;
console.error('Per-lesson counts:', JSON.stringify(byLesson));

// dedupe by id (in case of duplicate matches)
const seen = new Set();
const unique = [];
for (const p of all) {
  if (seen.has(p.id)) continue;
  seen.add(p.id);
  unique.push(p);
}

fs.writeFileSync(path.join(__dirname, '_phrases_full.json'), JSON.stringify(unique, null, 2), 'utf8');
console.error(`Total unique: ${unique.length} phrases written to _phrases_full.json`);
