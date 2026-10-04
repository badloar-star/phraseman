// PM-220 «регрессионные performance gates»: проверка ТРЁХ измеримых вещей против config/perf-budgets.json.
//   bundle <каталог бандл-экспорта>   — размер JS (hermes) и ассетов по платформам против бюджета
//   homepaint <logcat.log ...>        — «Start proc → [HOME-PAINT] first_frame», по файлу на запуск
//   coldio <logcat.log>               — строка [COLD-START-IO] summary (число обращений к хранилищу)
//   amstart <ключ> <файл>             — серия `am start -W` (coldStartAmW / warmStart / reenter): TotalTime против бюджета
//   frames <gfxinfo.txt>              — dumpsys gfxinfo: p95/p99 кадра и доля janky против бюджета
// Выход 0 — в бюджете, 1 — регрессия, 2 — нет данных/ошибка вызова (молча «ОК» не бывает).
// зачем (владелец: «так чтобы все летало»; координатор, Q111): бюджеты — от локального замера release-сборки
// на профиле 2 ядра / 2 ГБ, а не «от балды». Чем ограничено: config/perf-budgets.json, поле provenance.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { summarizeExport } from './pm216_release_size_report.mjs';

const LOG = '[PM-220]';
const DEFAULT_BUDGETS = 'config/perf-budgets.json';

export function loadBudgets(file = DEFAULT_BUDGETS) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Бюджет бандла: каждая платформа из бюджета обязана быть в обмере; превышение любого поля — нарушение. */
export function evaluateBundle(summary, budget) {
  const problems = [];
  const rows = [];
  for (const [platform, limits] of Object.entries(budget.platforms)) {
    const got = summary?.[platform];
    if (!got) { problems.push(`${platform}: нет в обмере`); continue; }
    const checks = [
      ['bundleBytes', got.bundleBytes, limits.maxBundleBytes],
      ['bundleGzipBytes', got.bundleGzipBytes, limits.maxBundleGzipBytes],
      ['assetCount', got.assetCount, limits.maxAssetCount],
      ['assetBytes', got.assetBytes, limits.maxAssetBytes],
    ];
    for (const [field, value, max] of checks) {
      rows.push({ platform, field, value, max });
      if (!Number.isFinite(value)) problems.push(`${platform}.${field}: значение не число (${value})`);
      else if (value > max) problems.push(`${platform}.${field}: ${value} > бюджета ${max} (+${value - max})`);
    }
    if (got.assetsMissing > 0) problems.push(`${platform}: не найдено ассетов ${got.assetsMissing}`);
  }
  return { ok: problems.length === 0, problems, rows };
}

/** Из logcat -v epoch: мс от строки «Start proc … <pkg>» до первой метки [HOME-PAINT] first_frame. */
export function parseHomePaintMs(logText, pkg = 'app.phraseman') {
  const startRe = new RegExp(`^\\s*(\\d+\\.\\d+)\\s.*Start proc \\d+:${pkg.replace(/\./g, '\\.')}`);
  let procTs = null;
  let paintTs = null;
  let markers = 0;
  for (const line of logText.split(/\r?\n/)) {
    if (procTs === null) {
      const m = startRe.exec(line);
      if (m) procTs = Number(m[1]);
    }
    if (line.includes('[HOME-PAINT] first_frame')) {
      markers += 1;
      if (paintTs === null) {
        const m = /^\s*(\d+\.\d+)\s/.exec(line);
        if (m) paintTs = Number(m[1]);
      }
    }
  }
  if (procTs === null || paintTs === null) return { ms: null, markers, procTs, paintTs };
  return { ms: Math.round((paintTs - procTs) * 1000), markers, procTs, paintTs };
}

export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const i = Math.max(1, Math.round(sorted.length * p));
  return sorted[Math.min(sorted.length, i) - 1];
}

/** Бюджет первого кадра Главной: минимум запусков, ровно одна метка за запуск, медиана и p90 не хуже бюджета. */
export function evaluateHomePaint(runs, budget) {
  const problems = [];
  const values = runs.filter((r) => r.ms !== null).map((r) => r.ms).sort((a, b) => a - b);
  if (runs.length < budget.minRuns) problems.push(`запусков ${runs.length} < ${budget.minRuns}: мало для вывода`);
  for (const [i, r] of runs.entries()) {
    if (r.ms === null) problems.push(`запуск ${i + 1}: нет Start proc или метки [HOME-PAINT] (markers=${r.markers})`);
    else if (r.markers !== 1) problems.push(`запуск ${i + 1}: меток [HOME-PAINT] ${r.markers}, ожидалась 1`);
  }
  const median = percentile(values, 0.5);
  const p90 = percentile(values, 0.9);
  if (median !== null && median > budget.maxMedianMs) problems.push(`медиана ${median} мс > ${budget.maxMedianMs} мс`);
  if (p90 !== null && p90 > budget.maxP90Ms) problems.push(`p90 ${p90} мс > ${budget.maxP90Ms} мс`);
  return { ok: problems.length === 0, problems, median, p90, values };
}

