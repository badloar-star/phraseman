// Сторож рантайм-данных классических курсов (modules/classic-courses/<lang>/, контракт Ядра 04.11).
// Ловит: неполные курсы (не 32 × 50), повтор id, «жир» из архива в lessons-NN (english/russian/ukrainian/teachingNote/category),
// озвучку (audio*/voice*/tts*-ключи, mp3/ogg/m4a, http-ссылки — владелец: пока только системный TTS), разъезд с manifest.json
// (размер/sha256 файлов, rev = sha256 всех lessons-файлов) и раздувание размера сверх бюджета.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const LANGS = fs.existsSync(ROOT) ? fs.readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
// зачем: лимит из контракта Ядра — ≤ 5 МБ сырого JSON на язык (EN допускается до 6,5)
const BUDGET_MB: Record<string, number> = { en: 6.5, es: 5, fr: 5, de: 5, it: 5 };
const LISTS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'classic_distractor_lists.json'), 'utf8')) as { numbers: Record<string, string[]>; articles?: Record<string, string[]>; synonyms?: Record<string, string[][]>; youGroups?: Record<string, string[][]>; siblingTails?: Record<string, string[]>; timeAdverbs?: Record<string, string[]>; adverbOnly?: Record<string, { words: string[]; allowedFor: string[] }>; closedClasses?: Record<string, { prep: string[]; conj: string[] }>; articlePairs?: Record<string, string[][]> };
const PATCHES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'classic_distractor_patches.json'), 'utf8')) as { remove: Record<string, string[]>; answers?: Record<string, { remove?: string[] }> };
// зачем: соблазны, поставленные аудитором (scripts/classic_audit_layer.json), не подчиняются классовым правилам генератора — их проверяет генератор
// (нет второй верной фразы у этой фразы и в словаре курса); тест оставляет для них только проверки «своё слово / чужое правильное / принимаемая фраза / дубль»
const AUDIT_LAYER = fs.existsSync(path.join(__dirname, '..', 'scripts', 'classic_audit_layer.json'))
  ? (JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'classic_audit_layer.json'), 'utf8')) as { tiles: Record<string, { position: number; with: string }[]> })
  : { tiles: {} };
const LESSON_FAT = ['english', 'russian', 'ukrainian', 'teachingNote', 'category', 'gradingMethod'];
const FORBIDDEN_KEY = /^(audio|voice|tts)/i;
const FORBIDDEN_VALUE = /\.(mp3|ogg|m4a)|https?:\/\//i;

const read = (lang: string, name: string) => fs.readFileSync(path.join(ROOT, lang, name), 'utf8');
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');

function walk(node: unknown, visit: (key: string | null, value: unknown) => void, key: string | null = null): void {
  visit(key, node);
  if (Array.isArray(node)) node.forEach((v) => walk(v, visit));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, visit, k);
}

