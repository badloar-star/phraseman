// gen_classic_lesson_topics.mjs — названия тем уроков классических курсов (es/fr/de/it) для списка и меню уроков.
// зачем (владелец 05.11: «Lesson 1 без темы» в списке уроков de/it): тему урока берём из theory.json курса (поле title урока: объект локалей),
// кладём в компактный файл app/classic_lesson_topics.gen.ts — список уроков не должен грузить 900 КБ теории ради 32 названий.
// Запуск: node scripts/gen_classic_lesson_topics.cjs   (после пересборки theory.json); сторож: tests/classic_lesson_topics_fresh.test.ts.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LANGS = ['es', 'fr', 'de', 'it'];
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

const clean = (s) => String(s ?? '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

// зачем (координатор 05.11, проверка 1cdcbafd6): в theory.json у тем уроков 1–6 поля es/pt-BR/vi/id/tr/pl — английская копия,
// и в списке уроков пользователь с таким интерфейсом видел английский. Переводы лежат в источнике scripts/data/classic_lesson_topics_i18n.json
// (не в .gen.ts — иначе следующая генерация вернула бы английский). Подставляем, только если в theory.json значение пустое или = en:
// настоящий перевод из theory.json всегда главнее.
const OVERLAY = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'classic_lesson_topics_i18n.json'), 'utf8'));

function withTopicTranslations(titles, overlay) {
  if (!overlay) return titles;
  const next = { ...titles };
  for (const locale of LOCALES) {
    if (locale === 'en' || typeof overlay[locale] !== 'string') continue;
    if (!next[locale] || next[locale] === next.en) next[locale] = clean(overlay[locale]);
  }
  return next;
}

function buildTopics() {
  const out = {};
  for (const lang of LANGS) {
    const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules', 'classic-courses', lang, 'theory.json'), 'utf8'));
    const lessons = {};
    for (let n = 1; n <= 32; n += 1) {
      const raw = file.data?.[String(n)]?.title;
      let titles = null;
      if (raw && typeof raw === 'object') {
        titles = {};
        for (const locale of LOCALES) {
          const value = clean(raw[locale] ?? raw.en ?? raw.ru);
          if (value) titles[locale] = value;
        }
      } else if (typeof raw === 'string' && raw.trim()) {
        titles = { en: clean(raw) };
      } else if (file.data?.[String(n)]?.localized) {
        // es (studio2): title внутри localized[locale]
        titles = {};
        for (const locale of LOCALES) {
          const value = clean(file.data[String(n)].localized[locale]?.title);
          if (value) titles[locale] = value;
        }
      }
      if (titles) titles = withTopicTranslations(titles, OVERLAY[lang]?.[String(n)]);
      if (titles && Object.keys(titles).length > 0) lessons[n] = titles;
    }
    out[lang] = lessons;
  }
  return out;
}

function render(topics) {
  return `// АВТОГЕНЕРАЦИЯ: node scripts/gen_classic_lesson_topics.mjs — не править руками.
// Темы уроков классических курсов (из theory.json) для списка и меню уроков; сторож свежести: tests/classic_lesson_topics_fresh.test.ts.
export type ClassicTopicLang = 'es' | 'fr' | 'de' | 'it';
export const CLASSIC_LESSON_TOPICS: Readonly<Record<ClassicTopicLang, Readonly<Record<number, Readonly<Record<string, string>>>>>> = ${JSON.stringify(topics, null, 1)};
`;
}

module.exports = { buildTopics, render };

if (require.main === module) {
  const target = path.join(ROOT, 'app', 'classic_lesson_topics.gen.ts');
  fs.writeFileSync(target, render(buildTopics()));
  console.log('written', target);
}
