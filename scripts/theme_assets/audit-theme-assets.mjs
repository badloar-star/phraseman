import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LEGACY_THEME_TOMBSTONES,
  LIVE_THEMES,
  RETIRED_RASTER_PREFIXES,
  SOURCE_EXTENSIONS,
  SOURCE_ROOTS,
} from './theme-asset-config.mjs';

const STATIC_REQUIRE_PATTERN = /require\(\s*['"](?<assetPath>[^'"]*assets[\\/]images[\\/][^'"]+)['"]\s*\)/g;
const THEME_REQUIRE_PATTERN = /(?:['"])?(?<theme>[A-Za-z][A-Za-z0-9]*)(?:['"])?\s*:\s*require\(\s*['"](?<assetPath>[^'"]*assets[\\/]images[\\/][^'"]+)['"]\s*\)/g;
const BRANCH_THEME_PATTERN = /if\s*\(\s*themeMode\s*===\s*['"](?<theme>[^'"]+)['"]\s*\)/;
const BRANCH_REQUIRE_PATTERN = /(?<slot>[A-Za-z][A-Za-z0-9_]*)\s*:\s*require\(\s*['"](?<assetPath>[^'"]*assets[\\/]images[\\/][^'"]+)['"]\s*\)/g;
const ALL_THEME_TOKENS = Object.freeze([
  ...LIVE_THEMES,
  ...LEGACY_THEME_TOMBSTONES,
]);

function normalizeAssetPath(rawPath) {
  const normalized = rawPath.replace(/\\/g, '/');
  const assetStart = normalized.indexOf('assets/images/');
  return assetStart >= 0 ? normalized.slice(assetStart) : normalized;
}

function walkSourceFiles(rootDir, sourceRoots) {
  const files = [];

  const visit = (absoluteDirectory) => {
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolutePath);
      }
    }
  };

  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = path.resolve(rootDir, sourceRoot);
    if (existsSync(absoluteRoot)) visit(absoluteRoot);
  }

  return files.sort();
}

function stripThemeToken(value) {
  let next = value;
  for (const theme of ALL_THEME_TOKENS) {
    const escaped = theme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next
      .replace(new RegExp(`(^|[-_.])${escaped}(?=[-_.]|$)`, 'gi'), '$1')
      .replace(/[-_.]{2,}/g, match => match[0]);
  }
  return next.replace(/[-_.]+$/g, '');
}

function themeFreeDirectory(assetPath) {
  const relativePath = assetPath.slice('assets/images/'.length);
  const segments = relativePath.split('/');
  segments.pop();
  return segments.filter(segment => {
    return !ALL_THEME_TOKENS.some(theme => {
      const lowerSegment = segment.toLowerCase();
      const lowerTheme = theme.toLowerCase();
      return lowerSegment === lowerTheme || lowerSegment.startsWith(`${lowerTheme}_`);
    });
  }).join('/');
}

