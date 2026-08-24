import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const INVENTORY_PATH = path.join(PROJECT_ROOT, 'config', 'phone-state-legacy-inventory.v1.json');
const SOURCE_ROOTS = ['app', 'components', 'hooks', 'contexts', 'lib', 'modules'];
const DECLARATION_SOURCES = new Set([
  'app/cloud_sync.ts',
  'app/target_storage_keys.ts',
  'app/progress_events_client.ts',
  'app/economy/client_shard_operation_ledger.ts',
  'modules/learning-v2/progress/progress_outbox.ts',
  'app/friend_gift_outbox.ts',
]);

function sourceFiles(rootDir) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name)) files.push(absolute);
    }
  };
  for (const relative of SOURCE_ROOTS) {
    const absolute = path.join(rootDir, relative);
    if (fs.existsSync(absolute)) visit(absolute);
  }
  return files;
}

function looksLikeStorageKey(value) {
  return value.length >= 3
    && value.length <= 240
    && /^[A-Za-z@][A-Za-z0-9_.:@/\-]*$/.test(value)
    && !['true', 'false', 'null', 'undefined'].includes(value);
}

function addCandidate(map, value, source, kind = 'key') {
  if (!looksLikeStorageKey(value)) return;
  const id = `${kind}:${value}`;
  const current = map.get(id) ?? { kind, value, sources: new Set() };
  current.sources.add(source.replaceAll('\\', '/'));
  map.set(id, current);
}

