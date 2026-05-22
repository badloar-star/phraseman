#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const plannedLocales = ['pt-BR', 'vi', 'id', 'tr', 'pl'];
const plannedFieldSuffixes = ['PtBr', 'Vi', 'Id', 'Tr', 'Pl'];
const plannedFieldSuffixAliases = {
  PtBr: ['PtBr', 'PTBR'],
  Vi: ['Vi', 'VI'],
  Id: ['Id', 'ID'],
  Tr: ['Tr', 'TR'],
  Pl: ['Pl', 'PL'],
};
const scanRoots = ['app', 'constants', 'components', 'admin', 'knowly-www'];
const sourceExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html']);
const skipParts = new Set(['node_modules', '.expo', '.git', 'ios', 'android', 'functions/lib']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (entry.isDirectory()) {
      if (!skipParts.has(entry.name) && !skipParts.has(rel)) walk(full, out);
      continue;
    }
    if (sourceExt.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function countMatches(text, re) {
  return [...text.matchAll(re)].length;
}

function extractBalancedBlock(text, openIndex) {
  if (openIndex < 0 || text[openIndex] !== '{') return null;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }
  return null;
}

function extractConstObject(text, constName) {
  const marker = new RegExp(`\\bconst\\s+${constName}\\b`);
  const match = marker.exec(text);
  if (!match) return null;
  const equalsIndex = text.indexOf('=', match.index);
  if (equalsIndex < 0) return null;
  const openIndex = text.indexOf('{', equalsIndex);
  return extractBalancedBlock(text, openIndex);
}

function extractPropertyValueBlock(objectBlock, propName) {
  if (!objectBlock) return null;
  const prop = new RegExp(`(?:^|[,{]\\s*)${propName}\\s*:`, 'm');
  const match = prop.exec(objectBlock);
  if (!match) return null;
  const colonIndex = objectBlock.indexOf(':', match.index);
  const valueStart = objectBlock.slice(colonIndex + 1).search(/\S/);
  if (valueStart < 0) return null;
  const absoluteStart = colonIndex + 1 + valueStart;
  if (objectBlock[absoluteStart] === '{') return extractBalancedBlock(objectBlock, absoluteStart);
  const tail = objectBlock.slice(absoluteStart);
  const end = tail.search(/[,}]/);
  return (end >= 0 ? tail.slice(0, end) : tail).trim();
}

function topLevelObjectEntries(objectBlock) {
  if (!objectBlock) return new Map();
  const entries = new Map();
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = 0; i < objectBlock.length; i += 1) {
    const ch = objectBlock[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      continue;
    }
    if (depth !== 1) continue;
    const rest = objectBlock.slice(i);
    const match = /^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_]+))\s*:/.exec(rest);
    if (!match) continue;
    const key = match[1] ?? match[2] ?? match[3];
    const colonOffset = match[0].lastIndexOf(':');
    const afterColon = i + colonOffset + 1;
    const valueStartRel = objectBlock.slice(afterColon).search(/\S/);
    if (valueStartRel < 0) continue;
    const valueStart = afterColon + valueStartRel;
    if (objectBlock[valueStart] !== '{') continue;
    const value = extractBalancedBlock(objectBlock, valueStart);
    if (!value) continue;
    entries.set(key, value);
    i = valueStart + value.length - 1;
  }
  return entries;
}

function hasAllPlannedLocales(valueBlock) {
  if (!valueBlock) return false;
  return plannedLocales.every((locale) => {
    const key = locale === 'pt-BR' ? "'pt-BR'" : locale;
    return new RegExp(`${key}\\s*:`).test(valueBlock);
  });
}

function auditLevelGiftPlannedLocaleCoverage(text) {
  const plannedRoot = extractConstObject(text, 'LEVEL_GIFT_PLANNED_LOCALE');
  const foreverDesc = extractConstObject(text, 'PACK_FOREVER_DESC');
  const plannedEntries = topLevelObjectEntries(plannedRoot);
  const ids = [...new Set([...text.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]))]
    .filter((id) => plannedEntries.has(id) || /^prem_|^(energy|xp|hint|shards|focus|arena|chain|cosmetic|club|wager|pack|choice)/.test(id));

  const missing = [];
  for (const id of ids) {
    const entry = plannedEntries.get(id);
    if (!entry) {
      missing.push({ id, field: 'entry' });
      continue;
    }
    const title = extractPropertyValueBlock(entry, 'title');
    const desc = extractPropertyValueBlock(entry, 'desc');
    if (!hasAllPlannedLocales(title)) missing.push({ id, field: 'title' });
    const descIsSharedFullLocaleCopy = desc === 'PACK_FOREVER_DESC' && hasAllPlannedLocales(foreverDesc);
    if (!descIsSharedFullLocaleCopy && !hasAllPlannedLocales(desc)) missing.push({ id, field: 'desc' });
  }
  return { giftIds: ids.length, missing };
}

