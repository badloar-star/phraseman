// зачем (координатор 12.10, Главная: «сперва логи на паузу 2792 мс — откуда, повторяется ли»): в журнале паузы JS-потока видны (`[JS-STALL]`), но ЧТО в это время выполнялось — нет:
// JS-поток занят, он молчит, а [COLD-START-IO] «медленно» просто ждёт, пока поток освободится. Профиль Hermes (CDP Profiler.*) называет функции и файлы.
// Чистый разбор профиля `.cpuprofile` без сети и без записи — тестируется в node (tests/hermes_cpuprofile_summary.test.mjs).
// Формат: { nodes: [{ id, callFrame: { functionName, url, lineNumber } }], startTime, endTime, samples: [nodeId], timeDeltas: [мкс] }.

const IDLE_NAMES = new Set(['(idle)', '(program)', '(root)']);

/** Короткое имя файла: без запроса `?platform=…` и без хоста Metro. */
export function shortUrl(url) {
  if (!url) return '(native)';
  const noQuery = String(url).split('?')[0];
  const marker = noQuery.indexOf('/node_modules/');
  if (marker >= 0) return noQuery.slice(marker + 1);
  const parts = noQuery.split('/');
  return parts.slice(-3).join('/');
}

function nodeLabel(node) {
  const cf = node.callFrame ?? {};
  const name = cf.functionName && cf.functionName.length > 0 ? cf.functionName : '(anonymous)';
  return `${name} @ ${shortUrl(cf.url)}:${(cf.lineNumber ?? 0) + 1}`;
}

function isIdle(node) {
  const name = node?.callFrame?.functionName ?? '';
  return IDLE_NAMES.has(name);
}

/**
 * Интервалы между сэмплами (мкс). Hermes через CDP при startTime=0 кладёт в один из первых интервалов (в реальных профилях Сверки — ВТОРОЙ, [0, 30839113838, 17954, …]) время от эпохи
 * (≈3·10^10 мкс) — оно не относится к профилю (Сверка 12.10: «всего 30 853 146 мс, один занятый участок 30 839 239 мс»). Интервал между двумя сэмплами длиннее 10 минут — не интервал: считаем нулём.
 */
const MAX_DELTA_US = 600_000_000;
export function sampleDeltas(profile) {
  return profile.timeDeltas.slice(0, profile.samples.length).map((delta) => (delta > MAX_DELTA_US ? 0 : delta));
}

/** Метки времени сэмплов (мкс от начала профиля). */
export function sampleTimes(profile) {
  const deltas = sampleDeltas(profile);
  const out = new Array(profile.samples.length);
  let t = 0;
  for (let i = 0; i < profile.samples.length; i += 1) {
    t += deltas[i] ?? 0;
    out[i] = t;
  }
  return out;
}

function topN(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, us]) => ({ label, ms: Math.round(us / 1000) }));
}

/**
 * Занятые участки JS-потока: подряд идущие неидловые сэмплы (щели короче `gapMs` склеиваются), длиннее `minMs`.
 * Для каждого — смещение от начала профиля, длительность, топ функций по собственному времени и топ файлов.
 */
export function findBusyRuns(profile, { minMs = 400, gapMs = 20, top = 6 } = {}) {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const times = sampleTimes(profile);
  const deltas = sampleDeltas(profile);
  const runs = [];
  let current = null;
  let lastBusyAt = 0;
  for (let i = 0; i < profile.samples.length; i += 1) {
    const node = byId.get(profile.samples[i]);
    const at = times[i];
    const dt = deltas[i] ?? 0;
    const busy = node && !isIdle(node);
    if (busy) {
      if (current && at - lastBusyAt > gapMs * 1000) {
        runs.push(current);
        current = null;
      }
      if (!current) current = { startUs: at - dt, endUs: at, selfByFn: new Map(), selfByFile: new Map() };
      current.endUs = at;
      lastBusyAt = at;
      const label = nodeLabel(node);
      current.selfByFn.set(label, (current.selfByFn.get(label) ?? 0) + dt);
      const file = shortUrl(node.callFrame?.url);
      current.selfByFile.set(file, (current.selfByFile.get(file) ?? 0) + dt);
    }
  }
  if (current) runs.push(current);
  return runs
    .map((run) => ({
      startMs: Math.round(run.startUs / 1000),
      durationMs: Math.round((run.endUs - run.startUs) / 1000),
      topFunctions: topN(run.selfByFn, top),
      topFiles: topN(run.selfByFile, top),
    }))
    .filter((run) => run.durationMs >= minMs)
    .sort((a, b) => b.durationMs - a.durationMs);
}

/** Общий итог: сколько времени поток был занят и топ файлов за весь профиль. */
export function summarizeProfile(profile, options = {}) {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const deltas = sampleDeltas(profile);
  let busyUs = 0;
  let totalUs = 0;
  let idleSamples = 0;
  const byFile = new Map();
  for (let i = 0; i < profile.samples.length; i += 1) {
    const dt = deltas[i] ?? 0;
    totalUs += dt;
    const node = byId.get(profile.samples[i]);
    if (!node || isIdle(node)) { idleSamples += 1; continue; }
    busyUs += dt;
    const file = shortUrl(node.callFrame?.url);
    byFile.set(file, (byFile.get(file) ?? 0) + dt);
  }
  return {
    totalMs: Math.round(totalUs / 1000),
    busyMs: Math.round(busyUs / 1000),
    samples: profile.samples.length,
    idleSamples,
    topFiles: topN(byFile, options.top ?? 12),
    busyRuns: findBusyRuns(profile, options),
  };
}

export function formatSummary(summary) {
  const lines = [];
  lines.push(`[CPU-PROFILE] всего ${summary.totalMs} мс, занят ${summary.busyMs} мс, сэмплов ${summary.samples}`);
  if (summary.samples > 0 && summary.idleSamples === 0) {
    // зачем (Сверка 12.10: «окна занято 500/500»): Hermes через CDP не пишет (idle)-кадры — простой может быть записан последним кадром, поэтому «занят» завышен; смотрите СОБСТВЕННОЕ время функций, а не процент занятости.
    lines.push('[CPU-PROFILE] ⚠ в профиле нет (idle)-сэмплов: процент «занят» завышен (простой записан последним кадром) — опирайтесь на собственное время функций');
  }
  lines.push('[CPU-PROFILE] топ файлов по собственному времени:');
  for (const f of summary.topFiles) lines.push(`  ${String(f.ms).padStart(6)} мс  ${f.label}`);
  lines.push(`[CPU-PROFILE] непрерывные занятые участки JS-потока (≥ порога): ${summary.busyRuns.length}`);
  for (const run of summary.busyRuns) {
    lines.push(`  +${run.startMs} мс, ${run.durationMs} мс подряд`);
    for (const f of run.topFiles.slice(0, 4)) lines.push(`      файл  ${String(f.ms).padStart(5)} мс  ${f.label}`);
    for (const f of run.topFunctions.slice(0, 4)) lines.push(`      функц ${String(f.ms).padStart(5)} мс  ${f.label}`);
  }
  return lines.join('\n');
}
