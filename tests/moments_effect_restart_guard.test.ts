// зачем (координатор 14.10; баг eac17d631: эффект тайм-листа перезапускал ВСЕ таймеры после каждого такта — не появлялись тексты и кнопки): во всех моментах эффект с таймерами/анимацией
// не зависит от значения, которое меняется на каждом такте или рендере. Признаки (каждый — отдельная ошибка):
//  1) в зависимостях колбэк-проп `onXxx` (не `...Ref`) или нестабильный возврат хука (`rumble`, `play…`) — хозяин передаёт новую функцию на каждый рендер;
//  2) в зависимостях состояние, которое сам эффект (его таймеры) и обновляет через setXxx — каждый такт перезапускает эффект.
// Каталоги: моменты Пика, сторис, монета/«С возвращением», ранг монеты, выход из урока, рубежи серии. Новые каталоги моментов добавлять в список.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const DIRS = ['components/spire/moments', 'components/stories', 'components/moments', 'components/coin_rank_moments', 'components/lesson_exit', 'components/streak/moments'];
const TIMER = /setTimeout|setInterval|withDelay|withTiming|withSequence|withRepeat|withSpring|requestAnimationFrame/;
/** Колбэки и возвраты хуков, новые на каждый рендер. `...Ref` — стабильный ref, булевы пропы вроде `fire` значение, а не функция. */
const UNSTABLE = /^(?!.*Ref$)(on[A-Z]\w*|rumble|play\w*)$/;

function matchParen(s: string, i: number): number {
  let depth = 0;
  for (let j = i; j < s.length; j += 1) {
    if (s[j] === '(') depth += 1;
    else if (s[j] === ')') { depth -= 1; if (depth === 0) return j; }
  }
  return -1;
}

type Finding = Readonly<{ at: string; reason: string }>;

function scanSource(rel: string, src: string): Finding[] {
  const out: Finding[] = [];
  for (const m of src.matchAll(/\buse(?:Effect|LayoutEffect)\(/g)) {
    const start = m.index! + m[0].length - 1;
    const end = matchParen(src, start);
    if (end < 0) continue;
    const body = src.slice(start, end + 1);
    if (!TIMER.test(body)) continue;
    const dm = /\[([^\[\]]*)\]\s*\)\s*$/.exec(body);
    const deps = dm && dm[1]!.trim() ? dm[1]!.split(',').map((x) => x.trim()) : [];
    const line = src.slice(0, m.index).split('\n').length;
    for (const d of deps) {
      if (UNSTABLE.test(d)) out.push({ at: `${rel}:${line}`, reason: `в зависимостях нестабильный колбэк/возврат хука «${d}»` });
    }
    const setters = new Set([...body.matchAll(/\b(set[A-Z]\w*)\(/g)].map((x) => x[1]!));
    for (const d of deps) {
      const setter = `set${d.charAt(0).toUpperCase()}${d.slice(1)}`;
      if (/^[a-z]\w*$/.test(d) && setters.has(setter)) out.push({ at: `${rel}:${line}`, reason: `эффект сам обновляет «${d}» (${setter}) и зависит от него — перезапуск на каждом такте` });
    }
  }
  return out;
}

describe('моменты: эффект с таймерами не перезапускается на каждом такте', () => {
  const files = DIRS.flatMap((d) => (fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${d}/${f}`) : []));

  it('просматриваются реальные файлы моментов (не пустая проверка)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('нет эффектов с таймерами и нестабильными/самообновляемыми зависимостями', () => {
    const findings = files.flatMap((rel) => scanSource(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')));
    expect(findings.map((f) => `${f.at}: ${f.reason}`)).toEqual([]);
  });

  it('сторож действительно ловит класс: образец плохого эффекта помечается обоими признаками; ref и булев проп — нет', () => {
    const bad = "useEffect(() => { const t = setTimeout(() => { setStep(1); onDone(); }, 100); return () => clearTimeout(t); }, [step, onDone]);\n";
    expect(scanSource('sample.tsx', bad).map((f) => f.reason).sort()).toEqual([
      'в зависимостях нестабильный колбэк/возврат хука «onDone»',
      'эффект сам обновляет «step» (setStep) и зависит от него — перезапуск на каждом такте',
    ]);
    const good = "useEffect(() => { const t = setTimeout(() => { setStep(1); onDoneRef.current(); }, 100); return () => clearTimeout(t); }, [fire, onDoneRef, reduceMotion]);\n";
    expect(scanSource('sample.tsx', good)).toEqual([]);
  });
});
