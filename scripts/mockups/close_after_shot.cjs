// зачем (координатор 15.10, до 07:20): утром после снимка №7 закрыть пачкой pending-строки реестра visual_parity.json,
// у которых ВСЕ отличия — только [данные] (демо-данные/фикстура, не дефект) или устаревший образец (образец уже приведён к коду).
// Реестр только читается; итог — список docs/phraseman-2.0/evidence/parity_moments_v1/CLOSE_AFTER_SHOT_<дата>.md.
// Строки «Совпадает…», «… ✓», «⚠ Снимок старше кода» — не отличия. Отличие без тега — значит не разобрано, строка в список НЕ идёт.
// usage: node scripts/mockups/close_after_shot.cjs
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const REG = path.join(ROOT, 'docs', 'phraseman-2.0', 'registries', 'visual_parity.json');
const OUT = path.join(ROOT, 'docs', 'phraseman-2.0', 'evidence', 'parity_moments_v1', `CLOSE_AFTER_SHOT_${new Date().toISOString().slice(0, 10)}.md`);
const log = (...a) => console.log('[CLOSE-AFTER-SHOT]', ...a);
const j = JSON.parse(fs.readFileSync(REG, 'utf8'));
const tagOf = (d) => { const m = String(d).match(/^\s*\[([^\]]+)\]/); return m ? m[1] : null; };
const DATA = (t) => /^данные/.test(t);
const STALE = (t) => /^образец (приведён к коду|устарел|дорисован|дополнен|перерисован|отстаёт)/.test(t);
// второй список: по разбору 13–14.10 «не дефект» (образец верен / строение совпало / корзина б / код уже приведён) — закрываются свежим кадром, но решает координатор
const SOFT = (t) => /^(образец верен|строение совпадает|разбор 13\.10, корзина б|кадр 12\.10 старше правки кода|код приведён к образцу|тон темы — исправлено|привязка исправлена)/.test(t);
// зачем (координатор 15.10, разбор 89 строк без тега — UNTAGGED_TRIAGE_2026-10-15.md): строки, у которых отличие без тега разобрано
// вручную как данные / язык кадра / состояние кадра — тоже в пачку «закрыть после №7»; тег в реестре не пишем (реестр не трогаем)
const EXTRA = { 'paywalls-012': 'нет пробного периода — данные', 'paywalls-016': 'нет пробного периода — данные', 'auth-gap-001': 'монета по рангу — данные; uk-кадр',
  'cards-002': 'uk-перенос «Правда / неправда» — язык кадра', 'cards-section-032': 'uk-перенос «Правда / неправда» — язык кадра', 'settings-gap-035': 'клавиатура на кадре — состояние; uk-кадр' };
const NEUTRAL = (d) => /^\s*(Совпадает|✓)/.test(d) || /✓\s*$/.test(d) || /^\s*⚠ Снимок старше кода/.test(d);
const strict = [], soft = [], extra = []; let pending = 0, withDiffs = 0, untagged = 0;
for (const r of j.rows) { if (r.status !== 'pending') continue; pending++; if (!r.diffs || !r.diffs.length) continue; withDiffs++;
  const real = r.diffs.map(String).filter((d) => !NEUTRAL(d)); if (!real.length) { log('нет отличий кроме нейтральных', r.id); continue; }
  if (EXTRA[r.id]) { extra.push({ r, tags: [EXTRA[r.id]] }); continue; }
  const tags = real.map(tagOf); if (tags.some((t) => !t)) { untagged++; continue; }
  if (tags.every((t) => DATA(t) || STALE(t))) strict.push({ r, tags });
  else if (tags.every((t) => DATA(t) || STALE(t) || SOFT(t))) soft.push({ r, tags }); }
const row = ({ r, tags }) => `| ${r.id} | ${String(r.screen)} · ${String(r.state)} | ${[...new Set(tags)].join('; ')} | ${r.evidence ? 'есть, ' + String(r.evidence_at || '').slice(0, 10) : '**нет — нужен первый кадр**'} |`;
const H = ['| id | экран · состояние | теги отличий | кадр |', '|---|---|---|---|'];
const L = ['# Закрыть после снимка — pending-строки, где все отличия = данные или устаревший образец', '',
  `Сформировано ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC скриптом scripts/mockups/close_after_shot.cjs из docs/phraseman-2.0/registries/visual_parity.json (реестр не менялся).`, '',
  `pending всего ${pending}; с записанными отличиями ${withDiffs}; из них с отличием без тега и вне раздела 3 — ${untagged} (разбор: UNTAGGED_TRIAGE_2026-10-15.md — Learning V2 ждут решения владельца, остальным нужен кадр).`, '',
  'Как закрывать: после снимка №7 открыть свежий кадр строки и убедиться, что на нём нет НОВЫХ отличий (кроме тех же данных); тогда status → match, reviewed_by координатор. Строки без кадра — сначала снять.', '',
  `## 1. Строго: только [данные] и/или «образец приведён к коду / устарел / дорисован / дополнен / перерисован» — ${strict.length}`, '', ...H, ...strict.map(row), '',
  `## 2. «Не дефект» по разбору 13–14.10 (координатор 15.10: закрывать вместе с разделом 1) — ${soft.length}`, '',
  'Теги: «образец верен, проверено по коду», «строение совпадает», «разбор 13.10, корзина б», «кадр старше правки кода», «код приведён к образцу», «тон темы — исправлено». Отличие в них — состояние/язык/тема кадра, а не код; закрываются верным свежим кадром.', '',
  ...H, ...soft.map(row), '',
  `## 3. Разобраны вручную (отличие без тега = данные / язык / состояние кадра) — ${extra.length}`, '',
  'Координатор 15.10: «да» — в пачку. Основание — docs/phraseman-2.0/evidence/parity_moments_v1/UNTAGGED_TRIAGE_2026-10-15.md.', '',
  ...H, ...extra.map(row), ''];
fs.writeFileSync(OUT, L.join('\n')); log('записан', path.relative(ROOT, OUT), 'строго', strict.length, 'на решение', soft.length, 'вручную', extra.length, 'не разобрано', untagged);
