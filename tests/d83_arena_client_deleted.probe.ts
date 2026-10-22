// D83 ратчет-проба: клиентская Арена УДАЛЕНА, модули, которыми живёт Шпиль, на месте.
// зачем: D83 (владелец, 2026-09-30) + D78 — «удаляемое удаляем, а не отключаем».
// Серверная Арена снята в D78 (см. tests/d74_arena_server_retired.probe.ts), здесь —
// клиент: экраны, маршруты, arena_client, прогревы, фоновый поиск, ассеты, входы.
// Проба падает, если кто-то вернёт экран/маршрут/импорт удалённой Арены или
// уберёт модули, которые импортирует Шпиль (answer_check → contract → target_registry).
// Запуск: npx tsx tests/d83_arena_client_deleted.probe.ts (exit 0 = PASS).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { redirectSystemPath } from '../app/+native-intent';

const ROOT = path.resolve(__dirname, '..');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//gu, '')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/gu, '')
  .replace(/(^|[^:'"`])\/\/[^\n]*/gu, '$1');

// Модули Арены, которые импортирует оставшийся код (доказано графом импортов):
// Шпиль → answer_check → contract → target_registry; практика ошибок → contract;
// уведомления → target_registry; Learning V2 speed-match → use_arena_sound → sound_catalog.
const KEPT_ARENA_MODULES = ['answer_check.ts', 'contract.ts', 'sound_catalog.ts', 'target_registry.ts'];

// 1) Экраны и клиент Арены удалены.
for (const dir of ['app']) {
  const leftovers = fs.readdirSync(path.join(ROOT, dir)).filter((name) => /^arena_/u.test(name));
  assert.deepEqual(leftovers, [], `${dir}/arena_* снова на диске (D83)`);
}
assert.equal(exists('components/arena'), false, 'components/arena снова на диске (D83)');
assert.equal(exists('components/ArenaReportOpponentButton.tsx'), false, 'кнопка жалобы на соперника вернулась (D83)');
assert.equal(exists('assets/images/arena'), false, 'ранговые щиты Арены снова в бандле (D83)');
assert.equal(exists('assets/audio/sfx/v1/arena'), false, 'звуки Арены снова в бандле (D83)');
for (const hook of ['use_arena_font_scale', 'use_arena_local_match', 'use_arena_terminal_result_sync']) {
  assert.equal(exists(`hooks/${hook}.ts`), false, `hooks/${hook}.ts снова на диске (D83)`);
}
const arenaModules = fs.readdirSync(path.join(ROOT, 'modules/arena')).sort();
assert.deepEqual(arenaModules, KEPT_ARENA_MODULES, 'в modules/arena только то, что импортирует оставшийся код');

// 2) (tabs)/arena.tsx — пустой якорь старого URL, без импортов.
const anchor = stripComments(read('app/(tabs)/arena.tsx'));
assert.doesNotMatch(anchor, /\bimport\b|\brequire\(/u, '(tabs)/arena.tsx снова что-то импортирует (D83)');

// 3) Никто в клиенте не импортирует удалённую Арену.
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('.') ? [] : walk(full);
    return /\.(tsx?|mts|js)$/u.test(entry.name) ? [full] : [];
  });
}
const clientFiles = ['app', 'components', 'hooks', 'modules', 'constants', 'lib', 'shared']
  .flatMap((dir) => walk(path.join(ROOT, dir)));
assert.ok(clientFiles.length > 500, `обход клиента подозрительно мал: ${clientFiles.length}`);
const allowedArenaImport = /(?:modules\/arena\/(?:answer_check|contract|sound_catalog|target_registry)|\.\.?\/arena\/(?:answer_check|contract|target_registry)|hooks\/use_arena_sound|\.\/sound_catalog|\.\/contract|\.\/target_registry|\.\/sections\/screens_arena_social|assets\/images\/v2art\/(?:dark|light)\/intro_arena\.webp)$/u;
// screens_arena_social — раздел dev-витрины (турниры, рефералы); пункты Арены из него сняты.
// intro_arena.webp — картинка-иллюстрация в реестре тематического арта (плитка «Шпиль» временно берёт её), не код Арены; уйдёт вместе с заменой арта.
const badImports: string[] = [];
const badRoutes: string[] = [];
for (const file of clientFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/gu, '/');
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  for (const m of code.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]*[Aa]rena[^'"]*)['"]/gu)) {
    if (!allowedArenaImport.test(m[1])) badImports.push(`${rel} -> ${m[1]}`);
  }
  // Навигация в удалённые экраны: push/replace/href/pathname на /arena_*.
  if (/(?:push|replace|navigate)\(\s*['"`]\/arena_|pathname:\s*['"`]\/arena_|href=\{?\s*['"`]\/arena_/u.test(code)) badRoutes.push(rel);
}
assert.deepEqual(badImports, [], 'клиент снова импортирует удалённую Арену (D83)');
assert.deepEqual(badRoutes, [], 'клиент снова ведёт в удалённые экраны Арены (D83)');

// 4) Корневой стек: ни маршрутов, ни глобального хоста находки, ни прогрева хаба.
const layout = stripComments(read('app/_layout.tsx'));
assert.doesNotMatch(layout, /<Stack\.Screen\s+name=["']arena_/u, 'маршруты Арены снова в корневом стеке (D83)');
assert.doesNotMatch(layout, /ArenaOpponentFoundHost|arena_home_preload|startArenaHomePreload/u, 'прогрев/хост Арены снова в корне (D83)');

// 5) Тап по старому уведомлению дуэли ведёт на Главную и не падает.
for (const rel of ['app/notifications.ts', 'app/notification_tap_handler.ts', 'components/NotificationCenterButton.tsx']) {
  const code = stripComments(read(rel));
  assert.doesNotMatch(code, /arenaInviteRouteFromPayload|arena_notification_route/u, `${rel}: старый роутер приглашений Арены (D83)`);
}
for (const rel of ['app/notifications.ts', 'app/notification_tap_handler.ts']) {
  const code = stripComments(read(rel));
  const at = code.indexOf("case 'arena_friend_expired':");
  assert.ok(at > 0, `${rel}: обработчик старых arena_friend_* пропал — тап упадёт в default`);
  assert.match(code.slice(at, at + 400), /navTabHome\(\)/u, `${rel}: arena_friend_* обязан вести на Главную`);
}

// 6) Диплинки Арены открывают Главную.
for (const url of [
  'phraseman://arena',
  'https://knowlyapps.com/arena',
  'phraseman://arena/invite/Pz3FMGqvfVjwMSax_0L9Xg?studyTarget=fr',
  `phraseman://arena/ghost/${'a'.repeat(64)}`,
  'phraseman://arena_match',
  'phraseman://arena_invite?inviteId=x',
]) {
  assert.equal(redirectSystemPath({ path: url, initial: true }), '/home', `диплинк ${url} обязан вести на Главную`);
}

// 7) Звуки Арены не тянут файлы в бандл.
assert.doesNotMatch(read('modules/audio/sound_events.ts'), /sfx\/v1\/arena\//u, 'require на звуки Арены вернулся (D83)');

// 8) Шпиль на месте и по-прежнему опирается на сохранённые модули.
for (const rel of [
  'modules/spire/step_machine.ts', 'modules/spire/report_queue.ts', 'modules/spire/config_contract.ts',
  'components/spire/SpireHomeScreen.tsx', 'components/spire/SpireTower.tsx',
  'app/spire_config_client.ts', 'app/spire_report_client.ts', 'app/spire_tab_flag.ts',
  'modules/arena/answer_check.ts', 'modules/arena/contract.ts', 'modules/arena/target_registry.ts',
]) {
  assert.ok(exists(rel), `${rel} пропал — Шпиль/сохранённые модули сломаны`);
}
assert.match(read('modules/spire/step_machine.ts'), /from ['"]\.\.\/arena\/answer_check['"]/u, 'Шпиль больше не берёт проверку ответа из answer_check');

console.log('D83 PASS: клиентская Арена удалена, Шпиль и сохранённые модули на месте');
