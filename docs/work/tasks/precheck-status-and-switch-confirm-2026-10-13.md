# Task packet: срез release:precheck после ночи + окно «Сменить аккаунт?» в виде общего окна (auth-gap-012)

Governance-ID: TG-FF32FE385773
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 06:2x: (1) разбор diff зон → (2) R1_PRECHECK_STATUS к ~07:30)

## Outcome

1. `docs/phraseman-2.0/R1_PRECHECK_STATUS_2026-10-13.md` переписан по свежему прогону `release_precheck` (06:37–06:39).
   Одна таблица: 9 гейтов плюс то, что ждёт владельца (вопрос 5 — проверка типов, вопросы 7/8 — номер сборки, 13 — политика, 4 — английский).
2. auth-gap-012: карточка подтверждения смены аккаунта (`app/(tabs)/settings.tsx`, стадия `confirm`) выглядит как общее окно
   `.or-alert` из образца `accounts-gaps-states.html` (switch): заголовок по центру 23/29, текст по центру, кнопки-пилюли в ряд
   (ghost «Отмена» и основная «Продолжить», высота 44).

## Scope

In scope:
- документ статуса;
- вид карточки стадии `confirm` (общая карточка `GlassAlertCard` или её стили).

Out of scope:
- логика смены аккаунта, стадия `wiping`, флаги Account V2;
- тексты абзацев;
- `testID` `settings-switch-cancel`, `settings-switch-continue`, `settings-switch-plus-notice` — сохраняются.

## Architecture

Модал остаётся ОДИН на обе стадии: два `<Modal>` ломают стек презентаций iOS (см. шапку блока в `settings.tsx`).
Поэтому `ThemedConfirmModal` и `GlassAlertDialog` (у каждого свой модал) не подходят. Внутри существующего модала рисуется карточка
со стилями общего окна `GlassAlertCard`: `opaqueSheet`, тень `plateBoxShadow`, r25, поля 20.
Кнопки — как у `GlassAlertCard`: ghost — `opaqueControl` с `nestedBoxShadow`, основная — `accent` с `ThemeAccentFill`.

## Security and privacy

Только вид. Данные, вызовы и порядок шагов смены аккаунта не меняются.

## Technical debt

- Contain: карточка повторяет стили `GlassAlertCard`, потому что у общей карточки нет слота под несколько абзацев и своих `testID` кнопок.
  Расширение `GlassAlertCard` (`messageNode`, `testID` кнопок) — отдельная задача Дизайна.

## Verification

- Контракт-тест: в стадии `confirm` заголовок по центру, кнопки в ряд пилюлями, `testID` сохранены, модал один.
- Тесты смены аккаунта в Настройках зелёные.
- Переснять auth-gap-012 и auth-gap-013.

## Rollback

git revert коммита.
