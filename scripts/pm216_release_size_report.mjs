// PM-216 «Измерить release bundle»: JS / assets / native отдельно, по каждой платформе.
// зачем: размер репозитория (git, assets/ на диске, архив EAS) — не размер приложения. Реальный
// размер приложения даёт только релизная сборка. Скрипт НИЧЕГО не собирает: он читает готовый
// результат `expo export` (владелец/CI запускает его под светофором) и, по желанию, готовые
// установочные файлы из EAS. Тяжёлое (Metro-сборка) здесь намеренно не запускается.
//
// Как получить вход (тяжёлое, под слотом светофора, один раз на платформу или обе сразу):
//   npx expo export --platform all --output-dir <dir> --no-minify=false
//   node scripts/pm216_release_size_report.mjs <dir> [--ipa <файл.ipa>] [--aab <файл.aab|.apk>] [--out <md>]
// Native-часть считается как «установочный файл минус JS минус assets» и помечена как оценка:
// в неё входят нативные библиотеки, шрифты плагинов, иконки и служебное, а не только код.
// Это приблизительно, но честно разделяет «что едет в телефон» и «что лежит в репозитории».
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const LOG = '[PM-216]';
const PLATFORMS = ['ios', 'android'];

function fileSize(path) {
  try {
    return statSync(path).size;
  } catch (e) {
    // зачем: молча считать 0 нельзя — отсутствующий файл исказил бы сравнение платформ.
    console.warn(`${LOG} нет файла ${path}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** Разбор каталога `expo export`: по платформам JS-бандл, ассеты (число, байты, по расширениям). */
export function summarizeExport(dir) {
  const metaPath = join(dir, 'metadata.json');
  if (!existsSync(metaPath)) {
    throw new Error(`${LOG} нет metadata.json в ${dir}: это не результат expo export`);
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const result = {};
  for (const platform of PLATFORMS) {
    const entry = meta?.fileMetadata?.[platform];
    if (!entry) {
      console.warn(`${LOG} платформа ${platform} отсутствует в экспорте — в отчёте будет пропуск`);
      continue;
    }
    const bundlePath = join(dir, entry.bundle);
    const bundleBytes = fileSize(bundlePath);
    const gzipBytes = bundleBytes === null ? null : gzipSync(readFileSync(bundlePath)).length;
    const byExt = {};
    let assetBytes = 0;
    let missing = 0;
    for (const asset of entry.assets ?? []) {
      const size = fileSize(join(dir, asset.path));
      if (size === null) { missing += 1; continue; }
      assetBytes += size;
      const ext = String(asset.ext ?? 'noext').toLowerCase();
      byExt[ext] = byExt[ext] ?? { count: 0, bytes: 0 };
      byExt[ext].count += 1;
      byExt[ext].bytes += size;
    }
    result[platform] = {
      bundleFile: entry.bundle,
      bundleBytes,
      bundleGzipBytes: gzipBytes,
      assetCount: (entry.assets ?? []).length,
      assetBytes,
      assetsMissing: missing,
      assetsByExt: byExt,
    };
  }
  return result;
}

const mb = (n) => (n === null || n === undefined ? 'н/д' : `${(n / 1048576).toFixed(2)} МБ`);

/** Markdown-отчёт; installBytes = { ios?: число, android?: число } (размер .ipa / .aab/.apk). */
export function renderReport(summary, installBytes = {}) {
  const lines = [
    '# PM-216 — размер release bundle по платформам',
    '',
    'Размер репозитория, `assets/` на диске и архива EAS в этот отчёт НЕ входят и за размер приложения не выдаются (см. PM-009).',
    '',
    '| Платформа | JS (min) | JS (gzip) | Assets (шт.) | Assets | Установочный файл | Native, оценка |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  for (const platform of PLATFORMS) {
    const s = summary[platform];
    if (!s) { lines.push(`| ${platform} | н/д | н/д | н/д | н/д | н/д | н/д |`); continue; }
    const install = installBytes[platform] ?? null;
    const native = install === null || s.bundleBytes === null ? null : Math.max(0, install - s.bundleBytes - s.assetBytes);
    lines.push(`| ${platform} | ${mb(s.bundleBytes)} | ${mb(s.bundleGzipBytes)} | ${s.assetCount} | ${mb(s.assetBytes)} | ${mb(install)} | ${mb(native)} |`);
  }
  lines.push('', 'Native = установочный файл − JS − assets (нативные библиотеки, шрифты плагинов, иконки): оценка, а не точный обмер. «н/д» — вход не дан, число не выдумываем.', '');
  for (const platform of PLATFORMS) {
    const s = summary[platform];
    if (!s) continue;
    lines.push(`## Assets ${platform} по типам`, '', '| Тип | Шт. | Размер |', '|---|---:|---:|');
    for (const [ext, v] of Object.entries(s.assetsByExt).sort((a, b) => b[1].bytes - a[1].bytes)) {
      lines.push(`| ${ext} | ${v.count} | ${mb(v.bytes)} |`);
    }
    if (s.assetsMissing > 0) lines.push('', `Файлов assets, не найденных на диске: ${s.assetsMissing} (в суммы не входят).`);
    lines.push('');
  }
  return lines.join('\n');
}

function main(argv) {
  const dir = argv[0];
  if (!dir || dir.startsWith('--')) {
    console.error(`${LOG} использование: node scripts/pm216_release_size_report.mjs <каталог expo export> [--ipa файл] [--aab файл] [--out файл.md]`);
    process.exit(2);
  }
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const install = {};
  const ipa = arg('--ipa');
  const aab = arg('--aab');
  if (ipa) install.ios = fileSize(ipa) ?? undefined;
  if (aab) install.android = fileSize(aab) ?? undefined;
  const summary = summarizeExport(dir);
  const report = renderReport(summary, install);
  const out = arg('--out');
  if (out) writeFileSync(out, report, 'utf8');
  console.log(report);
  console.log(`${LOG} готово: платформы=${Object.keys(summary).join(',') || 'нет'} install=${JSON.stringify(install)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
