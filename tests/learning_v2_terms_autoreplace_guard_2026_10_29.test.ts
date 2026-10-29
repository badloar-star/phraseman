// Сторож автозамены терминов в текстах Learning V2 (координатор и Ревизор 29.10). Термины по Библии текстов меняли скриптами
// («неисчисляемое» → «не считают поштучно», «артикль» → «a / the», «множественное число» → «форма для нескольких»), и часть строк
// вышла сломанной: «Crockery — это не считают поштучно», «Перед одним считается поштучно предметом», «слово a / the не нужен»,
// «форма формы для нескольких». Каждый шаблон ниже уже встречался и был исправлен; найден снова → красный со списком мест.
import fs from 'node:fs';
import path from 'node:path';

const SESSIONS = path.join(__dirname, '..', 'content/learning-v2-course/sessions/en');

const BROKEN: readonly (readonly [string, RegExp])[] = [
  ['«X — это не считают поштучно»', /— это не считают поштучно|— це не рахують поштучно/],
  ['«Здесь это не считают поштучно: X»', /[Зз]десь это не считают поштучно:|[Тт]ут це не рахують поштучно:/],
  // зачем: «such здесь не считают поштучно» — поштучно не считают слово после such (work, noise), а не само such
  ['«such не считают поштучно»', /such (здесь|тут) не (считают|рахують) поштучно/],
  ['«считается поштучно» перед английским словом', /(считается|рахується) поштучно [A-Za-z]/],
  ['«одним считается поштучно …» на месте прилагательного', /(?:^|[^а-яёіїєґ])(один|одна|одно|одним|одного|одну|одній) (считается|рахується) поштучно/i],
  ['«слово a / the» с глаголом не того рода', /слово a \/ the (не )?(нужен|потрібен)/],
  ['«с словом a / the»', /(?:^|[^а-яёіїєґ])(с|з) словом a \/ the/],
  ['«слова a / the a»', /слова a \/ the a\b/],
  ['«форма формы для нескольких»', /форм[аую] форм[ыиа] для (нескольких|кількох)/],
];

function finalFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return finalFiles(p);
    return /^final\.(ru|uk)\.md$/.test(e.name) ? [p] : [];
  });
}

describe('Learning V2: тексты без поломок автозамены терминов', () => {
  const files = finalFiles(SESSIONS);

  it('файлы занятий найдены', () => {
    expect(files.length).toBeGreaterThan(1000);
  });

  it.each(BROKEN.map(([name, re]) => [name, re] as const))('нет шаблона %s', (_name, re) => {
    const hits: string[] = [];
    for (const f of files) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (re.test(line)) hits.push(`${path.relative(SESSIONS, f)}:${i + 1}`);
      });
    }
    expect(hits).toEqual([]);
  });
});
