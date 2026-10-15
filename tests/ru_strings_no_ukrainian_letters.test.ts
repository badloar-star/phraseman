// зачем (Макеты → Дизайн 12.10): в русском интерфейсе «Уведомления» стояло украинское «Вислів дня» (в ru-слот попала украинская строка). Полный скан нашёл ещё два таких места
// (заголовок пуша «Фраза дня» и подпись «Фраза» в свайпе карточек). Сторож: в строке ru-ключа не бывает украинских букв і ї є ґ — русский их не знает.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

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
        const lines = normalizeEol(fs.readFileSync(file, 'utf8')).split('\n');
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
    const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
    expect(read('app/settings_notifications.tsx')).toContain("L({ ru:'Фраза дня', uk:'Вислів дня'");
    expect(read('app/notifications.ts')).toContain("ru: '☀️ Фраза дня',");
    expect(read('app/flashcards_swipe.tsx')).toContain("ru: 'Фраза',\n        en: 'Phrase',\n        uk: 'Вислів',");
  });

  // зачем (координатор 12.10): подсказки Главной хранятся отдельными наборами по языкам, а не ключами `ru:` — первый тест их не видит.
  // В украинском наборе заголовок остался русским «Фраза дня» над украинскими текстами. Проверяем все 6 показов обоих наборов.
  it('подсказки Главной: ru без украинских букв, uk без русских и со своими заголовками', () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { buildHomeFeatureTips } = require('../app/home_feature_tips');
    const RU_ONLY = /[ыэъёЫЭЪЁ]/;
    const SAME_IN_BOTH = new Set(['Статистика', 'Уроки']);
    for (let show = 0; show < 6; show += 1) {
      type Tip = { title: string; body: string; icon: string };
      const ru = buildHomeFeatureTips('ru', show) as Tip[];
      const uk = buildHomeFeatureTips('uk', show) as Tip[];
      ru.forEach((tip) => {
        expect(`${show}:${tip.title}:${UK_ONLY.test(tip.title + tip.body)}`).toBe(`${show}:${tip.title}:false`);
      });
      // зачем (координатор 12.10): uk-набор держал «Виклики дня» после удаления раздела — наборы обязаны совпадать по составу и порядку
      expect(uk.map((tip) => tip.icon)).toEqual(ru.map((tip) => tip.icon));
      const ruTitleByIcon = new Map(ru.map((tip) => [tip.icon, tip.title]));
      uk.forEach((tip) => {
        expect(`${show}:${tip.title}:${RU_ONLY.test(tip.title + tip.body)}`).toBe(`${show}:${tip.title}:false`);
        const ruTitle = ruTitleByIcon.get(tip.icon);
        if (ruTitle && !SAME_IN_BOTH.has(tip.title)) expect(`${tip.icon}:${tip.title}`).not.toBe(`${tip.icon}:${ruTitle}`);
      });
    }
  });
});
