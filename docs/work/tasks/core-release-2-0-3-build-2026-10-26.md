# Ядро · полная версия 2.0.3 в App Store и Google Play + серверная выкладка шагов 2/2б (слово владельца через координатора)

Governance-ID: TG-2CF708EAD2D3
Governance-ID: TG-F5D4E797CFF8
Governance-ID: TG-B18086E69B30
Governance-ID: TG-3856AFDED735
Governance-ID: TG-6FC0F33B9F2F
Governance-ID: TG-AD211F2BC512
Governance-ID: TG-6371EA87051A
Governance-ID: TG-3C131EAFF5BE
Governance-ID: TG-BE660C1DB0A8
Status: In progress
Owner: 1 · ЯДРО

## Outcome
Серверная выкладка шагов 2 и 2б пакета 26.10 (см. `core-server-deploy-step2-2b-2026-10-26.md`), затем сборка 2.0.3 (145)
для iOS и Android из чистого снимка HEAD после коммита Learning V2 с `learning_chapter_exam_v2_enabled = true`, и отправка
в магазины. OTA-канал `production` для 2.0.3 начинается заново: runtimeVersion 2.0.3, старые сборки 2.0.2 держат свои
заплатки.

## Scope
In scope: проверки перед выкладкой и выкладка по пакету; отдельный коммит номеров (`app.json`: version 2.0.3,
runtimeVersion 2.0.3, versionCode/buildNumber 145); проверка типов приложения на этом хэше; снимок `git archive` +
`EAS_NO_VCS=1 eas build --platform all --profile production --auto-submit`; отчёт координатору (хэш, ссылки, статус).
Out of scope: новые нативные работы, флаги Пульта, Кнопка 2, материалы магазинов (скриншоты, листинг).

## Architecture
Без изменений кода. Сборка — тем же путём, что 142/143/144 (`docs/work/release/RELEASE_25_10_RUNBOOK.md` раздел 4).
Временные скрипты — только в папке черновиков сессии.

## Security and privacy
App Check не трогается. Ключи и токены не читаются и не печатаются. Новых данных сборка не собирает сверх уже
выложенной политики (October 25).

## Technical debt
Android-отправка упирается в права ключа в Play Console (403 у 2.0.2) — это делает только владелец; если не выдано,
Android-сборка остаётся готовой и ждёт.

## Verification
Сервер: тесты строк в выгрузке HEAD зелёные, 10 минут журналов без ERROR. Сборка: проверка типов приложения 0 на
хэше, сторож номеров/precheck зелёный, сборки EAS FINISHED, статусы отправки.

## Итог 26.10 (Ядро)
- Номера — b60fa6ea3. Снимок b60fa6ea3 (LF): проверка типов приложения — 0 ошибок. `release:precheck`: красный только паритет
  макетов (351 нарушение). По слову владельца он обойдён `PARITY_GATE_WAIVER=owner-2026-10-26:собрать 2.0.3 с красным
  паритетом макетов, переснять и чинить после выпуска` — только в локальном прогоне, в окружение EAS не положен. Остальные
  гейты зелёные. Ревизор 🟢: версии, профиль, флаги 51/51, банки 1:1–1:3, бандлы без dev-строк (npm ci).
- Сборки EAS (06:28 → FINISHED):
  - Android 3d0a5f8d-73af-49f0-b34d-1164b2d36a73;
  - iOS 4cd4b013-181b-4c27-a1a1-fb57b415abac.
- iOS отправлен в App Store Connect (submission d41ffcf3-2c54-42fe-ba53-8289d1f07faa). Submit for Review — кнопка
  владельца.
- Android: отправка 9883ed46-95b1-4226-a1ed-a9c096380791 → 403. У ключа `firebase-adminsdk` нет прав в Play Console.
  .aab — артефакт сборки на expo.dev, ждёт ручной загрузки владельцем или выдачи прав ключу.
- Не вошло (нативное): заставка Android цветом темы (UiModeManager) — только план; отзыв Sign in with Apple — JS,
  флаг выключен.

## Rollback
Сервер — раздел «Откат» пакета. Сборка — не выпускать в магазине (Play: не продвигать релиз; App Store: не отправлять
на ревью / отозвать); номера — откат коммита.
