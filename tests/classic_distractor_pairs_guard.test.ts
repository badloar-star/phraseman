/**
 * Сторож парных соблазнов классических курсов (Ревизор, 05.11.2026).
 *
 * зачем (координатор 05.11, пункт «ни один дистрактор не завершает верную фразу»): classic_courses_pack ловит ОДИНОЧНУЮ подстановку
 * (один соблазн вместо верной плитки не должен давать принимаемую фразу). Аудит B1 нашёл и ПАРЫ: два соблазна на разных позициях,
 * вместе дающие верный вариант («местоимение + глагол», артикль + существительное). Механическая часть — здесь: для каждой фразы,
 * для каждой пары позиций и каждой пары соблазнов результат не должен входить в {верный порядок} ∪ accepted ∪ alternatives.
 * Лингвистическую часть (соблазн даёт ДРУГУЮ верную фразу вне accepted) механика не ловит — это аудит.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const LANGS = ['en', 'es', 'fr', 'de', 'it'] as const;

type Tile = { correct: string; distractors: string[] };
type Phrase = { id: string; tiles: Tile[]; accepted?: string[][]; alternatives?: string[] };

const strip = (t: string): string => t.toLowerCase().replace(/[.,!?;:¿¡]/g, '');
const keyOf = (tokens: string[]): string => tokens.map(strip).join(' ');

describe('парные соблазны не дают верную фразу (механика)', () => {
  it.each(LANGS)('%s: ни одна пара соблазнов на двух позициях не складывается в принимаемую фразу', (lang) => {
    const files = fs.readdirSync(path.join(ROOT, lang)).filter((name) => /^lessons-\d+\.json$/.test(name)).sort();
    const phrases = files.flatMap((name) => (JSON.parse(fs.readFileSync(path.join(ROOT, lang, name), 'utf8')).phrases as Phrase[]));
    expect(phrases.length).toBe(1600);
    const bad: string[] = [];
    for (const p of phrases) {
      const corrects = p.tiles.map((t) => t.correct);
      const accepted = new Set([keyOf(corrects), ...(p.accepted ?? []).map(keyOf), ...(p.alternatives ?? []).map((a) => keyOf(a.split(/\s+/)))]);
      for (let i = 0; i < p.tiles.length; i += 1) {
        for (let j = i + 1; j < p.tiles.length; j += 1) {
          for (const di of p.tiles[i]!.distractors) {
            for (const dj of p.tiles[j]!.distractors) {
              const candidate = corrects.map((c, k) => (k === i ? di : k === j ? dj : c));
              if (accepted.has(keyOf(candidate))) bad.push(`${p.id}#${i}+${j}: «${di}» + «${dj}»`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 15)).toEqual([]);
    expect(bad.length).toBe(0);
  });
});
