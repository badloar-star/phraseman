# Task packet: живой макет «Готовим занятие…» — нажали «Продолжить», а занятие ещё собирается (2.0.3)

Governance-ID: TG-C4B92C5055D9
Status: In progress
Owner: 3 · МАКЕТЫ (заказ координатора 25.10, владелец «да хочу макет!»)
Related epic/enabler: app/learning_v2_home_continue_route.ts (launchHomeContinueV2), components/home/v2/scene/HomeSceneStage.tsx, app/learning_v2_session_launch_v1.ts (12 с)

## Outcome

Координатор 25.10, заказ на 2.0.3: анимированный макет редкого случая — тап «Продолжить», а занятие ещё собирается (до 12 с, через ~6 с «ещё готовится»). Мгновенная реакция кнопки, индикация на месте без спиннера на весь экран, переход в занятие; цвета темы, верх цельный. Три сценария рядом: уже собрано / 8 с / не успело за 12 с.

## Scope

In scope: docs/design/v2-app/lesson-preparing-live.html и этот пакет.

Out of scope: код приложения (перенос — после одобрения владельца): HomeSceneStage (вид занятости), launchHomeContinueV2 (отказ — остаться на Главной вместо карты курса), шторка урока во вкладке «Уроки».

## Architecture

No architecture change: статичная страница. Основа — код: сцена Главной (homeSceneTokensForTheme ink/marine, стили HomeSceneStage), срок LEARNING_V2_PREPARE_TIMEOUT_MS = 12 000, подписка useHomeContinueV2Launching; первая страница занятия — эталон learning-v2.html.

## Security and privacy

Данных нет: макет, сеть не используется.

## Technical debt

- Accept temporarily: в коде при отказе подготовки Главная уводит на карту курса, а макет предлагает остаться на Главной с подсказкой — это отдельная правка Ядра/Дизайна после одобрения; владелец решения — координатор.

## Verification

playwright: три сценария по кадрам (0–14 с), ошибок консоли 0, обе темы; снимки глазами.

## Rollback

Удалить страницу одним коммитом — приложение не меняется.
