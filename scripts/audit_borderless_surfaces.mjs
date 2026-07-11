#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BORDER_PROPERTY_RE = /\b(borderWidth|borderTopWidth|borderBottomWidth|borderLeftWidth|borderRightWidth)\s*:\s*([^,;}]+)/g;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const STATE_HINT_RE = /focus|select|active|error|wrong|correct|warn|disabled|pressed|valid|invalid/i;

function parseArgs(argv) {
  const options = { reconcile: false, strict: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--reconcile') options.reconcile = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg.startsWith('--')) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      options[arg.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function slug(value) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'surface';
}

function shouldExclude(relativePath) {
  const normalizedPath = toPosix(relativePath);
  const segments = normalizedPath.split('/');
  const basename = segments.at(-1) ?? '';
  const stem = basename.replace(/\.[^.]+$/, '');
  if (segments.some((segment) => /^(?:admin|dev|lab|tester|tests?|__tests__)$/i.test(segment))) return true;
  if (/(?:^|_)(?:admin|dev|lab|tester)(?:_|$)/i.test(stem)) return true;
  if (/(?:Admin|Dev|Lab|Tester)(?:Modal|Screen|Panel|Preview|$)/.test(stem)) return true;
  if (/\.gen\.[^.]+$/i.test(basename)) return true;
  return false;
}

function listSourceFiles(root) {
  const files = [];
  for (const relativeDir of ['app', 'components']) {
    const absoluteDir = path.join(root, relativeDir);
    if (!fs.existsSync(absoluteDir)) continue;
    const visit = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const absolutePath = path.join(dir, entry.name);
        const relativePath = toPosix(path.relative(root, absolutePath));
        if (shouldExclude(relativePath)) continue;
        if (entry.isDirectory()) visit(absolutePath);
        else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolutePath);
      }
    };
    visit(absoluteDir);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function nearestAnchor(lines, lineIndex) {
  const start = Math.max(0, lineIndex - 20);
  const window = lines.slice(start, lineIndex + 1).join('\n');
  const testIds = [...window.matchAll(/testID\s*=\s*["'`]([^"'`]+)["'`]/g)];
  if (testIds.length > 0) return { kind: 'testID', value: testIds.at(-1)[1] };

  const linePrefix = lines[lineIndex].slice(0, Math.max(0, lines[lineIndex].search(/border(?:Top|Bottom|Left|Right)?Width/)));
  const styleMatches = [...linePrefix.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*\{/g)];
  if (styleMatches.length > 0) return { kind: 'style', value: styleMatches.at(-1)[1] };

  const borderIndent = lines[lineIndex].match(/^\s*/)?.[0].length ?? 0;
  for (let index = lineIndex - 1; index >= start; index -= 1) {
    const styleStart = lines[index].match(/^(\s*)([A-Za-z_$][\w$]*)\s*:\s*\{/);
    if (styleStart && styleStart[1].length < borderIndent) {
      return { kind: 'style', value: styleStart[2] };
    }
  }

  const filePrefix = lines.slice(0, lineIndex + 1).join('\n');
  const components = [
    ...filePrefix.matchAll(
      /function\s+([A-Z][A-Za-z0-9_$]*)|const\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    ),
  ];
  if (components.length > 0) {
    const match = components.at(-1);
    return { kind: 'component', value: match[1] ?? match[2] };
  }
  return { kind: 'line-context', value: `line-${lineIndex + 1}` };
}

function normalized(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function contextFingerprint(lines, lineIndex) {
  let start = lineIndex;
  for (let index = lineIndex; index >= Math.max(0, lineIndex - 10); index -= 1) {
    const line = lines[index];
    if (
      /style\s*=\s*\{\{|style\s*=\s*\[|^\s*\{\s*$|^\s*[A-Za-z_$][\w$]*\s*:\s*\{/.test(line)
    ) {
      start = index;
      break;
    }
  }
  const context = normalized(lines.slice(start, lineIndex + 1).join(' ')).replace(
    /border(?:Top|Bottom|Left|Right)?Width\s*:\s*[^,;}]+/g,
    'borderWidth:*',
  );
  return crypto.createHash('sha1').update(context).digest('hex').slice(0, 12);
}

function suggestedCategory(property, excerpt) {
  if (STATE_HINT_RE.test(excerpt)) return 'KEEP_STATE';
  if (property !== 'borderWidth') return 'KEEP_STRUCTURE';
  return 'MIGRATE';
}

function scanFile(root, absolutePath) {
  const file = toPosix(path.relative(root, absolutePath));
  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
  const entries = [];
  lines.forEach((line, lineIndex) => {
    for (const match of line.matchAll(BORDER_PROPERTY_RE)) {
      const property = match[1];
      const value = normalized(match[2]);
      if (value === '0' || value === '0.0') continue;
      const anchor = nearestAnchor(lines, lineIndex);
      if (/(^|[-_])(?:admin|dev|lab|tester)(?:[-_]|$)/i.test(anchor.value)) continue;
      const excerpt = normalized(line);
      const contextHash = contextFingerprint(lines, lineIndex);
      entries.push({
        file,
        line: lineIndex + 1,
        property,
        anchor,
        fingerprint: `${file}|${anchor.kind}:${anchor.value}|${property}:${value}|context:${contextHash}`,
        excerpt,
        suggestedCategory: suggestedCategory(property, excerpt),
      });
    }
  });
  return entries;
}

function makeId(entry, usedIds) {
  const base = `surface:${slug(entry.file)}:${slug(entry.anchor.value)}`;
  let suffix = 1;
  let id = `${base}:${suffix}`;
  while (usedIds.has(id)) {
    suffix += 1;
    id = `${base}:${suffix}`;
  }
  usedIds.add(id);
  return id;
}

function reconcile(scanEntries, previousLedger) {
  const previous = Array.isArray(previousLedger?.entries) ? previousLedger.entries : [];
  const usedIds = new Set(previous.map((entry) => entry.id));
  const consumedIds = new Set();
  const ambiguousIds = new Set();
  const entries = scanEntries.map((scanEntry) => {
    const exact = previous.filter(
      (entry) => !consumedIds.has(entry.id) && entry.fingerprint === scanEntry.fingerprint,
    );
    const anchorMatches = previous.filter(
      (entry) =>
        !consumedIds.has(entry.id) &&
        entry.file === scanEntry.file &&
        entry.property === scanEntry.property &&
        entry.anchor?.kind === scanEntry.anchor.kind &&
        entry.anchor?.value === scanEntry.anchor.value,
    );
    if (exact.length === 0 && anchorMatches.length > 1) {
      anchorMatches.forEach((entry) => ambiguousIds.add(entry.id));
    }
    const existing = exact.length === 1 ? exact[0] : anchorMatches.length === 1 ? anchorMatches[0] : null;
    if (existing) {
      consumedIds.add(existing.id);
      return {
        ...existing,
        file: scanEntry.file,
        property: scanEntry.property,
        anchor: scanEntry.anchor,
        fingerprint: scanEntry.fingerprint,
        lastSeenLine: scanEntry.line,
        excerpt: scanEntry.excerpt,
        suggestedCategory: scanEntry.suggestedCategory,
        scanState: 'present',
      };
    }
    return {
      id: makeId(scanEntry, usedIds),
      file: scanEntry.file,
      property: scanEntry.property,
      anchor: scanEntry.anchor,
      fingerprint: scanEntry.fingerprint,
      lastSeenLine: scanEntry.line,
      excerpt: scanEntry.excerpt,
      category: 'UNREVIEWED',
      suggestedCategory: scanEntry.suggestedCategory,
      tone: null,
      reason: '',
      status: 'pending',
      scanState: 'present',
      history: [],
    };
  });
  for (const existing of previous) {
    if (!consumedIds.has(existing.id)) {
      entries.push({
        ...existing,
        scanState:
          ambiguousIds.has(existing.id) || existing.scanState === 'ambiguous'
            ? 'ambiguous'
            : 'missing',
      });
    }
  }
  return {
    schemaVersion: 1,
    scope: ['app', 'components'],
    excludedKinds: ['admin', 'dev', 'lab', 'tester', 'test', 'generated'],
    entries: entries.sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertSafeOutput(root, outputPath) {
  const absoluteOutput = path.resolve(outputPath);
  const relative = path.relative(root, absoluteOutput);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Audit output must stay inside the supplied root: ${absoluteOutput}`);
  }
  if (fs.existsSync(path.join(root, 'package.json'))) {
    const relativePosix = toPosix(relative);
    if (!relativePosix.startsWith('docs/reports/') && !relativePosix.startsWith('.codex-tmp/')) {
      throw new Error(`Project audit output must use docs/reports or .codex-tmp: ${relativePosix}`);
    }
  }
}

function strictErrors(ledger) {
  const errors = [];
  for (const entry of ledger.entries) {
    if (entry.category === 'UNREVIEWED') {
      errors.push(`${entry.id}: unreviewed border`);
    }
    if (entry.scanState === 'ambiguous') {
      errors.push(`${entry.id}: ambiguous reconciliation`);
    }
    if (entry.category === 'MIGRATE' && entry.status === 'pending') {
      errors.push(`${entry.id}: migration is still pending (${entry.scanState})`);
    }
    if (entry.category === 'MIGRATE' && entry.status === 'migrated' && entry.scanState !== 'missing') {
      errors.push(`${entry.id}: migrated border is still present`);
    }
    if (
      /^KEEP_/.test(entry.category) &&
      entry.scanState === 'missing' &&
      !(entry.status === 'kept' && entry.reason && entry.history?.length > 0)
    ) {
      errors.push(`${entry.id}: kept border disappeared without explicit review`);
    }
  }
  return errors;
}

function addFingerprintOccurrences(entries) {
  const counts = new Map();
  return entries.map((entry) => {
    const occurrence = (counts.get(entry.fingerprint) ?? 0) + 1;
    counts.set(entry.fingerprint, occurrence);
    return { ...entry, fingerprint: `${entry.fingerprint}|occurrence:${occurrence}` };
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.root || !options['scan-output'] || !options.ledger || !options.reconcile) {
    throw new Error('Required: --root, --scan-output, --ledger, and --reconcile');
  }
  const root = path.resolve(options.root);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Invalid root: ${root}`);
  assertSafeOutput(root, options['scan-output']);
  assertSafeOutput(root, options.ledger);

  const entries = addFingerprintOccurrences(
    listSourceFiles(root).flatMap((file) => scanFile(root, file)),
  );
  const scan = { schemaVersion: 1, generatedAt: new Date().toISOString(), entries };
  const ledgerPath = path.resolve(options.ledger);
  const previousLedger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
    : null;
  const ledger = reconcile(entries, previousLedger);

  writeJson(path.resolve(options['scan-output']), scan);
  writeJson(ledgerPath, ledger);
  if (options.strict) {
    const errors = strictErrors(ledger);
    if (errors.length > 0) throw new Error(`Borderless surface strict audit failed:\n${errors.join('\n')}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
