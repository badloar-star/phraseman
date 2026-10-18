# Task packet: вход — довести прерванный вход вперёд после перезапуска; признак «вход идёт» по попыткам

Governance-ID: TG-934DA7A41E28
Status: В работе (координатор 18.10: «вход — главная задача», пункты 1 и 3)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

1. Приложение убили посреди входа (Firebase уже вошёл в B, запись передачи осталась) — при следующем запуске человек
   ВОШЁЛ в B, а не откатан к гостю. Если довести нельзя (сеть, сервер, несовпадение) — прежний безопасный откат
   (без сброса согласий, 7a6cf13aa).
2. Признак «вход идёт» (424a4dda7) хранится по попыткам: finally одной попытки не снимает признак другой; срок 10 мин.

## Факты

- resumeInternal (account_switch_quarantine): при Firebase-пользователе-провайдере с совпавшим subject помечает запись
  authenticated и затем всё равно откатывает к гостю (signOut → wipe → новый гость).
- Запись передачи ставится только когда гость доказан ЧИСТЫМ (localClean) — стирать у гостя нечего.
- Вход в окне после Firebase делает: auth_links/{uid} → удалённый stable или текущий → ensureStableAuthLink → смена
  stableId → восстановление из облака (runSignInWithProvider ≈3090–3700).

## Scope

- account_switch_quarantine.ts: попытки входа по ключам (begin/end/ageMs); в ветке передачи — необязательная зависимость
  `completeProviderHandoff(handoff, authUid)`: если провайдер с совпавшим subject — довести вперёд; null/ошибка → откат.
  Журнал [SWITCH-QUARANTINE] handoff_roll_forward start|done|fallback reason=.
- auth_provider.ts: `completeInterruptedProviderHandoff` — auth_links → ensureStableAuthLink (удалённый или текущий
  stable) → под замком перехода: стирание гостя (он доказан чистым) при смене stable, setStableId, поколение, восстановление
  из облака; дать зависимость в обеих сборках. Журнал [AUTH-HANDOFF] roll_forward ….
- Тесты: восстановление (довод вперёд и откат при отказе), подсчёт вызовов.

## Architecture

Довод вперёд — только при доказанном совпадении: Firebase-пользователь не аноним, провайдер привязан, subject ==
targetProviderSubject (или фаза authenticated с тем же uid). Любой сбой — прежний откат. Окно смешения A/B не
открывается: гость доказан чистым до записи передачи.

## Security and privacy

Данные B читаются только после авторитетной связки ensureStableAuthLink для uid B.

## Technical debt

RevenueCat-перепривязка после довода — штатная при следующем входе в фон (как после обычного входа).

## Verification

Адресные тесты через светофор; эмулятор (замок) — сценарии координатора.

## Rollback

`git revert <hash>`.
