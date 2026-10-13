#!/usr/bin/env node
/**
 * План Б R1 (решение 15.10 12:00): проверка «в выпуске Learning V2 скрыт». Только чтение — ничего не пишет, не собирает и не выкладывает.
 *
 * зачем (координатор 13.10, набор к решению): одной командой увидеть, что при плане Б
 *   1) в бандле нет ни одного выпущенного занятия V2 (потолок generated-файла = 0);
 *   2) в профиле production eas.json стоит PHRASEMAN_R1_HIDE_V2=1 — иначе сборка EAS упадёт на гейтах №3/№4 в eas-build-post-install;
 *   3) обёртка гейтов отвечает «НЕПРИМЕНИМО» (а при потолке > 0 — ОТКАЗ, V2 нельзя выдать за скрытый);
 *   4) маршрут learning-v2/course в стор-сборке уводит в «Уроки» (лог [V2-ROUTE] reason=ceiling0);
 *   5) если уже есть экспорт стор-бандла (dist-store/) — эта ветка в нём присутствует.
 *
 * Запуск:  node scripts/plan_b_v2_hidden_check.mjs                  — до применения патча eas.json (флаг «ещё не применён» = предупреждение)
 *          node scripts/plan_b_v2_hidden_check.mjs --expect-applied — после применения: флаг в профиле обязателен
 * Код выхода: 0 — всё ок; 1 — есть отказ (причина в строке [PLAN-B-CHECK] ОТКАЗ).
 * Патч профиля: docs/work/plan-b/eas_json_production_hide_v2.patch (git apply).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[PLAN-B-CHECK]';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectApplied = process.argv.includes('--expect-applied');
const results = [];

function ok(step, detail) { results.push({ step, status: 'ok' }); console.log(`${TAG} OK   ${step}: ${detail}`); }
function warn(step, detail) { results.push({ step, status: 'warn' }); console.log(`${TAG} WARN ${step}: ${detail}`); }
function fail(step, detail) { results.push({ step, status: 'fail' }); console.error(`${TAG} ОТКАЗ ${step}: ${detail}`); }
function read(rel) { return readFileSync(path.join(ROOT, rel), 'utf8'); }

console.log(`${TAG} вход: root=${ROOT} expectApplied=${expectApplied}`);

// 1. Потолок выпущенных занятий в бандле.
try {
  const src = read('app/learning_v2_bundle_availability_v1.generated.ts');
  const m = /LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = (\d+)/.exec(src);
  if (!m) fail('потолок', 'константа LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 не найдена в generated-файле');
  else if (Number(m[1]) === 0) ok('потолок', 'LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = 0 — в бандле нет выпущенных занятий V2');
  else fail('потолок', `= ${m[1]}: занятия V2 в бандле — план Б невозможен без возврата потолка к 0 (зона Codex, решение координатора)`);
} catch (error) {
  fail('потолок', `generated-файл не прочитан: ${error instanceof Error ? error.message : String(error)}`);
}

// 2. Флаг в профиле production eas.json.
try {
  const eas = JSON.parse(read('eas.json'));
  const env = eas?.build?.production?.env ?? {};
  const value = env.PHRASEMAN_R1_HIDE_V2;
  if (value === '1') ok('eas.json', 'build.production.env.PHRASEMAN_R1_HIDE_V2 = "1" — гейты на сервере EAS будут «НЕПРИМЕНИМО»');
  else if (expectApplied) fail('eas.json', `PHRASEMAN_R1_HIDE_V2 = ${JSON.stringify(value ?? null)} — патч не применён, сборка EAS упадёт в eas-build-post-install`);
  else warn('eas.json', `PHRASEMAN_R1_HIDE_V2 = ${JSON.stringify(value ?? null)} — ещё не применён (патч docs/work/plan-b/eas_json_production_hide_v2.patch)`);
  if (env.EXPO_PUBLIC_STORE_RELEASE === '1') ok('eas.json', 'EXPO_PUBLIC_STORE_RELEASE = "1" — стор-сборка, ENABLE_DEV_TOOLS выключен');
  else fail('eas.json', `EXPO_PUBLIC_STORE_RELEASE = ${JSON.stringify(env.EXPO_PUBLIC_STORE_RELEASE ?? null)} — без него в сборке открыты dev-инструменты и V2`);
} catch (error) {
  fail('eas.json', `не прочитан/не разобран: ${error instanceof Error ? error.message : String(error)}`);
}

// 3. Обёртка гейтов №3/№4 в режиме плана Б.
{
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/learning_v2_plan_b_gates.mjs')], {
    cwd: ROOT, env: { ...process.env, PHRASEMAN_R1_HIDE_V2: '1' }, encoding: 'utf8', timeout: 120_000,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const ms = Date.now() - started;
  if (r.error) fail('гейты №3/№4', `обёртка не запустилась: ${r.error.message} (${ms} мс)`);
  else if (r.status === 0 && out.includes('НЕПРИМЕНИМО')) ok('гейты №3/№4', `learning_v2_plan_b_gates.mjs с PHRASEMAN_R1_HIDE_V2=1 → «НЕПРИМЕНИМО», код 0 (${ms} мс)`);
  else fail('гейты №3/№4', `код ${r.status}, «НЕПРИМЕНИМО» ${out.includes('НЕПРИМЕНИМО') ? 'есть' : 'нет'}: ${out.trim().split('\n').slice(-2).join(' | ')}`);
}

// 4. Маршрут learning-v2/course в стор-сборке уводит в «Уроки» (статически по исходнику).
try {
  const course = read('app/learning-v2/course.tsx');
  const lessons = read('app/(tabs)/lessons.tsx');
  const config = read('app/config.ts');
  const checks = [
    ['course.tsx открывает экран уроков с initialPage="v2"', /initialPage="v2"/.test(course)],
    ['флаг V2 = выпущенные занятия || dev-инструменты', /LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = LEARNING_V2_HAS_RELEASED_SESSIONS_V1 \|\| ENABLE_DEV_TOOLS/.test(lessons)],
    ['startLessonsPage: без выпущенных занятий initialPage v2 → «Уроки» с логом [V2-ROUTE] reason=ceiling0',
      /if \(initial === "v2" && !LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY\) \{[\s\S]{0,200}\[V2-ROUTE\] reason=ceiling0[\s\S]{0,120}return "lessons";/.test(lessons)],
    ['ENABLE_DEV_TOOLS выключен в стор-сборке (&& !IS_STORE_RELEASE)', /export const ENABLE_DEV_TOOLS =[\s\S]{0,200}&& !IS_STORE_RELEASE/.test(config)],
  ];
  for (const [name, passed] of checks) (passed ? ok : fail)('маршрут V2', name);
} catch (error) {
  fail('маршрут V2', `исходники не прочитаны: ${error instanceof Error ? error.message : String(error)}`);
}

// 5. Экспорт стор-бандла (если уже сделан в день сборки).
{
  const dist = path.join(ROOT, 'dist-store');
  if (!existsSync(dist)) {
    warn('стор-бандл', 'нет dist-store/ — проверка бандла делается в день сборки после экспорта');
  } else {
    const bundles = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(hbc|js)$/.test(name) && /_expo|bundles|index/.test(full)) bundles.push(full);
      }
    };
    walk(dist);
    if (bundles.length === 0) warn('стор-бандл', 'в dist-store/ не найден файл бандла (.js/.hbc)');
    else {
      const hit = bundles.find((file) => readFileSync(file).includes(Buffer.from('reason=ceiling0')));
      if (hit) ok('стор-бандл', `ветка [V2-ROUTE] reason=ceiling0 есть в ${path.relative(ROOT, hit)}`);
      else fail('стор-бандл', `строки reason=ceiling0 нет ни в одном из ${bundles.length} файлов бандла — экспорт старый или ветка вырезана`);
    }
  }
}

const failed = results.filter((r) => r.status === 'fail').length;
const warned = results.filter((r) => r.status === 'warn').length;
console.log(`${TAG} итог: ${failed === 0 ? 'V2 СКРЫТ' : 'ЕСТЬ ОТКАЗЫ'} — ок ${results.length - failed - warned}, предупреждений ${warned}, отказов ${failed}`);
process.exit(failed === 0 ? 0 : 1);
