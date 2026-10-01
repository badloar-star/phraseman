// PM-003: механическая сверка реестра требований с исходной записью и расшифровкой шести скриншотов.
// зачем: критерий «каждый найденный пункт имеет source locator, ID, статус и задачу» нельзя принимать
// на глаз. Скрипт проверяет: (1) дословные выдержки совпадают с исходным текстом по offsets,
// (2) у каждого требования есть задача, (3) каждый пункт S01.. расшифровки скриншотов привязан
// (anchor) хотя бы к одному требованию. Запуск из корня репозитория:
//   node docs/phraseman-2.0/tools/pm003_source_reconcile.mjs
import fs from 'node:fs';

const ROOT = 'docs/phraseman-2.0';
const reqRaw = JSON.parse(fs.readFileSync(`${ROOT}/registries/requirements.json`, 'utf8'));
const reqs = Array.isArray(reqRaw) ? reqRaw : reqRaw.requirements || Object.values(reqRaw);
const cache = new Map();
const sourceChars = (file) => {
  if (!cache.has(file)) cache.set(file, [...fs.readFileSync(`${ROOT}/${file}`, 'utf8')]);
  return cache.get(file);
};

let verbatimChecked = 0;
const mismatches = [];
const withoutTask = [];
for (const r of reqs) {
  if (!r.tasks || r.tasks.length === 0) withoutTask.push(r.id);
  const s = r.source;
  if (s && s.verbatim && s.file && Number.isInteger(s.start_char)) {
    verbatimChecked += 1;
    const got = sourceChars(s.file).slice(s.start_char, s.end_char).join('');
    if (got !== s.excerpt) mismatches.push(r.id);
  }
}

const transcript = fs.readFileSync(`${ROOT}/sources/02_screenshot_transcript.md`, 'utf8');
const items = [...transcript.matchAll(/^(S\d{2})\./gm)].map((m) => m[1]);
const anchored = new Set(reqs.filter((r) => r.source && r.source.anchor).map((r) => r.source.anchor));
// зачем: 32 пункта без собственного R привязаны через registries/screenshot_coverage.json (D и/или R);
// пункт считается привязанным, если есть anchor у требования ИЛИ запись покрытия с реально существующими R.
const coverage = JSON.parse(fs.readFileSync(`${ROOT}/registries/screenshot_coverage.json`, 'utf8'));
const reqIds = new Set(reqs.map((r) => r.id));
const badCoverage = [];
for (const [sid, c] of Object.entries(coverage.coverage)) {
  const okR = (c.requirements || []).length > 0 && c.requirements.every((id) => reqIds.has(id));
  const okD = (c.decisions || []).length > 0;
  if (!okR || !okD) badCoverage.push(sid);
}
const covered = new Set(Object.keys(coverage.coverage).filter((id) => !badCoverage.includes(id)));
const unanchored = items.filter((id) => !anchored.has(id) && !covered.has(id));
const unconfirmed = (coverage.unconfirmed || []).map((u) => u.id);

const report = {
  requirements_total: reqs.length,
  verbatim_locators_checked: verbatimChecked,
  verbatim_mismatches: mismatches,
  requirements_without_task: withoutTask,
  screenshot_items_total: items.length,
  screenshot_items_anchored: items.length - unanchored.length,
  screenshot_items_anchored_by_requirement: items.filter((id) => anchored.has(id)).length,
  screenshot_items_bound_by_coverage_file: items.filter((id) => !anchored.has(id) && covered.has(id)).length,
  screenshot_items_unanchored: unanchored,
  screenshot_coverage_bad_entries: badCoverage,
  screenshot_items_unconfirmed: unconfirmed,
};
console.log('[PM-003]', JSON.stringify(report, null, 2));
process.exitCode = mismatches.length || withoutTask.length || unanchored.length || badCoverage.length ? 1 : 0;
