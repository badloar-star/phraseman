// PM-210 — каждая фоновая работа клиента обязана быть в реестре.
//
// зачем: PM-210 — фоновая работа (таймеры-циклы, подписки на AppState,
// отложенные прогревы корня, сетевые аренды, координаторы foreground-задач,
// системные фоновые задачи) раньше появлялась «по месту», и никто не видел
// суммарной нагрузки: у удалённых фич оставались живые циклы. Реестр
// docs/phraseman-2.0/evidence/PM-210_background_jobs.md держит для каждой
// работы priority, owner, trigger, TTL, dedupe key, cancellation, budget и
// влияние на очереди. Проба сканирует код и роняет прогон, если в файле
// появилась фоновая работа, которой нет в реестре (или стало больше, чем
// записано). Неизвестное пишется словом unknown, а не нулём.
//
// Запуск: npx tsx tests/pm210_background_jobs_registry.probe.ts
//         npx tsx tests/pm210_background_jobs_registry.probe.ts --dump   (текущие счётчики)
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '..');
// PM210_REGISTRY — только для самопроверки пробы на испорченной копии реестра.
const REGISTRY = process.env.PM210_REGISTRY ?? 'docs/phraseman-2.0/evidence/PM-210_background_jobs.md';
const SCAN_DIRS = ['app', 'components', 'modules', 'hooks'] as const;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'graphify-out', '__mocks__']);
const FIELD_NAMES = ['job', 'priority', 'owner', 'trigger', 'ttl', 'dedupe', 'cancellation', 'budget', 'queues'] as const;

export type JobKind =
  | 'setInterval' | 'appState' | 'runtimeAppState' | 'foregroundTask'
  | 'coalescedRunner' | 'networkLease' | 'afterInteractions' | 'backgroundTask';
const SCANNED_KINDS: readonly JobKind[] = [
  'setInterval', 'appState', 'runtimeAppState', 'foregroundTask',
  'coalescedRunner', 'networkLease', 'afterInteractions', 'backgroundTask',
];
const BACKGROUND_TASK_MODULES = /^(expo-task-manager|expo-background-fetch|expo-background-task)$/;

function listSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(abs);
    }
  };
  for (const dir of SCAN_DIRS) walk(path.join(root, dir));
  return out;
}

function classify(call: ts.CallExpression, sf: ts.SourceFile, rel: string): JobKind | null {
  const callee = call.expression;
  const name = ts.isIdentifier(callee) ? callee.text
    : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
  const owner = ts.isPropertyAccessExpression(callee) ? callee.expression.getText(sf) : '';
  if (name === 'setInterval') return 'setInterval';
  if (name === 'addEventListener' && owner === 'AppState') return 'appState';
  if (name === 'subscribe' && owner === 'runtimeAppStateStore') return 'runtimeAppState';
  if (name === 'scheduleCoalescedForegroundTask') return 'foregroundTask';
  if (name === 'createCoalescedAsyncRunner') return 'coalescedRunner';
  if (name === 'withBackgroundNetworkLease') return 'networkLease';
  // Отложенная работа корня и не-экранных модулей; в экранах (.tsx) это
  // обычная отсрочка UI после анимации перехода, а не фоновая работа.
  if (name === 'runAfterInteractions' && owner === 'InteractionManager'
    && (rel === 'app/_layout.tsx' || rel.endsWith('.ts'))) return 'afterInteractions';
  if (/^(TaskManager|BackgroundFetch|BackgroundTask)$/.test(owner)) return 'backgroundTask';
  return null;
}

export function scanBackgroundJobs(): Map<string, number> {
  const found = new Map<string, number>();
  for (const abs of listSourceFiles()) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const source = readFileSync(abs, 'utf8');
    if (!/setInterval|AppState|runtimeAppStateStore|scheduleCoalescedForegroundTask|createCoalescedAsyncRunner|withBackgroundNetworkLease|runAfterInteractions|TaskManager|BackgroundFetch|BackgroundTask|expo-background|expo-task-manager/.test(source)) continue;
    const sf = ts.createSourceFile(abs, source, ts.ScriptTarget.Latest, true,
      abs.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const bump = (kind: JobKind): void => {
      const key = `${rel}|${kind}`;
      found.set(key, (found.get(key) ?? 0) + 1);
    };
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const kind = classify(node, sf, rel);
        if (kind) bump(kind);
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)
        && BACKGROUND_TASK_MODULES.test(node.moduleSpecifier.text)) bump('backgroundTask');
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