function literalValues(text) {
  return [...text.matchAll(/(['"])([A-Za-z@][A-Za-z0-9_.:@/\-]{2,239})\1/g)].map((match) => match[2]);
}

function discoverCandidates(rootDir = PROJECT_ROOT) {
  const candidates = new Map();
  for (const absolute of sourceFiles(rootDir)) {
    const relative = path.relative(rootDir, absolute).replaceAll('\\', '/');
    const text = fs.readFileSync(absolute, 'utf8');

    for (const match of text.matchAll(/AsyncStorage\.(?:getItem|setItem|removeItem)\(\s*(['"])([^'"\r\n]+)\1/g)) {
      addCandidate(candidates, match[2], relative);
    }
    for (const match of text.matchAll(/AsyncStorage\.multi(?:Get|Remove)\(\s*\[([\s\S]{0,8000}?)\]\s*\)/g)) {
      for (const value of literalValues(match[1])) addCandidate(candidates, value, relative);
    }

    if (DECLARATION_SOURCES.has(relative)) {
      for (const match of text.matchAll(/(?:export\s+)?(?:const|let)\s+([A-Z][A-Z0-9_]*)[^=]*=\s*(['"])([^'"\r\n]+)\2/g)) {
        if (/(?:KEY|PREFIX|OUTBOX|LEDGER|QUEUE|SNAPSHOT)/.test(match[1])) {
          addCandidate(candidates, match[3], relative, match[1].includes('PREFIX') ? 'prefix' : 'key');
        }
      }
      for (const match of text.matchAll(/(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)[^=]*=\s*\([^)]*\)[^=]*=>\s*`([^`$]{3,})\$\{/g)) {
        if (/(?:KEY|PREFIX|OUTBOX|LEDGER|QUEUE|SNAPSHOT)/.test(match[1])) {
          addCandidate(candidates, match[2], relative, 'prefix');
        }
      }
      for (const match of text.matchAll(/scopedOrLegacyKey\(\s*(['"])([^'"\r\n]+)\1/g)) {
        addCandidate(candidates, match[2], relative);
      }
      for (const match of text.matchAll(/const\s+raw\s*=\s*`([^`$]{3,})\$\{/g)) {
        addCandidate(candidates, match[1], relative, 'prefix');
      }
      if (relative === 'app/progress_events_client.ts') {
        for (const match of text.matchAll(/const\s+(PROGRESS_[A-Z0-9_]+_KEY)[^=]*=\s*(['"])([^'"\r\n]+)\2/g)) {
          addCandidate(candidates, `${match[3]}:`, relative, 'prefix');
        }
      }
    }

    if (relative === 'app/cloud_sync.ts') {
      const syncBlock = text.match(/export const SYNC_KEYS\s*=\s*\[([\s\S]*?)\n\] as const;/);
      if (syncBlock) {
        for (const value of literalValues(syncBlock[1])) addCandidate(candidates, value, relative);
      }
      for (const prefix of [
        'lesson_progress_v2::',
        'lesson_session_local_v2::',
        'lesson_rewards_v2::',
        'level_exams_v2::',
        'mistake_practice_v2::',
        'personal_practice_v2::',
        'cloud_sync_v2::',
        'daily_phrase_v2::',
        'flashcards_v2::',
        'target_stats_v2::',
        'achievements_v2::',
      ]) {
        addCandidate(candidates, prefix, 'app/target_storage_keys.ts', 'prefix');
      }
    }
  }
  return [...candidates.values()]
    .map((candidate) => ({ ...candidate, sources: [...candidate.sources].sort() }))
    .sort((left, right) => left.kind.localeCompare(right.kind) || left.value.localeCompare(right.value));
}

function readInventory(rootDir) {
  const inventoryPath = path.join(rootDir, 'config', 'phone-state-legacy-inventory.v1.json');
  if (!fs.existsSync(inventoryPath)) {
    return { schemaVersion: null, rows: [], prefixRules: [] };
  }
  return JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
}

function validPolicy(row, ownerField) {
  const allowedFields = new Set([
    ownerField,
    'domain',
    'scope',
    'reducer',
    'importSource',
    'legacyMirror',
    'sensitivity',
  ]);
  return row
    && Object.keys(row).every((key) => allowedFields.has(key))
    && typeof row[ownerField] === 'string'
    && row[ownerField].length >= 3
    && typeof row.domain === 'string'
    && /^(portable|device_only|external)$/.test(row.scope)
    && /^(sum_unique|max|union|date_union|field_register|or_set|composite_economy|none)$/.test(row.reducer)
    && Array.isArray(row.importSource)
    && row.importSource.every((source) => typeof source === 'string')
    && typeof row.legacyMirror === 'boolean'
    && /^(low|personal|sensitive)$/.test(row.sensitivity);
}

export function auditPhoneStateLegacyInventory({ rootDir = PROJECT_ROOT } = {}) {
  const candidates = discoverCandidates(rootDir);
  const inventory = readInventory(rootDir);
  const rows = Array.isArray(inventory.rows) ? inventory.rows : [];
  const prefixRules = Array.isArray(inventory.prefixRules) ? inventory.prefixRules : [];
  const invalidRows = [
    ...rows.filter((row) => !validPolicy(row, 'key')),
    ...prefixRules.filter((row) => !validPolicy(row, 'prefix')),
  ];
  const duplicatesInManifest = [
    ...rows.map((row) => `key:${row.key}`),
    ...prefixRules.map((row) => `prefix:${row.prefix}`),
  ].filter((value, index, all) => all.indexOf(value) !== index);

  const matches = (candidate) => candidate.kind === 'prefix'
    ? prefixRules.filter((row) => candidate.value.startsWith(row.prefix))
    : [
      ...rows.filter((row) => row.key === candidate.value),
      ...prefixRules.filter((row) => candidate.value.startsWith(row.prefix)),
    ];
  const unknownKeys = candidates.filter((candidate) => candidate.kind === 'key' && matches(candidate).length === 0);
  const unknownPrefixes = candidates.filter((candidate) => candidate.kind === 'prefix' && matches(candidate).length === 0);
  const duplicateOwners = [
    ...duplicatesInManifest,
    ...candidates.filter((candidate) => matches(candidate).length > 1).map((candidate) => `${candidate.kind}:${candidate.value}`),
  ];
  return {
    candidates,
    inventory,
    invalidRows,
    unknownKeys,
    unknownPrefixes,
    duplicateOwners: [...new Set(duplicateOwners)].sort(),
  };
}

function printCandidate(candidate) {
  return `${candidate.kind}\t${candidate.value}\t${candidate.sources.join(',')}`;
}

function main() {
  const option = process.argv[2];
  if (!['--print-candidates', '--check'].includes(option) || process.argv.length !== 3) {
    console.error('Usage: node scripts/guard_phone_state_legacy_inventory.mjs --print-candidates|--check');
    process.exitCode = 2;
    return;
  }
  const report = auditPhoneStateLegacyInventory();
  if (option === '--print-candidates') {
    for (const candidate of report.candidates) console.log(printCandidate(candidate));
    console.log(`candidates=${report.candidates.length}`);
    return;
  }

  for (const candidate of [...report.unknownKeys, ...report.unknownPrefixes]) {
    console.log(`UNKNOWN\t${printCandidate(candidate)}`);
  }
  for (const row of report.invalidRows) console.log(`INVALID_POLICY\t${JSON.stringify(row)}`);
  for (const owner of report.duplicateOwners) console.log(`DUPLICATE_OWNER\t${owner}`);
  console.log(
    `unknownKeys=${report.unknownKeys.length} unknownPrefixes=${report.unknownPrefixes.length} duplicateOwners=${report.duplicateOwners.length}`,
  );
  if (
    report.inventory.schemaVersion !== 'phone-state-legacy-inventory.v1'
    || report.invalidRows.length > 0
    || report.unknownKeys.length > 0
    || report.unknownPrefixes.length > 0
    || report.duplicateOwners.length > 0
  ) {
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
