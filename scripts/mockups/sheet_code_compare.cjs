// зачем (координатор 15.10, без эмулятора): сверка «эталон ↔ код» по листам приёмки — для каждой строки текста из листа
// находим в компоненте момента <Text> с тем же ключом строки и сравниваем кегль / межстрочный / вес / трекинг.
// Это не заменяет кадр с эмулятора (цвет, место, анимацию видно только на снимке) — ловит типографику и тексты до съёмки.
// usage: node scripts/mockups/sheet_code_compare.cjs [m01,m02,…]   → docs/phraseman-2.0/evidence/parity_moments_v1/CODE_VS_ETALON_<дата>.md
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SHEETS = path.join(ROOT, 'docs', 'phraseman-2.0', 'evidence', 'parity_moments_v1');
const log = (...a) => console.log('[SHEET-CODE]', ...a);
// момент → файлы компонентов (откуда рисуется момент в коде)
const SP = 'components/spire/moments/'; const ST = 'components/streak/moments/';
const MAP = {
  m01: [SP + 'MomentPromotion.tsx', SP + 'moments_layout.tsx'], m02: [SP + 'MomentStay.tsx', SP + 'moments_layout.tsx'], m03: [SP + 'MomentDown.tsx', SP + 'moments_layout.tsx'],
  m05: [SP + 'SpirePositionRiseMoment.tsx', SP + 'SpireOvertakeToast.tsx', SP + 'SpireLastChanceSheet.tsx'], m06: [SP + 'SpireStepResultMoment.tsx', SP + 'moments_layout.tsx'], m07: [SP + 'SpireFloorMoment.tsx', SP + 'moments_layout.tsx'],
  m09: ['components/lesson_moments/LessonPerfectMoment.tsx'], m11: [ST + 'StreakMomentRings.tsx', ST + 'TodayRings.tsx', 'components/home/v2/HomeV2TodayCard.tsx'],
  m14: ['components/coin_rank_moments/CoinRankEnoughDialog.tsx'], m15: ['components/lesson_exit/LessonExitSheet.tsx'], m17: ['components/dialog_moments/FirstDialogMoment.tsx'],
  m21: ['components/moments/WelcomeBackMoment.tsx'],
};
for (const d of [1, 3, 7, 14, 30, 50, 100, 150, 200, 250, 300, 365, 400, 500, 600, 730, 800, 900, 1000]) MAP['d' + d] = [ST + 'StreakMilestoneScreen.tsx', ST + 'StreakMilestoneToast.tsx', ST + 'StreakMilestoneMoment.tsx', ST + 'StreakMilestoneRibbon.tsx', ST + 'StreakMomentFlame.tsx'];
const IDS = (process.argv[2] || 'm01,m02,m03,m06,m07,m11,m14,m15,d3,d7,d30,d100,d365,d730,d1000').split(',').filter(Boolean);

// V2_TYPE из constants/v2Style.ts — для `...V2_TYPE.overline`
const V2 = {}; { const src = fs.readFileSync(path.join(ROOT, 'constants', 'v2Style.ts'), 'utf8'); const re = /^\s{2}(\w+):\s*\{([^{}]*fontSize[^{}]*)\}/gm; let m; while ((m = re.exec(src))) V2[m[1]] = m[2]; }
const props = (body) => { const o = {}; for (const [k, re] of [['fs', /fontSize:\s*([\d.]+)/], ['lh', /lineHeight:\s*([\d.]+)/], ['fw', /fontWeight:\s*'(\d+)'/], ['ls', /letterSpacing:\s*(-?[\d.]+)/]]) { const m = body.match(re); if (m) o[k] = m[1]; }
  const sp = body.match(/\.\.\.V2_TYPE\.(\w+)/); if (sp && V2[sp[1]]) return { ...props(V2[sp[1]]), ...o }; return o; };
