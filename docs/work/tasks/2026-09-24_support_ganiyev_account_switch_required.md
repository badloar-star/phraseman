# Task packet: помочь пользователю с «Нужно подтвердить смену аккаунта» без обновления

Governance-ID: TG-62AB48B12221
Governance-ID: TG-069818A1C7E3
Governance-ID: TG-0C48CA4BC44C
Governance-ID: TG-DB5237663D16
Status: Done (ждём, что телефон подхватит связку)
Owner: Claude session 2026-09-24 (поддержка)
Related epic/enabler: none

## Outcome

Пользователь (Abdusalom Ganiyev, почта Google ganiyevabdusalom91@gmail.com) не может
привязать Google в приложении: окно «Нужно подтвердить смену аккаунта»
(`account_switch_required` из `app/auth_provider.ts`). Хочет начать с нуля и спрашивает про
подписку. Успех = владелец получает диагноз по серверным данным и готовый ответ/план
действий, выполнимый без выпуска новой версии.

## Scope

In scope: разовый скрипт ТОЛЬКО НА ЧТЕНИЕ в scratchpad (Firebase Auth + users/*),
диагноз, текст ответа пользователю, план серверного вмешательства.

Out of scope: правки кода приложения, любые записи/удаления в прод-базе без явного «да»
владельца.

## Architecture

No architecture change: только чтение прод-данных админ-SDK.

## Security and privacy

Читаются персональные данные одного пользователя по его же обращению. Ничего не
пишется, наружу не уходит, скрипт вне репозитория. service-account.json не копируется.

## Technical debt

Accept temporarily: тупик `account_switch_required` при конфликте анонимной ссылки
(owner: владелец, review 2026-10-01) — в UI нет понятного выхода для незарегистрированного
пользователя; решение продуктовое, отдельной задачей.

## Verification

Вывод скрипта сверяется со скриншотами пользователя (имя «Apole», 1 день прогресса).

## Rollback

Нечего откатывать — записей нет.

## Обновление 2026-09-28

Пользователь согласился на удаление старого аккаунта (оплат не было — владелец).
Найдено: Google-auth `Pmm11…` (создан 19.09) → профиль `4f4ecb4b…`; прежний профиль
`8fa2507d…` («Абдусалом 1», старый auth `M0D7…`); анонимный профиль «Apole» `cc8c0429…`.
Штатное админ-удаление НЕ подходит: выключает auth-запись и ставит 14 дней grace —
вход Google будет упираться в отказ. Перед любой записью — чтение следов удаления и
auth_links, затем точечный план и явное «да» владельца на конкретные операции.

## Выполнено 2026-09-28 (владелец разрешил удаление явно)

Удалены: auth `Pmm11…`, users/`4f4ecb4b…` с 7 подколлекциями (18 док.), auth_links/`Pmm11…`.
Проверка: getUserByEmail → auth/user-not-found, почта свободна. Копия: scratchpad
`backup_ganiyev_4f4ecb4b.json`. Профили `8fa2507d…` (grace до 03.10) и `cc8c0429…` не тронуты.

## 2026-09-30: вход прошёл наполовину — чиним сервером (владелец явно разрешил)

Телефон вошёл Google-входом `EpQiv…` (28.09), но шлёт на связку локальный stable
`f00e4339…`, удалённый 17.09 (tombstone + permanent denial). `ensureStableLinkForAuth`
первым делом зовёт `assertStableDeletionNotPending(f00e)` → identity_retired; связка
падает по кругу, Plus-листенер без связки не стартует.

План: снять tombstone + denial `f00e`; users/f00e.firebaseAuthUid=EpQiv + linkedAuth;
auth_links/EpQiv → f00e; затем год Plus тем же патчем, что adminGrantAccess
(vip_* + access_projection + admin_log). Копия трогаемых документов — scratchpad.
Откат: восстановить из копии.

## Выполнено 2026-09-30 13:05 UTC (скрипты запустил владелец)

relink: отменена очередная задача удаления `adel_f09f…` (срок был 01.10 09:56), сняты
tombstone и denial `f00e…`, запись в account_deletion_restores; users/f00e →
firebaseAuthUid=EpQiv + linkedAuth google; auth_links/EpQiv → f00e.
Plus: vip до 2027-09-30, access_projection vipActive=true, запись в admin_log.
Проверка чтением: всё на месте, запретов нет. Копия: scratchpad backup_ganiyev_relink.json.
Не проверено: связка с телефона — на момент проверки он ещё не заходил.
