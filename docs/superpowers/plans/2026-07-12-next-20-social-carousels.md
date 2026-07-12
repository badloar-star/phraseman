# Next 20 Phraseman Social Carousels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать 20 новых готовых двухслайдовых каруселей Phraseman под номерами 08–27 с тремя вариантами рекламного слайда, подписями и независимым визуальным контролем.

**Architecture:** Существующий файловый pipeline получает расширенный каталог новых тем и поле варианта рекламного макета `A | B | C`. Каждый DALL-E-атлас генерируется встроенным imagegen отдельно, немедленно сохраняется в revision-папку, импортируется и рендерится. Готовая карусель экспортируется на рабочий стол только после ручной и независимой проверки.

**Tech Stack:** Node.js ESM, Sharp, SVG renderer, Jest, встроенный Codex DALL-E/imagegen, Markdown/TXT.

---

## Файловая структура

- Modify: `content/marketing/social-learning-cards/series-20.json` — добавить 20 новых уникальных карточек и вариант макета A/B/C.
- Modify: `tools/social-learning-cards/src/schema.mjs` — валидировать вариант рекламного слайда.
- Modify: `tools/social-learning-cards/src/render.mjs` — поддержать A/B/C и полностью убрать блок «готовая фраза» из новых макетов.
- Modify: `tests/social_learning_cards_pipeline.test.ts` — контракты 20 новых карточек и трёх макетов.
- Create: `output/social-learning-cards/<contentId>/revision_001/**` — игнорируемые исходники и финальные результаты.
- Create: `C:/Users/badlo/OneDrive/Desktop/Phraseman Social Cards/<08-27>-<slug>/**` — готовые публикационные пакеты.

## Тематическая матрица и варианты

| № | Тема | Учебный набор | Вариант |
|---:|---|---|:---:|
| 08 | Hotel English | 6 фраз в отеле | A |
| 09 | Emotions | 9 точных эмоций | B |
| 10 | Shopping | 6 действий в магазине | C |
| 11 | Weather | 9 выражений о погоде | A |
| 12 | Phone Calls | 6 телефонных фраз | B |
| 13 | Cooking Verbs | 9 глаголов готовки | C |
| 14 | Job Interview | 6 фраз собеседования | A |
| 15 | Housework | 9 домашних действий | B |
| 16 | Public Transport | 6 действий в транспорте | C |
| 17 | Personality | 9 черт характера | A |
| 18 | Make Collocations | 6 конструкций с make | B |
| 19 | Do Collocations | 6 конструкций с do | C |
| 20 | Money Vocabulary | 9 слов о деньгах | A |
| 21 | Fitness | 6 действий на тренировке | B |
| 22 | Internet English | 9 цифровых действий | C |
| 23 | Small Talk | 6 естественных реплик | A |
| 24 | Clothes | 9 предметов одежды | B |
| 25 | City Directions | 6 фраз для маршрута | C |
| 26 | Sleep Vocabulary | 9 выражений о сне | A |
| 27 | Agree and Disagree | 6 вежливых конструкций | B |

Распределение: A — 7, B — 7, C — 6.

### Task 1: Контракты новых макетов

**Files:**
- Modify: `tests/social_learning_cards_pipeline.test.ts`
- Modify: `tools/social-learning-cards/src/schema.mjs`
- Modify: `tools/social-learning-cards/src/render.mjs`

- [ ] **Step 1: Добавить падающие тесты**

Проверить, что `conversion.layoutVariant` принимает только `A`, `B`, `C`; новые варианты не содержат `answerEn`, `answerRu` или заголовок «готовая фраза»; персонаж или сцена получают безопасную область без обрезки головы.

- [ ] **Step 2: Запустить тест и увидеть ожидаемый FAIL**

Run: `$env:NODE_OPTIONS='--experimental-vm-modules'; npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: FAIL на отсутствующем `layoutVariant` и старом answer-блоке.

- [ ] **Step 3: Реализовать минимальную поддержку A/B/C**

Добавить enum `A | B | C`, отдельные безопасные layout-модели и не рендерить прежний правый блок фразы для этих вариантов. Сохранить старый renderer для уже выпущенных 01–07.

- [ ] **Step 4: Запустить профильный тест**

Run: `$env:NODE_OPTIONS='--experimental-vm-modules'; npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

Run: `git add tests/social_learning_cards_pipeline.test.ts tools/social-learning-cards/src/schema.mjs tools/social-learning-cards/src/render.mjs && git commit -m "feat: add varied install slide layouts"`

### Task 2: Каталог 08–27

