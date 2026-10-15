#!/usr/bin/env node
// зачем: сессии 1-46 принимались по ОДНОМУ прогону судей, а замер 05.09.2026
// показал, что вердикт по одному прогону — жребий. Прогоняем готовые сессии
// двойным судейством (только reader и nonsense — самые ценные и дешевле,
// чем все пять) и составляем список тех, где претензия ВОСПРОИЗВЕЛАСЬ.
// Ничего не правим: аудит только показывает, куда смотреть.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const ROOT = path.join(HERE, '..');
const DIR = path.join(ROOT, 'sessions', 'en', 'l01');
const OUT = path.join(ROOT, 'ОТЧЁТ_АУДИТ_СЕССИЙ.md');
const JUDGES = ['judge_reader', 'judge_nonsense'];

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const FROM = +opt('from', 1), TO = +opt('to', 999);

const sessions = fs.readdirSync(DIR)
  .filter((s) => /^s\d+$/.test(s) && fs.existsSync(path.join(DIR, s, 'final.ru.md')))
  .sort((a, b) => +a.slice(1) - +b.slice(1))
  .filter((s) => +s.slice(1) >= FROM && +s.slice(1) <= TO);

console.log(`[АУДИТ] сессий к проверке: ${sessions.length} (${sessions[0]}..${sessions[sessions.length-1]})`);

const rows = [];
for (const s of sessions) {
  const dir = path.join(DIR, s);
  // убираем кэш вердиктов, иначе судейство не запустится заново
  for (const j of JUDGES) {
    const f = path.join(dir, `final.${j}.json`);
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { console.log(`[АУДИТ] не удалось убрать кэш ${s}/${j}: ${e.message}`); }
  }
  const r = spawnSync(process.execPath, [path.join(HERE, 'run.mjs'), 'judge', '--session', `en/l01/${s}`, '--file', 'final.ru.md'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.log(`[АУДИТ] ${s}: прогон упал (код ${r.status})`); rows.push({ s, err: `прогон упал: ${(r.stderr||'').slice(0,120)}` }); continue; }
  const row = { s, judges: {} };
  for (const j of JUDGES) {
    const f = path.join(dir, `final.${j}.json`);
    if (!fs.existsSync(f)) { row.judges[j] = { verdict: 'НЕ СУДИЛСЯ', confirmed: [] }; row.notJudged = true; continue; }
    try {
      const v = JSON.parse(fs.readFileSync(f, 'utf8'));
      row.judges[j] = { verdict: v.verdict, confirmed: v.confirmed_problems || [], reason: (v.verdict_reason || '').slice(0, 180) };
    } catch (e) { row.judges[j] = { verdict: '?', confirmed: [], reason: `вердикт нечитаем: ${e.message}` }; }
  }
  const conf = JUDGES.reduce((n, j) => n + (row.judges[j].confirmed?.length || 0), 0);
  console.log(`[АУДИТ] ${s}: ${JUDGES.map(j=>j.replace('judge_','')+'='+row.judges[j].verdict).join(' ')} | подтверждено: ${conf}`);
  rows.push(row);
}

let md = `# Аудит готовых сессий двойным судейством — ${new Date().toISOString().slice(0,10)}\n\n`;
md += `Проверено сессий: ${rows.length}. Судьи: читатель и бреда, по два прогона каждый.\n`;
md += `Правок не вносилось — это карта того, куда смотреть.\n\n`;
const bad = rows.filter((r) => !r.err && JUDGES.some((j) => (r.judges[j]?.confirmed?.length || 0) > 0));
const failed = rows.filter((r) => r.err);
md += `## Сессии с ПОДТВЕРЖДЁННЫМИ претензиями (${bad.length})\n\n`;
md += `Претензия повторилась в обоих прогонах — значит настоящая.\n\n`;
for (const r of bad) {
  md += `### ${r.s}\n`;
  for (const j of JUDGES) {
    const x = r.judges[j];
    if (!x.confirmed?.length) continue;
    md += `- **${j.replace('judge_','')}** (${x.verdict}): ${x.reason}\n`;
    for (const q of x.confirmed) md += `  - подтверждено: «${q}»\n`;
  }
  md += `\n`;
}
const skipped = rows.filter((r) => !r.err && r.notJudged);
const clean = rows.filter((r) => !r.err && !bad.includes(r) && !r.notJudged);
md += `## Сессии без подтверждённых претензий (${clean.length})\n\n`;
md += clean.map((r) => r.s).join(', ') + '\n\n';
if (skipped.length) { md += `## НЕ СУДИЛИСЬ — судейство оборвалось на ранней проверке (${skipped.length})\n\n`; md += skipped.map((r) => r.s).join(", ") + "\n\n"; }
if (failed.length) { md += `## Не проверены (${failed.length})\n\n`; for (const r of failed) md += `- ${r.s}: ${r.err}\n`; }
fs.writeFileSync(OUT, md);
console.log(`\n[АУДИТ] готово. С подтверждёнными претензиями: ${bad.length}, чистых: ${clean.length}, упало: ${failed.length}`);
console.log(`[АУДИТ] отчёт: ${OUT}`);
