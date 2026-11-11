// зачем (владелец 11.11, U10 «Один подходящий ответ», часть 2 — плитки уроков): среди пяти соблазнов плитки не должно быть
// слова, которое даёт грамматичную фразу под тот же показанный перевод («bought → got», «anything → something»,
// «at the station → in the station»). Штатный путь — слой сборщика classic_course_pack.mjs, но исходных архивов курсов
// на машине нет (как и в U20), поэтому скрипт идемпотентно меняет ОДИН соблазн в готовых lessons-NN.json и пересчитывает
// index.json языка и manifest.json так же, как сборщик (rev = sha256 всех lessons-файлов).
// Не меняются: id, target, sourceLocales, alternatives, accepted, rev фразы, число и порядок фраз и плиток.
// Замена — слово, которое УЖЕ стоит соблазном при том же верном слове в этом или более раннем уроке курса, и оно проходит
// те же правила, что сторож tests/classic_courses_pack_2026_11_04.test.ts (пройденность слова, «ты/вы», синонимы, артикли,
// список запретов). Снятый соблазн дописывается в scripts/classic_distractor_patches.json → remove: сторож больше не даст
// ему вернуться в эту фразу.
// Решения: docs/work/u10_tiles_2026_11_11/decisions_<lang>.json — [{correct, distractor, where|null, with[], why}].
// Запуск: node scripts/u10_apply_tile_distractor_fixes.cjs [--check] [--base-head] [--report <файл.md>]
//   --base-head — исходник урока брать из HEAD (git show), а не из рабочей копии: повторный запуск после неудачного
//   применения даёт тот же результат, что первый, и не требует отката файлов.
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COURSES = path.join(ROOT, 'modules', 'classic-courses');
const DECISIONS = path.join(ROOT, 'docs', 'work', 'u10_tiles_2026_11_11');
const LISTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'classic_distractor_lists.json'), 'utf8'));
const PATCHES_PATH = path.join(__dirname, 'classic_distractor_patches.json');
const PATCHES = JSON.parse(fs.readFileSync(PATCHES_PATH, 'utf8'));
const LANGS = ['en', 'es', 'fr', 'de', 'it'];
const CHECK = process.argv.includes('--check');
const BASE_HEAD = process.argv.includes('--base-head');
const reportAt = process.argv.indexOf('--report');
const REPORT = reportAt > 0 ? process.argv[reportAt + 1] : null;
const LOG = '[U10-TILES]';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const low = (s) => String(s).toLocaleLowerCase();
const strip = (t) => String(t).toLowerCase().replace(/[.,!?;:¿¡]/g, '');
const keyOf = (tokens) => tokens.map(strip).join(' ');
const lessonName = (n) => `lessons-${String(n).padStart(2, '0')}.json`;
const likeCase = (word, like) => (/^\p{Lu}/u.test(like) ? word.charAt(0).toLocaleUpperCase() + word.slice(1) : word);
const noAccent = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const RU_VY = /(^|[^а-яё])(вы|вас|вам|вами|ваш[а-яё]*)(?![а-яё])/i;
const RU_OTHER = /(^|[^а-яё])(я|мы|ты|он|она|оно|они|меня|мне|нас|нам|тебя|тебе|его|её|ее|им|ей|ему|их|ним|ней|ними)(?![а-яё])/i;

function readLesson(lang, n) {
  const rel = `modules/classic-courses/${lang}/${lessonName(n)}`;
  // зачем: maxBuffer — файл урока до ~100 КБ, запас на порядок
  return BASE_HEAD ? execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }) : fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Те же проверки соблазна, что в стороже classic_courses_pack: true — слово ставить нельзя. */
