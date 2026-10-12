# Task packet: режим чистых кадров — Fast Refresh выключен

Governance-ID: TG-2E954A607BBC
Status: Done
Owner: сессия «1 · Ядро». Координатор 12.10: «ДА — выключать Fast Refresh в режиме чистых кадров. Только при
EXPO_PUBLIC_SNAPSHOT_CLEAN=1 и только в dev; лог [SNAPSHOT-CLEAN] fast_refresh=off при старте».

## Outcome
Белый экран cards-v2-033 — перезагрузка JS от правок параллельных сессий посреди съёмки. В режиме чистых кадров
`NativeDevSettings.setHotLoadingEnabled(false)`, лог `[SNAPSHOT-CLEAN] fast_refresh=off`. Настройка на Android сохраняется между
запусками, поэтому ставится метка в AsyncStorage; в обычном dev Fast Refresh возвращается (`fast_refresh=on`) только по метке.

## Scope
In: app/dev_snapshot_clean.ts, tests/dev_snapshot_clean_behavior.test.ts. Out: релизная сборка (модуль подключается только под __DEV__).

## Architecture
Нативный модуль DevSettings через require внутри try; AsyncStorage-метка `dev_snapshot_clean_fast_refresh_off_v1`.

## Security and privacy
Только dev-настройка; данных пользователя нет.

## Technical debt
Нет.

## Verification
dev_snapshot_clean_behavior 8/8 (+3: выключение с меткой, возврат только после режима, релиз не трогает), контракт 4/4.

## Rollback
`git revert` коммита.
