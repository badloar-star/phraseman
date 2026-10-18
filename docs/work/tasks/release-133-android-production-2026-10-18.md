# Task packet: номер сборки 133 и Android в рабочий выпуск

Governance-ID: TG-A01E795B24F3
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: релиз 2.0.0, заморозка 10:00. Слово владельца кнопками 08:30, передал координатор в 08:31: «132 загружал — поднять до 133»; Android — «в рабочий выпуск».

## Outcome

Сборки 2.0.0 идут с номером 133 на обеих платформах (132 уже загружен в стор, повтор отклонят). Отправка Android идёт в production-трек Google Play, а не в internal.

## Scope

В работе:
- app.json — `expo.android.versionCode` и `expo.ios.buildNumber`: 132 → 133;
- eas.json — `submit.production.android.track`: internal → production.

Вне работы:
- версия 2.0.0;
- runtimeVersion;
- профили сборки;
- android/ — не в git, генерируется при сборке.

## Architecture

Архитектура не меняется. Номера пишутся одним числом на две платформы, как требует scripts/release_keys_gate.mjs (versionCode == buildNumber). tests/release_notes_v2_gate.test.ts требует minBuildId ≤ номера, при 133 это выполняется.

## Security and privacy

Не затрагивает. Ключ сервисного аккаунта не читается и не меняется.

## Technical debt

Нет.

## Verification

- `node scripts/release_keys_gate.mjs` в части номеров: versionCode = buildNumber = 133.
- Сухой просмотр eas.json.
- Ворота EAS — в R150 на хеше фиксации.

## Rollback

Ревертнуть коммит. Если сборка 133 уже загружена в стор, номер назад не возвращается — только вперёд.