function guardRejects(lang, ctx, tile, i, word) {
  const c = strip(tile.correct);
  const dd = strip(word);
  if (!/^[\p{L}][\p{L}'’-]*$/u.test(word)) return 'не слово';
  if (ctx.removed.has(dd)) return 'в списке запретов';
  const articles = new Set(LISTS.articles?.[lang] ?? []);
  const artPairs = LISTS.articlePairs?.[lang] ?? null;
  if (articles.has(c) && articles.has(dd) && (!artPairs || artPairs.some(([a, b]) => (a === c && b === dd) || (a === dd && b === c)))) return 'артикль';
  const groupHit = (groups) => (groups ?? []).some((g) => g.includes(c) && g.includes(dd));
  if (groupHit(LISTS.synonyms?.[lang])) return 'синоним';
  const tails = LISTS.siblingTails?.[lang] ?? [];
  const sibling = () => {
    const a = noAccent(c); const b = noAccent(dd);
    if (!tails.length || a === b) return false;
    let p = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p += 1;
    return p >= 3 && tails.includes(a.slice(p)) && tails.includes(b.slice(p)) && a.length - p <= 4 && b.length - p <= 4;
  };
  const youApplies = RU_VY.test(ctx.ru) || !RU_OTHER.test(ctx.ru);
  if (youApplies && (groupHit(LISTS.youGroups?.[lang]) || sibling())) return 'форма «вы»';
  const timeAdv = new Set(LISTS.timeAdverbs?.[lang] ?? []);
  if (lang === 'de' && timeAdv.has(dd) && !timeAdv.has(c)) return 'наречие времени';
  const numbers = new Set(LISTS.numbers?.[lang] ?? []);
  if (!numbers.has(c)) {
    const pt = LISTS.posTags?.[lang];
    const strictRole = new Set([...(pt?.subj ?? []), ...(pt?.aux ?? []), ...(pt?.yn ?? []), ...(pt?.yn_fill ?? []), ...(pt?.det ?? []), ...(LISTS.determiners?.[lang] ?? []), ...articles]);
    const closed = new Set([...(LISTS.closedClasses?.[lang]?.prep ?? []), ...(LISTS.closedClasses?.[lang]?.conj ?? [])]);
    const seen = ctx.vocab.get(dd);
    if (i > 0 && tile.correct[0] === tile.correct[0].toLowerCase() && !closed.has(dd) && !strictRole.has(dd)
      && (seen === undefined || seen > ctx.lesson + Math.max(1, 8 - ctx.lesson))) return 'слово ещё не пройдено';
  }
  return null;
}

const rows = [];
const newRemovals = [];
let changedTotal = 0;
const touchedLangs = [];
for (const lang of LANGS) {
  const decisionsPath = path.join(DECISIONS, `decisions_${lang}.json`);
  if (!fs.existsSync(decisionsPath)) { console.log(`${LOG} ${lang}: файла решений нет — язык пропущен`); continue; }
  const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8')).map((d) => ({ ...d, re: d.where ? new RegExp(d.where, 'i') : null, hits: 0 }));
  const suspect = new Set(decisions.map((d) => `${low(d.correct)}\u0000${low(d.distractor)}`));
  const lessons = [];
  for (let n = 1; n <= 32; n += 1) {
    const text = readLesson(lang, n);
    const data = JSON.parse(text);
    if (JSON.stringify(data) + '\n' !== text) throw new Error(`${LOG} ${lang}/${lessonName(n)}: файл не в каноническом виде сборщика — не трогаю`);
    lessons.push({ n, text, data });
  }
  // словарь курса «слово → первый урок» (как в стороже) и соблазны при том же верном слове
  const vocab = new Map();
  const seen = new Map();
  for (const { n, data } of lessons) for (const p of data.phrases) {
    for (const t of [...p.tiles.map((x) => x.correct), ...(p.accepted ?? []).flat(), ...(p.alternatives ?? []).flatMap((a) => a.split(/\s+/))]) {
      const k = strip(t);
      if (k && (!vocab.has(k) || vocab.get(k) > n)) vocab.set(k, n);
    }
    for (const t of p.tiles) {
      const c = low(t.correct);
      if (!seen.has(c)) seen.set(c, new Map());
      for (const x of t.distractors) { const e = seen.get(c).get(low(x)) || { first: n, count: 0 }; e.count += 1; seen.get(c).set(low(x), e); }
    }
  }
  let changed = 0;
  const touched = [];
  for (const lesson of lessons) {
    for (const p of lesson.data.phrases) {
      const mm = /(\d\d)[.:](\d\d)$/.exec(p.id);
      const patchKey = `${lang}:${mm[1]}:${mm[2]}`;
      const corrects = p.tiles.map((t) => t.correct);
      const accepted = new Set([keyOf(corrects), ...(p.accepted ?? []).map(keyOf), ...(p.alternatives ?? []).map((a) => keyOf(a.split(/\s+/)))]);
      const ownWords = new Set([...corrects, ...(p.accepted ?? []).flat(), ...(p.alternatives ?? []).flatMap((a) => a.split(/\s+/))].map(strip));
      const ctx = { ru: p.sourceLocales.ru, lesson: lesson.n, vocab, removed: new Set((PATCHES.remove[patchKey] ?? []).map(strip)), fresh: new Set() };
      p.tiles.forEach((tile, i) => {
        for (const d of decisions) {
          if (low(tile.correct) !== low(d.correct)) continue;
          const at = tile.distractors.findIndex((x) => low(x) === low(d.distractor));
          if (at < 0 || (d.re && !d.re.test(p.target))) continue;
          const taken = new Set(tile.distractors.map(low));
          const fits = (w) => {
            const k = low(w);
            if (k === low(tile.correct) || taken.has(k) || ownWords.has(strip(k)) || suspect.has(`${low(tile.correct)}\u0000${k}`)) return false;
            if (accepted.has(keyOf(corrects.map((c, j) => (j === i ? w : c))))) return false;
            return guardRejects(lang, ctx, tile, i, w) === null;
          };
          const pool = [...(seen.get(low(tile.correct)) || new Map()).entries()]
            .filter(([, e]) => e.first <= lesson.n).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])).map(([w]) => w);
          // последний запас — служебные слова языка из списков сторожа (на них правило «пройденности» не распространяется)
          // зачем (U10, часть 3): noPool — замена ТОЛЬКО из явного списка слов другого класса. Пул «соблазны того же верного
          // слова» состоит из слов того же класса (предлог к предлогу), а они-то и встают в слот грамматически («être vers la gare»).
          const pick = d.noPool
            ? (d.with || []).find(fits)
            : pool.find(fits) ?? (d.with || []).find(fits) ?? (LISTS.closedClasses?.[lang]?.prep ?? []).find(fits);
          if (!pick) throw new Error(`${LOG} ${p.id}#${i}: нет замены для «${d.distractor}» при «${tile.correct}» (${p.target})`);
          const next = likeCase(pick, tile.distractors[at]);
          rows.push(`| ${lang} | ${String(lesson.n).padStart(2, '0')} | ${p.target} — ${p.sourceLocales.ru} | **${tile.correct}** / ~~${tile.distractors[at]}~~ | **${tile.correct}** / ${next} | ${d.why} |`);
          console.log(`${LOG} ${p.id}#${i}: «${tile.correct}»: ${tile.distractors[at]} => ${next}   (${p.target})`);
          newRemovals.push([patchKey, strip(tile.distractors[at])]);
          ctx.removed.add(strip(tile.distractors[at])); ctx.fresh.add(strip(tile.distractors[at]));
          tile.distractors[at] = next; d.hits += 1; changed += 1;
        }
      });
      // зачем: список запретов сторожа действует на ВСЮ фразу — снятое слово не должно остаться соблазном и в соседней плитке
      p.tiles.forEach((tile, i) => {
        tile.distractors.forEach((x, at) => {
          if (!ctx.fresh.has(strip(x))) return;
          const taken = new Set(tile.distractors.map(low));
          const fits = (w) => {
            const k = low(w);
            if (k === low(tile.correct) || taken.has(k) || ownWords.has(strip(k)) || suspect.has(`${low(tile.correct)}\u0000${k}`)) return false;
            if (accepted.has(keyOf(corrects.map((c, j) => (j === i ? w : c))))) return false;
            return guardRejects(lang, ctx, tile, i, w) === null;
          };
          const pool = [...(seen.get(low(tile.correct)) || new Map()).entries()]
            .filter(([, e]) => e.first <= lesson.n).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])).map(([w]) => w);
          const pick = pool.find(fits) ?? (LISTS.closedClasses?.[lang]?.prep ?? []).find(fits);
          if (!pick) throw new Error(`${LOG} ${p.id}#${i}: нет замены для соседнего «${x}» (${p.target})`);
          const next = likeCase(pick, x);
          rows.push(`| ${lang} | ${String(lesson.n).padStart(2, '0')} | ${p.target} — ${p.sourceLocales.ru} | **${tile.correct}** / ~~${x}~~ | **${tile.correct}** / ${next} | то же слово снято в соседней плитке этой фразы |`);
          console.log(`${LOG} ${p.id}#${i}: сосед «${tile.correct}»: ${x} => ${next}   (${p.target})`);
          tile.distractors[at] = next; changed += 1;
        });
      });
    }
    const after = JSON.stringify(lesson.data) + '\n';
    const file = path.join(COURSES, lang, lessonName(lesson.n));
    if (after !== lesson.text) touched.push(lesson.n);
    if (!CHECK && after !== fs.readFileSync(file, 'utf8')) fs.writeFileSync(file, after);
  }
  for (const d of decisions) if (d.hits === 0) console.log(`${LOG} ${lang}: решение без попаданий (уже применено?) — ${d.correct} → ${d.distractor}${d.where ? ` @ ${d.where}` : ''}`);
  console.log(`${LOG} ${lang}: замен ${changed}, уроков затронуто ${touched.length}${CHECK ? ' (проверка, ничего не записано)' : ''}`);
  changedTotal += changed;
  if (touched.length) touchedLangs.push(lang);
}

