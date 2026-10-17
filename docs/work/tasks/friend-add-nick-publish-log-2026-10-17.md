# Task packet: момент публикации ника в поисковый индекс (версия Ревизора про nickname_guard)

Governance-ID: TG-C22A2C0C47F3
Status: Разбор + один лог (координатор 17.10 ~20:10, пересылка от Ревизора)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Проверить версию «ник попадает в name_index не при создании/смене, а позже, при повторном проходе клиента».

## Разбор по коду

Клиентских писателей name_index три, все синхронные с действием человека:
1. Генерация ника (nameGenerateAndReserve) — сервер пишет name_index в той же транзакции; повтор после 5e910033a берёт
   запомненный резерв без сервера.
2. Смена ника (components/account/NicknameEditModal.tsx → reserveNameDetailed → nameReserve) — сервер пишет name_index в
   транзакции; ответ не ok → откат имени на экране и плашка, поэтому «показанное, но не опубликованное» имя невозможно.
3. reconcileNameIndex внутри ensureLocalNickname (app/nickname_guard.ts) — тот самый «повторный проход», но вызовов
   ensureLocalNickname в приложении нет (только тесты): отложенной публикации не бывает.

Вывод: задержка «через полчаса» — не в публикации ника. Главный кандидат прежний (fee6b1116, a0d7bbdf4): заявки и список
друзей читаются один раз при входе на вкладку «Друзья», без слушателей.

## Scope

Один release-лог [FRIEND-ADD] nick_publish в NicknameEditModal (статус брони, мс) — dev-трассировка [NICK] в сторе молчит.

## Architecture

Одна строка лога через общий помощник app/friend_add_trace.ts после ответа брони; логика сохранения ника не меняется.

## Security and privacy

Без имени: только статус брони и мс.

## Technical debt

Нет новых.

## Verification

Прогон Сверки: смена ника → [FRIEND-ADD] nick_publish status=ok → поиск у второго аккаунта ([FRIEND-ADD] lookup_nick found).

## Rollback

Обратный собственный патч.
