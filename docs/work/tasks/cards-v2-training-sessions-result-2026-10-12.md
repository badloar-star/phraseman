# Карточки 2.0 — блоки 9–12 (Тренировка, Сессии, Ответы, Итог)

Governance-ID: TG-922770C169C6

## Outcome
Блоки 9–12 приложения совпадают с утверждённым макетом `docs/design/v2-app/cards-v2.html`: шторка режима 2×2, настройка тренировки (плитки наборов, «Сколько», «Показывать», лимит Free с «Безлимит с Plus»), сессии (Блиц, Устно, Правда/ложь со смахиванием, Напиши с подсветкой ошибки), панели ответов и итог (с ошибками и без). Стиль «Тень» (без обводок), цвета — токены темы.

## Scope
`app/flashcards/FlashcardsTrainingModeSheet.tsx`, `TrainingSetupV2.tsx`, `DeckPickerSheet.tsx`, `DeckSelectionTile.tsx`, `app/flashcards_training_setup.tsx`, `app/flashcards/training_entry.ts`, `app/flashcards_blitz_session.tsx`, `app/flashcards_speaking_session.tsx`, `app/flashcards_swipe.tsx`, `app/flashcards_recall_session.tsx`, `app/flashcards/PhraseCard.tsx`, `app/flashcards/CardsSessionResultV2.tsx` и их тесты/AST-хэши. Файлы других участков (хаб, Сохранённые, наборы, видео, CardsKit) не правятся.

## Architecture
Только слой вида: логика загрузки наборов, квоты, энергии (режим Б, `SessionAttemptsHud`, `isAttemptsStopEffect`, `useSessionAttemptAutoReset`) не меняется. Общие части берутся из `components/v2/ShadowSurface` и `components/cards-grid/CardsKit`; новые компоненты живут рядом с экранами. Анимации — Reanimated/нативный драйвер, `useReduceMotion` уважается. Данные, которых нет (направление/размер блица, бинарный вердикт «Устно»), не выдумываются — перечисляются как ожидание Ядра.

## Security and privacy
Данные пользователей не собираются и не передаются иначе, чем раньше; новых сервисов, разрешений и полей профиля нет.

## Technical debt
Тени дороже по отрисовке на слабых Android — следить на списках. AST-хэши контрактных тестов обновляются вместе с вёрсткой. Часть пунктов макета ждёт Ядра (см. отчёт).

## Verification
Срезовый `tsc` по изменённым файлам, точечные тесты (`npm run test:one`, `node --test`), сторожа обводок/типографики/цветов, затем кадры Эмулятора и склейки Сверки с макетом.

## Rollback
Откат коммитов блока (каждый блок — отдельный коммит); логика экранов не затронута.
