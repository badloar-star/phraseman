#!/usr/bin/env node
/**
 * Подготовка релиза одной командой: синхронный бамп версий + оба гейта.
 *
 * зачем (владелец 2026-08-15): перед каждым `eas build` нужно помнить три вещи —
 * поднять `android.versionCode`, поднять `ios.buildNumber` НА ТО ЖЕ ЧИСЛО и
 * прогнать два разных гейта. Оба гейта висят в `eas-build-post-install`, то есть
 * падают на сервере уже ПОСЛЕ загрузки архива — сжигая платную сборку.
 * `AGENTS.md` называет расхождение номеров «самым частым падением».
 *
 * Держать это в голове от релиза к релизу — источник дорогих ошибок.
 * Здесь оно становится одной командой, которая физически не может
 * развести номера: они пишутся из одной переменной.
 *
 * Использование:
 *   npm run release:precheck          # проверить, ничего не меняя
 *   npm run release:precheck -- --bump  # поднять оба номера на +1 и проверить
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_JSON = path.join(ROOT, 'app.json');

const args = new Set(process.argv.slice(2));
const shouldBump = args.has('--bump');

function readAppConfig() {
  const raw = fs.readFileSync(APP_JSON, 'utf8');
  return { raw, config: JSON.parse(raw) };
}

function fail(message, hint) {
  console.error(`ОТКАЗ: ${message}`);
  if (hint) {
    console.error('');
    console.error(hint);
  }
  process.exit(1);
}

const { raw, config } = readAppConfig();
const expo = config.expo ?? config;
const androidCode = expo.android?.versionCode;
const iosBuild = expo.ios?.buildNumber;

if (typeof androidCode !== 'number') {
  fail('в app.json нет числового android.versionCode');
}
if (iosBuild === undefined) {
  fail('в app.json нет ios.buildNumber');
}

// зачем сравнивать как числа: iOS хранит buildNumber строкой, и "112" !== 112.
const iosNumber = Number(iosBuild);
if (!Number.isFinite(iosNumber)) {
  fail(`ios.buildNumber не число: ${JSON.stringify(iosBuild)}`);
}

if (shouldBump) {
  const next = Math.max(androidCode, iosNumber) + 1;
  // зачем из одной переменной: так номера не могут разойтись физически,
  // а не «по внимательности разработчика».
  const updated = raw
    .replace(/("versionCode"\s*:\s*)\d+/, `$1${next}`)
    .replace(/("buildNumber"\s*:\s*")\d+(")/, `$1${next}$2`);

  if (updated === raw) {
    fail('не удалось поднять версии — формат app.json изменился',
      'Проверь поля "versionCode" и "buildNumber" вручную.');
  }
  fs.writeFileSync(APP_JSON, updated, 'utf8');
  console.log(`Версии подняты: ${androidCode} → ${next} (обе платформы).`);
} else if (androidCode !== iosNumber) {
  fail(`versionCode=${androidCode}, buildNumber=${iosNumber} — номера разошлись`,
    'Это самое частое падение релиза: сборка упадёт на сервере уже после\n'
    + 'загрузки архива, то есть платная сборка сгорит.\n\n'
    + 'Почини одной командой: npm run release:precheck -- --bump');
} else {
  console.log(`Версии синхронны: ${androidCode}.`);
}

/**
 * Переменные production-профиля из eas.json.
 *
 * зачем подставлять их локально: гейт версий выходит молча, если не видит
 * `EAS_BUILD_PROFILE=production`, и тогда локальная проверка ничего не проверяет.
 * Значения берутся из eas.json, а не выдумываются — иначе гейт проверял бы
 * не то, с чем реально соберётся релиз.
 */
function productionEnvFromEasJson() {
  try {
    const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
    return eas.build?.production?.env ?? {};
  } catch {
    return {};
  }
}

const productionEnv = productionEnvFromEasJson();