/** Последняя строка «[COLD-START-IO] summary …» → числа. */
export function parseColdStartIo(logText) {
  const lines = logText.split(/\r?\n/).filter((l) => l.includes('[COLD-START-IO] summary'));
  if (lines.length === 0) return null;
  const line = lines[lines.length - 1];
  const num = (name) => {
    const m = new RegExp(`${name}=(\\d+)`).exec(line);
    return m ? Number(m[1]) : null;
  };
  const patchedMatch = /patched=(\{[^}]*\})/.exec(line);
  let patched = null;
  if (patchedMatch) {
    try { patched = JSON.parse(patchedMatch[1]); } catch (error) {
      console.warn(`${LOG} patched не разобран: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { windowMs: num('windowMs'), calls: num('calls'), groups: num('groups'), maxInflight: num('maxInflight'), patched, summaries: lines.length };
}

export function evaluateColdStartIo(parsed, budget) {
  const problems = [];
  if (!parsed) return { ok: false, problems: ['нет строки [COLD-START-IO] summary (трассировка не установилась или окно не закрылось)'] };
  if (budget.requireAllPatched) {
    const bad = parsed.patched ? Object.entries(parsed.patched).filter(([, v]) => v !== true).map(([k]) => k) : ['patched_missing'];
    if (bad.length) problems.push(`не обёрнуты API трассировки: ${bad.join(', ')}`);
  }
  if (parsed.windowMs !== budget.windowMs) problems.push(`окно ${parsed.windowMs} мс ≠ ${budget.windowMs} мс — числа несопоставимы`);
  if (parsed.calls === null || parsed.calls > budget.ceiling.calls) problems.push(`calls ${parsed.calls} > потолка ${budget.ceiling.calls}`);
  if (parsed.maxInflight === null || parsed.maxInflight > budget.ceiling.maxInflight) problems.push(`maxInflight ${parsed.maxInflight} > потолка ${budget.ceiling.maxInflight}`);
  return { ok: problems.length === 0, problems };
}

/** Из вывода `adb shell am start -W` (по запуску на файл или несколько запусков в одном): значения «TotalTime: N» в мс. */
export function parseAmStartTotalMs(text) {
  const out = [];
  for (const m of String(text).matchAll(/TotalTime:\s*(\d+)/g)) out.push(Number(m[1]));
  return out;
}

/**
 * Бюджет серии запусков `am start -W` (холодный, тёплый, повторный вход): минимум запусков, медиана и p90 не хуже бюджета.
 * зачем (PM-220 A2): ворота «возврат из фона» и «тёплый старт» раньше были только исходниковыми сторожами с threshold=null.
 */
export function evaluateAmStartSeries(values, budget) {
  const problems = [];
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length < budget.minRuns) problems.push(`запусков ${sorted.length} < ${budget.minRuns}: мало для вывода`);
  const median = percentile(sorted, 0.5);
  const p90 = percentile(sorted, 0.9);
  if (median !== null && median > budget.maxMedianMs) problems.push(`медиана ${median} мс > ${budget.maxMedianMs} мс`);
  if (p90 !== null && budget.maxP90Ms !== undefined && p90 > budget.maxP90Ms) problems.push(`p90 ${p90} мс > ${budget.maxP90Ms} мс`);
  return { ok: problems.length === 0, problems, median, p90, values: sorted };
}

/** Из `adb shell dumpsys gfxinfo <pkg>`: число кадров, доля «janky» и перцентили времени кадра (мс). */
export function parseGfxinfoFrames(text) {
  const num = (re) => {
    const m = re.exec(String(text));
    return m ? Number(m[1]) : null;
  };
  const jankyMatch = /Janky frames:\s*\d+\s*\(([\d.]+)%\)/.exec(String(text));
  return {
    frames: num(/Total frames rendered:\s*(\d+)/),
    jankyPct: jankyMatch ? Number(jankyMatch[1]) : null,
    p50: num(/50th percentile:\s*(\d+)ms/),
    p90: num(/90th percentile:\s*(\d+)ms/),
    p95: num(/95th percentile:\s*(\d+)ms/),
    p99: num(/99th percentile:\s*(\d+)ms/),
  };
}

/** Бюджет плавности прокрутки: достаточно кадров для вывода, p95 и p99 кадра и доля janky не хуже бюджета. */
export function evaluateFrames(parsed, budget) {
  const problems = [];
  if (!parsed || parsed.frames === null) return { ok: false, problems: ['нет данных gfxinfo (Total frames rendered)'] };
  if (parsed.frames < budget.minFrames) problems.push(`кадров ${parsed.frames} < ${budget.minFrames}: мало для вывода`);
  if (parsed.p95 === null || parsed.p95 > budget.maxP95Ms) problems.push(`p95 кадра ${parsed.p95} мс > ${budget.maxP95Ms} мс`);
  if (parsed.p99 === null || parsed.p99 > budget.maxP99Ms) problems.push(`p99 кадра ${parsed.p99} мс > ${budget.maxP99Ms} мс`);
  if (parsed.jankyPct === null || parsed.jankyPct > budget.maxJankyPct) problems.push(`janky ${parsed.jankyPct}% > ${budget.maxJankyPct}%`);
  return { ok: problems.length === 0, problems };
}

function report(title, result) {
  console.log(`${LOG} ${title}: ${result.ok ? 'OK' : 'РЕГРЕССИЯ'}`);
  for (const p of result.problems) console.log(`${LOG}   - ${p}`);
}

export function main(argv) {
  const [cmd, ...args] = argv;
  const budgets = loadBudgets();
  if (cmd === 'bundle' && args[0]) {
    const result = evaluateBundle(summarizeExport(args[0]), budgets.bundle);
    for (const r of result.rows) console.log(`${LOG}   ${r.platform}.${r.field} = ${r.value} (бюджет ${r.max})`);
    report('бандл', result);
    return result.ok ? 0 : 1;
  }
  if (cmd === 'homepaint' && args.length > 0) {
    const runs = args.map((f) => parseHomePaintMs(fs.readFileSync(f, 'utf8'), budgets.homePaint.package));
    const result = evaluateHomePaint(runs, budgets.homePaint);
    console.log(`${LOG}   запусков=${runs.length} значения=${result.values.join(' ')} median=${result.median} p90=${result.p90}`);
    report('первый кадр Главной', result);
    return result.ok ? 0 : 1;
  }
  if (cmd === 'coldio' && args[0]) {
    const parsed = parseColdStartIo(fs.readFileSync(args[0], 'utf8'));
    if (parsed) console.log(`${LOG}   calls=${parsed.calls} groups=${parsed.groups} maxInflight=${parsed.maxInflight} windowMs=${parsed.windowMs}`);
    const result = evaluateColdStartIo(parsed, budgets.coldStartIo);
    report('холодный старт: обращения к хранилищу', result);
    return result.ok ? 0 : 1;
  }
  if (cmd === 'amstart' && args.length === 2 && budgets[args[0]]) {
    const values = parseAmStartTotalMs(fs.readFileSync(args[1], 'utf8'));
    const result = evaluateAmStartSeries(values, budgets[args[0]]);
    console.log(`${LOG}   ${args[0]}: запусков=${values.length} значения=${result.values.join(' ')} median=${result.median} p90=${result.p90}`);
    report(`am start -W (${args[0]})`, result);
    return result.ok ? 0 : 1;
  }
  if (cmd === 'frames' && args[0]) {
    const parsed = parseGfxinfoFrames(fs.readFileSync(args[0], 'utf8'));
    console.log(`${LOG}   кадров=${parsed.frames} janky=${parsed.jankyPct}% p50=${parsed.p50} p90=${parsed.p90} p95=${parsed.p95} p99=${parsed.p99}`);
    const result = evaluateFrames(parsed, budgets.frames);
    report('плавность кадров (gfxinfo)', result);
    return result.ok ? 0 : 1;
  }
  console.error(`${LOG} usage: pm220_perf_gates.mjs bundle <каталог> | homepaint <logcat...> | coldio <logcat> | amstart <coldStartAmW|warmStart|reenter> <файл с TotalTime> | frames <gfxinfo.txt>`);
  return 2;
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`${LOG} ошибка: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}
