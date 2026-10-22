// зачем (координатор 22.10, аудит theory-audit-2026-10-22.md): кнопка «Теория» из эпизода открывает раздел по карте «занятие → раздел».
// 24 содержательных раздела не открывал ни один эпизод — ученик видел их только вкладкой. Сторож не даёт «сиротам» вернуться:
// каждый раздел урока, кроме первого, открытого сразу и двух итоговых («Ошибки…», «Что взять…»), открывается хотя бы одним занятием.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'modules', 'learning-v2', 'theory', 'generated');

type Section = { num: string; title: string; defaultOpen?: boolean };
type Theory = { lesson: number; sections: Section[]; sessionSection: Record<string, string> };

const lessons = fs.readdirSync(GEN)
  .map((f) => /^lesson_(\d{2})\.ru\.json$/u.exec(f))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => Number(m[1]))
  .sort((a, b) => a - b);

const load = (n: number): Theory => JSON.parse(fs.readFileSync(path.join(GEN, `lesson_${String(n).padStart(2, '0')}.ru.json`), 'utf8')) as Theory;

describe('карта «занятие → раздел» теории', () => {
  it('есть уроки с теорией', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(22);
  });

  it.each(lessons)('урок %i: каждый содержательный раздел открывается хотя бы одним занятием', (n) => {
    const theory = load(n);
    const reached = new Set(Object.values(theory.sessionSection));
    // два последних раздела — итоговые («Ошибки…», «Что взять…»): их открывают вкладкой, не из эпизода
    const content = theory.sections.slice(1, -2).filter((s) => !s.defaultOpen);
    const orphans = content.filter((s) => !reached.has(s.num)).map((s) => `${s.num} ${s.title}`);
    expect(orphans).toEqual([]);
  });

  it.each(lessons)('урок %i: карта ведёт только на существующие разделы', (n) => {
    const theory = load(n);
    const nums = new Set(theory.sections.map((s) => s.num));
    const broken = Object.entries(theory.sessionSection).filter(([, num]) => !nums.has(num)).map(([s, num]) => `${s} → ${num}`);
    expect(broken).toEqual([]);
  });
});
