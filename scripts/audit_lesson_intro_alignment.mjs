import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_ALL = path.join(ROOT, 'app', 'lesson_data_all.ts');
const EXTRA_INTROS = path.join(ROOT, 'app', 'lesson_intro_screens_9_32.ts');
const REPORT = path.join(ROOT, 'tools', 'audit', 'lesson_intro_alignment_audit.md');

const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);

function findMatching(src, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openIndex; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`No matching ${closeChar} for ${openChar} at ${openIndex}`);
}

function extractBlock(src, marker, openChar, closeChar) {
  const markerIndex = src.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Marker not found: ${marker}`);
  const open = src.indexOf(openChar, markerIndex);
  if (open < 0) throw new Error(`Opening ${openChar} not found after: ${marker}`);
  const close = findMatching(src, open, openChar, closeChar);
  return src.slice(open + 1, close);
}

function parseAllLessons(src) {
  const body = extractBlock(src, 'export const ALL_LESSONS', '[', ']');
  const rows = new Map();
  const re = /^\s*\{\s*id:\s*(\d+),.*?\bintroScreens:\s*([^,}]+).*?\bphrases:\s*(LESSON_\d+_PHRASES)\s*\},?\s*$/gm;
  let match;
  while ((match = re.exec(body))) {
    rows.set(Number(match[1]), {
      intro: match[2].trim(),
      phrases: match[3].trim(),
    });
  }
  return rows;
}

function parseLessonData(src) {
  const body = extractBlock(src, 'export const LESSON_DATA', '{', '}');
  const rows = new Map();
  const re = /^\s*(\d+):\s*\{\s*id:\s*(\d+),.*?\bintroScreens:\s*([^,}]+).*?\bphrases:\s*(LESSON_\d+_PHRASES)\s*\},?\s*$/gm;
  let match;
  while ((match = re.exec(body))) {
    const keyId = Number(match[1]);
    const rowId = Number(match[2]);
    rows.set(keyId, {
      rowId,
      intro: match[3].trim(),
      phrases: match[4].trim(),
    });
  }
  return rows;
}

function parseExtraIntroMap(src) {
  const body = extractBlock(src, 'export const EXTRA_INTRO_SCREENS', '{', '}');
  const rows = new Map();
  const re = /^\s*(\d+):\s*(LESSON_\d+_INTRO_[A-Z_]+|LESSON_\d+_INTRO_SCREENS)\s*,?\s*$/gm;
  let match;
  while ((match = re.exec(body))) rows.set(Number(match[1]), match[2].trim());
  return rows;
}

function expectedIntro(id) {
  return `LESSON_${id}_INTRO_SCREENS`;
}

function expectedPhrase(id) {
  return `LESSON_${id}_PHRASES`;
}

function checkIntroExpression(expr, id, location, critical) {
  if (expr === '[]') {
    critical.push(`L${id}: ${location} has empty introScreens: [].`);
    return;
  }
  const expected = expectedIntro(id);
  if (!expr.includes(expected)) {
    critical.push(`L${id}: ${location} uses "${expr}" instead of ${expected}.`);
  }
}

function main() {
  const src = fs.readFileSync(DATA_ALL, 'utf8');
  const extraSrc = fs.readFileSync(EXTRA_INTROS, 'utf8');
  const allLessons = parseAllLessons(src);
  const lessonData = parseLessonData(src);
  const extraIntros = parseExtraIntroMap(extraSrc);
  const critical = [];
  const warnings = [];
  const report = [];

  report.push('# Lesson Intro Alignment Audit');
  report.push('');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  report.push('| Lesson | ALL_LESSONS intro | LESSON_DATA intro | Extra intro | Status |');
  report.push('|---:|---|---|---|---|');

  for (const id of LESSONS) {
    const rowIssues = [];
    const allRow = allLessons.get(id);
    const dataRow = lessonData.get(id);
    const extra = extraIntros.get(id);

    if (!allRow) {
      const issue = `L${id}: missing from ALL_LESSONS.`;
      critical.push(issue);
      rowIssues.push('missing ALL_LESSONS');
    } else {
      checkIntroExpression(allRow.intro, id, 'ALL_LESSONS', critical);
      if (allRow.phrases !== expectedPhrase(id)) {
        critical.push(`L${id}: ALL_LESSONS uses "${allRow.phrases}" instead of ${expectedPhrase(id)}.`);
        rowIssues.push('wrong ALL_LESSONS phrases');
      }
      if (allRow.intro === '[]' || !allRow.intro.includes(expectedIntro(id))) {
        rowIssues.push('bad ALL_LESSONS intro');
      }
    }

    if (!dataRow) {
      const issue = `L${id}: missing from LESSON_DATA.`;
      critical.push(issue);
      rowIssues.push('missing LESSON_DATA');
    } else {
      if (dataRow.rowId !== id) {
        critical.push(`L${id}: LESSON_DATA key has id ${dataRow.rowId}.`);
        rowIssues.push('wrong LESSON_DATA id');
      }
      checkIntroExpression(dataRow.intro, id, 'LESSON_DATA', critical);
      if (dataRow.phrases !== expectedPhrase(id)) {
        critical.push(`L${id}: LESSON_DATA uses "${dataRow.phrases}" instead of ${expectedPhrase(id)}.`);
        rowIssues.push('wrong LESSON_DATA phrases');
      }
      if (dataRow.intro === '[]' || !dataRow.intro.includes(expectedIntro(id))) {
        rowIssues.push('bad LESSON_DATA intro');
      }
    }

    if (id >= 9 && id <= 32 && !extra) {
      warnings.push(`L${id}: not present in EXTRA_INTRO_SCREENS; getLessonIntroScreens will fall back to primary introScreens.`);
    }

    const allIntro = allRow?.intro ?? '-';
    const dataIntro = dataRow?.intro ?? '-';
    const extraIntro = extra ?? (id >= 9 ? '-' : 'n/a');
    report.push(`| ${id} | \`${allIntro}\` | \`${dataIntro}\` | \`${extraIntro}\` | ${rowIssues.length ? rowIssues.join('; ') : 'OK'} |`);
  }

  for (const id of LESSONS) {
    const symbol = expectedIntro(id);
    const occurrences = src.split(symbol).length - 1;
    if (occurrences < 3) {
      critical.push(`L${id}: ${symbol} is referenced ${occurrences} time(s) in lesson_data_all.ts; expected import plus ALL_LESSONS plus LESSON_DATA.`);
    }
  }

  report.push('');
  report.push('## Critical');
  report.push('');
  if (critical.length) critical.forEach((issue) => report.push(`- ${issue}`));
  else report.push('None.');
  report.push('');
  report.push('## Warnings');
  report.push('');
  const uniqueWarnings = [...new Set(warnings)];
  if (uniqueWarnings.length) uniqueWarnings.forEach((issue) => report.push(`- ${issue}`));
  else report.push('None.');

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, report.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${path.relative(ROOT, REPORT)}`);
  if (critical.length) {
    console.log(`FAIL: ${critical.length} critical intro issue(s). Warnings: ${uniqueWarnings.length}.`);
    process.exit(1);
  }
  console.log(`OK: intro alignment checks passed. Warnings: ${uniqueWarnings.length}.`);
}

main();