/** Оба гейта, которые иначе падают на сервере после загрузки архива. */
const GATES = [
  {
    name: 'ключи и конфиги релиза',
    script: 'scripts/release_keys_gate.mjs',
    env: {},
    allowMissingEasSecrets: true,
  },
  {
    name: 'версии production-профиля',
    script: 'scripts/eas_production_version_gate.mjs',
    env: { ...productionEnv, EAS_BUILD_PROFILE: 'production' },
    allowMissingEasSecrets: true,
  },
  // Сборка и OTA не должны читать выпуск, который расходится с проверенным
  // исходником, или отставшую копию выпуска внутри приложения.
  // зачем (инцидент 04.10, решение координатора): контент урока 1 перегенерировали без озвучки — занятие молча не открывалось.
  // Гейт озвучки собирает КАЖДОЕ встроенное занятие из бандла и падает, если для реплики нет записи в таблице озвучки.
  // зачем (план Б R1, владелец 13.10): оба гейта V2 идут через обёртку — при PHRASEMAN_R1_HIDE_V2=1 и потолке 0 «НЕПРИМЕНИМО»,
  // без переменной — как раньше (docs/phraseman-2.0/R1_PLAN_B_HIDE_V2.md).
  // зачем (репетиция 13.10): на сервере EAS этот гейт идёт с build.production.env из eas.json — там включается план Б
  // (PHRASEMAN_R1_HIDE_V2=1). С env {} репетиция оставалась бы красной при зелёном сервере.
  // зачем (координатор 15.10 ночь): EAS собирает рабочую папку — потолок V2, набор звука и таблица голосов в ней обязаны
  // совпадать с закоммиченными, иначе в сборку уедет незакоммиченный прогон сторожа (145 вместо 15/56).
  { name: 'Learning V2: потолок, набор звука и таблица голосов = закоммиченным', script: 'scripts/learning_v2_ceiling_committed_gate.mjs', env: {} },
  { name: 'Learning V2: исходник = выпуск = копия приложения и озвучка (или НЕПРИМЕНИМО при плане Б)', script: 'scripts/learning_v2_plan_b_gates.mjs', env: { ...productionEnv } },
  // зачем (координатор 23:50, класс дефекта 52d420253): ни одной безусловной ссылки на маршрут, вырезанный из
  // стор-сборки регуляркой router.ctx.js (тупик «неизвестный маршрут»). Отчёт: docs/work/tasks/store-route-reachability-audit-2026-10-10.md.
  { name: 'нет ссылок на вырезанные из стор-сборки маршруты', script: 'scripts/store_route_reachability.mjs', env: {} },
  // зачем (координатор 14.10, прогон Тем на 2133977a1): код приложения не должен ссылаться на файлы, которые .easignore
  // выкинет из архива EAS — иначе бандлер на сервере падает «Unable to resolve» ПОСЛЕ загрузки архива (платная сборка сгорает).
  { name: 'код приложения не ссылается на исключённое из архива EAS', script: 'scripts/easignore_runtime_imports_gate.mjs', env: {} },
  // зачем (координатор 12.10, dd756cf9a): новый экспорт getDevDialogSend не попал в стор-заглушку dev_dialog_state — в стор-сборке
  // каждый ход Диалога упал бы. Список заглушек — из metro.config.js; у каждой те же runtime-экспорты, что у настоящего модуля.
  { name: 'стор-заглушки dev-модулей совпадают по экспортам', script: 'scripts/store_release_stubs_gate.mjs', env: {} },
  // зачем (владелец 04.10, CLAUDE.md «ГЕЙТ: ПРИЛОЖЕНИЕ = МАКЕТ»): сборка в стор запрещена, пока КАЖДЫЙ экран не сверен с макетом (склейка + ревью координатора).
  // зачем (вариант «А+Б» владельца, handoff/r1_parity_gate_AB.md): выпуск R1 — только строки release=r1; разобранные
  // корзины (пересъёмка, решение владельца, новый образец, тон темы) — отдельный громкий счётчик, а не нарушение.
  { name: 'приложение = макет (визуальная сверка)', script: 'scripts/visual_parity_gate.mjs', env: {}, args: ['--release=r1', '--defer-triage'] },
  // зачем (координатор 12.10): dev-модули в стор-режиме подменяются заглушками — проверяем готовый стор-бандл на dev-строки.
  // Работает только при наличии стор-экспорта в dist-store/ (делается в день сборки), иначе громко пропускает.
  { name: 'в стор-бандле нет dev-строк', script: 'scripts/store_bundle_dev_strings_gate.mjs', env: {} },
  // зачем (координатор 12.10, после 4ad0686a0): пакеты фразы дня es/de/it — ресурс-файлы .dpk; протухший манифест expo-updates
  // локальной стор-сборки уносит сборку без них (фраза дня молча не открывается). Проверка исходников + манифеста сборки.
  { name: 'пакеты фразы дня (.dpk) в сборке', script: 'scripts/daily_phrase_dpk_assets_gate.mjs', env: {} },
];

let failed = 0;
const secretsMissing = [];
for (const gate of GATES) {
  console.log(`\n— ${gate.name} —`);
  // зачем перехватывать, а не 'inherit': ниже нужно отличить отсутствующий
  // секрет EAS от настоящего провала гейта — для этого требуется текст ошибки.
  const result = spawnSync(process.execPath, [gate.script, ...(gate.args ?? [])], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...gate.env },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    // зачем отделять секреты от настоящих провалов: ключи RevenueCat и подобные
    // живут в секретах EAS и локально отсутствуют по определению. Считать это
    // провалом — значит приучить владельца игнорировать красный вывод.
    const stderr = String(result.stderr ?? '');
    if (gate.allowMissingEasSecrets
      && /EXPO_PUBLIC_RC_|EXPO_PUBLIC_GOOGLE_|is missing for production/.test(stderr)) {
      secretsMissing.push(gate.name);
      console.log('   (пропущено: значение живёт в секретах EAS, локально его нет)');
    } else {
      process.stderr.write(stderr);
      failed += 1;
    }
  }
}

console.log('');
if (failed > 0) {
  console.error(`ОТКАЗ: не прошло гейтов — ${failed}. Сборку не запускать: она сгорит на сервере.`);
  process.exit(1);
}
if (secretsMissing.length > 0) {
  console.log('Локально проверено всё, кроме секретов EAS (ключи магазинов) —');
  console.log('их значения живут на сервере сборки и здесь отсутствуют по определению.');
  console.log('Версии и конфиги в порядке: самое частое падение исключено.');
  process.exit(0);
}
console.log('Оба гейта пройдены. Можно запускать eas build.');
