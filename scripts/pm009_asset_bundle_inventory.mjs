// PM-009 «Инвентаризировать ассеты и тяжёлые библиотеки».
// зачем: A1 — размер исходного файла отделён от вклада в release bundle; A2 — для удаления
// найден путь импортирования и подтверждены остальные потребители. Реестр 24.09
// (registries/asset_inventory.json) мерил только du по assets/ и топ-40 вручную.
// Скрипт для КАЖДОГО файла assets/ определяет:
//   archive  — попадает ли в архив EAS (не исключён .easignore);
//   bundle   — тянет ли его Metro: есть статический require(...) из клиентского кода
//              или ссылка из app.json (иконки/сплэш/шрифты плагинов);
//   consumers — все файлы-потребители с номером строки (путь импортирования).
// Вклад в бандл = только файлы с bundle=yes. Это верхняя граница: require из модуля,
// который сам недостижим, тоже засчитан (граф достижимости Metro здесь не строится).
//   node scripts/pm009_asset_bundle_inventory.mjs → docs/phraseman-2.0/evidence/PM-009_asset_bundle_inventory.md
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, normalize, sep } from 'node:path';

const require = createRequire(import.meta.url);
const minimatch = require('minimatch');

const OUT = 'docs/phraseman-2.0/evidence/PM-009_asset_bundle_inventory.md';
const CODE_DIRS = ['app', 'components', 'hooks', 'modules', 'constants', 'lib', 'shared', 'utils', 'contexts', 'src'];
const SKIP = new Set(['node_modules', '__tests__', '__mocks__', 'graphify-out', '.git']);
const posix = (p) => p.split(sep).join('/');

function walk(dir, out, filter) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = posix(join(dir, e.name));
    if (e.isDirectory()) walk(p, out, filter);
    else if (filter(p)) out.push(p);
  }
  return out;
}

function easignorePatterns() {
  if (!existsSync('.easignore')) {
    console.warn('[PM-009] .easignore не найден — считаем, что в архив идёт всё');
    return [];
  }
  return readFileSync('.easignore', 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('!'));
}

// зачем: семантика gitignore в минимальном объёме: «/x» — от корня, «x/» — каталог,
// без слеша — по имени на любой глубине.
function ignoredBy(patterns, file) {
  return patterns.find((raw) => {
    let p = raw;
    const anchored = p.startsWith('/');
    if (anchored) p = p.slice(1);
    const dirOnly = p.endsWith('/');
    if (dirOnly) p = p.slice(0, -1);
    const globs = anchored || p.includes('/') ? [p] : [`**/${p}`];
    return globs.some((g) => minimatch(file, g, { dot: true }) || minimatch(file, `${g}/**`, { dot: true }));
  }) ?? null;
}

