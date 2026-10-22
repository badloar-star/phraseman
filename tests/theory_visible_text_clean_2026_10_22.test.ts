// зачем (координатор 22.10, после того как в уроке 22 ученик увидел служебную пометку в названии): всё, что экран теории Learning V2
// показывает ученику — заголовки, абзацы, советы, формулы, примеры, переводы, ошибки, — не содержит служебных пометок, id занятий,
// двойных пробелов и незакрытых скобок или кавычек. Плюс шапка Learning V2 не выдаёт «· A1» для всех уроков подряд.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'modules', 'learning-v2', 'theory', 'generated');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

type Block = { kind: string; text?: string; formula?: { text: string }[]; examples?: { en: string; translation: string }[]; fixes?: { wrong: string; right: string }[] };
type Theory = { title: string; sections: { num: string; title: string; blocks: Block[] }[] };

// регистр важен: «todo» в es / pt-BR — обычное слово «всё», а служебная пометка — TODO
const SERVICE = /[Рр]ешени[ея] владельца|[Рр]ішення власника|[Сс]лот\b|\bTODO\b|\bTBD\b|FIXME|[Чч]ерновик|[Чч]ернетк|\?\?|\bl\d\d\/s\d\d\b|[Gg]overnance|[Cc]odex|[Cc]laude|ТЕОРИЯ|Learning V2|\[\[|\]\]|<\/?[a-z]+>|\bundefined\b|\bnull\b|NaN/;
const PAIRS: [string, string][] = [['(', ')'], ['«', '»'], ['[', ']'], ['“', '”']];

function visibleTexts(theory: Theory): [string, string][] {
  const out: [string, string][] = [['title', theory.title]];
  for (const s of theory.sections) {
    out.push([`${s.num} title`, s.title]);
    for (const b of s.blocks) {
      if (b.text !== undefined) out.push([`${s.num} ${b.kind}`, b.text]);
      for (const part of b.formula ?? []) out.push([`${s.num} formula`, part.text]);
      for (const e of b.examples ?? []) { out.push([`${s.num} example`, e.en]); out.push([`${s.num} translation`, e.translation]); }
      for (const f of b.fixes ?? []) { out.push([`${s.num} fix wrong`, f.wrong]); out.push([`${s.num} fix right`, f.right]); }
    }
  }
  return out;
}

function problems(text: string): string[] {
  const found: string[] = [];
  if (SERVICE.test(text)) found.push('служебная пометка');
  if (/\S {2,}\S/.test(text)) found.push('двойной пробел');
  if (/^\s|\s$/.test(text)) found.push('пробел по краю');
  for (const [open, close] of PAIRS) if (text.split(open).length !== text.split(close).length) found.push(`непарные ${open}${close}`);
  if ((text.match(/"/g) ?? []).length % 2 === 1) found.push('непарные "');
  return found;
}

const files = fs.readdirSync(GEN).filter((f) => /^lesson_\d{2}\.[\w-]+\.json$/.test(f)).sort();

describe('видимые тексты теории Learning V2 чистые', () => {
  it('файлы теории есть', () => {
    expect(files.length).toBeGreaterThanOrEqual(22 * 9);
  });

  it.each(files)('%s: нет служебных пометок, двойных пробелов и непарных скобок', (file) => {
    const theory = JSON.parse(fs.readFileSync(path.join(GEN, file), 'utf8')) as Theory;
    const bad = visibleTexts(theory)
      .filter(([, text]) => typeof text !== 'string' || problems(text).length > 0)
      .map(([where, text]) => `${where}: ${typeof text === 'string' ? problems(text).join(', ') : 'пусто'} — ${String(text).slice(0, 80)}`);
    expect(bad).toEqual([]);
  });

  it('шапка Learning V2 без уровня: «Урок N», а не «Урок N · A1» для любого урока', () => {
    const sheet = read('components/learning-v2/LearningV2TheorySheet.tsx');
    const view = read('components/theory/TheoryLessonView.tsx');
    expect(sheet).toContain('level={null}');
    expect(view).toContain("level = 'A1',");
    expect(view).not.toMatch(/`[^`]*\$\{lessonId\} · A1`/);
  });
});