type RegistryRow = Readonly<{ file: string; kind: string; count: number; fields: Record<string, string>; line: number }>;

function parseRegistry(): RegistryRow[] {
  const text = readFileSync(path.join(root, REGISTRY), 'utf8');
  const rows: RegistryRow[] = [];
  // Строки берём ТОЛЬКО из раздела «## Реестр» (остальные таблицы документа — пояснения).
  let inRegistry = false;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line.startsWith('## ')) { inRegistry = line === '## Реестр'; return; }
    if (!inRegistry || !line.startsWith('| `')) return;
    const cells = line.slice(1, -1).split(' | ').map((cell) => cell.trim());
    if (cells.length !== 3 + FIELD_NAMES.length) {
      throw new Error(`${REGISTRY}:${index + 1}: ожидалось ${3 + FIELD_NAMES.length} колонок, найдено ${cells.length}`);
    }
    const [file, kind, count, ...rest] = cells;
    const fields: Record<string, string> = {};
    FIELD_NAMES.forEach((name, i) => { fields[name] = rest[i] ?? ''; });
    rows.push({
      file: file!.replace(/`/g, ''),
      kind: kind!.replace(/`/g, ''),
      count: Number(count),
      fields,
      line: index + 1,
    });
  });
  return rows;
}

const found = scanBackgroundJobs();

if (process.argv.includes('--dump')) {
  for (const [key, count] of [...found.entries()].sort()) console.log(`${key}|${count}`);
  process.exit(0);
}

const rows = parseRegistry();
const problems: string[] = [];
const warnings: string[] = [];
const registered = new Map<string, number>();

for (const row of rows) {
  const key = `${row.file}|${row.kind}`;
  if (registered.has(key)) problems.push(`${REGISTRY}:${row.line}: дубль строки ${key}`);
  registered.set(key, row.count);
  if (!Number.isInteger(row.count) || row.count < 1) problems.push(`${REGISTRY}:${row.line}: count должен быть целым ≥ 1`);
  for (const name of FIELD_NAMES) {
    const value = row.fields[name] ?? '';
    // Пустое поле или «0» вместо честного unknown — реестр врёт молча.
    if (value === '' || value === '—' || value === '-') problems.push(`${REGISTRY}:${row.line}: пустое поле ${name} (пиши unknown)`);
    if (value === '0') problems.push(`${REGISTRY}:${row.line}: поле ${name}=0 — неизвестное пишется unknown`);
  }
}

for (const [key, count] of found) {
  const [file, kind] = key.split('|') as [string, JobKind];
  const expected = registered.get(key);
  if (expected === undefined) {
    problems.push(`${file}: фоновая работа ${kind} ×${count} не зарегистрирована в ${REGISTRY}`);
  } else if (count > expected) {
    problems.push(`${file}: ${kind} стало ${count}, в реестре ${expected} — зарегистрируй новую работу`);
  } else if (count < expected) {
    warnings.push(`${file}: ${kind} стало ${count}, в реестре ${expected} — уменьши строку реестра`);
  }
}
for (const row of rows) {
  const key = `${row.file}|${row.kind}`;
  if ((SCANNED_KINDS as readonly string[]).includes(row.kind) && !found.has(key)) {
    warnings.push(`${row.file}: ${row.kind} в коде больше нет — удали строку реестра (${REGISTRY}:${row.line})`);
  }
}

for (const warning of warnings) console.warn(`[PM-210] warn: ${warning}`);
if (problems.length > 0) {
  console.error('[PM-210] background jobs registry:');
  for (const problem of problems) console.error(`  - ${problem}`);
}
assert.equal(problems.length, 0, `PM-210: ${problems.length} проблем реестра фоновых работ (см. выше)`);

const totalJobs = [...found.values()].reduce((sum, n) => sum + n, 0);
console.log(`PM-210 PROBE PASS: registeredRows=${rows.length} scannedSites=${totalJobs} files=${new Set([...found.keys()].map((k) => k.split('|')[0])).size} warnings=${warnings.length}`);
