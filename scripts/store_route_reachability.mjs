#!/usr/bin/env node
// зачем (координатор 23:30, класс дефекта 52d420253): в стор-сборке часть маршрутов физически вырезана регуляркой
// router.ctx.js (Learning V2, дев/админ-экраны). Любая безусловная навигация на них из живого кода — тупик
// «неизвестный маршрут» у покупателя. Скрипт строит множество вырезанных маршрутов из ТОЙ ЖЕ регулярки (через
// storeRouteRegex гейта сверки), находит в коде все переходы на них и проверяет, что рядом стоит условие
// стор-режима/DEV. Без условия и без осознанного исключения — «дыра», код выхода 1.
//
// Использование: node scripts/store_route_reachability.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[STORE-ROUTES]';

// Каталоги app/, которые регулярка стор-режима вообще не считает маршрутами (не экраны).
const NON_ROUTE_APP_DIRS = /^(audio|community_packs|components|constants|error_traps|flashcards|graphify-out|quizzes|services|settings|types)\//;
const SCAN_DIRS = ['app', 'components', 'hooks', 'modules', 'constants', 'lib', 'shared'];
// Условия, после которых переход считается закрытым в стор-сборке. Голый `if (__DEV__) {` НЕ считается: так
// оформлены лог-блоки, а не ворота навигации (ложная пометка lessons.tsx при первом прогоне аудита).
const GUARD_TOKENS = /\bIS_STORE_RELEASE\b|\bENABLE_DEV_TOOLS\b|\bLEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY\b|\bisStoreRelease\b|__DEV__\s*(?:&&|\?)|!__DEV__/;
const GUARD_WINDOW_LINES = 40;
// Переход, а не сравнение пути: роутер, ссылка, редирект, объект перехода, пункт меню-маршрута.
const NAVIGATION = /router\.(?:push|replace|navigate|dismissTo)\(|\bhref\s*[=:]|<Redirect\b|<Link\b|\bpathname\s*:|Linking\.openURL\(|kind:\s*['"]route['"]/;

/**
 * Осознанные исключения: файл (или префикс каталога с «/» на конце) + маршрут (null = любой) → причина.
 * Только места, недостижимые в стор-сборке механизмом, которого эвристика не видит. Новое — с причиной.
 */
export const ALLOWED = Object.freeze([
  {
    file: 'components/dev/',
    route: null,
    reason: 'реестр дев-витрины: рисует только app/_motion_showcase.tsx (вырезан), вход app/motion_showcase.tsx пускает лишь при __DEV__ && !IS_STORE_RELEASE',
  },
]);

function allowedReason(file, route) {
  const hit = ALLOWED.find((entry) => (entry.file.endsWith('/') ? file.startsWith(entry.file) : file === entry.file)
    && (entry.route === null || entry.route === route));
  return hit ? hit.reason : null;
}

export async function excludedRoutes(root = ROOT) {
  const { storeRouteRegex, isRouteExcludedInStore } = await import(pathToFileURL(path.join(root, 'scripts', 'visual_parity_gate.mjs')).href);
  const regex = storeRouteRegex(root);
  if (!regex) throw new Error(`${LOG} регулярка стор-режима router.ctx.js не найдена — аудит невозможен`);
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.tsx')) continue;
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (NON_ROUTE_APP_DIRS.test(rel.slice('app/'.length))) continue;
      if (isRouteExcludedInStore(regex, rel)) out.push(rel);
    }
  };
  walk(path.join(root, 'app'));
  return out.sort();
}

/** `app/learning-v2/session/[id].tsx` → `/learning-v2/session/` (префикс, по которому ищем ссылки). */
export function routePrefix(routeFile) {
  let route = routeFile.slice('app'.length).replace(/\.tsx$/, '').replace(/\/\([^/]+\)/g, '');
  route = route.replace(/\/index$/, '');
  const dyn = route.indexOf('[');
  return dyn >= 0 ? route.slice(0, dyn) : route;
}

function listSources(root) {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (/\.(tsx?|jsx?|mjs)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) out.push(full);
    }
  };
  for (const dir of SCAN_DIRS) walk(path.join(root, dir));
  return out;
}

/** Строка-маршрут в кавычках/шаблоне, начинающаяся с префикса вырезанного маршрута (граница — конец имени). */
function linkPattern(prefix) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundary = prefix.endsWith('/') ? '' : '(?![A-Za-z0-9_-])';
  return new RegExp(`['"\`]${escaped}${boundary}`);
}

export async function audit(root = ROOT) {
  const routes = await excludedRoutes(root);
  const excludedSet = new Set(routes);
  // Приватные `_…`-файлы expo-router маршрутами не являются — навигации на них нет смысла искать.
  const targets = routes
    .filter((file) => !path.basename(file).startsWith('_'))
    .map((file) => ({ file, prefix: routePrefix(file), pattern: linkPattern(routePrefix(file)) }));
  // зачем (владелец 11.10, V2 в стор-сборке): страница V2 — дыра, только пока занятие V2 вырезано из стор-сборки
  // (тогда с неё любая сессия падает в «неизвестный маршрут»). Маршрут занятия есть — переход на страницу законный.
  const v2SessionExcluded = excludedSet.has('app/learning-v2/session/[id].tsx');
  const findings = [];
  for (const full of listSources(root)) {
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (excludedSet.has(rel)) continue; // ссылки внутри уже вырезанного экрана в сторе не исполняются
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // комментарии — не навигация
      const setPageV2 = v2SessionExcluded && /setPage\(\s*["']v2["']\s*\)|initialPage\s*=\s*["']v2["']/.test(line);
      // Строка-маршрут — ссылка, только если она в переходе (на этой или предыдущей строке): сравнения
      // pathname === '…' / startsWith и реестры-классификаторы в сторе ничего не открывают.
      const navigating = NAVIGATION.test(line) || NAVIGATION.test(lines[index - 1] ?? '');
      const hits = navigating ? targets.filter((target) => target.pattern.test(line)) : [];
      if (hits.length === 0 && !setPageV2) return;
      const window = lines.slice(Math.max(0, index - GUARD_WINDOW_LINES), index + 1).join('\n');
      const guarded = GUARD_TOKENS.test(window);
      for (const target of hits.length > 0 ? hits : [{ file: 'page:v2', prefix: 'setPage("v2")' }]) {
        const allowed = allowedReason(rel, target.prefix);
        findings.push({ file: rel, line: index + 1, route: target.prefix, routeFile: target.file, guarded, allowed, text: line.trim().slice(0, 160) });
      }
    });
  }
  const holes = findings.filter((finding) => !finding.guarded && !finding.allowed);
  return { routes, findings, holes };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = await audit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`${LOG} вырезано маршрутов: ${result.routes.length}; переходов на них: ${result.findings.length}; дыр: ${result.holes.length}`);
    for (const hole of result.holes) console.log(`${LOG} ДЫРА ${hole.file}:${hole.line} → ${hole.route} | ${hole.text}`);
  }
  process.exitCode = result.holes.length > 0 ? 1 : 0;
}
