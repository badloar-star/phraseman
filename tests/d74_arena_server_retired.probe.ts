// D74/D78 ратчет-проба: серверная Арена УДАЛЕНА из кода, пул заданий Шпиля сохранён.
// зачем: D78 (владелец, 2026-09-30) — «удаляемое удаляем, а не отключаем».
// Надгробия D74 (arena_retired.ts) сняты вместе с реализацией: ни одного
// arena-callable/cron/trigger в точке входа деплоя, кроме 8 админских функций
// пула, которым питается Шпиль. Заодно D81: текстовый репетитор tutorText* и
// dev-выдачи (devRunesGrant, devShardsGrant, referralDevGrantSpin) не возвращаются.
// Проба падает, если кто-то вернёт живую Арену/заглушки или снимет пул Шпиля.
// Запуск: npx tsx tests/d74_arena_server_retired.probe.ts (exit 0 = PASS).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'functions/src');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:'"`])\/\/[^\n]*/gu, '$1');

// Шпиль читает arena_v2_config/current.targetPublications и публикации пула
// (spire_pack_build.ts) — эти админские функции ведут пул и должны жить.
const SPIRE_POOL_ALLOWLIST = [
  'adminArenaConfigGet', 'adminArenaConfigSet',
  'adminArenaContentStatus', 'adminArenaContentValidate',
  'adminArenaPublicationStage', 'adminArenaPublicationStatus',
  'adminArenaPublicationActivate', 'adminArenaPublicationRollback',
];
const SPIRE_EXPORTS = [
  'spireReportSteps', 'spireJoinRoom', 'spireFinalizeCron', 'spirePackWeeklyCron',
  'adminSpirePackBuild', 'spireZoneWarningCron', 'adminSpireConfigGet', 'adminSpireConfigSet',
];
// Библиотеки пула, которые импортирует Шпиль и админка пула.
const KEPT_POOL_MODULES = [
  'arena_v2_core', 'arena_target_registry', 'arena_target_quality', 'arena_stars_v3',
  'arena_config_contract', 'arena_expansion_core', 'arena_target_publication_bridge',
  'arena_content_generation', 'tournament_core', 'tournament_pool_publication',
  'admin_arena_config', 'admin_arena_content', 'admin_arena_publication',
];
// Реализация серверной Арены и её эксклюзивные зависимости (D78).
const DELETED_ARENA_MODULES = [
  'arena_v2', 'arena_expansion', 'arena_retired', 'arena_bot_identity', 'arena_duel_v3',
  'arena_rank_engine', 'arena_tier_rewards', 'arena_v2_receipt_contract',
];
// D81: текстовый репетитор и dev-выдачи.
const DELETED_D81_MODULES = [
  'tutor_text_turn', 'tutor_text_topics', 'tutor_text_prompt', 'tutor_text_goal_catalog',
  'tutor_text_memory_controls', 'dev_runes_grant', 'dev_shards_grant',
  'referral_dev_grant', 'referral_dev_grant_policy',
];
const DELETED_D81_EXPORT = /^(tutorText[A-Za-z]*|devRunesGrant|devShardsGrant|referralDevGrantSpin)$/u;

const index = stripComments(read('functions/src/index.ts'));
const exportFrom = new Map<string, string>();
for (const m of index.matchAll(/\bexport\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/gu)) {
  for (const part of m[1].split(',')) {
    const name = part.trim().split(/\s+as\s+/u).at(-1);
    if (name && /^[A-Za-z0-9_]+$/u.test(name)) exportFrom.set(name, m[2]);
  }
}
for (const m of index.matchAll(/\bexports\.([A-Za-z0-9_]+)\s*=/gu)) exportFrom.set(m[1], '<exports>');
for (const m of index.matchAll(/\bexport\s+const\s+([A-Za-z0-9_]+)/gu)) exportFrom.set(m[1], '<const>');
assert.ok(exportFrom.size > 100, `разбор index.ts подозрительно мал: ${exportFrom.size}`);

// 1) Ни одного arena-экспорта вне allowlist'а пула Шпиля (callable, крон, триггер).
const arenaExports = [...exportFrom.keys()].filter((n) => /^(arena|adminArena)/u.test(n));
const liveArena = arenaExports.filter((n) => !SPIRE_POOL_ALLOWLIST.includes(n));
assert.deepEqual(liveArena, [], 'arena-функции снова в точке входа деплоя (D78)');
for (const [name, from] of exportFrom) {
  assert.ok(!/^\.\/(arena_v2|arena_expansion|arena_retired)$/u.test(from), `${name} экспортируется из удалённого ${from} (D78)`);
}
assert.doesNotMatch(index, /require\(\s*["']\.\/(arena_v2|arena_expansion|arena_retired)["']\s*\)/u, 'index.ts снова тянет реализацию Арены');

// 2) Файлы реализации отсутствуют.
for (const mod of [...DELETED_ARENA_MODULES, ...DELETED_D81_MODULES]) {
  assert.equal(fs.existsSync(path.join(SRC, `${mod}.ts`)), false, `functions/src/${mod}.ts снова на диске (D78/D81)`);
}

// 3) Никто из оставшегося серверного кода их не импортирует.
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}
const deletedImport = new RegExp(`["']\\.{1,2}/(?:[A-Za-z0-9_]+/)*(${[...DELETED_ARENA_MODULES, ...DELETED_D81_MODULES].join('|')})["']`, 'u');
const importers: string[] = [];
let scanned = 0;
for (const file of walk(SRC)) {
  scanned += 1;
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  const hit = code.match(deletedImport);
  if (hit) importers.push(`${path.relative(ROOT, file)} → ${hit[1]}`);
}
assert.ok(scanned > 200, `просмотрено подозрительно мало файлов: ${scanned}`);
assert.deepEqual(importers, [], 'оставшийся код импортирует удалённый модуль');

// 4) D81: репетитор и dev-выдачи не экспортируются.
const liveD81 = [...exportFrom.keys()].filter((n) => DELETED_D81_EXPORT.test(n));
assert.deepEqual(liveD81, [], 'tutorText*/dev-выдачи снова в точке входа (D81)');

// 5) Пул Шпиля и сам Шпиль живы.
for (const name of [...SPIRE_POOL_ALLOWLIST, ...SPIRE_EXPORTS]) assert.ok(exportFrom.has(name), `${name} пропал из экспорта — Шпиль без пула`);
for (const mod of KEPT_POOL_MODULES) assert.ok(fs.existsSync(path.join(SRC, `${mod}.ts`)), `functions/src/${mod}.ts пропал — пул Шпиля сломан`);

process.stdout.write(`D78 ARENA SERVER DELETED PROBE PASS: arenaExports=${arenaExports.length} (all spire pool) deletedModules=${DELETED_ARENA_MODULES.length + DELETED_D81_MODULES.length} scanned=${scanned} importers=0 spireExports=${SPIRE_EXPORTS.length} keptPoolModules=${KEPT_POOL_MODULES.length}\n`);
