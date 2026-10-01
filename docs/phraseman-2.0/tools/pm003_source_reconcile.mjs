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
const unanchored = items.filter((id) => !anchored.has(id));

const report = {
  requirements_total: reqs.length,
  verbatim_locators_checked: verbatimChecked,
  verbatim_mismatches: mismatches,
  requirements_without_task: withoutTask,
  screenshot_items_total: items.length,
  screenshot_items_anchored: items.length - unanchored.length,
  screenshot_items_unanchored: unanchored,
};
console.log('[PM-003]', JSON.stringify(report, null, 2));
process.exitCode = mismatches.length || withoutTask.length ? 1 : 0;
