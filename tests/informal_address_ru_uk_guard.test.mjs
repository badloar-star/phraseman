// зачем (координатор 00:12, переход на «ты» bb416e3cd/a54178f73): интерфейс обращается к человеку на «ты» в ru/uk.
// Остатки «вы» находились руками после каждого коммита («Вы уже занимались сегодня», «Проверьте интернет»,
// «Перевірте код»…). Сторож сканирует кириллические строки интерфейса (app, components, constants, hooks) и падает
// на новой вежливой форме. Учебный контент (переводы «you», теория, ловушки ошибок), множественное «вы» о двоих и
// файлы, которые сейчас ведут другие сессии, перечислены явно — с причиной. Список может только сокращаться.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['app', 'components', 'constants', 'hooks'];

// Зоны других владельцев и учебные корпуса — не интерфейсные фразы к человеку.
const SKIP_PATH = /learning[_-]v2|gustav|spire|\/dev\/|_dev|theory_content|lesson_intro_screens|lesson_words_data|lesson_data|lessons_data|phrases|vocab|dictionary|irregular|preposition|aha_scenes|level_exam|quiz|daily_phrase|curriculum/i;

/** Осознанные исключения: файл → причина. */
const ALLOWED_FILES = new Map([
  ['app/lesson_words.tsx', 'учебные переводы you: «Ты / Вы», «ваш» — значения слов'],
  ['components/lesson_help_theory_data.tsx', 'теория: you = «ты» или «вы», формы yourself/yourselves'],
  ['app/error_traps/error_traps_1_8.ts', 'учебный корпус ловушек ошибок целиком на «вы» — перевод на «ты» задача текстов (INBOX §CORE-0012)'],
  ['app/error_traps/error_traps_25_32.ts', 'учебный корпус ловушек ошибок — задача текстов (INBOX §CORE-0012)'],
  ['app/idioms_data.ts', 'множественное «вы» о двоих/компании в объяснении идиом'],
  ['components/profile-card/profile_card_copy.ts', '«Вы друзья» — о двоих, множественное'],
  ['app/achievement_catalog_v2.ts', 'шутка: «таймер обращается к тебе на „вы“»'],
  ['app/ai_dialog_briefing_copy.ts', '«почему вы свернули» — человек и водитель вместе, множественное'],
  ['app/ai_dialog_scenarios.ts', 'сценарии диалогов v1 — живой путь на V2, мёртвый код в списке «после релиза»'],
  ['app/exam_share.ts', 'текст, которым человек делится с другими: «это вам не шутки» — обращение к читателям'],
  ['app/dialogue_v2_visual_fixture.tsx', 'дев-образец диалога: «Вы» — подпись говорящего, не обращение'],
  ['app/community_pack_create.tsx', 'uk «Перевірте назву…» → «Перевір…»: правку блокирует сторож непереведённого (одиночная uk-строка словаря считается новой, когда общий счётчик вырос из-за чужих правок) — INBOX §CORE-0012'],
  ['app/flashcards_training_setup.tsx', 'ждёт владельца файла: «Говорите вслух», «Пишите по памяти», «Добавьте первый набор» (INBOX §CORE-0012)'],
  ['components/CleanOnboarding.tsx', 'ждёт сессию, которая правит файл: «Вы удалили все свои данные» (INBOX §CORE-0012)'],
]);

const POLITE = /(?<![А-Яа-яЁёІіЇїЄєҐґ'’])(Вы|вы|Вас|вас|Вам|вам|Вами|вами|Ваш[а-яё]*|ваш[а-яё]*|Ви|ви|Ваш[а-яієїґ]*)(?![А-Яа-яЁёІіЇїЄєҐґ])|(?<![А-Яа-яЁёІіЇїЄєҐґ])(?:Нажмите|Попробуйте|Выберите|Введите|Проверьте|Подождите|Откройте|Добавьте|Укажите|Используйте|Перезапустите|Обновите|Войдите|Свяжитесь|Напишите|Повторите|Сохраните|Подтвердите|Разрешите|Включите|Говорите|Пишите|Натисніть|Спробуйте|Оберіть|Виберіть|Введіть|Перевірте|Зачекайте|Відкрийте|Додайте|Вкажіть|Використовуйте|Оновіть|Увійдіть|Напишіть|Повторіть|Збережіть|Підтвердіть|Дозвольте|Увімкніть|Говоріть|Пишіть)(?![а-яієїґё])/;
const CYRILLIC_STRING = /(['"`])((?:(?!\1)[^\\]|\\.)*?[А-Яа-яЁёІіЇїЄєҐґ](?:(?!\1)[^\\]|\\.)*?)\1/g;

function politeHits() {
  const hits = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.tsx?$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
      const rel = path.relative(ROOT, full).replace(/\\/g, '/');
      if (SKIP_PATH.test(rel) || ALLOWED_FILES.has(rel)) continue;
      fs.readFileSync(full, 'utf8').split(/\r?\n/).forEach((line, index) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line) || /console\.|DebugLogger|logCta/.test(line)) return;
        for (const match of line.matchAll(CYRILLIC_STRING)) {
          if (POLITE.test(match[2])) hits.push(`${rel}:${index + 1} «${match[2].slice(0, 80)}»`);
        }
      });
    }
  };
  for (const dir of DIRS) walk(path.join(ROOT, dir));
  return hits;
}

test('интерфейс ru/uk обращается на «ты»: нет новых «вы/Нажмите/Перевірте» вне осознанных исключений', () => {
  assert.deepEqual(politeHits(), [], 'переведи строку на «ты» (Проверь / Перевір, ты / ти) или обоснуй исключение в ALLOWED_FILES');
});

test('исключения не протухают: каждый файл из списка существует', () => {
  for (const file of ALLOWED_FILES.keys()) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} удалён — убери из ALLOWED_FILES`);
  }
});