describe('классические курсы: рантайм-данные', () => {
  it('есть хотя бы один язык', () => {
    expect(LANGS.length).toBeGreaterThan(0);
  });

  it('детектор озвучки ловит подложенные поля', () => {
    const found: string[] = [];
    walk({ a: { audioUrl: 'x', tts: 1, b: 'https://x.y/z', c: 'v.mp3', d: 'ok' } }, (k, v) => {
      if (k && FORBIDDEN_KEY.test(k)) found.push(k);
      if (typeof v === 'string' && FORBIDDEN_VALUE.test(v)) found.push(v);
    });
    expect(found).toEqual(['audioUrl', 'tts', 'https://x.y/z', 'v.mp3']);
  });

  describe.each(LANGS)('%s', (lang) => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).languages[lang];
    const files = fs.readdirSync(path.join(ROOT, lang)).sort();
    const lessonFiles = files.filter((f) => /^lessons-\d\d\.json$/.test(f));

    it('32 урока × 50 фраз, id уникальны', () => {
      expect(lessonFiles).toEqual(Array.from({ length: 32 }, (_, i) => `lessons-${String(i + 1).padStart(2, '0')}.json`));
      const ids = new Set<string>();
      lessonFiles.forEach((f, i) => {
        const data = JSON.parse(read(lang, f));
        expect(data.schema).toBe('phraseman.classic.lesson/1');
        expect(data.lang).toBe(lang);
        expect(data.lesson).toBe(i + 1);
        expect(data.phrases).toHaveLength(50);
        for (const p of data.phrases) {
          expect(typeof p.target === 'string' && p.target.trim().length > 0).toBe(true);
          expect(p.tiles.length).toBeGreaterThan(0);
          expect(Object.keys(p.sourceLocales).sort()).toEqual(['en', 'es', 'id', 'pl', 'pt-BR', 'ru', 'tr', 'uk', 'vi']);
          expect(ids.has(p.id)).toBe(false);
          ids.add(p.id);
        }
      });
      expect(ids.size).toBe(1600);
    });

    // Плитки-соблазны (Координатор 04.11): правила проверяются по данным, а не по коду генератора
    it('соблазны: регистр, чужие правильные слова, числительные/имена, принимаемая фраза, дубли', () => {
      type Tile = { text: string; correct: string; distractors: string[] };
      type Phrase = { id: string; tiles: Tile[]; accepted?: string[][]; alternatives: string[] };
      const phrases: Phrase[] = lessonFiles.flatMap((f) => JSON.parse(read(lang, f)).phrases);
      const numbers = new Set<string>(LISTS.numbers[lang] ?? []);
      const strip = (t: string) => t.toLowerCase().replace(/[.,!?;:¿¡]/g, '');
      const keyOf = (tokens: string[]) => tokens.map(strip).join(' ');
      const upper = (t: string) => t[0] !== t[0].toLowerCase();
      // известные имена: с заглавной в середине фразы и никогда строчными (только es/fr/it — в EN/DE регистр не различает имён)
      const lower = new Set<string>();
      for (const p of phrases) for (const t of p.tiles) if (!upper(t.correct)) lower.add(t.correct);
      const names = new Set<string>();
      if (['es', 'fr', 'it'].includes(lang)) {
        for (const p of phrases) p.tiles.forEach((t, i) => { if (i > 0 && upper(t.correct) && !lower.has(t.correct.toLowerCase())) names.add(t.correct); });
      }
      const bad: Record<string, string[]> = { selfCase: [], otherCorrect: [], number: [], name: [], acceptedPhrase: [], duplicate: [], count: [], lowerI: [] };
      for (const p of phrases) {
        const corrects = p.tiles.map((t) => t.correct);
        const acc = new Set([keyOf(corrects), ...(p.accepted ?? []).map(keyOf), ...p.alternatives.map((a) => keyOf(a.split(/\s+/)))]);
        p.tiles.forEach((tile, i) => {
          const seen = new Set<string>();
          if (tile.distractors.length !== 5) bad.count.push(`${p.id}#${i}`);
          for (const d of tile.distractors) {
            const where = `${p.id}#${i}:${d}`;
            if (strip(d) === strip(tile.correct)) bad.selfCase.push(where);
            if (corrects.some((c, j) => j !== i && strip(c) === strip(d))) bad.otherCorrect.push(where);
            if (numbers.has(strip(d)) && !numbers.has(strip(tile.correct))) bad.number.push(where);
            if (names.has(d) && !names.has(tile.correct) && i > 0 && !upper(tile.correct)) bad.name.push(where);
            if (acc.has(keyOf(corrects.map((c, j) => (j === i ? d : c))))) bad.acceptedPhrase.push(where);
            if (seen.has(strip(d))) bad.duplicate.push(where);
            seen.add(strip(d));
            if (lang === 'en' && /^i(['’]|$)/.test(d)) bad.lowerI.push(where);
          }
        });
      }
      const counts = Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, v.length]));
      expect(counts).toEqual({ selfCase: 0, otherCorrect: 0, number: 0, name: 0, acceptedPhrase: 0, duplicate: 0, count: 0, lowerI: 0 });
    });

    // Системные причины неоднозначных плиток по аудиту сильной модели (Координатор 04.11, второй проход)
    it('соблазны: артикли, синонимы, «вы/они», части речи, непройденные слова, точечные правки', () => {
      type Tile = { correct: string; distractors: string[] };
      type Phrase = { id: string; tiles: Tile[]; accepted?: string[][]; alternatives: string[]; answers?: string[]; sourceLocales: { ru: string } };
      const phrases: Phrase[] = lessonFiles.flatMap((f) => JSON.parse(read(lang, f)).phrases);
      const strip = (t: string) => t.toLowerCase().replace(/[.,!?;:¿¡]/g, '');
      const lessonOf = (id: string) => { const m = /(\d\d)[.:](\d\d)$/.exec(id)!; return { lesson: Number(m[1]), key: `${m[1]}:${m[2]}` }; };
      const articles = new Set<string>(LISTS.articles?.[lang] ?? []);
      const artPairs = LISTS.articlePairs?.[lang] ?? null;
      const groupHit = (groups: string[][] | undefined, a: string, b: string) => (groups ?? []).some((g) => g.includes(a) && g.includes(b));
      const tails: string[] = LISTS.siblingTails?.[lang] ?? [];
      const noAccent = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
      // «вы» в русском (или нет указания лица) не различает 2-е лицо/вежливую/множественную форму — такие формы не соблазны
      const RU_VY = /(^|[^а-яё])(вы|вас|вам|вами|ваш[а-яё]*)(?![а-яё])/i;
      const RU_OTHER = /(^|[^а-яё])(я|мы|ты|он|она|оно|они|меня|мне|нас|нам|тебя|тебе|его|её|ее|им|ей|ему|их|ним|ней|ними)(?![а-яё])/i;
      const youApplies = (ru: string) => RU_VY.test(ru) || !RU_OTHER.test(ru);
      const sibling = (a0: string, b0: string) => {
        const a = noAccent(a0);
        const b = noAccent(b0);
        if (!tails.length || a === b) return false;
        let p = 0;
        while (p < a.length && p < b.length && a[p] === b[p]) p++;
        return p >= 3 && tails.includes(a.slice(p)) && tails.includes(b.slice(p)) && a.length - p <= 4 && b.length - p <= 4;
      };
      const timeAdv = new Set<string>(LISTS.timeAdverbs?.[lang] ?? []);
      const numbers = new Set<string>(LISTS.numbers[lang] ?? []);
      const vocab = new Map<string, number>();
      for (const p of phrases) {
        const { lesson } = lessonOf(p.id);
        for (const t of [...p.tiles.map((x) => x.correct), ...(p.accepted ?? []).flat(), ...p.alternatives.flatMap((a) => a.split(/\s+/))]) {
          const k = strip(t);
          if (k && (!vocab.has(k) || vocab.get(k)! > lesson)) vocab.set(k, lesson);
        }
      }
      // имена: с заглавной в середине фразы и никогда строчными среди правильных слов; плитка-имя в начале фразы — большинство соблазнов из имён
      const lowerSeen = new Set<string>();
      for (const p of phrases) for (const t of p.tiles) if (t.correct[0] === t.correct[0].toLowerCase()) lowerSeen.add(t.correct);
      const baseNames = new Set<string>();
      for (const p of phrases) p.tiles.forEach((t, i) => { if (i > 0 && t.correct[0] !== t.correct[0].toLowerCase() && !lowerSeen.has(t.correct.toLowerCase())) baseNames.add(t.correct); });
      const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
      const isNameTile = (t: Tile, i: number) => t.correct[0] !== t.correct[0].toLowerCase() && (i > 0 || baseNames.has(t.correct) || t.distractors.filter((d) => baseNames.has(cap(d))).length >= 3);
      const bad: Record<string, string[]> = { article: [], synonym: [], youForm: [], pos: [], nonWord: [], unseen: [], patch: [], answers: [] };
      for (const p of phrases) {
        const { lesson, key } = lessonOf(p.id);
        const removed = new Set<string>((PATCHES.remove[`${lang}:${key}`] ?? []).map(strip));
        p.tiles.forEach((tile, i) => {
          const c = strip(tile.correct);
          for (const d of tile.distractors) {
            const dd = strip(d);
            const where = `${p.id}#${i}:${d}`;
            const mm = /(\d\d)[.:](\d\d)$/.exec(p.id)!;
            if ((AUDIT_LAYER.tiles[`${lang}:${mm[1]}:${mm[2]}`] ?? []).some((o) => o.position === i && o.with.toLowerCase() === d.toLowerCase())) continue;
            if (!/^[\p{L}][\p{L}'’-]*$/u.test(d)) bad.nonWord.push(where);
            if (removed.has(dd)) bad.patch.push(where);
            if (articles.has(c) && articles.has(dd) && (!artPairs || artPairs.some(([a, b]) => (a === c && b === dd) || (a === dd && b === c)))) bad.article.push(where);
            if (groupHit(LISTS.synonyms?.[lang], c, dd)) bad.synonym.push(where);
            if (youApplies(p.sourceLocales.ru) && (groupHit(LISTS.youGroups?.[lang], c, dd) || sibling(c, dd))) bad.youForm.push(where);
            if (lang === 'de' && timeAdv.has(dd) && !timeAdv.has(c)) bad.pos.push(where);
            if (!numbers.has(c)) {
              const seen = vocab.get(dd);
              // зачем: имена и первые плитки (регистр не различает слова и имена) проверяет генератор; тест — для обычных слов внутри фразы
              const closed = new Set<string>([...(LISTS.closedClasses?.[lang]?.prep ?? []), ...(LISTS.closedClasses?.[lang]?.conj ?? [])]);
              if (i > 0 && tile.correct[0] === tile.correct[0].toLowerCase() && !closed.has(dd) && (seen === undefined || seen > lesson + Math.max(1, 8 - lesson))) bad.unseen.push(where);
            }
          }
        });
        if (lang === 'es') {
          const ap = PATCHES.answers?.[p.id];
          if (ap) for (const a of ap.remove ?? []) if ((p.answers ?? []).includes(a)) bad.answers.push(`${p.id}:${a}`);
          if ((p.answers ?? []).some((a) => /\bno[.?!]?$/.test(a) && a !== (p.answers ?? [])[0])) bad.answers.push(`${p.id}:final-no`);
          if ((p.answers ?? []).some((a) => /mesa fuese/.test(a))) bad.answers.push(`${p.id}:fuese`);
        }
      }
      const counts = Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, v.length]));
      expect(counts).toEqual({ article: 0, synonym: 0, youForm: 0, pos: 0, nonWord: 0, unseen: 0, patch: 0, answers: 0 });
    });

    // Переводы ru/uk — полные фразы: Переводчик однажды записал в fixes только слово из колонки «исправление» («рано», «Ваша»)
    it('переводы ru/uk: полная фраза, знак конца, без невидимых символов', () => {
      type P = { id: string; target: string; sourceLocales: { ru: string; uk: string } };
      const bad: string[] = [];
      for (const f of lessonFiles) for (const p of JSON.parse(read(lang, f)).phrases as P[]) {
        const tw = p.target.trim().split(/\s+/).length;
        for (const l of ['ru', 'uk'] as const) {
          const t = p.sourceLocales[l];
          const ratio = t.length / Math.max(1, p.target.trim().length);
          if (/[​‌‍⁠﻿]/.test(t)) bad.push(`${p.id} ${l}: невидимый символ`);
          if (!/[.?!…»"”)]$/.test(t)) bad.push(`${p.id} ${l}: нет знака конца «${t}»`);
          if (tw >= 4 && t.split(/\s+/).length < 2) bad.push(`${p.id} ${l}: фрагмент «${t}»`);
          if (ratio < 0.3 || ratio > 4) bad.push(`${p.id} ${l}: длина ${t.length}/${p.target.length} «${t}»`);
        }
      }
      expect(bad).toEqual([]);
    });

    it('допустимые ответы: без дублей, каждый путь непустой, канонический первым', () => {
      type P = { id: string; target: string; tiles: { correct: string }[]; accepted?: string[][]; alternatives: string[]; answers?: string[] };
      const bad: string[] = [];
      const norm = (a: string[]) => a.join(' ').toLowerCase();
      for (const f of lessonFiles) for (const p of JSON.parse(read(lang, f)).phrases as P[]) {
        const acc = (p.accepted ?? []).map(norm);
        if (new Set(acc).size !== acc.length) bad.push(`${p.id}: дубли accepted`);
        if (new Set(p.alternatives).size !== p.alternatives.length) bad.push(`${p.id}: дубли alternatives`);
        if (p.alternatives.includes(p.target)) bad.push(`${p.id}: target в alternatives`);
        if (p.answers && new Set(p.answers).size !== p.answers.length) bad.push(`${p.id}: дубли answers`);
        if (p.accepted && acc[0] !== norm(p.tiles.map((t) => t.correct))) bad.push(`${p.id}: первым не канонический путь`);
      }
      expect(bad).toEqual([]);
    });

    it('соблазны: род без признака, «fuera» только к наречиям места, нет мусорных ответов с существительным', () => {
      type P = { id: string; tiles: { correct: string; distractors: string[] }[]; answers?: string[] };
      const noAccent = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
      const genderPair = (a0: string, b0: string) => {
        const a = noAccent(a0.toLowerCase());
        const b = noAccent(b0.toLowerCase());
        if (a === b || a.length < 3 || b.length < 3) return false;
        if (lang === 'fr') return a + 'e' === b || b + 'e' === a || (a.endsWith('s') && b.endsWith('es') && a.slice(0, -1) + 'es' === b) || (b.endsWith('s') && a.endsWith('es') && b.slice(0, -1) + 'es' === a);
        if (a.slice(0, -1) !== b.slice(0, -1)) return false;
        const e = a.slice(-1) + b.slice(-1);
        if (lang === 'es') return e === 'oa' || e === 'ao';
        if (lang === 'it') return ['oa', 'ao', 'ie', 'ei'].includes(e);
        return false;
      };
      const only = LISTS.adverbOnly?.[lang];
      const bad: string[] = [];
      for (const f of lessonFiles) for (const p of JSON.parse(read(lang, f)).phrases as P[]) {
        p.tiles.forEach((t, i) => {
          for (const d of t.distractors) {
            const mm = /(\d\d)[.:](\d\d)$/.exec(p.id)!;
            if ((AUDIT_LAYER.tiles[`${lang}:${mm[1]}:${mm[2]}`] ?? []).some((o) => o.position === i && o.with.toLowerCase() === d.toLowerCase())) continue;
            if (genderPair(t.correct, d)) bad.push(`${p.id}#${i}: род ${t.correct}/${d}`);
            if (only && only.words.includes(d.toLowerCase()) && !only.allowedFor.includes(t.correct.toLowerCase())) bad.push(`${p.id}#${i}: ${d} вне наречий`);
          }
        });
        // «Hay una llaves»: допустимые ответы ES не содержат un/una + мн.ч., которого нет в основном ответе
        if (lang === 'es' && p.answers) {
          const re = /\b(un|una)\s+\p{L}+(as|os|es)\b/iu;
          if (p.answers.slice(1).some((a) => re.test(a)) && !re.test(p.answers[0])) bad.push(`${p.id}: мусорный ответ`);
        }
      }
      expect(bad).toEqual([]);
    });

    it('вступления: 32 урока × 3 блока, заголовки без разметки, примеры из курса', () => {
      const intro = JSON.parse(read(lang, 'intro.json')) as Record<string, Record<string, unknown>[]>;
      const ids = new Set<string>();
      for (const f of lessonFiles) for (const p of JSON.parse(read(lang, f)).phrases as { id: string }[]) ids.add(p.id);
      const bad: string[] = [];
      expect(Object.keys(intro)).toHaveLength(32);
      // зачем: рендерер вступлений не поддерживает Markdown — обратные кавычки ученик увидел бы буквально
      expect(read(lang, 'intro.json')).not.toContain('`');
      for (const [n, blocks] of Object.entries(intro)) {
        if (blocks.length !== 3) bad.push(`урок ${n}: блоков ${blocks.length}`);
        for (const b of blocks) {
          for (const [k, v] of Object.entries(b)) if (/^title/.test(k) && JSON.stringify(v).includes('`')) bad.push(`урок ${n} ${k}: разметка в заголовке`);
          const exIds = ((b.exampleIds ?? b.examplesById) as string[] | undefined) ?? [];
          if (!exIds.length) bad.push(`урок ${n}: нет примеров`);
          for (const id of exIds) if (!ids.has(id) && !ids.has(`en-classic-r1:${id}`)) bad.push(`урок ${n}: пример ${id} не из курса`);
        }
      }
      expect(bad).toEqual([]);
    });

    it('в lessons-NN нет «жира» архива', () => {
      const fat: string[] = [];
      for (const f of lessonFiles) {
        walk(JSON.parse(read(lang, f)), (k) => {
          if (k && LESSON_FAT.includes(k)) fat.push(`${f}:${k}`);
        });
      }
      expect([...new Set(fat)]).toEqual([]);
    });

    it('нет озвучки: audio*/voice*/tts*, mp3/ogg/m4a, http-ссылок', () => {
      const bad: string[] = [];
      for (const f of files.filter((x) => x.endsWith('.json'))) {
        walk(JSON.parse(read(lang, f)), (k, v) => {
          if (k && FORBIDDEN_KEY.test(k)) bad.push(`${f}:${k}`);
          if (typeof v === 'string' && FORBIDDEN_VALUE.test(v)) bad.push(`${f}:${v.slice(0, 40)}`);
        });
      }
      expect([...new Set(bad)]).toEqual([]);
    });

    it('manifest.json совпадает с файлами (размер, sha256, rev)', () => {
      expect(manifest.lessons).toBe(32);
      expect(manifest.phrases).toBe(1600);
      for (const f of files) {
        if (f === 'manifest.json') continue;
        const text = read(lang, f);
        expect(manifest.files[f]).toEqual({ bytes: Buffer.byteLength(text), sha256: sha(text) });
      }
      expect(Object.keys(manifest.files).sort()).toEqual(files);
      const rev = createHash('sha256');
      lessonFiles.forEach((f) => rev.update(read(lang, f)));
      expect(manifest.rev).toBe(rev.digest('hex'));
      expect(JSON.parse(read(lang, 'index.json'))).toEqual({ lang, lessons: 32, phrases: 1600, rev: manifest.rev, sourceZipSha256: manifest.sourceZipSha256 });
    });

    it('укладывается в бюджет размера', () => {
      const total = files.reduce((s, f) => s + fs.statSync(path.join(ROOT, lang, f)).size, 0);
      expect(total / 1048576).toBeLessThanOrEqual(BUDGET_MB[lang] ?? 5);
    });
  });
});

describe('классические курсы: файлы правок переводов', () => {
  const dir = path.join(__dirname, '..', 'docs', 'work');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => /^classic_translation_fixes_.*\.json$/.test(n)) : [];
  it.each(files)('%s: правки — полные фразы', (name) => {
    const fixes = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) as Record<string, Record<string, string>>;
    const bad: string[] = [];
    for (const [k, v] of Object.entries(fixes)) {
      if (k.startsWith('_')) continue;
      for (const l of ['ru', 'uk']) {
        const t = v[l];
        if (t === undefined) continue;
        if (/[​‌‍⁠﻿]/.test(t)) bad.push(`${k} ${l}: невидимый символ`);
        if (t.trim().split(/\s+/).length < 2 && !/^(Да|Нет|Так|Ні|Открыто|Відчинено)[.!?]$/.test(t)) bad.push(`${k} ${l}: фрагмент «${t}»`);
        if (!/[.?!…»"”)]$/.test(t.trim())) bad.push(`${k} ${l}: нет знака конца «${t}»`);
      }
    }
    expect(bad).toEqual([]);
  });
});