if (!CHECK && touchedLangs.length) {
  // список запретов сторожа: снятый соблазн не должен вернуться в эту фразу
  for (const [key, word] of newRemovals) {
    const list = PATCHES.remove[key] ?? [];
    if (!list.map(strip).includes(word)) list.push(word);
    PATCHES.remove[key] = list;
  }
  fs.writeFileSync(PATCHES_PATH, JSON.stringify(PATCHES, null, 1) + '\n');
  const manifestPath = path.join(COURSES, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const lang of touchedLangs) {
    const entry = manifest.languages[lang];
    const lessonHash = createHash('sha256');
    for (const name of Object.keys(entry.files)) {
      if (!name.startsWith('lessons-')) continue;
      const text = fs.readFileSync(path.join(COURSES, lang, name), 'utf8');
      lessonHash.update(text);
      entry.files[name] = { bytes: Buffer.byteLength(text), sha256: sha(text) };
    }
    const index = { lang, lessons: 32, phrases: entry.phrases, rev: lessonHash.digest('hex'), sourceZipSha256: entry.sourceZipSha256 };
    const indexText = JSON.stringify(index) + '\n';
    fs.writeFileSync(path.join(COURSES, lang, 'index.json'), indexText);
    entry.files['index.json'] = { bytes: Buffer.byteLength(indexText), sha256: sha(indexText) };
    manifest.languages[lang] = { ...index, files: entry.files };
  }
  // зачем: manifest.json бывает открыт другим процессом, и Windows тогда отклоняет перезапись (см. U20) — замена через переименование
  const tmpPath = `${manifestPath}.u10tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest) + '\n');
  fs.renameSync(tmpPath, manifestPath);
  console.log(`${LOG} manifest.json, index.json и список запретов обновлены: ${touchedLangs.join(', ')}`);
}
if (REPORT) fs.writeFileSync(REPORT, rows.join('\n') + '\n');
console.log(`${LOG} всего замен: ${changedTotal}`);
