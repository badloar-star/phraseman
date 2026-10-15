/**
 * Поверхность стор-сборки: вырезан ли Learning V2 из магазинной сборки целиком.
 *
 * зачем (координатор 10.10 02:25): маршруты `*learning[_-]v2*` вырезаны регуляркой стор-ветки router.ctx.js —
 * раздела в магазинной сборке нет. Его ворота (паритет выпуска и озвучка) в стор-режиме не должны блокировать
 * сборку, но ТОЛЬКО при доказанном вырезании: регулярка найдена и не берёт ни одного маршрута Learning V2.
 * Любая неясность — пропуска нет (строго по умолчанию).
 *
 * Логи: префикс [STORE-SURFACE].
 */
import fs from 'node:fs';
import path from 'node:path';

const LOG = '[STORE-SURFACE]';

// зачем (10.10): файл самостоятельный (без импорта visual_parity_gate.mjs) и лежит прямо в scripts/ — .easignore
// выкидывает scripts/* из архива EAS кроме явно разрешённых файлов, и каждый лишний импорт — ещё одна дыра в архиве.

/** Регулярка маршрутов стор-ветки router.ctx.js (`EXPO_PUBLIC_STORE_RELEASE === '1'`). null — не найдена. */
export function storeRouteRegexFromRouterCtx(root) {
  const file = path.join(root, 'router.ctx.js');
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const storeBranch = text.slice(text.indexOf("=== '1'"), text.indexOf(': require.context('));
  const literal = /\n\s*\/(\^[\s\S]*?)\/,\s*\n/.exec(storeBranch);
  if (!literal) return null;
  try {
    return new RegExp(literal[1]);
  } catch (error) {
    console.warn(`${LOG} router.ctx.js: регулярка стор-режима не разбирается (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

function isRouteExcludedInStore(regex, routeFile) {
  return !regex.test(`./${routeFile.slice('app/'.length)}`);
}

const LEARNING_V2_ROUTE = /learning[_-]v2/i;

function listRouteFiles(appDir, relativeTo) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      console.warn(`${LOG} не читается каталог ${dir}: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name.endsWith('.tsx')) out.push(path.relative(relativeTo, absolute).split(path.sep).join('/'));
    }
  };
  walk(appDir);
  return out;
}

/**
 * Решение «пропустить ворота Learning V2».
 * @returns {{ skip: boolean, reason: string, routes: number, reachable: string[] }}
 */
export function learningV2StoreSkipDecision(root, env = process.env) {
  if (env.EXPO_PUBLIC_STORE_RELEASE !== '1') {
    return { skip: false, reason: 'not_store_release', routes: 0, reachable: [] };
  }
  const regex = storeRouteRegexFromRouterCtx(root);
  if (!regex) return { skip: false, reason: 'store_regex_missing', routes: 0, reachable: [] };
  const routes = listRouteFiles(path.join(root, 'app'), root).filter((file) => LEARNING_V2_ROUTE.test(file));
  if (routes.length === 0) return { skip: false, reason: 'no_learning_v2_routes_found', routes: 0, reachable: [] };
  const reachable = routes.filter((file) => !isRouteExcludedInStore(regex, file));
  if (reachable.length > 0) {
    return { skip: false, reason: 'learning_v2_route_reachable_in_store', routes: routes.length, reachable };
  }
  return { skip: true, reason: 'learning_v2_excluded_from_store', routes: routes.length, reachable: [] };
}

/**
 * Сервер EAS: исходников курса в архиве нет (.easignore исключает /content/), поэтому сверку «исходник = выпуск = копия
 * приложения» там выполнить физически нельзя — она строгая локально, в `npm run release:precheck`.
 *
 * зачем (владелец 11.10, «LEARNING V2 ПОПАДАЕТ»): после снятия выреза ворота паритета на сервере падали бы не на качестве
 * курса, а на отсутствии папки. Признак срабатывает ТОЛЬКО на сервере EAS и ТОЛЬКО при отсутствии исходников.
 * @returns {{ skip: boolean, reason: string }}
 */
export function learningV2CourseSourcesAbsentOnBuildServer(root, env = process.env) {
  if (env.EAS_BUILD !== 'true') return { skip: false, reason: 'not_eas_build_server' };
  // зачем (репетиция сборки 15.10): с 2a033ab6e .easignore пропускает content/learning-v2-course/activation/ — сама папка курса на EAS
  // ЕСТЬ, а исходников нет. Признак исходников — папка sessions/ (DEFAULT_SOURCE_ROOT гейта паритета), иначе строгая сверка жгла сборку.
  const sources = path.join(root, 'content', 'learning-v2-course', 'sessions');
  if (fs.existsSync(sources)) return { skip: false, reason: 'course_sources_present' };
  return { skip: true, reason: 'course_sources_not_in_eas_archive' };
}

/** Печатает решение одной строкой; true — вызывающие ворота должны выйти с кодом 0. */
export function announceLearningV2StoreSkip(gateLog, root, env = process.env) {
  const decision = learningV2StoreSkipDecision(root, env);
  if (decision.skip) {
    console.log(`${gateLog} пропущено: не входит в стор-сборку (Learning V2 вырезан router.ctx.js, маршрутов ${decision.routes})`);
    return true;
  }
  if (decision.reason !== 'not_store_release') {
    console.warn(`${gateLog} стор-режим, но пропуска нет: ${decision.reason}${decision.reachable.length ? ` (${decision.reachable.slice(0, 5).join(', ')})` : ''}`);
  }
  return false;
}
