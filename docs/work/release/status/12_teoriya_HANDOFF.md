# 12 · ТЕОРИЯ — как работать с её данными (для сессий 14 ЛОВУШКИ, 15 ГЛАГОЛЫ, 16 ТЕОРИЯ ES/FR, Learning V2) — 05.11

## Кто что ведёт
- Теория (12): сборка данных `node scripts/classic_course_pack.mjs` (ОДНА сборка за раз — запускаю я; вам: пришлите список готовых файлов/хеш), plain-теория en 10–32, de/it 10–15, вступления (en-тексты), словарь.
- 16: plain-теория es и fr 10–32. Learning V2: de/it 16–32 (и 7+ по их договорённости со мной; de/it 1–9 уже готовы мной).
- 14: ловушки (дистракторы) — `scripts/classic_course_pack.mjs` (fixDistractors/badReason), `scripts/classic_distractor_*.json`, `scripts/classic_audit_layer.json`. Правило Ревизора: та же часть речи/форма, без вопросительных слов на не-вопросительных плитках; сторож `tests/classic_distractor_pairs_guard.test.ts`, `tests/classic_distractors_course_language.test.ts`.
- 15: неправильные глаголы/аналоги — схема `docs/work/classic_irregular_verbs_SCHEMA.md`; проверка `scripts/classic_irregular_verbs_check.mjs` (напишите её по схеме, если нет); данные `modules/classic-courses/<lang>/irregular_verbs.json`; подключение — в генераторе отдельной функцией (как `applyVocab`), не трогая чужие хунки.

## Plain-теория (формат и проверки)
- Правила: `docs/work/classic_theory_plain/SPEC.md` (в конце — P0: в en-тексте нельзя упоминать русский/кириллицу).
- Вход: `node scripts/classic_plain_input.mjs <lang> N N` → `docs/work/classic_theory_plain/input/<lang>_lesson_NN.json`. Результат: `docs/work/classic_theory_plain/<lang>/lesson_NN.json`.
- Проверка: `node scripts/classic_plain_fixmixed.mjs && node scripts/classic_plain_check.mjs <lang> NN && node scripts/classic_plain_coverage.mjs <lang> NN` (охват слов — по снимку `docs/work/classic_theory_plain/glossary_snapshot`).
- Образцы принятого стиля: lesson_04..09 того же языка. Чек-лист Координатора: каждое слово в примере с переводом рядом; ≤8–10 новых слов на главу; без «россыпей» слов; без противоречий с прошлыми уроками; задания только со словами из теории.
- Процесс: писатель → независимый читатель-новичок (`node scripts/classic_beginner_qa.cjs prepare --course <c> --lessons N`, отдельный агент, затем `collect`) → правка → 100% «понятно» → коммит. Переводы на pt-BR/vi/id/tr/pl/es делает Переводчик в `docs/work/classic_theory_plain/<lang>/locales_NN.json`.

## Словарь уроков (новое правило владельца)
- Слова = слова-формы плиток, каждое ровно в одном уроке (первом), без «слово / артикль+слово». Вход `node scripts/classic_vocab_input.mjs <lang> from to` → `docs/work/classic_vocab/input/`; перевод в `docs/work/classic_vocab/<lang>/lesson_NN.json`; проверка `node scripts/classic_vocab_check.mjs <lang>`; применение — `scripts/classic_vocab_apply.mjs` (уроки с файлами заменяют старые записи). Сейчас сделаны уроки 1–6 всех курсов.

## Вступления
- Формат: `docs/work/classic_intro_plain/<lang>/lesson_NN.json` (en — Теория) и `docs/work/classic_intro_plain/<loc>/<lang>/lesson_NN.<loc>.json` (ru — Темы, uk — Переводчик); 3 блока concept/formula/practice. Подключение: `plainIntroFor` в `scripts/classic_intro_plain_apply.mjs`, вызов в `classic_course_pack.mjs` после `applyIntroOverrides`.

## Коммиты
- Папки целиком `safe_commit` не принимает ("Unable to process path") — давайте ИМЕНА ФАЙЛОВ (`git status --porcelain -- <папка>`).
