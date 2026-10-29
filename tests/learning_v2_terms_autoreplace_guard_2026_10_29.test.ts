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
  // зачем: Ревизор 29.10 — «Множественное seats требует are» остался термином; простое слово — «Seats (их несколько) требуют are»
  ['«Множественное / Единственное X» в разборе', /(Множественное|Единственное|Множинне|Однинне) [a-z]/],
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

// «Что вы освоите» (координатор и Ревизор 29.10): простые слова без английских формул, ОДИН английский пример в конце строки,
// пример — правильный ответ из этого же занятия (встречается в тексте занятия вне самой строки), строка ≤ 90 знаков, ru и uk —
// один и тот же пример. Ловит формулы («Could I + base verb?»), придуманные примеры и один пример, скопированный во все занятия.
const GOAL_LABEL = { ru: '**Что вы освоите:** ', uk: '**Що ви опануєте:** ' } as const;
const GOAL_EXAMPLE = /(?:: | — )([A-Za-z][^:а-яёіїєґ]*?)$/i;

function goalLine(text: string, lang: 'ru' | 'uk'): string | null {
  const line = text.split('\n').find((l) => l.startsWith(GOAL_LABEL[lang]));
  return line ? line.slice(GOAL_LABEL[lang].length).trim() : null;
}

describe('Learning V2: «Что вы освоите» — простые слова и пример из занятия', () => {
  const sessions = finalFiles(SESSIONS).filter((f) => f.endsWith('final.ru.md')).map((ru) => path.dirname(ru));

  it('во всех занятиях: без формул, с примером из занятия, ≤ 90 знаков, ru = uk', () => {
    const bad: string[] = [];
    for (const dir of sessions) {
      const uk = path.join(dir, 'final.uk.md');
      if (!fs.existsSync(uk)) continue;
      const texts = { ru: fs.readFileSync(path.join(dir, 'final.ru.md'), 'utf8'), uk: fs.readFileSync(uk, 'utf8') };
      const goals = { ru: goalLine(texts.ru, 'ru'), uk: goalLine(texts.uk, 'uk') };
      if (!goals.ru || !goals.uk) continue;
      const where = path.relative(SESSIONS, dir);
      const examples: Record<string, string | null> = {};
      for (const lang of ['ru', 'uk'] as const) {
        const goal = goals[lang]!;
        if (!/[а-яёіїєґ]/i.test(goal)) bad.push(`${where} ${lang}: строка без кириллицы — английская формула`);
        if (goal.length > 90) bad.push(`${where} ${lang}: ${goal.length} знаков > 90`);
        const ex = GOAL_EXAMPLE.exec(goal)?.[1] ?? null;
        examples[lang] = ex;
        if (!ex) bad.push(`${where} ${lang}: нет английского примера`);
      }
      if (examples.ru !== examples.uk) bad.push(`${where}: пример ru «${examples.ru}» ≠ uk «${examples.uk}»`);
      const ex = examples.ru?.replace(/[.?!]+$/, '');
      const body = texts.ru.replace(`${GOAL_LABEL.ru}${goals.ru}`, '');
      // зачем: пример должен жить в самом занятии — иначе он придуман или скопирован из другого занятия
      if (ex && !body.includes(ex)) bad.push(`${where}: пример «${ex}» не встречается в тексте занятия`);
    }
    expect(bad).toEqual([]);
  });
});
