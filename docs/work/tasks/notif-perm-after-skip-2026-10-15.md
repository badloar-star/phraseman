# Task packet: после «Не сейчас» в онбординге на Главной всё равно всплывает системное «Allow notifications?»

Governance-ID: TG-ED161EA33D9A
Status: Шаг 1 — логи [NOTIF-PERM] (координатор 15.10 ~17:30, после R61); фикс — по фактам
Owner: 5 · АВТОРИЗАЦИЯ
Related epic/enabler: находка Сверки, evidence/full_sweep_1015/dobor (a50dbce43)

## Outcome

Человек выбрал «Не сейчас» для уведомлений в онбординге — системный запрос Android не показывается, пока он сам не включит
уведомления в Настройках или в окне-предложении (и не раньше, чем через N дней по мягкой логике). Нарушение выбора — риск
правил сторов о разрешениях.

## Scope

Шаг 1 (только логи, поведение не меняется): `app/notifications.ts` — единая точка системного запроса
`requestNotificationPermissionWithFallback` и внутренняя `canUseNotifications(requestIfNeeded)`: строка
`[NOTIF-PERM]` с вызвавшим (стек, снятый синхронно до первого await), сохранённым выбором онбординга
(`onboarding_trial_reminder_choice_v1`: allow/skip/blocked/null — из AsyncStorage), текущим статусом и canAskAgain.
Факт по коду: 13 функций планирования зовут `canUseNotifications(opts.requestPermission ?? true)` или `(true)` — по умолчанию
просят системное окно; _layout в конце онбординга спрашивает только при choice === null. Шаг 2 (фикс) — по журналу Сверки.
Out of scope: тексты, окно-предложение, сервер.

## Architecture

Без изменения поведения на шаге 1. Кандидат фикса: единая проверка «выбор онбординга skip/blocked → без системного запроса»
в requestNotificationPermissionWithFallback для неявных вызовов (планировщики), с явным разрешением для действий человека
(Настройки, окно-предложение).

## Security and privacy

В лог — только статус разрешения, выбор онбординга и имена функций стека. Новых данных не собирается (политику не трогает).

## Technical debt

Умолчание `requestPermission ?? true` у планировщиков — Pay at step 2 (по фактам).

## Verification

Сверка: онбординг «Не сейчас» → Главная → журнал `[NOTIF-PERM] system_prompt` покажет вызвавшего; тест «онбординг "Не сейчас"
→ Главная → системного окна нет» — на шаге 2.

## Rollback

Обратный собственный патч.

## R37-лог (Ревизор 959d29934, координатор ~19:40)

Governance-ID: TG-FF47A65A49AB
scheduleStreakWarningIfNeeded (be94ec7a8): cancelled_after_race писался и при неудачной отмене (catch глушил), skip без значения-причины, ранние выходы немые, catch только в dev. Правка: [STREAK-WARN] на каждом return с причиной и значениями; isDayAlreadyCounted отдаёт причину (lesson_done / already_scheduled / day_changed); cancelled_after_race — только после успешной отмены, иначе race_cancel_failed; итог scheduled; catch пишет причину всегда. Поведение не меняется.
R15d-префикс: правка не нужна — классификатор `story_events_v1:`, стирание сравнивает `key === prefix || key.startsWith(prefix + ":")`.
