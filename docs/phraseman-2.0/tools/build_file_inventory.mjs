// PM-005: детерминированная классификация ВСЕХ отслеживаемых git файлов по категориям.
// зачем: критерий «каждый first-party файл классифицирован» проверяется числом: сумма категорий
// обязана равняться знаменателю git ls-files, а unclassified = 0. Это КЛАССИФИКАЦИЯ ПО ПУТИ,
// а не построчный аудит содержимого (PM-005-A3: заявлений о 100% аудите не делаем).
// Запуск: node docs/phraseman-2.0/tools/build_file_inventory.mjs  (читает только git ls-files, лёгкий)
// Выход: docs/phraseman-2.0/registries/file_inventory.json (сводка + правила; не 44 тыс. строк).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const OUT = 'docs/phraseman-2.0/registries/file_inventory.json';
const raw = execFileSync('git', ['ls-files', '-z'], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8');
const files = raw.split('\0').filter(Boolean);
const head = execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();

// Порядок важен: первое совпадение побеждает. Категории из критерия A2: native/server/assets/tests/generated/vendor.
const RULES = [
  ['vendor', (p) => /(^|\/)node_modules\//.test(p) || /(^|\/)vendor\//.test(p) || /(^|\/)Pods\//.test(p)],
  ['generated', (p) => /(^|\/)lib\//.test(p) && /^functions[^/]*\//.test(p) || /\.js\.map$/.test(p) || /(^|\/)generated(_release)?\//.test(p) || /(^|\/)(build|dist)\//.test(p) || /\.eas-logs\//.test(p)],
  ['tests', (p) => /^(tests|test-results|maestro|.maestro|mocks|runtime-probes)\//.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p) || /\.probe\.[cm]?[jt]sx?$/.test(p)],
  ['native', (p) => /^(android|ios|hardware|plugins|patches)\//.test(p) || /^(app\.json|eas\.json|metro\.config\.js)$/.test(p)],
  ['server', (p) => /^functions[^/]*\//.test(p) || /^(firestore\.rules|storage\.rules|firebase\.json|firestore\.indexes\.json)$/.test(p) || /^subscription-recovery\//.test(p)],
  ['assets', (p) => /^(assets|asset_sources)\//.test(p) || /\.(png|jpe?g|webp|gif|svg|mp3|wav|m4a|ogg|mp4|mov|ttf|otf|woff2?|lottie)$/i.test(p)],
  ['client_code', (p) => /^(app|components|hooks|modules|constants|shared|config|lib|web_shims)\//.test(p)],
  ['content', (p) => /^(content|lingman-montazher)\//.test(p) || /^"content/.test(p)],
  ['admin_web', (p) => /^(admin|knowly-www|legal|store_release_stubs|.well-known)\//.test(p) || /\.html$/.test(p)],
  ['tooling_scripts', (p) => /^(scripts|tools|\.github|\.husky)\//.test(p)],
  ['docs', (p) => /^(docs|specs|ux-audit|animation-plans|\.planning|exports)\//.test(p) || /^"docs/.test(p) || /\.(md|docx|pdf)$/.test(p)],
  ['agent_config_and_archive', (p) => /^(\.claude|\.claude-flow|\.agents|\.codex|\.cursor|\.superpowers|\.swarm|\.obsidian|\.idea|\.vscode|\.dev-screens|.firebase|.hive-mind|.ruflo|.ruvector|_archive|_to_delete)\//.test(p)],
  ['root_config', (p) => !p.includes('/')],
];

const counts = Object.fromEntries(RULES.map(([name]) => [name, 0]));
counts.unclassified = 0;
const topDirsByCategory = {};
const unclassifiedSample = [];
for (const p of files) {
  const hit = RULES.find(([, test]) => test(p));
  const cat = hit ? hit[0] : 'unclassified';
  counts[cat] += 1;
  if (!hit && unclassifiedSample.length < 20) unclassifiedSample.push(p);
  const top = p.includes('/') ? p.split('/')[0] : '(root)';
  topDirsByCategory[cat] ||= {};
  topDirsByCategory[cat][top] = (topDirsByCategory[cat][top] || 0) + 1;
}
const total = files.length;
const sum = Object.values(counts).reduce((a, b) => a + b, 0);
if (sum !== total) throw new Error(`[PM-005] сумма категорий ${sum} != знаменатель ${total}`);

const out = {
  status: 'CLASSIFIED_BY_PATH_NOT_CONTENT_AUDITED',
  purpose: 'PM-005: каждому отслеживаемому git файлу присвоена ровно одна категория по пути. Это НЕ построчный аудит и НЕ реестр зависимостей.',
  generated_at_sha: head,
  denominator: { source: 'git ls-files', tracked_files: total, classified: total - counts.unclassified, unclassified: counts.unclassified },
  exclusions: [
    'Не отслеживаемые git файлы (node_modules, сборочные каталоги, .expo, локальные кэши) в знаменатель НЕ входят.',
    'Чужие незакоммиченные правки других сессий в знаменатель не входят (берётся только git ls-files).',
    'Категория определяется ТОЛЬКО по пути/расширению: файл в app/ считается client_code независимо от того, достижим ли он из релиза.',
  ],
  not_done: [
    'Граф зависимостей (кто кого импортирует) и признак release_reachable — отдельный тяжёлый проход (светофор), здесь не сделан.',
    'Решение оставить/удалить по каждому файлу — отдельные задачи удаления (E-эпики), здесь не принимается.',
  ],
  rules_order: RULES.map(([name]) => name),
  counts,
  top_dirs_by_category: topDirsByCategory,
  unclassified_sample: unclassifiedSample,
  columns: ['path', 'sha', 'category', 'feature', 'release_reachable', 'side_effects', 'decision', 'review_status', 'reviewer', 'evidence'],
  entries: [],
};
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log('[PM-005]', JSON.stringify({ total, counts }));
