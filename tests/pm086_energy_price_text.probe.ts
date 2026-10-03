import fs from 'node:fs';
import path from 'node:path';

// зачем: PM-086 «Убрать ценники энергии со всех кнопок». Проба доказывает по исходникам:
//  A2 — ни один текст доступности (accessibilityLabel/Hint) и ни одна видимая строка не
//       называет устаревшие цены 10/20/25 энергии;
//  A1 (исходная часть) — у всех режимов одна цена из таблицы ENERGY_ACTIVITY_PRICES, а окно
//       нехватки энергии во всех 9 локалях берёт число из этой таблицы, а не из литерала.
// Видимую проверку Free/Plus на устройстве проба НЕ заменяет.
const ROOTS = ['app', 'components', 'modules', 'hooks', 'constants'];
const ENERGY_WORD = /⚡|энерг|енерг|energ|năng lượng|enerji/iu;
const STALE_PRICE = /(?<![\d.,])(10|20|25)(?![\d.,%])/u;
// зачем: цена — это число РЯДОМ со словом энергии («20 ⚡», «нужно 25 энергии»), а не любое
// число в тексте про энергию (факт «10–20 минут сна заряжают энергией» ценой не является).
const PRICE_NEAR_ENERGY = /(?<![\d.,])(?:10|20|25)(?![\d.,%])\s{0,2}(?:⚡|энерг|енерг|energ|năng lượng|enerji)|(?:⚡|энерги[июя]|енергі[ї]|energy|energía|energia|energii|enerji)\s{0,3}[:x×]?\s{0,2}(?:10|20|25)(?![\d.,%])/iu;
// зачем: аллоулист был нужен для app/level_gift_system.ts («+20 энергии до полуночи» — награда, а не цена);
// файл удалён (§99, 03.10, D09), список пуст — любое исключение теперь надо добавлять осознанно.
const ALLOW = new Map<string, string>([]);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length))
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) => m.replace(/[^\n]/g, ' '));
}

const files: string[] = [];
function walk(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '__tests__', 'graphify-out'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(full.replace(/\\/g, '/'));
  }
}
ROOTS.forEach(walk);

const problems: string[] = [];
let literalsScanned = 0;
let a11yScanned = 0;
for (const file of files) {
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  const lineOf = (idx: number) => code.slice(0, idx).split('\n').length;
  // 1) строковые и шаблонные литералы рядом со словом «энергия»/⚡ с числом 10/20/25
  for (const m of code.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)) {
    const lit = m[0];
    literalsScanned += 1;
    if (!ENERGY_WORD.test(lit) || !PRICE_NEAR_ENERGY.test(lit.replace(/\$\{[^}]*\}/g, ''))) continue;
    if (ALLOW.has(file)) continue;
    problems.push(`${file}:${lineOf(m.index ?? 0)} устаревшая цена энергии в тексте: ${lit.slice(0, 120)}`);
  }
  // 2) тексты доступности: выражение после accessibilityLabel/Hint не содержит 10/20/25 ⚡
  for (const m of code.matchAll(/accessibility(?:Label|Hint)\s*[=:]\s*(\{[^}\n]{0,300}\}|'[^'\n]*'|"[^"\n]*")/g)) {
    a11yScanned += 1;
    const expr = m[1];
    if (ENERGY_WORD.test(expr) && PRICE_NEAR_ENERGY.test(expr)) {
      problems.push(`${file}:${lineOf(m.index ?? 0)} текст доступности с ценой энергии: ${expr.slice(0, 120)}`);
    }
  }
}

// 3) единая цена для всех режимов
const contract = fs.readFileSync('app/energy_contract.ts', 'utf8');
const cost = /export const ENERGY_SESSION_COST = (\d+) as const;/.exec(contract);
if (!cost || cost[1] !== '1') problems.push(`ENERGY_SESSION_COST должен быть 1, найдено: ${cost?.[1] ?? 'нет'}`);
const table = /ENERGY_ACTIVITY_PRICES[^=]*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/.exec(contract);
const keys = /export type EnergyActivityKey =([\s\S]*?);/.exec(contract)?.[1].match(/'([a-z_0-9]+)'/g)?.map((k) => k.slice(1, -1)) ?? [];
if (!table) problems.push('не найдена таблица ENERGY_ACTIVITY_PRICES');
const rows = new Map([...(table?.[1] ?? '').matchAll(/(\w+):\s*([\w]+)/g)].map((r) => [r[1], r[2]]));
for (const key of keys) {
  const v = rows.get(key);
  if (v !== 'ENERGY_SESSION_COST' && v !== '0') problems.push(`режим ${key}: цена ${v ?? 'нет'} — не единая`);
}
if (keys.length < 10) problems.push(`подозрительно мало режимов в EnergyActivityKey: ${keys.length}`);

// 4) окно нехватки энергии: 9 локалей, число только из ${required}, источник — activityEnergyCost
const titles = fs.readFileSync('app/energy_activity_titles.ts', 'utf8');
const gate = /export function energyGateMessage[\s\S]*?\n\}/.exec(titles)?.[0] ?? '';
const LOCALES = ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl'];
for (const loc of LOCALES) {
  const line = new RegExp(`\\n\\s*${loc.replace(/[-']/g, (c) => (c === '-' ? '\\-' : "'"))}:\\s*\`([^\`]*)\``).exec(gate);
  if (!line) { problems.push(`energyGateMessage: нет локали ${loc}`); continue; }
  if (!line[1].includes('${required} ⚡')) problems.push(`energyGateMessage ${loc}: цена не из \${required}`);
  if (STALE_PRICE.test(line[1].replace(/\$\{[^}]*\}/g, ''))) problems.push(`energyGateMessage ${loc}: литерал цены`);
}
const modal = fs.readFileSync('components/NoEnergyModal.tsx', 'utf8');
if (!/const requiredEnergy = activity \? activityEnergyCost\(activity\) : Math\.max\(ENERGY_SESSION_COST/.test(modal)) {
  problems.push('NoEnergyModal: requiredEnergy больше не берётся из activityEnergyCost/ENERGY_SESSION_COST');
}

console.log(`[PM-086] files=${files.length} literals=${literalsScanned} a11y=${a11yScanned} modes=${keys.length} locales=${LOCALES.length} allow=${ALLOW.size}`);
if (problems.length) {
  for (const p of problems) console.log(`  - ${p}`);
  throw new Error(`PM-086: ${problems.length} проблем`);
}
console.log('PM-086 ENERGY PRICE TEXT: PASS');
