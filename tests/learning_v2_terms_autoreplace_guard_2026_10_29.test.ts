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
  // зачем: Ревизор 29.10 — английская грамматическая формула внутри русского текста («Could I + base verb?», «have + past participle»)
  ['английская грамматическая формула', /\b(base verb|past participle|to-infinitive|gerund|noun phrase|count noun|non-count noun|plural noun|verb-ing|reflexive pronoun|object pronoun)\b/i],
  // зачем: Learning V2 29.10 — замена съела открывающую «*» разбора, и сборщик потерял разбор варианта (l27/s53)
  ['разбор варианта без открывающей «*»', /^- [^*]+ — [^*].*\*$/],
];

// зачем: Ревизор 29.10 — сторож обязан падать на подложенной строке; иначе регулярка могла «ослепнуть» после правки
const PLANTED: Readonly<Record<string, string>> = {
  '«X — это не считают поштучно»': '- ❌ It is crockery. — *Crockery — это не считают поштучно; согласуем с is.*',
  '«Здесь это не считают поштучно: X»': '- a — *Здесь это не считают поштучно: rice без a.*',
  '«such не считают поштучно»': '- so — *such здесь не считают поштучно, поэтому без a.*',
  '«считается поштучно» перед английским словом': '- ❌ There is smudge. — *Перед считается поштучно smudge нужно a.*',
  '«одним считается поштучно …» на месте прилагательного': 'Перед одним считается поштучно предметом нужен a.',
  '«слово a / the» с глаголом не того рода': 'После my слово a / the не нужен.',
  '«с словом a / the»': 'Назовите вещь с словом a / the.',
  '«слова a / the a»': 'Здесь слова a / the a и the не добавляем.',
  '«форма формы для нескольких»': 'В английском eggs имеет форму формы для нескольких.',
  '«Множественное / Единственное X» в разборе': '- is — *Множественное seats требует are.*',
  'английская грамматическая формула': '**Что вы освоите:** вежливо попросить: Could I + base verb?',
  'разбор варианта без открывающей «*»': '- leaving — Нужна форма прошлого: left.*',
};

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

  it.each(BROKEN.map(([name, re]) => [name, re] as const))('сторож ловит подложенную строку: %s', (name, re) => {
    expect(PLANTED[name]).toBeDefined();
    expect(re.test(PLANTED[name]!)).toBe(true);
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
// зачем: координатор 29.10 — те же правила целей для испанского курса; пример может начинаться с ¿ ¡ и буквы с ударением
const COURSES = { en: SESSIONS, es: path.join(__dirname, '..', 'content/learning-v2-course/sessions/es') } as const;
const GOAL_EXAMPLE = /(?:: | — )([¿¡A-Za-zÁÉÍÓÚÑ][^:а-яёіїєґ]*?)$/i;
const WHOLE_EXAMPLE = /^[¿¡A-ZÁÉÍÓÚÑ].*[.?!]$/;

function goalLine(text: string, lang: 'ru' | 'uk'): string | null {
  const line = text.split('\n').find((l) => l.startsWith(GOAL_LABEL[lang]));
  return line ? line.slice(GOAL_LABEL[lang].length).trim() : null;
}

// Все замечания к строке «Что вы освоите» одного занятия (ru + uk); пустой список — строка в порядке.
function goalProblems(where: string, texts: Readonly<{ ru: string; uk: string }>): string[] {
  const bad: string[] = [];
  const goals = { ru: goalLine(texts.ru, 'ru'), uk: goalLine(texts.uk, 'uk') };
  if (!goals.ru || !goals.uk) return bad;
  const examples: Record<string, string | null> = {};
  for (const lang of ['ru', 'uk'] as const) {
    const goal = goals[lang]!;
    if (!/[а-яёіїєґ]/i.test(goal)) bad.push(`${where} ${lang}: строка без кириллицы — английская формула`);
    if (goal.length > 90) bad.push(`${where} ${lang}: ${goal.length} знаков > 90`);
    const ex = GOAL_EXAMPLE.exec(goal)?.[1] ?? null;
    examples[lang] = ex;
    if (!ex) bad.push(`${where} ${lang}: нет примера`);
  }
  if (examples.ru !== examples.uk) bad.push(`${where}: пример ru «${examples.ru}» ≠ uk «${examples.uk}»`);
  const ex = examples.ru?.replace(/[.?!]+$/, '');
  const body = texts.ru.replace(`${GOAL_LABEL.ru}${goals.ru}`, '');
  // зачем: пример должен жить в самом занятии — иначе он придуман или скопирован из другого занятия
  if (ex && !body.includes(ex)) bad.push(`${where}: пример «${ex}» не встречается в тексте занятия`);
  // зачем: координатор 29.10 — пример целой фразой до 8 слов (с заглавной и точкой); обрывок допустим, только если
  // вырезан из фразы занятия длиннее 8 слов (короче целой фразы, показывающей навык, нет)
  const full = examples.ru;
  if (full) {
    if (full.split(/\s+/).length > 8) bad.push(`${where}: пример «${full}» длиннее 8 слов`);
    const whole = WHOLE_EXAMPLE.test(full);
    const phrases = [...body.matchAll(/(?:→|✅|🎙[^*]*)\s*\*\*([¿¡A-ZÁÉÍÓÚÑ][^*]{2,120}?[.?!])\*\*/g)].map((m) => m[1]!);
    if (!whole && !phrases.some((p) => p.includes(ex!) && p.split(/\s+/).length > 8)) {
      bad.push(`${where}: обрывок «${full}» при наличии фразы до 8 слов`);
    }
  }
  return bad;
}

describe('Learning V2: «Что вы освоите» — простые слова и пример из занятия', () => {
  it.each(Object.entries(COURSES))('курс %s: без формул, с примером из занятия, ≤ 90 знаков, ru = uk', (course, root) => {
    const sessions = finalFiles(root).filter((f) => f.endsWith('final.ru.md')).map((ru) => path.dirname(ru));
    expect(sessions.length).toBeGreaterThan(100);
    const bad: string[] = [];
    for (const dir of sessions) {
      const uk = path.join(dir, 'final.uk.md');
      if (!fs.existsSync(uk)) continue;
      const where = `${course}/${path.relative(root, dir).replace(/\\/g, '/')}`;
      const texts = { ru: fs.readFileSync(path.join(dir, 'final.ru.md'), 'utf8'), uk: fs.readFileSync(uk, 'utf8') };
      bad.push(...goalProblems(where, texts));
    }
    expect(bad).toEqual([]);
  });

  // зачем: координатор 29.10 (решение владельца) — в испанском «род» и «артикль» остаются, а «множественное / единственное
  // число», «местоимение» и подобные трудные слова заменены простыми («когда их несколько», «для одного», «без «они»»)
  // зачем: Ревизор 29.10 — «Множественное amigos требует son» прошло мимо «…числ»; в испанском «множественн-» без числа — тоже термин
  const ES_HARD_TERMS = /множествен|единствен\S* числ|местоимени|спряж|инфинитив|подлежащ|множин|однин|займенник|дієвідмін|інфінітив|підмет/i;
  it('испанский курс: в текстах занятий нет трудных грамматических слов', () => {
    expect(ES_HARD_TERMS.test('Sillas во множественном числе: pocas.')).toBe(true);
    const hits: string[] = [];
    for (const f of finalFiles(COURSES.es)) {
      const where = `es/${path.relative(COURSES.es, path.dirname(f)).replace(/\\/g, '/')}`;
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (ES_HARD_TERMS.test(line)) hits.push(`${where}/${path.basename(f)}:${i + 1}`);
      });
    }
    expect(hits).toEqual([]);
  });

  // зачем: Ревизор 29.10 — каждое правило обязано падать на подложенной плохой строке
  const body = '\n- ✅ **I am ready.**\n🎙 Скажите: **The gift was wrapped by the shop assistant in red paper.**\n';
  const planted = (ru: string, uk: string) => ({ ru: `**Что вы освоите:** ${ru}${body}`, uk: `**Що ви опануєте:** ${uk}${body}` });
  it.each([
    ['английская формула', planted('Could I + base verb?', 'Could I + base verb?'), 'без кириллицы'],
    ['нет примера', planted('сказать, что вы готовы', 'сказати, що ви готові'), 'нет примера'],
    ['длиннее 90', planted(`${'с'.repeat(80)}: I am ready.`, 'сказати: I am ready.'), '> 90'],
    ['ru ≠ uk', planted('сказать о себе: I am ready.', 'сказати про себе: I am late.'), '≠ uk'],
    ['пример не из занятия', planted('сказать о себе: I am late.', 'сказати про себе: I am late.'), 'не встречается'],
    ['обрывок при целой фразе', planted('сказать о себе: am ready', 'сказати про себе: am ready'), 'обрывок'],
  ] as const)('ловит подложенную строку: %s', (_name, texts, expected) => {
    expect(goalProblems('planted', texts).some((p) => p.includes(expected))).toBe(true);
  });

  it('пропускает правильную строку и законный обрывок из длинной фразы', () => {
    expect(goalProblems('planted', planted('сказать о себе: I am ready.', 'сказати про себе: I am ready.'))).toEqual([]);
    expect(goalProblems('planted', planted('сказать, кто упаковал: gift was wrapped by the shop assistant', 'сказати, хто запакував: gift was wrapped by the shop assistant'))).toEqual([]);
  });
});
