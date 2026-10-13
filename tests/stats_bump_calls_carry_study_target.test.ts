// зачем (PM-190, координатор 13.10): «суммарные данные не смешивают обучение разных языков без метки» и «нет двойного счёта одной сессии».
// bumpStatsDaily без третьего аргумента пишет в ключ по умолчанию (en): фразы es/fr/de/it ложились в английскую статистику (lesson1.tsx).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) { if (!/node_modules|__tests__|^\./.test(entry.name)) sourceFiles(rel, out); continue; }
    if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

describe('учёт статистики по языку обучения', () => {
  const callers: Array<{ file: string; call: string }> = [];
  for (const file of [...sourceFiles('app'), ...sourceFiles('components')]) {
    if (file === 'app/stats_daily_breakdown.ts') continue;
    const src = read(file);
    for (const m of src.matchAll(/bumpStatsDaily\(([^;]*?)\)\)?;?\s*$/gm)) callers.push({ file, call: m[1] });
  }

  it('нашлись все пять мест учёта (фразы, слова, уроки, карточки)', () => {
    expect(callers.map((c) => c.file).sort()).toEqual([
      'app/lesson1.tsx', 'app/lesson1.tsx', 'app/lesson_words.tsx', 'components/AddToFlashcard.tsx',
    ].sort());
  });

  it('каждый вызов передаёт язык обучения третьим аргументом', () => {
    for (const { file, call } of callers) {
      const args = call.split(',').map((a) => a.trim());
      expect(`${file}: ${call} -> ${args.length >= 3 ? 'с языком' : 'БЕЗ ЯЗЫКА'}`).toContain('с языком');
    }
  });

  it('учёт идёт один раз на событие: фраза — при переходе в «выучено», слово — при завершении слова', () => {
    const lesson1 = read('app/lesson1.tsx');
    expect(lesson1).toContain("if (!wasLearned) void bumpStatsDaily('phrases_learned', 1, studyTargetRef.current);");
    const words = read('app/lesson_words.tsx');
    expect(words).toContain("if (wordJustCompleted) {\n          void bumpStatsDaily('words_learned', 1, studyTarget);");
  });

  it('экран «За всё время» подписывает сумму («по всем языкам»)', () => {
    expect(read('app/streak_stats.tsx')).toContain("ru: 'по всем языкам'");
  });
});
