# Task packet: PM-252 п.3 — сообщения приложения без принудительного чтения на каждом возврате

Governance-ID: TG-94EA8E61CB15
Governance-ID: TG-94EA8E61CB15
Status: Done
Owner: Ядро; поручение координатора 04.10 (PM-252 п.3)

## Outcome
`app/_layout.tsx` вызывал `refreshAppMessagesSnapshotOnce({ force: true })` при КАЖДОМ возврате в приложение
(эффект зависит от `appIsActive`): 3 запроса × до 80 документов = до 240 чтений на возврат — крупнейший
источник чтений по ревью PM-252. Теперь принудительное чтение — только при входе (первый раз за запуск
процесса для данного аккаунта), дальше — из кэша, сеть не чаще раза в 6 часов. Лог `[APP-MESSAGES-REFRESH]`
с решением (force/interval) и аккаунтом-поколением.

## Scope
app/_layout.tsx (одна точка вызова), тест-сторож.

## Architecture
Множество в памяти процесса `appMessagesForcedForStableIds`: stableId попал → force уже был. Сам
`refreshAppMessagesSnapshotOnce` не меняется: его кэш и метка последнего обновления на аккаунт уже есть.
Колокольчик (`AppMessagesInbox`, 12 ч) и настройки (30 с при открытии) не трогаем.

## Security and privacy
Данные не меняются. Личные сообщения админа и модалки при возврате берутся из кэша; новые придут при
следующем входе или через ≤ 6 ч (live-подписка есть у открытого центра уведомлений).

## Technical debt
Курсор «только новее lastSeen» (вместо трёх запросов по 80) не сделан — требует правки самого
`refreshAppMessagesSnapshotOnce` и его сторожей; при интервале 6 ч выигрыш уже основной.

## Verification
Тест-сторож: в `_layout.tsx` force только в ветке первого входа, иначе `minIntervalMs` 6 ч; прежние
сторожа `app_messages_background_refresh_contract`, `phone_state_firebase_quiet_contract`; tsc по файлу.

## Rollback
Откат коммита.
