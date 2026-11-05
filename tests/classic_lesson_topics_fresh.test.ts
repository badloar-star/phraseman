// зачем: app/classic_lesson_topics.gen.ts — генерируемая копия тем уроков из theory.json. Если Теория пересобрала данные, а файл не перегенерирован,
// в списке уроков останутся старые темы. Сторож: файл совпадает с тем, что даёт node scripts/gen_classic_lesson_topics.cjs.
import fs from 'fs';
import path from 'path';

describe('classic lesson topics file is fresh', () => {
  it('app/classic_lesson_topics.gen.ts matches theory.json (run: node scripts/gen_classic_lesson_topics.cjs)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../scripts/gen_classic_lesson_topics.cjs') as { buildTopics: () => unknown; render: (t: unknown) => string };
    const expected = mod.render(mod.buildTopics()).replace(/\r\n/g, '\n');
    const actual = fs.readFileSync(path.join(__dirname, '..', 'app', 'classic_lesson_topics.gen.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(actual).toBe(expected);
  });
});
