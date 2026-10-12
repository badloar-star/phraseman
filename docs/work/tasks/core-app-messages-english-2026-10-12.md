# Task packet: сообщения «Важное от Phraseman» на английском интерфейсе — поля titleEn/messageEn/questionEn/textEn

Governance-ID: TG-DACA19815EFA
Status: In progress
Owner: сессия «1 · Ядро». Просьба «5 · Авторизация» по приказу координатора (EN-проход Сверки settings-gap-002): на английском
интерфейсе карточка «Важное от Phraseman» показывает русский текст — у сообщений app_messages нет английских полей, клиент
намеренно подставляет RU (pickAppMessageText / pickAppMessagePollQuestion / pickAppMessagePollOptionText).

## Outcome
- Клиент (`app/app_messages.ts`): поля titleEn/messageEn, poll.questionEn, option.textEn; для en берётся en, без молчаливого
  русского; пустой en → сообщение не показывается на английском интерфейсе (плашка настроек и список входящих).
- Сервер (`functions/src/admin_app_messages.ts`): язык En в записи кампаний и опросов; пустой En НЕ заполняется русским.
  Для активной плашки настроек En не обязателен (порядок выкладки: сервер может уехать раньше админки).
- Переводчик (`functions/src/admin_translate.ts`): цель En (English); пустой ответ для En не подменяется русским.
- Админка (`admin/v2/legacy.html`): язык EN в форме переводов; автоперевод берёт языки из того же списка; для EN нет
  подстановки RU; опрос Plus получает английский текст по умолчанию.
- Старые кампании без en остаются скрытыми для английского интерфейса (переоткрыть в админке и перевести — по желанию).

## Scope
In: app/app_messages.ts, app/settings_message_slots.ts, app/(tabs)/settings.tsx (передача языка), components/AppMessagesInbox.tsx
(фильтр списка), functions/src/admin_app_messages.ts (+тест), functions/src/admin_translate.ts, admin/v2/legacy.html, tests.
Out: глобальные объявления (broadcast — строгая схема полей, отдельная задача), деплой (координатор/владелец).

## Architecture
Поле En — ещё один суффикс языка, как PtBr, но без RU-подстановки ни на сервере, ни в админке, ни в клиенте. Видимость по
языку — чистая функция `hasAppMessageCopyForLang`, применяется при выборе плашки и в списке входящих.

## Security and privacy
Новых персональных данных нет: учебные/служебные тексты кампаний. Политику не затрагивает. Правила Firestore не меняются
(полей сообщений не перечисляют). Джарвис эти поля не читает (проверено grep по functions/src/jarvis).

## Technical debt
Входящие: счётчик непрочитанных считается без учёта языка — скрытое для en сообщение может держать бейдж; отмечено в отчёте.

## Verification
Тесты: functions admin_app_messages, tests/app_messages*, settings_message_slots; babel_check по изменённым файлам.

## Rollback
`git revert` коммита; поля En в документах безвредны для старых клиентов.
