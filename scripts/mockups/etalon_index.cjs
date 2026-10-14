// зачем (координатор 14.10): index.md эталонных кадров — момент → компоненты кода (из пояснений моментов / ТЗ) → ответственная сессия → кадры
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const OUT = path.join(__dirname, '..', '..', 'docs', 'phraseman-2.0', 'evidence', 'etalon_v3');
const owner = (id) => /^m0[1-7]$/.test(id) ? 'Дизайн — components/spire/moments' : /^s\d/.test(id) ? 'Дизайн — сторис (кольцо + просмотр), события — Ядро (useStoryEvents)'
  : (/^m(11|19|20)$/.test(id) || /^d\d+$/.test(id)) ? 'Темы — components/streak/moments' : id === 'm21' ? 'Авторизация (D193, вместо winback-пейвола)' : 'назначит координатор';
const COMP = /\b(SpireTower(?:Svg|Render)?|SpireWeekResultCard|GlassAlertDialog|KitSheetModal|HomeV2[A-Za-z]+|LiveStreakFlame|StreakFlameFill|V2Button|ActionToast|coin_rank_XX|DailyPhraseCard|dialogue_v2_completion|PaywallPlusCopy|NoEnergyModal|EnergyStopSheet|Lv2Cta|useStoryEvents)\b/g;
(async () => { const br = await chromium.launch(); const rows = [];
  for (const f of ['engagement-moments-v3-all.html', 'stories-avatar.html']) { const pg = await br.newPage(); await pg.goto('http://127.0.0.1:8765/' + f, { waitUntil: 'load' }); await pg.waitForTimeout(1200);
    const ms = await pg.evaluate(() => EM.MOMENTS.map((m) => ({ id: m.id, title: m.title, lead: (m.lead || '').replace(/<[^>]+>/g, ''), vars: m.variants.map((v) => v.k) })));
    ms.forEach((m) => rows.push({ ...m, page: f })); await pg.close(); }
  await br.close();
  const L = ['# Эталонные кадры моментов v3 — для переноса в приложение', '',
    'Паритет переноса — только по снимкам: кадр приложения (маршрут dev_moments_preview или эмулятор Сверки) сравнивается с эталоном поэлементно, порог — все элементы совпали.', '',
    'В репозитории (выборка, webp q85): `<момент>/<тема>_412_[<вариант>_]<точка>.webp` — 412×915; `aurora-dark` и `aurora-light` — точка `final` (конец тайм-листа) и `peak` (главный удар + 0,35 с) у m01, m14, m19, m21 и рубежей d*; `iris-light` — только `final`.',
    '',
    '**Полный набор (вне репозитория, ~1100 PNG):** `C:/Temp/claude/etalon_v3/<момент>/<тема>_<ширина>_[<вариант>_]<точка>.png` — темы `aurora-dark`, `aurora-light`, `iris-light`; ширины 360 (360×800) и 412 (412×915); точки `start` (0,5 с), `peak`, `final`. Пересъёмка (один поток): `node scripts/mockups/etalon_shoot.cjs engagement-moments-v3-all.html` и `… stories-avatar.html` (сервер образцов на 127.0.0.1:8765), выборка в репозиторий — `python scripts/mockups/etalon_pack.py`, оглавление — `node scripts/mockups/etalon_index.cjs`.',
    '',
    '**Склейка «приложение | эталон» для гейта паритета:** `python scripts/mockups/pgate.py <кадр_приложения.png> C:/Temp/claude/etalon_v3/<момент>/<тема>_412_<точка>.png <выход.png> "<момент> <тема> <точка>"` — обе половины приводятся к одной высоте, слева приложение, справа эталон. Порог — совпал каждый элемент.',
    'Источник: `docs/design/v2-app/engagement-moments-v3-all.html` (одобрен 14.10 с правками) и `stories-avatar.html` (D192). ТЗ: `docs/phraseman-2.0/ETALON_MOMENTS_V3_TRANSFER.md`.', '',
    '| момент | что | компоненты кода | ответственная сессия | кадров в репозитории |', '|---|---|---|---|---|'];
  for (const r of rows) { const dir = path.join(OUT, r.id); const n = fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.webp')).length : 0;
    const comps = [...new Set((r.lead.match(COMP) || []))].join(', ') || '—';
    L.push(`| [${r.id}](${r.id}/) | ${r.title.replace(/\|/g, '/')}${r.vars.length > 1 ? ` (варианты ${r.vars.join(', ')})` : ''} | ${comps} | ${owner(r.id)} | ${n} |`); }
  L.push('', 'Рубежи серии d1…d1000 сняты со страницы v3-all (там все 19 рубежей 1:1 со streak-milestones.html).');
  fs.writeFileSync(path.join(OUT, 'index.md'), L.join('\n')); console.log('моментов', rows.length);
})();
