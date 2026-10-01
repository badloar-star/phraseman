import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv2020 from 'ajv/dist/2020';
import { MIGRATION_EXPORT_FORMAT, runMigrationDryRun } from './dry_run';

/*
 * Account V2, Пакет 5 — сторож «dry-run не ходит в сеть и не трогает Firestore»
 * и сверка отчёта со схемой docs/reports/accounts-v2-migration-dry-run.schema.json.
 *
 * зачем: обещание «ничего не пишет в облако» должно держаться кодом, а не
 * комментарием. Проверяется ВСЁ замыкание импортов ядра (включая модули ядра
 * Account V2, от которых зависит dry-run) и CLI-обёртка.
 */

const REPO = join(__dirname, '..', '..', '..');
const FUNCTIONS_SRC = join(REPO, 'functions', 'src');

function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const found = new Set<string>();
  const patterns = [/\bfrom\s+['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g, /^\s*import\s+['"]([^'"]+)['"]/gm];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) found.add(match[1]);
  }
  return [...found].sort();
}

const CORE_CLOSURE: Readonly<Record<string, readonly string[]>> = {
  'accounts_v2_migration/dry_run.ts': ['../accounts_v2_contract', '../accounts_v2_merge', '../accounts_v2_validate', './inventory',
    './ledger', './report', './srs_memory', 'crypto'],
  'accounts_v2_migration/inventory.ts': [],
  'accounts_v2_migration/ledger.ts': [],
  'accounts_v2_migration/report.ts': ['../accounts_v2_contract', '../accounts_v2_merge', './inventory', './ledger', 'crypto'],
  'accounts_v2_migration/srs_memory.ts': ['../accounts_v2_contract'],
  'accounts_v2_contract.ts': ['crypto'],
  // зачем (7C): названия наборов — чистый модуль слияния, тоже без сети.
  'accounts_v2_merge.ts': ['./accounts_v2_contract', './accounts_v2_library_titles'],
  'accounts_v2_library_titles.ts': ['./accounts_v2_contract'],
  'accounts_v2_validate.ts': ['./accounts_v2_contract'],
};

// зачем: ищем имена модулей и сетевые вызовы, а не слово «firebase» в имени
// поля (`firebaseAuthUid` — поле старого документа в таблице инвентаря).
const FORBIDDEN = new RegExp([
  String.raw`['"](firebase-admin|firebase-functions|firebase|googleapis|@firebase/[^'"/]+|@google-cloud/[^'"/]+)(/[^'"]*)?['"]`,
  String.raw`['"](node:)?(net|http|https|http2|dgram|tls)['"]`,
  String.raw`https?://`, String.raw`\bfetch\s*\(`, 'XMLHttpRequest', 'WebSocket', String.raw`\bgetFirestore\b`, String.raw`\binitializeApp\b`,
].join('|'));

describe('accounts_v2_migration — без сети и Firestore', () => {
  it('сам сторож ловит сетевые импорты и не ловит имя поля firebaseAuthUid', () => {
    for (const bad of ["import { getFirestore } from 'firebase-admin/firestore';", "require('firebase-functions/v2')",
      "import x from 'https';", "await fetch(url)", "import('node:http')", "from '@google-cloud/storage'"]) {
      expect(bad).toMatch(FORBIDDEN);
    }
    expect("exact: ['firebaseAuthUid', 'linkedAuth']").not.toMatch(FORBIDDEN);
  });

  it.each(Object.entries(CORE_CLOSURE))('%s импортирует только разрешённое', (relative, allowed) => {
    expect(importsOf(join(FUNCTIONS_SRC, relative))).toEqual([...allowed].sort());
  });

  it.each(Object.keys(CORE_CLOSURE))('%s не упоминает firebase/http/fetch', (relative) => {
    const code = readFileSync(join(FUNCTIONS_SRC, relative), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(FORBIDDEN);
  });

  it('CLI читает и пишет только локальные файлы', () => {
    const file = join(REPO, 'scripts', 'accounts-v2-migration-dry-run.mjs');
    expect(importsOf(file)).toEqual(['node:fs', 'node:path', 'node:process', 'node:url', 'tsx/cjs/api']);
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(FORBIDDEN);
  });
});

describe('accounts_v2_migration — отчёт соответствует схеме', () => {
  const schema = JSON.parse(readFileSync(join(REPO, 'docs', 'reports', 'accounts-v2-migration-dry-run.schema.json'), 'utf8')) as object;
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

  it.each([
    ['пустой', { format: MIGRATION_EXPORT_FORMAT, uid: 'u-1', user: null }],
    ['смешанный', {
      format: MIGRATION_EXPORT_FORMAT, uid: 'u-2',
      user: {
        shards: 5, premium: true, mystery: 1,
        progress: { lesson1_best_score: '4', user_total_xp: '10', flashcards_v1: '[{"id":"a","en":"a","ru":"а","uk":"а"}]', lesson2_best_score: 'x' },
      },
      subcollections: { shard_log: [{ id: 'l', data: {} }], flashcard_pages: [{ id: 'en_0000', data: { target: 'en', index: 0, count: 0, cards: '[]', updatedAt: 1 } }] },
    }],
    ['чужой владелец', { format: MIGRATION_EXPORT_FORMAT, uid: 'u-3', user: { canonicalStableId: 'other' } }],
    ['руны, SRS, нет домена, маска', {
      format: MIGRATION_EXPORT_FORMAT, uid: 'u-4',
      user: {
        stars: { balance: 7 }, v2_access_stars: 3, identityHidden: false,
        progress: {
          flashcards_v1: '[{"id":"a","en":"a","ru":"а","uk":"а"}]', streak_freeze: '1', streak_count: '3', user_name: 'x',
          flashcards_swipe_memory_v1: '{"saved:all:a":{"seen":1,"lastSeenAt":1700000000000},"official:p:b":{"seen":1,"lastSeenAt":5}}',
          'x:someone@example.com': '1',
        },
      },
    }],
  ])('%s', (_name, input) => {
    const { report } = runMigrationDryRun(input);
    const ok = validate(report);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });
});
