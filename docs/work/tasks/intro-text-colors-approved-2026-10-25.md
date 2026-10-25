# Task packet: эталон цветов текста вступления — утверждённый вариант «Максимум и подложка» в замке одобренных

Governance-ID: TG-B83FCFD1B1C0
Status: In progress
Owner: 3 · МАКЕТЫ (заказ координатора 25.10, владелец «да хочу макет!»)
Related epic/enabler: app/learning_v2_session_intro.tsx (rolePresentation, IntroReaderParagraph, sayParts.situation без ролей), app/learning_v2_intro_semantic_bridge.ts; урок 17 занятие 1 (content/learning-v2-course/release/en/l17/s01/intro.json)

## Outcome

Владелец 25.10 выбрал «МАКСИМУМ И ПОДЛОЖКА»: частица — particle из introTextRoles (насыщенный цвет акцента с «Максимума» на любом уровне) + мягкая подложка + жирный. Эталон intro-text-colors.html сведён к одному утверждённому варианту (А/Б убраны, «Как сейчас» оставлен для сравнения), хэш внесён в approved-2026-10-21.lock.json и в список скрипта пересчёта. В «Проверь себя» частицы не подсвечиваются; разбор ролей при показе, без разметки в материалах.

## Scope

In scope: docs/design/v2-app/intro-text-colors.html, docs/design/v2-app/approved-2026-10-21.lock.json (новая строка), scripts/approved_2026_10_21_lock_update.mjs (файл в списке), артефакт, этот пакет.

Out of scope: код вступления (разбор текста на роли при показе, роли в ситуации «Скажи так») — после выбора владельца; тексты курса не меняются.

## Architecture

No architecture change: статичная страница. Предложение для кода: роли считаются при показе из обычного текста (письменность кириллица/латиница, список служебных слов, «+»/«→» формулы, -s/-es), без новой разметки в материалах; цвета — только токены темы (text, secondary, mutedText, accentTextSafe, accentSoft, semanticInk.badText).

## Security and privacy

Данных нет: макет, сеть не используется.

## Technical debt

- Contain: подложка accentSoft из слов владельца в тёмных темах даёт частице 3,8–4,4 : 1 (< 4,5 — закон контраста). В эталоне подложка — 12 % из самого particle (≥ 5,0 во всех показанных темах). Выход: Темы добавляют роль particleSoft в introTextRoles, проверенную на 29 темах; эталон переходит на неё. Владелец решения — координатор/Темы.

## Verification

node --test tests/approved_2026_10_21_locked.test.mjs (строка intro-text-colors.html ✔); playwright: 4 темы × 2 уровня, ошибок консоли 0, контраст ролей ≥ 4,5 на странице, 390 px без сдвига вбок.

## Rollback

Удалить страницу одним коммитом — приложение не меняется.
