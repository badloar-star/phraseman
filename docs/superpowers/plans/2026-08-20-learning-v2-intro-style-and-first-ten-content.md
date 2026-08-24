# Learning V2 Intro Style and First Ten Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Зафиксировать утверждённый стиль интро и подготовить проверяемый полный кандидат первых десяти занятий урока 1 на восьми активных языках без выхода за `to be`.

**Architecture:** Нормативный стиль живёт в отдельной Style Bible и подключается ссылками из основных спецификаций. Сначала автоматический контракт краснеет на старом материале, затем новый кандидат показывается в интерактивном макете; production source меняется только после визуальной проверки всего пакета владельцем. Макет не публикует данные и не запускает TTS.

**Tech Stack:** Markdown contracts, TypeScript/Jest content guards, standalone HTML/CSS/JavaScript visual preview.

---

### Task 1: Нормативная Style Bible

**Files:**
- Create: `docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md`
- Create: `docs/superpowers/specs/2026-08-20-learning-v2-intro-style-lock-design.md`
- Modify: `docs/v2/README.md`
- Modify: `docs/v2/LESSON_DESIGN_RULES.ru.md`
- Modify: `docs/v2/03-learning-architecture-and-curriculum.md`
- Modify: `docs/v2/HANDOVER_2026-08-17_lesson1_bundle_and_audio.ru.md`
- Modify: `modules/learning-v2/content/source/episode_01_session_map_v1.ts`

- [x] Зафиксировать трёхстраничную структуру, голос старого эталона и запрет мета-рассказа.
- [x] Внести восемь утверждённых locale-native примеров.
- [x] Поставить ссылки в нормативные и рабочие документы.

### Task 2: Исполняемый запрет регрессии

**Files:**
- Modify: `tests/learning_v2_intro_contract.test.ts`

- [x] Добавить RED-проверку мета-лексики для восьми языков.
- [x] Добавить RED-проверку ссылок на русский язык в нерусских объяснениях.
- [x] Запустить `npx jest --runTestsByPath tests/learning_v2_intro_contract.test.ts --no-cache --runInBand` и сохранить фактический список старых нарушений.
- [ ] Перевести контракт в GREEN после принятия и переноса нового пакета в production source.

### Task 3: Авторский кандидат занятий 1–10

**Files:**
- Create: `.superpowers/brainstorm/871-1787210859/content/lesson1-first-ten-full-candidate-data-v1.js`

- [ ] Написать десять комплектов `title/summary/goal + 3 intro pages` на `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`.
- [ ] Закрепить порядок: `I am` → `I am not` → состояния → `I’m` → формулы → профессии → голос → проверка → `you are` → `you are not`.
- [ ] Добавить 15 взаимодействий на занятие, переводы, объяснения и объективно неверные дистракторы.

### Task 4: Полный интерактивный макет

**Files:**
- Create: `.superpowers/brainstorm/871-1787210859/content/lesson1-first-ten-full-candidate-v1.html`

- [ ] Показать десять вкладок, восемь языков, три интро и все 15 взаимодействий.
- [ ] Сделать вопросы и варианты кликабельными с локальным feedback.
- [ ] Добавить поиск и счётчики полноты без изменения учебного текста.

### Task 5: Проверка и handover

**Files:**
- Modify: `docs/v2/HANDOVER.md`

- [ ] Проверить 10 × 8 × 3 интро, 10 × 15 взаимодействий и отсутствие запрещённых выражений.
- [ ] Проверить HTTP 200 и интерактивность макета.
- [ ] Записать изменения, RED/GREEN, непроверенные поверхности и точный следующий шаг.

Production source, TTS, Firebase, deploy, push и release не входят в этот пакет до визуального одобрения владельца всего материала.