function auditClubPlannedLocaleCoverage(text) {
  const clubsArrayStart = text.indexOf('export const CLUBS');
  const clubsOpenIndex = text.indexOf('[', clubsArrayStart);
  const clubsCloseIndex = text.indexOf('];', clubsOpenIndex);
  const clubsBlock = clubsOpenIndex >= 0 && clubsCloseIndex >= 0 ? text.slice(clubsOpenIndex, clubsCloseIndex) : '';
  const clubIds = [...new Set([...clubsBlock.matchAll(/\bid:\s*(\d+)/g)].map((m) => m[1]))];
  const descRoot = extractConstObject(text, 'CLUB_DESC_PLANNED');
  const descEntries = topLevelObjectEntries(descRoot);

  const missing = [];
  for (const id of clubIds) {
    const entry = descEntries.get(id);
    if (!entry || !hasAllPlannedLocales(entry)) missing.push({ id, field: 'desc' });
  }
  return { clubIds: clubIds.length, missing };
}

const files = scanRoots.flatMap((dir) => walk(path.join(root, dir)));
const report = {
  scannedFiles: files.length,
  oldFieldHits: [],
  runtimeFallbackHits: [],
  missingPlannedFieldFamilies: [],
  lessonSurfaceBlockers: [],
  levelGiftPlannedLocaleCoverage: null,
  clubPlannedLocaleCoverage: null,
  summary: {},
};

const oldFieldRe = /\b(title|subtitle|label|text|lines|desc)(RU|UK|ES)\??\s*:/g;
const fallbackRe = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/g;
const userFacingLessonFiles = /(^|\/)(lesson_data_all|lesson_data_types|lesson_intro_screens|lesson_intro_screens_|lesson_help|lesson_menu|lesson1|lesson_complete|lesson_words|quizzes|flashcards)/;

for (const file of files) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  const oldFieldCount = countMatches(text, oldFieldRe);
  const fallbackCount = countMatches(text, fallbackRe);
  const levelGiftCoverage = rel === 'app/level_gift_system.ts'
    ? auditLevelGiftPlannedLocaleCoverage(text)
    : null;
  const clubCoverage = rel === 'app/league_engine.ts'
    ? auditClubPlannedLocaleCoverage(text)
    : null;
  if (levelGiftCoverage) report.levelGiftPlannedLocaleCoverage = levelGiftCoverage;
  if (clubCoverage) report.clubPlannedLocaleCoverage = clubCoverage;
  if (oldFieldCount) report.oldFieldHits.push({ file: rel, oldFieldCount });
  if (fallbackCount) report.runtimeFallbackHits.push({ file: rel, fallbackCount });

  for (const family of ['title', 'subtitle', 'label', 'text', 'lines', 'desc']) {
    const legacyCounts = ['RU', 'UK', 'ES'].map((suffix) =>
      countMatches(text, new RegExp(`\\b${family}${suffix}\\??\\s*:`, 'g')),
    );
    const legacyCount = Math.max(...legacyCounts);
    if (!legacyCount) continue;
    const missing = plannedFieldSuffixes
      .map((suffix) => {
        const aliases = plannedFieldSuffixAliases[suffix] ?? [suffix];
        const plannedCount = Math.max(
          ...aliases.map((alias) => countMatches(text, new RegExp(`\\b${family}${alias}\\??\\s*:`, 'g'))),
        );
        return { field: `${family}${suffix}`, missingCount: Math.max(0, legacyCount - plannedCount) };
      })
      .filter((entry) => entry.missingCount > 0);
    if (missing.length) {
      if (
        rel === 'app/level_gift_system.ts'
        && (family === 'title' || family === 'desc')
        && levelGiftCoverage
        && levelGiftCoverage.missing.length === 0
      ) {
        continue;
      }
      if (
        rel === 'app/league_engine.ts'
        && family === 'desc'
        && clubCoverage
        && clubCoverage.missing.length === 0
      ) {
        continue;
      }
      report.missingPlannedFieldFamilies.push({ file: rel, family, legacyCount, missing });
      if (userFacingLessonFiles.test(rel)) {
        report.lessonSurfaceBlockers.push({ file: rel, family, legacyCount, missing });
      }
    }
  }
}

const missingPlannedFieldSlots = report.missingPlannedFieldFamilies.reduce(
  (sum, item) => sum + item.missing.reduce((inner, entry) => inner + entry.missingCount, 0),
  0,
);
const lessonSurfaceBlockerSlots = report.lessonSurfaceBlockers.reduce(
  (sum, item) => sum + item.missing.reduce((inner, entry) => inner + entry.missingCount, 0),
  0,
);

report.summary = {
  filesWithOldRuUkEsFields: report.oldFieldHits.length,
  filesWithRuntimeFallbacks: report.runtimeFallbackHits.length,
  missingPlannedFieldFamilies: report.missingPlannedFieldFamilies.length,
  lessonSurfaceBlockers: report.lessonSurfaceBlockers.length,
  missingPlannedFieldSlots,
  lessonSurfaceBlockerSlots,
};

const outDir = path.join(root, 'docs', 'heisenberg');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'full_app_localization_audit_latest.json');
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  report: path.relative(root, outPath),
  ...report.summary,
  topLessonBlockers: report.lessonSurfaceBlockers.slice(0, 12),
}, null, 2));

if (report.lessonSurfaceBlockers.length > 0) {
  process.exitCode = 1;
}
