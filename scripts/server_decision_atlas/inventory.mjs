import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE_ROOTS = ['app', 'modules', 'components', 'functions/src', 'admin/v2'];
const TEST_ROOTS = ['tests', 'functions/src'];
const EXCLUDED_SEGMENTS = new Set(['node_modules', '.git', '.codex-tmp', '.superpowers', 'build', 'dist', 'coverage']);
const SOURCE_FILE = /\.(?:[cm]?js|tsx?|html)$/u;
const TEST_FILE = /(?:\.test\.[cm]?[jt]sx?$|_contract\.[cm]?[jt]sx?$|_gate\.[cm]?[jt]sx?$)/u;

const SERVER_PATTERNS = [
  ['callable', /(?:export\s+const\s+|exports\.)([A-Za-z0-9_]+)\s*=\s*[\s\S]{0,180}?\b(?:onCall|https\.onCall)\s*\(/gu],
  ['http', /(?:export\s+const\s+|exports\.)([A-Za-z0-9_]+)\s*=\s*[\s\S]{0,180}?\bonRequest\s*\(/gu],
  ['schedule', /(?:export\s+const\s+|exports\.)([A-Za-z0-9_]+)\s*=\s*[\s\S]{0,180}?\bonSchedule\s*\(/gu],
  ['firestore-trigger', /(?:export\s+const\s+|exports\.)([A-Za-z0-9_]+)\s*=\s*[\s\S]{0,180}?\bonDocument(?:Created|Updated|Written|Deleted)\s*\(/gu],
];
const FIRESTORE_OPERATION = /\b(getDoc|getDocs|setDoc|updateDoc|deleteDoc|addDoc|onSnapshot|runTransaction|writeBatch)\s*\(/gu;
const NAMESPACED_FIRESTORE_OPERATION = /\.(collection|doc|get|set|update|delete|add|onSnapshot|runTransaction|batch)\s*\(/gu;
const CLIENT_HTTP_OPERATION = /\bfetch\s*\(/gu;
const MARKERS = {
  optimistic: /\boptimistic\b/iu,
  offline: /\boffline\b|NetInfo|network.*(?:unavailable|failure)/iu,
  queue: /\bqueue(?:d|ing)?\b|outbox/iu,
  retry: /\bretry\b|attempts?/iu,
  idempotency: /idempotency(?:Key)?|idempotent/iu,
  receipt: /\breceipt\b/iu,
};

function shouldSkip(entry) {
  return EXCLUDED_SEGMENTS.has(entry) || entry.startsWith('.');
}

function walk(root, current = '') {
  const directory = join(root, current);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (shouldSkip(entry.name)) return [];
      const child = join(current, entry.name).replaceAll('\\', '/');
      if (entry.isDirectory()) return walk(root, child);
      return SOURCE_FILE.test(entry.name) ? [child] : [];
    })
    .sort((a, b) => a.localeCompare(b));
}

function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function snippetAt(source, offset) {
  const start = source.lastIndexOf('\n', offset) + 1;
  const end = source.indexOf('\n', offset);
  return source.slice(start, end === -1 ? source.length : end).trim().slice(0, 260);
}

function markerEvidence(source, sourcePath) {
  return Object.entries(MARKERS).map(([name, matcher]) => {
    const match = matcher.exec(source);
    return match
      ? { name, state: 'evidence-found', sourcePath, line: lineAt(source, match.index) }
      : { name, state: 'not-established-by-static-scan' };
  });
}

function matchedParenthesis(source, start) {
  const opening = source.indexOf('(', start);
  if (opening === -1) return null;
  let depth = 0;
  let quote = '';
  for (let index = opening; index < source.length && index < opening + 1400; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(opening + 1, index);
    }
  }
  return null;
}

function clientCallableMatches(source) {
  const matches = [];
  let cursor = 0;
  while (true) {
    const index = source.indexOf('httpsCallable', cursor);
    if (index === -1) return matches;
    const argumentsText = matchedParenthesis(source, index);
    if (argumentsText) {
      const quoted = [...argumentsText.matchAll(/['"]([A-Za-z][A-Za-z0-9_]*)['"]/gu)];
      const last = quoted.at(-1);
      if (last) matches.push({ name: last[1], index });
    }
    cursor = index + 'httpsCallable'.length;
  }
}

function makeRecord({ routeType, name, sourcePath, line, snippet, source }) {
  return {
    id: `${routeType}:${sourcePath}:${line}:${name}`,
    routeType,
    name,
    sourcePath,
    line,
    snippet,
    markers: markerEvidence(source, sourcePath),
    evidence: [{ kind: 'source', sourcePath, line, label: 'Найдено в исходном коде' }],
  };
}

function scanSourceFile(root, sourcePath) {
  const absolute = join(root, sourcePath);
  const source = readFileSync(absolute, 'utf8');
  const records = [];
  if (sourcePath.startsWith('functions/src/') && !TEST_FILE.test(sourcePath)) {
    for (const [routeType, pattern] of SERVER_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        records.push(makeRecord({ routeType, name: match[1], sourcePath, line: lineAt(source, match.index), snippet: snippetAt(source, match.index), source }));
      }
    }
  }
  if (!sourcePath.startsWith('functions/src/') && !TEST_FILE.test(sourcePath)) {
    for (const match of clientCallableMatches(source)) {
      records.push(makeRecord({ routeType: 'client-callable', name: match.name, sourcePath, line: lineAt(source, match.index), snippet: snippetAt(source, match.index), source }));
    }
    FIRESTORE_OPERATION.lastIndex = 0;
    for (const match of source.matchAll(FIRESTORE_OPERATION)) {
      records.push(makeRecord({ routeType: 'client-firestore', name: match[1], sourcePath, line: lineAt(source, match.index), snippet: snippetAt(source, match.index), source }));
    }
    if (/@react-native-firebase\/firestore|\bfirestore\s*\(\)/u.test(source)) {
      NAMESPACED_FIRESTORE_OPERATION.lastIndex = 0;
      for (const match of source.matchAll(NAMESPACED_FIRESTORE_OPERATION)) {
        records.push(makeRecord({ routeType: 'client-firestore', name: `firestore.${match[1]}`, sourcePath, line: lineAt(source, match.index), snippet: snippetAt(source, match.index), source }));
      }
    }
    CLIENT_HTTP_OPERATION.lastIndex = 0;
    for (const match of source.matchAll(CLIENT_HTTP_OPERATION)) {
      records.push(makeRecord({ routeType: 'client-http', name: 'fetch', sourcePath, line: lineAt(source, match.index), snippet: snippetAt(source, match.index), source }));
    }
  }
  return records;
}

function findTestEvidence(root, records) {
  const testFiles = [...new Set(TEST_ROOTS.flatMap((directory) => walk(join(root, directory)).map((file) => join(directory, file).replaceAll('\\', '/'))))]
    .filter((file) => TEST_FILE.test(file));
  const testSources = testFiles.map((sourcePath) => ({ sourcePath, source: readFileSync(join(root, sourcePath), 'utf8') }));
  for (const record of records) {
    const basename = record.sourcePath.split('/').at(-1)?.replace(/\.[^.]+$/u, '') ?? '';
    for (const test of testSources) {
      if (!test.source.includes(record.name) && (!basename || !test.source.includes(basename))) continue;
      const kind = /contract|guard|gate/iu.test(test.sourcePath) ? 'contract-source' : 'test-source';
      record.evidence.push({ kind, sourcePath: test.sourcePath, line: 1, label: kind === 'contract-source' ? 'Найден связанный contract/guard-файл' : 'Найден связанный тестовый файл' });
      break;
    }
  }
}

export function scanServerDecisionAtlasSources(root = process.cwd()) {
  const files = SOURCE_ROOTS.flatMap((directory) => walk(join(root, directory)).map((file) => join(directory, file).replaceAll('\\', '/')));
  const records = files.flatMap((sourcePath) => scanSourceFile(root, sourcePath));
  const deduped = [...new Map(records.map((record) => [record.id, record])).values()].sort((a, b) => a.id.localeCompare(b.id));
  findTestEvidence(root, deduped);
  const serverExports = deduped.filter((record) => ['callable', 'http', 'schedule', 'firestore-trigger'].includes(record.routeType)).length;
  return { records: deduped, sourceFiles: files.length, serverExports, root: relative(root, root) || '.' };
}
