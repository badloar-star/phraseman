# Ядро · диалог не засчитывается при 6/6 + правило повышения в Пике (04.11)

Governance-ID: TG-552784B9AD02
Governance-ID: TG-A412EEB20A58
Status: In progress
Owner: 1 · ЯДРО (поручение координатора, ошибки из Telegram)

## Outcome
1) Тестер прошёл диалог до «Мила: отлично! 6/6, +10 монет, Готово»: в «Сегодня» засчитан, в «Все диалоги» счётчик 0.
   Причина по коду: openSummary в app/dialogue_v2_session.tsx засчитывает диалог только при endedBy = bot; при 6/6 собеседник ещё
   не закончил разговор (coaching.ended=false, allObjectivesComplete=true), «Готово» уходит как manual → не засчитан.
   Правка: manual + все цели выполнены = bot (прохождение).
2) Пик: в «зону повышения» попадают только дошедшие до вершины (135 ступеней). Ищем расчёт в functions/src/spire_*.

## Scope
+ Telegram: серверный фильтр алертов — ошибки категории learning_v2 (feature learning_v2 или context learning_v2* / learning-v2*) не попадают в админ-алерты (adminAlertOnCriticalError); работает для уже выпущенных версий приложения. Деплой — отдельно.
Только app/dialogue_v2_session.tsx (условие endedBy) и расчёт повышения в spire_*; недельные циклы не переписываем.

## Architecture
Условие отметки markDialogueV2Done остаётся дословным (его сверяет tests/dialogue_v2_done_status.test.ts); меняется только
вычисление endedBy выше. Повтор диалога: отметка идемпотентна (множество id), счётчик не ломается.

## Security and privacy
Данных пользователей не добавляется.

## Technical debt
Нет проверки повтора диалога на экране каталога — смотрим отдельно, если подтвердится.

## Verification
Охранный тест на условие; tsc/jest точечно через светофор; логи [DIALOG-DONE].

## Rollback
git revert коммита.