function parseFile(rel) {
  const p = path.join(ROOT, rel); if (!fs.existsSync(p)) { log('нет файла', rel); return { styles: {}, texts: [] }; }
  const src = fs.readFileSync(p, 'utf8'); const styles = {};
  for (const m of src.matchAll(/StyleSheet\.create\(\{([\s\S]*?)\n\}\)/g)) for (const e of m[1].matchAll(/^\s{2}(\w+):\s*\{([^{}]*)\}/gm)) styles[e[1]] = props(e[2]);
  const texts = [];
  for (const m of src.matchAll(/<(?:Animated\.)?Text\b([\s\S]*?)<\/(?:Animated\.)?Text>/g)) { const el = m[1];
    const gt = el.indexOf('>'); const open = gt >= 0 ? el.slice(0, gt + 1) : el; const names = [...open.matchAll(/\bs\.(\w+)/g)].map((x) => x[1]);
    let st = {}; for (const n of names) st = { ...st, ...(styles[n] || {}) }; st = { ...st, ...props(open.replace(/\.\.\.V2_TYPE\.\w+/g, '')) };
    const keys = [...el.matchAll(/\(\s*lang\s*,\s*'(\w+)'/g), ...el.matchAll(/\b(\w+(?:Title|Label|Line|Text))\(\s*lang/g)].map((x) => x[1]);
    texts.push({ file: rel, names, st, keys, line: src.slice(0, m.index).split('\n').length }); }
  return { styles, texts };
}
function sheetRows(id) {
  const f = path.join(SHEETS, `CHECKLIST_${id}.md`); if (!fs.existsSync(f)) { log('нет листа', id); return null; }
  const rows = [];
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!/^\| \d+ \| текст/.test(l)) continue; const c = l.split('|').map((x) => x.trim());
    const text = (c[2].match(/«(.*)»/) || [])[1]; const key = (c[3].match(/`([^`]+)`/) || [])[1]; const font = c[4];
    const fm = font.match(/^([\d.]+)\/([\d.]+|auto) · (\d+)/); const ls = (font.match(/трекинг (-?[\d.]+)/) || [])[1];
    rows.push({ text, key, fs: fm && fm[1], lh: fm && fm[2] !== 'auto' ? fm[2] : null, fw: fm && fm[3], ls: ls || null }); }
  return rows;
}
const L = ['# Эталон ↔ код по листам приёмки (без эмулятора)', '', `Сформировано ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC скриптом scripts/mockups/sheet_code_compare.cjs.`,
  'Для каждой строки текста из листа приёмки ищется <Text> компонента момента с тем же ключом строки; сравниваются кегль / межстрочный / вес / трекинг.',
  '✓ — совпало по ключу, ≈ — ключ не виден (текст через переменную), но стиль с параметрами эталона в компоненте есть, ✗ — расхождение (эталон → код), ✗? — ключ не виден и стиля с параметрами эталона нет (вероятное расхождение; кнопки V2Button и числа из данных здесь не проверяются). Вес 800 — известное расхождение шрифта на Android до нативной сборки, здесь сравнивается значение в коде.', ''];
const SUM = [];
for (const id of IDS) {
  const rows = sheetRows(id); if (!rows) continue; const files = MAP[id.replace(/-.*/, '')] || []; const parsed = files.map(parseFile); const texts = parsed.flatMap((x) => x.texts);
  const seen = new Set(); let ok = 0, bad = 0, unk = 0; const out = [];
  for (const r of rows) { if (!r.key || seen.has(r.key + r.fs)) continue; seen.add(r.key + r.fs);
    const k = r.key.replace(/\[.*$/, ''); const t = texts.find((x) => x.keys.includes(k) || x.keys.includes(r.key));
    if (!t) {
      // зачем: текст в коде часто идёт через переменную ({title}) или общий помощник со стилем s[style] — ключ не виден.
      // Тогда ищем в файлах момента стиль с теми же параметрами: нашёлся — «≈ по стилю», нет ни одного — вероятное расхождение.
      const all = parsed.flatMap((x, i) => Object.entries(x.styles).map(([n, st]) => ({ n, st, f: files[i] })));
      const same = all.filter(({ st }) => st.fs && +st.fs === +r.fs && (!r.lh || !st.lh || +st.lh === +r.lh) && (!r.fw || !st.fw || st.fw === r.fw) && (!r.ls || Math.abs(+r.ls - +(st.ls || 0)) <= 0.05));
      const near = all.filter(({ st }) => st.fs && Math.abs(+st.fs - +r.fs) <= 2 && (!r.fw || !st.fw || st.fw === r.fw)).slice(0, 3);
      const spec = `${r.fs}/${r.lh || 'auto'} · ${r.fw}${r.ls ? ' · ' + r.ls : ''}`;
      if (same.length) { unk++; out.push(`| ≈ | «${r.text}» · \`${r.key}\` | ${spec} | ключ не виден (текст через переменную); стиль с теми же параметрами есть: ${same.slice(0, 3).map((x) => x.f.split('/').pop() + ' s.' + x.n).join(', ')} |`); }
      else { bad++; out.push(`| ✗? | «${r.text}» · \`${r.key}\` | ${spec} | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ${near.length ? '; ближайшие: ' + near.map((x) => `s.${x.n} ${x.st.fs}/${x.st.lh || '?'} · ${x.st.fw || '?'}${x.st.ls ? ' · ' + x.st.ls : ''}`).join(', ') : ''} |`); }
      continue; }
    const d = []; if (r.fs && t.st.fs && +r.fs !== +t.st.fs) d.push(`кегль ${r.fs} → ${t.st.fs}`); if (r.lh && t.st.lh && +r.lh !== +t.st.lh) d.push(`строка ${r.lh} → ${t.st.lh}`);
    if (r.fw && t.st.fw && r.fw !== t.st.fw) d.push(`вес ${r.fw} → ${t.st.fw}`); if (r.ls && Math.abs(+r.ls - +(t.st.ls || 0)) > 0.05) d.push(`трекинг ${r.ls} → ${t.st.ls || 0}`);
    if (!t.st.fs) d.push('кегль в коде не найден (стиль из компонента-обёртки?)');
    if (d.length) bad++; else ok++;
    out.push(`| ${d.length ? '✗' : '✓'} | «${r.text}» · \`${r.key}\` | ${r.fs}/${r.lh || 'auto'} · ${r.fw}${r.ls ? ' · ' + r.ls : ''} | ${d.length ? d.join('; ') : 'совпало'} — ${t.file.split('/').pop()}:${t.line} (${t.names.map((n) => 's.' + n).join(' + ') || 'inline'}) |`); }
  SUM.push(`| ${id} | ${ok} | ${bad} | ${unk} |`);
  L.push(`## ${id}`, '', `Файлы кода: ${files.map((f) => '`' + f + '`').join(', ')}`, '', '| | текст · ключ | эталон | код |', '|---|---|---|---|', ...out, '');
}
L.splice(6, 0, '| момент | ✓ по ключу | ✗ и ✗? | ≈ по стилю |', '|---|---|---|---|', ...SUM, '');
const outF = path.join(SHEETS, `CODE_VS_ETALON_${new Date().toISOString().slice(0, 10)}.md`); fs.writeFileSync(outF, L.join('\n')); log('записан', path.relative(ROOT, outF)); console.log(SUM.join('\n'));
