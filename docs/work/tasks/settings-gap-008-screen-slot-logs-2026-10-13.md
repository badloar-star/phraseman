# Task packet: settings-gap-008, шаг 1б — логи экрана «Настройки»: откуда пришёл слот опроса (координатор 13.10: «не читает ли строка кэш 6 ч до инвалидации»)

Governance-ID: TG-E87E35BC6803
Governance-ID: TG-25773672877E
Governance-ID: TG-0CB4EA16EC74
Status: In progress — только логи, поведение не меняется

> Поправка (TG-25773672877E): сторож `app_messages_login_only_force_contract` держит вызов `refreshAppMessagesSnapshotOnce({ minIntervalMs: APP_MESSAGES_SCREEN_MIN_INTERVAL_MS })` дословно. Поэтому `onOutcome` не добавляем. Источник (кэш 6 ч или сеть) уже пишет сама функция строкой `[STARTUP-READS] app_messages: …`.
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Дополнение к a5314ed21 (логи сида и гидрации карточки). В `app/(tabs)/settings.tsx` экран:
- выбирает слоты из `peekAppMessagesSnapshot()` при монтировании;
- затем вызывает `refreshAppMessagesSnapshotOnce` с интервалом 6 ч;
- оставляет прежний объект выбора, если id кампаний не изменились;
- событие `app_messages_local_changed`, которое шлёт сид dev-ссылки, экран не слушает.

Если вкладка смонтирована раньше сида (premount), карточка читает голос до записи. Потом id кампании `dev-state-poll` не меняется, и голос больше не перечитывается. Логи `[SETTINGS-POLL]` покажут:
- выбор при монтировании (id верх/низ, владелец — хвост);
- итог обновления: источник `onOutcome` (`cache_interval` или сеть), возраст кэша, id выбранных кампаний, оставлен прежний выбор или заменён;
- ранний выход — отменено, нет stableId или сменилось поколение аккаунта. Раньше он был немым.

## Scope

In scope: только `app/(tabs)/settings.tsx`, блок выбора слотов сообщений (`useState` и `useEffect` ниже него).
Out of scope: починка (подписка на событие или перечитывание голоса) — только после журнала.

## Architecture

Логи `if (__DEV__) console.log` и `onOutcome` в уже существующем вызове `refreshAppMessagesSnapshotOnce` — только чтение исхода. Логика выбора и сеть не меняются. Ранний выход пишет причину всегда: правило «немой return/catch запрещён», лог дешёвый и одноразовый на заход.

## Security and privacy

Владелец в журнале — только хвост (`ownerTail`: 4 знака и длина). Новых данных нет, в сеть ничего не уходит.

## Technical debt

- Логи выбора — временная трассировка, убрать после починки. Лог раннего выхода остаётся.

## Verification

- syncheck файла; сторож `tests/settings_*` с хэшами — если затронут хэшируемый участок, перепин по diff.
- Сверка на кадре settings-gap-008 присылает строки `[SETTINGS-POLL]`.

## Rollback

`git revert` коммита.