function main() {
  const assets = walk('assets', [], () => true).map((p) => ({ path: p, bytes: statSync(p).size }));
  const patterns = easignorePatterns();
  const code = CODE_DIRS.flatMap((d) => walk(d, [], (p) => /\.(ts|tsx|js|jsx)$/.test(p) && !/\.(test|spec)\.[jt]sx?$/.test(p)));
  const consumers = new Map();
  const addConsumer = (asset, where) => {
    if (!consumers.has(asset)) consumers.set(asset, []);
    consumers.get(asset).push(where);
  };
  for (const f of code) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/require\(\s*['"]([^'"]*assets\/[^'"]+)['"]\s*\)/g)) {
        const spec = m[1];
        const resolved = spec.startsWith('@/') ? spec.slice(2) : posix(normalize(join(dirname(f), spec)));
        addConsumer(resolved, `${f}:${i + 1}`);
      }
    });
  }
  const appJson = readFileSync('app.json', 'utf8');
  for (const m of appJson.matchAll(/"\.\/(assets\/[^"]+)"/g)) addConsumer(m[1], 'app.json');

  const rows = assets.map((a) => {
    const ign = ignoredBy(patterns, a.path);
    const used = consumers.get(a.path) ?? [];
    return { ...a, archive: ign ? `нет (.easignore: ${ign})` : 'да', bundle: !ign && used.length > 0, consumers: used };
  });
  const missing = [...consumers.keys()].filter((p) => !existsSync(p));
  const mb = (b) => (b / 1048576).toFixed(2);
  const sum = (xs) => xs.reduce((s, r) => s + r.bytes, 0);
  const groupKey = (p) => p.split('/').slice(0, 3).join('/');
  const groups = new Map();
  for (const r of rows) {
    const k = groupKey(r.path);
    const g = groups.get(k) ?? { files: 0, src: 0, bundle: 0, archive: 0, unused: 0, consumers: new Set() };
    g.files += 1; g.src += r.bytes;
    if (r.bundle) g.bundle += r.bytes;
    if (r.archive === 'да') g.archive += r.bytes;
    if (r.archive === 'да' && !r.bundle) g.unused += r.bytes;
    r.consumers.forEach((c) => g.consumers.add(c.split(':')[0]));
    groups.set(k, g);
  }
  const out = [];
  out.push('# PM-009 — ассеты: размер исходников против вклада в release bundle', '');
  out.push('Сгенерировано `node scripts/pm009_asset_bundle_inventory.mjs` (детерминированно, без сборки и без сети).', '');
  out.push('Колонки: **исходники** — все байты файлов в `assets/`; **в архиве EAS** — не исключено `.easignore`; **в бандле** — есть статический `require()` из клиентского кода или ссылка из `app.json` (верхняя граница: достижимость модуля-потребителя не проверяется); **в архиве, но не в бандле** — грузится в сборочный архив, но Metro его не тянет (кандидаты на чистку). Настоящий diff `.aab/.ipa` требует EAS-сборки и здесь не делается.', '');
  out.push(`Итого: файлов **${rows.length}**, исходники **${mb(sum(rows))} МБ**, в архиве EAS **${mb(sum(rows.filter((r) => r.archive === 'да')))} МБ**, в бандле **${mb(sum(rows.filter((r) => r.bundle)))} МБ** (${rows.filter((r) => r.bundle).length} файлов), в архиве, но не в бандле **${mb(sum(rows.filter((r) => r.archive === 'да' && !r.bundle)))} МБ**.`, '');
  if (missing.length) {
    out.push(`⚠ require на несуществующие файлы (${missing.length}): ${missing.slice(0, 20).map((p) => `\`${p}\``).join(', ')}`, '');
  }
  out.push('## По каталогам', '', '| Каталог | Файлов | Исходники, МБ | В архиве EAS, МБ | В бандле, МБ | В архиве, не в бандле, МБ | Файлы-потребители |', '|---|---:|---:|---:|---:|---:|---|');
  for (const [k, g] of [...groups.entries()].sort((a, b) => b[1].src - a[1].src)) {
    const cons = [...g.consumers].sort();
    out.push(`| \`${k}\` | ${g.files} | ${mb(g.src)} | ${mb(g.archive)} | ${mb(g.bundle)} | ${mb(g.unused)} | ${cons.length ? `${cons.length}: ${cons.slice(0, 3).join(', ')}${cons.length > 3 ? ', …' : ''}` : 'нет'} |`);
  }
  out.push('', '## Топ-40 файлов по размеру', '', '| Файл | КБ | В архиве EAS | В бандле | Путь импортирования (потребители) |', '|---|---:|---|---|---|');
  for (const r of [...rows].sort((a, b) => b.bytes - a.bytes).slice(0, 40)) {
    out.push(`| \`${r.path}\` | ${Math.round(r.bytes / 1024)} | ${r.archive} | ${r.bundle ? 'да' : 'нет'} | ${r.consumers.slice(0, 3).join('<br>') || 'нет'}${r.consumers.length > 3 ? ` (+${r.consumers.length - 3})` : ''} |`);
  }
  const candidates = rows.filter((r) => r.archive === 'да' && !r.bundle).sort((a, b) => b.bytes - a.bytes);
  out.push('', `## Кандидаты на удаление: в архиве, потребителей нет (${candidates.length} файлов, ${mb(sum(candidates))} МБ)`, '');
  out.push('Для каждого кандидата проверено: ни одного `require()` в клиентском коде и ни одной ссылки в `app.json`. Перед удалением дополнительно: `git grep -n "<имя файла>"` (динамические пути и скрипты контента), владелец ассетов (D69: новые ассеты Главной и 20 монет рангов не трогать). Скрипт ничего не удаляет.', '');
  out.push('| Файл | КБ |', '|---|---:|');
  for (const r of candidates.slice(0, 150)) out.push(`| \`${r.path}\` | ${Math.round(r.bytes / 1024)} |`);
  if (candidates.length > 150) out.push(`| … ещё ${candidates.length - 150} | |`);
  writeFileSync(OUT, out.join('\n') + '\n');
  console.log(`[PM-009] files=${rows.length} srcMB=${mb(sum(rows))} bundleMB=${mb(sum(rows.filter((r) => r.bundle)))} candidates=${candidates.length} missingRequires=${missing.length} → ${OUT}`);
}

main();