function slotIdFromAssetPath(assetPath, explicitSlot = null) {
  const family = themeFreeDirectory(assetPath);
  if (explicitSlot) return `${family}/${explicitSlot}`.replace(/^\//, '');

  const relativePath = assetPath.slice('assets/images/'.length);
  const segments = relativePath.split('/');
  const normalizedSegments = segments.filter(segment => {
    return !ALL_THEME_TOKENS.some(theme => {
      const lowerSegment = segment.toLowerCase();
      const lowerTheme = theme.toLowerCase();
      return lowerSegment === lowerTheme || lowerSegment.startsWith(`${lowerTheme}_`);
    });
  });
  const fileName = normalizedSegments.pop() ?? 'asset';
  const extension = path.posix.extname(fileName);
  const baseName = stripThemeToken(fileName.slice(0, -extension.length)) || 'asset';
  return `${family}/${baseName}`.replace(/^\//, '');
}

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function collectBranchEntries(source) {
  const entries = [];
  const branchPattern = new RegExp(BRANCH_THEME_PATTERN.source, 'g');

  for (const branchMatch of source.matchAll(branchPattern)) {
    const theme = branchMatch.groups.theme;
    const openBraceIndex = source.indexOf('{', branchMatch.index + branchMatch[0].length);
    if (openBraceIndex < 0) continue;
    const closeBraceIndex = findMatchingBrace(source, openBraceIndex);
    if (closeBraceIndex < 0) continue;
    const block = source.slice(openBraceIndex + 1, closeBraceIndex);
    for (const match of block.matchAll(BRANCH_REQUIRE_PATTERN)) {
      entries.push({
        theme,
        assetPath: normalizeAssetPath(match.groups.assetPath),
        explicitSlot: match.groups.slot,
      });
    }
  }

  return entries;
}

function collectNestedThemeEntries(source) {
  const entries = [];
  const themeAlternation = ALL_THEME_TOKENS.join('|');
  const outerPattern = new RegExp(
    `(?:^|[,\\n{])\\s*(?:['"])?(?<theme>${themeAlternation})(?:['"])?\\s*:\\s*\\{`,
    'g',
  );
  const nestedRequirePattern = /(?:['"])?(?<slot>[A-Za-z0-9_-]+)(?:['"])?\s*:\s*require\(\s*['"](?<assetPath>[^'"]*assets[\\/]images[\\/][^'"]+)['"]\s*\)/g;

  for (const outerMatch of source.matchAll(outerPattern)) {
    const openBraceIndex = source.indexOf('{', outerMatch.index + outerMatch[0].length - 1);
    if (openBraceIndex < 0) continue;
    const closeBraceIndex = findMatchingBrace(source, openBraceIndex);
    if (closeBraceIndex < 0) continue;
    const block = source.slice(openBraceIndex + 1, closeBraceIndex);
    for (const innerMatch of block.matchAll(nestedRequirePattern)) {
      entries.push({
        theme: outerMatch.groups.theme,
        assetPath: normalizeAssetPath(innerMatch.groups.assetPath),
        explicitSlot: innerMatch.groups.slot,
      });
    }
  }
  return entries;
}

function collectThemeEntries(source) {
  const entries = [];
  for (const match of source.matchAll(THEME_REQUIRE_PATTERN)) {
    entries.push({
      theme: match.groups.theme,
      assetPath: normalizeAssetPath(match.groups.assetPath),
      explicitSlot: null,
    });
  }
  entries.push(...collectBranchEntries(source));
  entries.push(...collectNestedThemeEntries(source));

  const seen = new Set();
  return entries.filter(entry => {
    const key = `${entry.theme}\0${entry.explicitSlot ?? ''}\0${entry.assetPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function addViolation(violations, violation) {
  const key = JSON.stringify(violation);
  if (violations.some(item => JSON.stringify(item) === key)) return;
  violations.push(violation);
}

export function auditThemeAssets({
  rootDir,
  sourceRoots = SOURCE_ROOTS,
}) {
  const resolvedRoot = path.resolve(rootDir);
  const slots = {};
  const violations = [];
  const sourceFiles = walkSourceFiles(resolvedRoot, sourceRoots);

  for (const sourceFile of sourceFiles) {
    const source = readFileSync(sourceFile, 'utf8');
    const relativeSource = path.relative(resolvedRoot, sourceFile).replace(/\\/g, '/');

    for (const match of source.matchAll(STATIC_REQUIRE_PATTERN)) {
      const assetPath = normalizeAssetPath(match.groups.assetPath);
      if (!existsSync(path.join(resolvedRoot, ...assetPath.split('/')))) {
        addViolation(violations, {
          code: 'missing_asset_file',
          path: assetPath,
          source: relativeSource,
        });
      }
      if (RETIRED_RASTER_PREFIXES.some(prefix => assetPath.startsWith(prefix))) {
        addViolation(violations, {
          code: 'retired_raster_reference',
          path: assetPath,
          source: relativeSource,
        });
      }
    }

    for (const entry of collectThemeEntries(source)) {
      if (LEGACY_THEME_TOMBSTONES.includes(entry.theme)) {
        addViolation(violations, {
          code: 'legacy_theme_key',
          path: entry.assetPath,
          source: relativeSource,
          theme: entry.theme,
        });
        continue;
      }
      if (!LIVE_THEMES.includes(entry.theme)) continue;

      const slotId = slotIdFromAssetPath(entry.assetPath, entry.explicitSlot);
      slots[slotId] ??= {};
      slots[slotId][entry.theme] = entry.assetPath;
    }
  }

  for (const [slotId, sources] of Object.entries(slots)) {
    for (const theme of LIVE_THEMES) {
      if (!sources[theme]) {
        addViolation(violations, {
          code: 'missing_theme_variant',
          slotId,
          theme,
        });
      }
    }

    const themesByPath = new Map();
    for (const [theme, assetPath] of Object.entries(sources)) {
      const themes = themesByPath.get(assetPath) ?? [];
      themes.push(theme);
      themesByPath.set(assetPath, themes);
    }
    for (const [assetPath, themes] of themesByPath) {
      if (themes.length > 1) {
        addViolation(violations, {
          code: 'live_theme_alias',
          path: assetPath,
          slotId,
          themes: themes.sort(),
        });
      }
    }
  }

  return {
    liveThemes: [...LIVE_THEMES],
    slots: Object.fromEntries(Object.entries(slots).sort(([left], [right]) => left.localeCompare(right))),
    violations: violations.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    sourceFileCount: sourceFiles.length,
  };
}

function markdownSummary(report) {
  const lines = [
    '# Theme asset audit',
    '',
    `- Live themes: ${report.liveThemes.length}`,
    `- Source files scanned: ${report.sourceFileCount}`,
    `- Connected theme slots: ${Object.keys(report.slots).length}`,
    `- Violations: ${report.violations.length}`,
    '',
    '## Violations',
    '',
  ];
  if (report.violations.length === 0) lines.push('- None');
  for (const violation of report.violations) {
    lines.push(`- \`${violation.code}\`: ${violation.path ?? violation.slotId ?? 'unknown'}`);
  }
  lines.push('');
  return lines.join('\n');
}

function parseArguments(argv) {
  const options = { rootDir: process.cwd(), outDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root') options.rootDir = argv[index += 1];
    else if (argument === '--out-dir') options.outDir = argv[index += 1];
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const report = auditThemeAssets({ rootDir: options.rootDir });
  if (options.outDir) {
    const resolvedOutDir = path.resolve(options.rootDir, options.outDir);
    mkdirSync(resolvedOutDir, { recursive: true });
    writeFileSync(
      path.join(resolvedOutDir, 'theme-assets.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    writeFileSync(
      path.join(resolvedOutDir, 'theme-assets.md'),
      markdownSummary(report),
    );
  }
  process.stdout.write(`${JSON.stringify({
    slots: Object.keys(report.slots).length,
    violations: report.violations.length,
  })}\n`);
  if (report.violations.length > 0) process.exitCode = 1;
}

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) main();
