// зачем (Макеты → Дизайн 12.10): в русском интерфейсе «Уведомления» стояло украинское «Вислів дня» (в ru-слот попала украинская строка). Полный скан нашёл ещё два таких места
// (заголовок пуша «Фраза дня» и подпись «Фраза» в свайпе карточек). Сторож: в строке ru-ключа не бывает украинских букв і ї є ґ — русский их не знает.
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['app', 'components', 'constants', 'modules', 'hooks'];
const UK_ONLY = /[іїєґІЇЄҐ]/;
// ключ ru: со строкой в одинарных, двойных или обратных кавычках (однострочной)
const RU_LITERAL = /\bru\s*:\s*(['"`])((?:(?!\1).){1,200})\1/g;

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

describe('русские строки не содержат украинских букв', () => {
  it('ни в одном ru-литерале нет і ї є ґ', () => {
    const root = path.join(__dirname, '..');
    const hits: string[] = [];
    for (const top of ROOTS) {
      const dir = path.join(root, top);
      if (!fs.existsSync(dir)) continue;
      for (const file of sourceFiles(dir)) {
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, index) => {
          for (const match of line.matchAll(RU_LITERAL)) {
            if (UK_ONLY.test(match[2])) hits.push(`${path.relative(root, file)}:${index + 1} «${match[2].slice(0, 60)}»`);
          }
        });
      }
    }
    expect(hits).toEqual([]);
  });

  it('три найденных места исправлены на «Фраза»', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    expect(read('app/settings_notifications.tsx')).toContain("L({ ru:'Фраза дня', uk:'Вислів дня'");
    expect(read('app/notifications.ts')).toContain("ru: '☀️ Фраза дня',");
    expect(read('app/flashcards_swipe.tsx')).toContain("ru: 'Фраза',\n        en: 'Phrase',\n        uk: 'Вислів',");
  });
});
