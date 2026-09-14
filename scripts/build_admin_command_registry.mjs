import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const surfacePath = path.join(root, 'admin/v2/legacy.html');
const surface = fs.readFileSync(surfacePath, 'utf8');
const names = [...surface.matchAll(/httpsCallable\([^,]+,\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g)]
  .map((match) => match[1]);
const uniqueNames = [...new Set(names)].sort();

function collectFunctionSources(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFunctionSources(full));
    else if (/\.(ts|js)$/.test(entry.name)) files.push(full);
  }
  return files;
}
const sourceRoots = ['functions/src', 'functions-admin', 'functions-english-test', 'functions-content/lib', 'functions-max/lib'];
const functionSource = sourceRoots.flatMap((sourceRoot) => collectFunctionSources(path.join(root, sourceRoot)))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

const requiredFields = [
  ['actorRole', 'No source proof recorded by inventory generator'],
  ['inputValidation', 'No source proof recorded by inventory generator'],
  ['idempotency', 'No source proof recorded by inventory generator'],
  ['previewConfirm', 'No source proof recorded by inventory generator'],
  ['auditEvent', 'No source proof recorded by inventory generator'],
  ['rollback', 'No source proof recorded by inventory generator'],
  ['tests', 'No source proof recorded by inventory generator'],
];

const commands = uniqueNames.map((name) => {
  const sourceExported = functionSource.includes(name);
  const blockers = [
    'human owner and role evidence not linked',
    'input schema/validation evidence not linked',
    'idempotency contract not linked',
    'preview/confirm semantics not linked',
    'audit event evidence not linked',
    'rollback/runbook evidence not linked',
    'focused test evidence not linked',
  ];
  return {
    name,
    sourceSurface: 'admin/v2/legacy.html',
    functionSourceMatch: sourceExported,
    mutationCandidate: /admin|publish|set|grant|revoke|delete|refund|repair|upsert|toggle|activate|deactivate|send/i.test(name),
    actorRole: 'BLOCKED — prove actor/role enforcement',
    inputValidation: 'BLOCKED — link schema and rejection tests',
    idempotency: 'BLOCKED — link operation/idempotency contract',
    previewConfirm: 'BLOCKED — prove preview/confirm or document why not applicable',
    auditEvent: 'BLOCKED — link immutable audit evidence',
    rollback: 'BLOCKED — link rollback/runbook or explicit non-reversibility decision',
    tests: 'BLOCKED — link focused callable/UI contract tests',
    blockers,
  };
});

const registry = {
  schemaVersion: 1,
  generatedAt: 'generated-at-run-time; intentionally omitted from the committed contract',
  sourceSurface: 'admin/v2/legacy.html',
  functionSourceRoots: sourceRoots,
  requiredSafetyFields: Object.fromEntries(requiredFields),
  commands,
};

const outputPath = path.join(root, 'docs/admin/ADMIN_COMMAND_REGISTRY.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`admin_command_registry_ok commands=${commands.length} output=${path.relative(root, outputPath)}`);