**Files:**
- Modify: `content/marketing/social-learning-cards/series-20.json`
- Modify: `tests/social_learning_cards_pipeline.test.ts`

- [ ] **Step 1: Добавить тест каталога**

Проверить 20 новых уникальных `contentId`, темы, EN/RU-пары, хуки, `layoutVariant`, отсутствие answer-блока и распределение A=7, B=7, C=6.

- [ ] **Step 2: Запустить тест и увидеть FAIL**

Run: `$env:NODE_OPTIONS='--experimental-vm-modules'; npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: FAIL, новые 20 записей отсутствуют.

- [ ] **Step 3: Добавить точные данные всех 20 карточек**

Для каждой темы записать 6 или 9 уникальных EN/RU-пар, визуальные контракты, рекламный хук, две конкретные выгоды, CTA, обещание старта через 30 секунд, URL и вариант A/B/C.

- [ ] **Step 4: Запустить тест каталога**

Run: `$env:NODE_OPTIONS='--experimental-vm-modules'; npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

Run: `git add content/marketing/social-learning-cards/series-20.json tests/social_learning_cards_pipeline.test.ts && git commit -m "content: add next twenty social carousels"`

### Task 3: Пакет 08–12

- [ ] Для каждой карточки выполнить `prepare`.
- [ ] Сгенерировать один текст-свободный DALL-E-атлас встроенным imagegen.
- [ ] Немедленно скопировать atlas в revision-папку и выполнить `import` + `render`.
- [ ] Открыть оба JPEG в original-размере и проверить головы, руки, очки, текст и композицию.
- [ ] Передать оба JPEG независимой модели; исправлять до `APPROVED`.
- [ ] Создать уникальный `POST.txt` и экспортировать готовую папку на рабочий стол.

### Task 4: Пакет 13–17

- [ ] Подготовить Cooking Verbs, Job Interview, Housework, Public Transport и Personality отдельными командами `prepare`.
- [ ] Для каждой темы сгенерировать отдельный встроенный DALL-E-атлас без текста и сразу сохранить его в соответствующую revision-папку.
- [ ] Импортировать и отрендерить обе карточки каждой темы.
- [ ] Проверить крупный размер персонажей, целые головы, фирменные очки, анатомию, переводы и отсутствие внутренних подложек.
- [ ] Получить независимый `APPROVED` для каждой карусели, исправляя дефекты отдельными replacement-иллюстрациями.
- [ ] Создать пять уникальных `POST.txt` и экспортировать папки 13–17 на рабочий стол.

### Task 5: Пакет 18–22

- [ ] До генерации проверить классификацию и перевод конструкций Make Collocations и Do Collocations.
- [ ] Подготовить Make Collocations, Do Collocations, Money Vocabulary, Fitness и Internet English отдельными командами `prepare`.
- [ ] Создать и немедленно сохранить пять отдельных встроенных DALL-E-атласов.
- [ ] Выполнить `import` и `render`, затем открыть все десять JPEG в original-размере.
- [ ] Передать каждую пару независимой модели и выполнить цикл исправлений до `APPROVED`.
- [ ] Создать пять уникальных `POST.txt` и экспортировать папки 18–22 на рабочий стол.

### Task 6: Пакет 23–27

- [ ] Подготовить Small Talk, Clothes, City Directions, Sleep Vocabulary и Agree and Disagree отдельными командами `prepare`.
- [ ] Проверить естественность реплик Small Talk и Agree and Disagree до создания визуалов.
- [ ] Создать пять отдельных встроенных DALL-E-атласов и немедленно сохранить каждый результат.
- [ ] Выполнить `import` и `render`; визуально проверить все десять JPEG по строгим правилам.
- [ ] Получить независимый `APPROVED` для каждой карусели и исправить все замечания.
- [ ] Создать пять уникальных `POST.txt` и экспортировать папки 23–27 на рабочий стол.

### Task 7: Общий выпускной gate

- [ ] Подтвердить наличие ровно 20 новых папок 08–27.
- [ ] Подтвердить в каждой папке два JPEG 1080×1080, `POST.txt` и `sources/atlas.png`.
- [ ] Проверить распределение вариантов A=7, B=7, C=6.
- [ ] Запустить `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand` и получить 0 failures.
- [ ] Передать все 40 JPEG финальному сильномодельному ревьюеру.
- [ ] Исправить каждый блокирующий дефект и повторить аудит до `DECISION: APPROVED`.
- [ ] Commit финальных отслеживаемых изменений; generated output остаётся в предназначенных output/desktop-папках.
