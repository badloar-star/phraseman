// зачем ([LABEL-FIT], координатор 18.10, 🟡 Ревизора 3.13): английские подписи стали короче, а es / pt-BR / pl / tr длиннее — кнопки могут снова переноситься.
// Расчёт без эмулятора: ширина подписи по кеглю/весу (средние ширины символов Inter, ±8 %) против ширины контейнера при 360 dp, fontScale 1,0 и 1,3.
// Запуск: node scripts/label_fit_report.cjs  → docs/phraseman-2.0/evidence/label_fit_1018.md. Подписи берутся из исходников (объекты ru/uk/en/es/pt-BR/vi/id/tr/pl).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const SCREEN = 360;

// ── извлечение 9-язычных объектов (как lf_scan)
const BS = String.fromCharCode(92);
function strRe(prefix) {
  return new RegExp(prefix + ':\\s*(\'|"|`)((?:(?!\\1)[^' + BS + BS + ']|' + BS + BS + '.)*)\\1');
}
function scanObjects(file) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const out = [];
  const objRe = /\{[^{}]*?\bru:[^{}]*?\}/g;
  let m;
  while ((m = objRe.exec(s))) {
    const vals = {};
    let ok = true;
    for (const k of LANGS) {
      const prefix = k.includes('-') ? '[\'"]' + k + '[\'"]' : '\\b' + k;
      const mm = m[0].match(strRe(prefix));
      if (!mm) { ok = false; break; }
      vals[k] = mm[2];
    }
    if (ok) out.push({ line: s.slice(0, m.index).split('\n').length, vals });
  }
  return out;
}
const byRu = (file, ru) => {
  const o = scanObjects(file).find((x) => x.vals.ru === ru);
  if (!o) throw new Error(`нет подписи «${ru}» в ${file}`);
  return o.vals;
};
// массив из 9 строк в порядке ru, uk, en, es, pt-BR, vi, id, tr, pl: ['Играть', 'Грати', ...]
function byArray(file, ru) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const i = s.indexOf(`['${ru}',`);
  if (i < 0) throw new Error(`нет массива «${ru}» в ${file}`);
  const arr = s.slice(i, s.indexOf(']', i) + 1);
  const parts = [...arr.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
  const vals = {};
  LANGS.forEach((k, idx) => { vals[k] = parts[idx]; });
  return vals;
}
// шторка голоса: тексты по языкам в объекте `ru: { title: '…', plus: '…', start: '…' }`
function byLangField(file, field) {
  const s2 = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const vals = {};
  for (const k of LANGS) {
    const prefix = k.includes('-') ? '[\'"]' + k + '[\'"]' : '\\n\\s+' + k;
    const i = s2.search(new RegExp(prefix + ':\\s*\\{\\s*title:'));
    if (i < 0) throw new Error('нет блока ' + k + ' в ' + file);
    const block = s2.slice(i, s2.indexOf(String.fromCharCode(10), i + 1));
    const mm = block.match(new RegExp(field + ':\\s*([\'"`])((?:(?!\\1)[^\\\\]|\\\\.)*)\\1'));
    if (!mm) throw new Error('нет поля ' + field + ' для ' + k);
    vals[k] = mm[2];
  }
  return vals;
}
// строка из app/vip_survey_content.ts: flashcards: loc({ ru: 'Карточки', …, ptBR: 'Cartões', … })
function cardsTab() {
  const s2 = fs.readFileSync(path.join(ROOT, 'app/vip_survey_content.ts'), 'utf8');
  const line = s2.split('\n').find((l) => /^\s*flashcards: loc\(/.test(l));
  const vals = {};
  for (const k of LANGS) {
    const key = k === 'pt-BR' ? 'ptBR' : k;
    const mm = line.match(new RegExp('\\b' + key + ":\\s*'([^']*)'"));
    vals[k] = mm[1];
  }
  return vals;
}
const withN = (vals, n) => Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v.replace('${n}', String(n))]));

// «Добить» — шаблонные строки с ${n}
function finishMistakes(n) {
  const s = fs.readFileSync(path.join(ROOT, 'app/lesson_complete.tsx'), 'utf8');
  const i = s.indexOf('const finishMistakesLabels');
  const block = s.slice(i, s.indexOf('});', i));
  const vals = {};
  for (const k of LANGS) {
    const prefix = k.includes('-') ? '[\'"]' + k + '[\'"]' : '\\b' + k;
    const mm = block.match(new RegExp(prefix + ':\\s*`([^`]*)`'));
    if (!mm) throw new Error('нет ' + k + ' в finishMistakesLabels');
    vals[k] = mm[1].replace('${n}', String(n));
  }
  return vals;
}

