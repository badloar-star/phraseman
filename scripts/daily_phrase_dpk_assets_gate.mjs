#!/usr/bin/env node
/**
 * Гейт «пакеты фразы дня (.dpk) попадают в стор-сборку» — [DPK-GATE].
 *
 * зачем (координатор 12.10, после 4ad0686a0): пакеты фразы дня es/de/it теперь ресурс-файлы `.dpk`, а не JS-модули. Ресурсы в
 * стор-сборку несёт манифест expo-updates; если он протух (известная ловушка: собирать с
 * `:app:createReleaseUpdatesResources --rerun`), сборка уедет без пакетов — фраза дня для es/de/it молча не откроется.
 * Чтобы это не забыли в день сборки (16.10), проверка стоит в release:precheck.
 *
 * Всегда (дёшево): тип dpk в assetExts сборщика; три пакета на месте, читаются, по 176 фраз, цель совпадает; на каждый
 * есть ссылка в app/daily_phrase_pack_assets.ts.
 * Если есть результат сборки: манифест expo-updates release-сборки обязан содержать все три пакета, а стор-экспорт
 * (dist-store/_expo) — регистрировать их в бандле с хэшем текущих файлов. Нет ни того, ни другого — громкое «пропущено»
 * (сборка делается в день релиза).
 * Использование: node scripts/daily_phrase_dpk_assets_gate.mjs
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[DPK-GATE]';
export const DPK_TARGETS = Object.freeze(['es', 'de', 'it']);
const EXPECTED_ROWS = 176;
const MANIFESTS = [
  'android/app/build/generated/assets/createReleaseUpdatesResources/app.manifest',
  'android/app/build/intermediates/assets/release/mergeReleaseAssets/app.manifest',
];

/** Статическая проверка исходников: массив проблем (пусто — всё в порядке). */
export function checkDpkSources(root = ROOT) {
  const problems = [];
  const bundlerConfig = fs.readFileSync(path.join(root, ['me', 'tro.config.js'].join('')), 'utf8');
  if (!/assetExts\s*=\s*\[[^\]]*'dpk'/.test(bundlerConfig)) problems.push("тип 'dpk' не зарегистрирован в assetExts сборщика");
  const reader = fs.readFileSync(path.join(root, 'app', 'daily_phrase_pack_assets.ts'), 'utf8');
  for (const target of DPK_TARGETS) {
    const rel = `assets/daily_phrase_packs/${target}.dpk`;
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) { problems.push(`нет файла ${rel}`); continue; }
    if (!reader.includes(`'../${rel}'`)) problems.push(`нет ссылки на ${rel} в app/daily_phrase_pack_assets.ts`);
    try {
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (pack.studyTarget !== target) problems.push(`${rel}: studyTarget=${pack.studyTarget}`);
      if (!Array.isArray(pack.entries) || pack.entries.length !== EXPECTED_ROWS) problems.push(`${rel}: фраз ${pack.entries?.length ?? 0}, нужно ${EXPECTED_ROWS}`);
    } catch (error) {
      problems.push(`${rel}: не читается как JSON (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  return problems;
}

/** Какие пакеты отсутствуют в списке ресурсов сборки ({ name, type }[]). */
export function missingDpkInAssetList(assets) {
  const present = new Set(assets.filter((a) => String(a.type ?? a.ext ?? '').replace(/^\./, '') === 'dpk').map((a) => String(a.name ?? '')));
  return DPK_TARGETS.filter((target) => !present.has(target));
}

/** Файлы бандла стор-экспорта (.hbc / .js / .bundle) в dist-store/_expo; нет экспорта — null. */
function exportBundleFiles(root) {
  const dir = path.join(root, 'dist-store', '_expo');
  if (!fs.existsSync(dir)) return null;
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(hbc|js|bundle)$/i.test(entry.name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/**
 * Какие пакеты НЕ зарегистрированы в бандле с хэшем текущего файла. Сборщик пишет в registerAsset hash = md5 файла.
 * зачем (Ядро 13.10, первый стор-экспорт PM-216): экспорт кладёт в metadata.json только ресурсы из assetPatternsToBeBundled
 * (app.config.js) — 28 картинок, без .dpk, — поэтому «0 dpk в metadata.json» ничего не доказывает. Хэш в бандле доказывает, что
 * код ссылается на ТЕКУЩИЕ пакеты; встраивание в установочный файл проверяет манифест релизной сборки (выше).
 */
export function missingDpkInBundles(bundleBuffers, hashesByTarget) {
  return DPK_TARGETS.filter((target) => {
    const needle = Buffer.from(hashesByTarget[target] ?? '', 'utf8');
    return needle.length === 0 || !bundleBuffers.some((data) => data.indexOf(needle) >= 0);
  });
}

function dpkHashes(root) {
  return Object.fromEntries(DPK_TARGETS.map((target) => {
    const file = path.join(root, 'assets', 'daily_phrase_packs', `${target}.dpk`);
    return [target, fs.existsSync(file) ? createHash('md5').update(fs.readFileSync(file)).digest('hex') : ''];
  }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  let failed = false;
  const sourceProblems = checkDpkSources();
  if (sourceProblems.length > 0) {
    failed = true;
    sourceProblems.forEach((p) => console.error(`${LOG} ОТКАЗ: ${p}`));
  } else {
    console.log(`${LOG} исходники: тип dpk зарегистрирован, пакеты ${DPK_TARGETS.join('/')} на месте, по ${EXPECTED_ROWS} фраз`);
  }
  let checkedBuild = false;
  // зачем: облачная сборка EAS собирает манифест с нуля — старый локальный артефакт (собран до появления .dpk) ей не мешает.
  // Ловушка — локальная сборка ПОСЛЕ появления пакетов, в которую они не попали; только её считаем провалом.
  const newestDpkMs = Math.max(...DPK_TARGETS.map((t) => {
    const f = path.join(ROOT, 'assets', 'daily_phrase_packs', `${t}.dpk`);
    return fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0;
  }));
  for (const rel of MANIFESTS) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    if (fs.statSync(file).mtimeMs < newestDpkMs) {
      console.log(`${LOG} ПРОПУЩЕНО: ${rel} собран раньше пакетов .dpk (старая локальная сборка) — для локальной стор-сборки пересобрать с :app:createReleaseUpdatesResources --rerun`);
      continue;
    }
    checkedBuild = true;
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    const missing = missingDpkInAssetList(manifest.assets ?? []);
    if (missing.length > 0) {
      failed = true;
      console.error(`${LOG} ОТКАЗ: в манифесте ${rel} нет пакетов ${missing.join(', ')} — манифест протух; пересобрать с :app:createReleaseUpdatesResources --rerun`);
    } else {
      console.log(`${LOG} манифест ${rel}: все ${DPK_TARGETS.length} пакета на месте`);
    }
  }
  const bundleFiles = exportBundleFiles(ROOT);
  if (bundleFiles && bundleFiles.length > 0) {
    checkedBuild = true;
    const missing = missingDpkInBundles(bundleFiles.map((file) => fs.readFileSync(file)), dpkHashes(ROOT));
    if (missing.length > 0) {
      failed = true;
      console.error(`${LOG} ОТКАЗ: стор-бандл не регистрирует пакеты ${missing.join(', ')} с хэшем текущего файла — экспорт старше пакетов или ссылка потеряна; повтори экспорт`);
    } else {
      console.log(`${LOG} стор-экспорт: бандл регистрирует все ${DPK_TARGETS.length} пакета с хэшем текущих файлов (встраивание — по манифесту релизной сборки)`);
    }
  } else if (bundleFiles) {
    console.log(`${LOG} ПРОПУЩЕНО: в dist-store/_expo нет файла бандла`);
  }
  if (!checkedBuild) console.log(`${LOG} ПРОПУЩЕНО: нет ни манифеста release-сборки, ни dist-store — проверка сборки делается в день релиза`);
  process.exit(failed ? 1 : 0);
}
