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
const LISTS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'classic_distractor_lists.json'), 'utf8')) as { numbers: Record<string, string[]> };
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