// ── модель ширины: доли em для Inter (средние), вес 700 шире 600 на ~3 %
function charEm(ch) {
  if (ch === ' ') return 0.28;
  if (/[0-9]/.test(ch)) return 0.62;
  if (/[.,:;!?·…()\-—→’']/.test(ch)) return 0.34;
  if (/[A-ZА-ЯЁІЇЄҐ]/.test(ch)) return 0.70;
  if (/[а-яёіїєґ]/.test(ch)) return 0.58;
  if (/[mwMW]/.test(ch)) return 0.88;
  if (/[iljtf]/.test(ch)) return 0.30;
  return 0.57; // латиница нижнего регистра, включая диакритику
}
function textWidth(text, size, weight) {
  const wk = weight >= 700 ? 1.03 : 1.0;
  let w = 0;
  for (const ch of text) w += charEm(ch);
  return w * size * wk;
}
// перенос по словам: сколько строк, и есть ли слово шире строки (ломается посреди слова)
function wrap(text, size, weight, avail) {
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let cur = 0;
  let broken = false;
  const space = textWidth(' ', size, weight);
  for (const w of words) {
    const ww = textWidth(w, size, weight);
    if (ww > avail) broken = true;
    if (cur === 0) cur = ww;
    else if (cur + space + ww <= avail) cur += space + ww;
    else { lines += 1; cur = ww; }
  }
  return { lines, broken };
}

// ── кнопки главных путей: контейнер при 360 dp (dp за вычетом полей/значков), кегль, вес, допустимо ли 2 строки по вёрстке
// avail — ширина под текст; lines: 'wrap' (перенос допустим, minHeight/высота растёт), 'cut' (numberOfLines=1 → обрезка), 'tile' (плитка: перенос допустим, но слово не должно ломаться)
const ELEMENTS = [
  { id: 'Итог урока: «Продолжить»', file: 'app/lesson_complete.tsx', get: () => byRu('app/lesson_complete.tsx', 'Продолжить'), size: 16, weight: 700, avail: SCREEN - 40 - 56, mode: 'wrap', note: 'V2DoneScreen cta: dock 20, minHeight 52; стрелка 20+отступ' },
  { id: 'Итог урока: «Завершить»', file: 'app/lesson_complete.tsx', get: () => byRu('app/lesson_complete.tsx', 'Завершить'), size: 16, weight: 700, avail: SCREEN - 40 - 56, mode: 'wrap', note: 'тот же cta' },
  { id: 'Итог урока: «Следующий урок»', file: 'app/lesson_complete.tsx', get: () => byRu('app/lesson_complete.tsx', 'Следующий урок'), size: 16, weight: 700, avail: SCREEN - 40 - 56, mode: 'wrap', note: 'тот же cta' },
  { id: 'Итог урока: «Открыть Plus»', file: 'app/lesson_complete.tsx', get: () => byRu('app/lesson_complete.tsx', 'Открыть Plus'), size: 16, weight: 700, avail: SCREEN - 40 - 56, mode: 'wrap', note: 'тот же cta' },
  { id: 'Итог урока: «Добить (N)» + метка Plus', file: 'app/lesson_complete.tsx', get: () => finishMistakes(12), size: 16, weight: 600, avail: SCREEN - 40 - 56, mode: 'wrap', note: 'quietRow: метка Plus xs ≈ 40 + gap 8 справа, N=12; minHeight 22' },
  { id: 'Итог урока: «Повторить ошибки»', file: 'components/completion/V2DoneScreen.tsx', get: () => byRu('components/completion/V2DoneScreen.tsx', 'Повторить ошибки'), size: 16, weight: 600, avail: SCREEN - 40 - 36 - 26 - 56, mode: 'wrap', note: 'ghost в панели: поля 20+18, значок 18+gap 8, метка Plus ≈ 56; minHeight 44' },
  { id: 'Итог: «Закрыть»', file: 'components/completion/V2DoneScreen.tsx', get: () => byRu('components/completion/V2DoneScreen.tsx', 'Закрыть'), size: 16, weight: 600, avail: SCREEN - 40, mode: 'wrap', note: 'тихая кнопка' },
  { id: 'Главная: плитка «Диалоги»', file: 'app/(tabs)/home.tsx', get: () => byRu('app/(tabs)/home.tsx', 'Диалоги'), size: 13, weight: 700, avail: (SCREEN - 40 - 30) / 4, capScale: 1.15, mode: 'tile', note: '4 плитки: (360−40−3·10)/4 = 72,5; перенос допустим, слово не должно ломаться' },
  { id: 'Главная: плитка «Уроки»', file: 'app/(tabs)/home.tsx', get: () => byRu('app/(tabs)/home.tsx', 'Уроки'), size: 13, weight: 700, avail: (SCREEN - 40 - 30) / 4, capScale: 1.15, mode: 'tile', note: 'то же' },
  { id: 'Главная: плитка «Карточки»', file: 'app/vip_survey_content.ts', get: () => cardsTab(), size: 13, weight: 700, avail: (SCREEN - 40 - 30) / 4, capScale: 1.15, mode: 'tile', note: 'то же' },
  { id: 'Главная: плитка «Пик»', file: 'app/(tabs)/home.tsx', get: () => byRu('app/(tabs)/home.tsx', 'Пик'), size: 13, weight: 700, avail: (SCREEN - 40 - 30) / 4, capScale: 1.15, mode: 'tile', note: 'то же' },
  { id: 'Хаб Карточек: кнопка «Тренироваться»', file: 'app/flashcards/FlashcardsHubScreen.tsx', get: () => byRu('app/flashcards/FlashcardsHubScreen.tsx', 'Тренироваться с карточками'), size: 16, weight: 700, avail: SCREEN - 40 - 72, mode: 'wrap', note: 'CTA: поля 20, справа стрелка 12+20, слева симметрично' },
  { id: 'Хаб Карточек: плитка «Сохранённые»', file: 'app/flashcards/FlashcardsHubScreen.tsx', get: () => byRu('app/flashcards/FlashcardsHubScreen.tsx', 'Сохранённые'), size: 19, weight: 700, avail: (SCREEN - 40 - 12) / 2 - 32, mode: 'tile', note: 'плитка 154 − padding 32 = 122; до 18.10 numberOfLines=1 (обрезка), теперь 2 строки + перенос; слово шире 122 ломается посреди слова' },
  { id: 'Хаб Карточек: плитка «Мои наборы»', file: 'app/flashcards/FlashcardsHubScreen.tsx', get: () => byRu('app/flashcards/FlashcardsHubScreen.tsx', 'Мои наборы'), size: 19, weight: 700, avail: (SCREEN - 40 - 12) / 2 - 32, mode: 'tile', note: 'то же' },
  { id: 'Хаб Карточек: плитка «Из видео»', file: 'app/flashcards/FlashcardsHubScreen.tsx', get: () => byRu('app/flashcards/FlashcardsHubScreen.tsx', 'Из видео'), size: 19, weight: 700, avail: (SCREEN - 40 - 12) / 2 - 32, mode: 'tile', note: 'то же' },
  { id: 'Хаб Карточек: плитка «Сообщество»', file: 'app/flashcards/FlashcardsHubScreen.tsx', get: () => byRu('app/flashcards/FlashcardsHubScreen.tsx', 'Сообщество'), size: 19, weight: 700, avail: (SCREEN - 40 - 12) / 2 - 32, mode: 'tile', note: 'то же' },
  { id: 'Шторка голоса: главная кнопка (Plus)', file: 'components/learning-v2/LearningV2VoiceHeadsupSheet.tsx', get: () => byLangField('components/learning-v2/LearningV2VoiceHeadsupSheet.tsx', 'plus'), size: 16, weight: 700, avail: SCREEN - 44 - 32, mode: 'wrap', note: 'Lv2Cta: лист с полями 22, кнопка 54' },
  { id: 'Шторка голоса: «Начать всё равно»', file: 'components/learning-v2/LearningV2VoiceHeadsupSheet.tsx', get: () => byLangField('components/learning-v2/LearningV2VoiceHeadsupSheet.tsx', 'start'), size: 16, weight: 600, avail: SCREEN - 44, mode: 'wrap', note: 'тихая кнопка, высота 44' },
  { id: 'Пик: «Играть»', file: 'components/spire/spire_strings.ts', get: () => byArray('components/spire/spire_strings.ts', 'Играть'), size: 16, weight: 700, avail: SCREEN - 40 - 32, mode: 'wrap', note: 'SpireClimbDock ctaText 16/700, кнопка на всю ширину' },
];

const SCALES = [1.0, 1.3];
const rows = [];
let problemsFs1 = 0;
let problemsFs13 = 0;
for (const el of ELEMENTS) {
  let vals;
  try { vals = el.get(); } catch (e) { rows.push({ el, error: e.message }); continue; }
  const cells = {};
  for (const lang of LANGS) {
    const per = {};
    for (const sc of SCALES) {
      const size = el.size * (el.capScale ? Math.min(sc, el.capScale) : sc); // maxFontSizeMultiplier: потолок роста кегля
      const w = textWidth(vals[lang], size, el.weight);
      const avail = el.avail; // ширина контейнера в dp не растёт с fontScale
      const wr = wrap(vals[lang], size, el.weight, avail);
      let verdict = 'ок';
      if (el.mode === 'cut') {
        if (sc === 1.0) verdict = w > avail ? 'ОБРЕЗКА' : 'ок';
        else verdict = wr.broken ? 'слово ломается' : (wr.lines > 1 ? `${wr.lines} стр.` : 'ок'); // при fontScale>1 numberOfLines снимается
      } else if (el.mode === 'tile') {
        verdict = wr.broken ? 'слово ломается' : (wr.lines > 1 ? `${wr.lines} стр.` : 'ок');
      } else {
        verdict = wr.broken ? 'слово ломается' : (wr.lines > 1 ? `${wr.lines} стр.` : 'ок');
      }
      per[sc] = { w: Math.round(w), lines: wr.lines, verdict };
    }
    cells[lang] = per;
  }
  rows.push({ el, vals, cells });
}

const isProblem = (v) => v === 'ОБРЕЗКА' || v === 'слово ломается' || /^[3-9] стр\./.test(v);
const isTwoLines = (v) => /^2 стр\./.test(v);
for (const r of rows) {
  if (!r.cells) continue;
  for (const lang of LANGS) {
    if (isProblem(r.cells[lang][1.0].verdict)) problemsFs1 += 1;
    if (isProblem(r.cells[lang][1.3].verdict)) problemsFs13 += 1;
  }
}

// худшие 10 по запасу ширины при fontScale 1,0 (Переводчику: сократить формулировку)
const worst = [];
for (const r of rows) {
  if (!r.cells) continue;
  for (const lang of LANGS) {
    const c = r.cells[lang][1.0];
    worst.push({ id: r.el.id, lang, text: r.vals[lang], ratio: c.w / r.el.avail, verdict: c.verdict });
  }
}
worst.sort((a, b) => b.ratio - a.ratio);

let md = `# [LABEL-FIT] 18.10 — влезают ли подписи кнопок на 9 языках (360 dp)\n\n`;
md += `Расчёт без эмулятора (±8 %): ширина подписи по кеглю и весу (средние ширины символов Inter) против ширины контейнера при 360 dp, fontScale 1,0 и 1,3. Шрифт не ужимается (adjustsFontSizeToFit запрещён). «ок» — в одну строку; «2 стр.» — переносится на 2 строки (допустимо там, где вёрстка растёт: minHeight, а не фиксированная высота); «ОБРЕЗКА» — numberOfLines=1 и подпись шире контейнера; «слово ломается» — слово длиннее строки.\n\n`;
md += `**Проблемных ячеек (кнопка × язык): fontScale 1,0 — ${problemsFs1}; fontScale 1,3 — ${problemsFs13}** (из ${rows.filter((r) => r.cells).length * LANGS.length} на каждый масштаб). До правки вёрстки плиток хаба Карточек (numberOfLines 1 → 2) при fontScale 1,0 было 6 → стало ${problemsFs1}.\n\n`;
md += `Не охвачены этим проходом (подписи вне простых объектов ru/…/pl, нужна ручная выписка): онбординг, пейвол, окна моментов — см. «Не охвачено» ниже.\n\n`;
md += `## Таблица (ширина текста dp → запас; ячейка = «ширина / вердикт 1,0 | вердикт 1,3»)\n\n`;
md += `| Кнопка (контейнер, dp) | ${LANGS.join(' | ')} |\n|---|${LANGS.map(() => '---').join('|')}|\n`;
for (const r of rows) {
  if (r.error) { md += `| ${r.el.id} | ОШИБКА: ${r.error} |${LANGS.slice(1).map(() => '').join('|')}\n`; continue; }
  md += `| ${r.el.id} (${Math.round(r.el.avail)}) | ${LANGS.map((l) => `${r.cells[l][1.0].w} / ${r.cells[l][1.0].verdict} \| ${r.cells[l][1.3].verdict}`).join(' | ')} |\n`;
}
md += `\n## Примечания по контейнерам\n\n`;
for (const r of rows) if (!r.error) md += `- ${r.el.id}: ${r.el.note}\n`;
md += `\n## Худшие 10 по запасу ширины (fontScale 1,0) — Переводчику: сократить формулировку\n\n| # | Кнопка | Язык | Текст | Ширина / контейнер | Вердикт |\n|---|---|---|---|---|---|\n`;
worst.slice(0, 10).forEach((w, i) => { md += `| ${i + 1} | ${w.id} | ${w.lang} | ${w.text} | ${(w.ratio * 100).toFixed(0)} % | ${w.verdict} |\n`; });
md += `\n## Не охвачено\n\n- Онбординг (CleanOnboarding.tsx), пейвол (premium_modal / paywallShared), окна моментов (streak_moments_strings.ts, WelcomeBackMoment) — подписи в других структурах; требуется отдельная выписка.\n`;
fs.mkdirSync(path.join(ROOT, 'docs/phraseman-2.0/evidence'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/phraseman-2.0/evidence/label_fit_1018.md'), md, 'utf8');
console.log(`LABEL-FIT elements=${rows.length} problemsFs1=${problemsFs1} problemsFs13=${problemsFs13}`);
rows.filter((r) => r.error).forEach((r) => console.log('ERR', r.el.id, r.error));
