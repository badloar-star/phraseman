// Примеры глав теории по СМЫСЛУ главы (владелец 05.11: «примеры подобраны по шаблону и не подходят к тексту главы»).
// Для каждой главы берём фразы ЭТОГО урока и выбираем те, чьи слова (последовательности ≥2 слов) встречаются в тексте главы
// (en+ru+uk: целевые слова в тексте остаются как есть, обычно в `обратных кавычках`); нет совпадений ≥2 слов — одиночные слова из кавычек; нет вообще — прежние примеры.
// Форматы: chapters (fr/de/it): chapters[i].exampleIds; studio2 (en/es): localized.<loc>.chapters[i].samples (+ focusId у es).
export const theoryExamplesStats = { rebuilt: 0, kept: 0, perLang: {} };

const norm = (s) => s.toLowerCase().replace(/[`.,!?;:¿¡«»"“”()]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => norm(s).split(' ').filter(Boolean);

function pick(chapterText, quoted, lessonPhrases, want) {
  const hay = ` ${norm(chapterText)} `;
  const scored = [];
  for (const p of lessonPhrases) {
    const t = toks(p.target);
    let best = 0, bestGram = '';
    for (let i = 0; i < t.length; i++) for (let j = i + 2; j <= t.length; j++) {
      const g = t.slice(i, j).join(' ');
      if (hay.includes(` ${g} `) && j - i > best) { best = j - i; bestGram = g; }
    }
    if (best < 2) {
      for (const w of t) if (w.length > 3 && quoted.has(w) && best < 1) { best = 1; bestGram = w; }
    }
    if (best >= 1) scored.push({ id: p.id, score: best, gram: bestGram, len: t.length });
  }
  scored.sort((a, b) => b.score - a.score || a.len - b.len || (a.id < b.id ? -1 : 1));
  // разные «граммы» вперёд, чтобы примеры показывали разные места главы
  const out = []; const used = new Set();
  for (const s of scored) { if (out.length >= want) break; if (!used.has(s.gram)) { used.add(s.gram); out.push(s.id); } }
  for (const s of scored) { if (out.length >= want) break; if (!out.includes(s.id)) out.push(s.id); }
  return out;
}

const quotedOf = (txt) => { const set = new Set(); for (const m of txt.matchAll(/`([^`]+)`/g)) for (const w of toks(m[1])) set.add(w); return set; };

export function rebuildTheoryExamples(lang, n, th, fmt, lessonPhrases) {
  const st = (theoryExamplesStats.perLang[lang] ??= { rebuilt: 0, kept: 0 });
  const done = (changed) => { if (changed) { theoryExamplesStats.rebuilt++; st.rebuilt++; } else { theoryExamplesStats.kept++; st.kept++; } };
  if (fmt === 'chapters') {
    (th.chapters ?? []).forEach((ch) => {
      const text = Object.values(ch.textByLocale ?? {}).filter((x) => typeof x === 'string').join(' ');
      const want = Math.min(3, Math.max(2, (ch.exampleIds ?? []).length));
      const ids = pick(text, quotedOf(text), lessonPhrases, want);
      if (ids.length >= 1) { ch.exampleIds = ids; done(true); } else done(false);
    });
  } else {
    const locs = Object.keys(th.localized ?? {});
    const base = th.localized?.en ?? th.localized?.[locs[0]];
    (base?.chapters ?? []).forEach((_, i) => {
      const text = ['en', 'ru', 'uk'].map((l) => { const c = th.localized?.[l]?.chapters?.[i]; return c ? `${c.title ?? ''} ${c.body ?? ''} ${c.note ?? ''}` : ''; }).join(' ');
      const want = Math.min(3, Math.max(2, (base.chapters[i].samples ?? []).length));
      const ids = pick(text, quotedOf(text), lessonPhrases, want);
      if (ids.length >= 1) {
        if (lang === 'en') ids.forEach((x, k) => { ids[k] = x.replace(/^en-classic-r1:/, ''); }); // в EN-теории примеры — короткие id «16.11»
        for (const l of locs) { const c = th.localized[l]?.chapters?.[i]; if (c) { c.samples = ids; if (c.focusId !== undefined) c.focusId = ids[0]; } }
        done(true);
      } else done(false);
    });
  }
}

// Заголовки глав для формата chapters (fr/de/it): в архиве их нет, экран показывал «Часть N». Берём первое предложение текста главы на каждой локали
// (обычно это вопрос или короткая тема: «Один или несколько?»), без обратных кавычек, до 70 знаков. Переводчик может уточнить через polish-слой (поле chapters[i].titleByLocale.<loc>).
export function addChapterTitles(th) {
  for (const ch of th.chapters ?? []) {
    if (ch.titleByLocale) continue;
    const t = {};
    for (const [loc, txt] of Object.entries(ch.textByLocale ?? {})) {
      if (typeof txt !== 'string') continue;
      const clean = txt.replace(/`/g, '').trim();
      const m = /^(.+?[.?!…])(\s|$)/s.exec(clean);
      let first = (m ? m[1] : clean).trim();
      if (first.length > 70) first = first.slice(0, 67).replace(/\s+\S*$/, '') + '…';
      t[loc] = first.replace(/[.]$/, '');
    }
    ch.titleByLocale = t;
  }
}
