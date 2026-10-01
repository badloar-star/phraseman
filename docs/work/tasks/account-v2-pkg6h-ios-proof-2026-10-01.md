# Task packet: Account V2 — Пакет 6H: доказательство iOS (SQLCipher-область, Keychain) через EAS + iPhone владельца (OD17)

Governance-ID: TG-1EAA17467689
Status: Done (SPEC+SECURITY APPROVE; ждёт сборки и запуска на iPhone владельца)
Owner: Claude session (Account V2, /loop)

## Outcome

Решение владельца OD17: проверку iPhone делать сейчас — облачная сборка EAS + iPhone владельца (кредиты EAS разрешены этим решением; владелец сам устанавливает и запускает).

1. **Анализ:** что уже есть для iOS — патч expo-sqlite 16.0.10 (`patches/expo-sqlite+16.0.10.patch`, есть ли iOS-часть аренды/блокировки), SecureStore на iOS (класс доступа WHEN_UNLOCKED_THIS_DEVICE_ONLY — Keychain, не в iCloud-бэкапе), file protection, исключение из бэкапа (NSURLIsExcludedFromBackupKey для папки accounts-v2). Записать пробелы.
2. **iOS-адаптер области** (`modules/account-session-v2/native/account_native_expo_environment.ts` сейчас отдаёт null на iOS): включить iOS только если все части доказуемы; иначе оставить null и честно описать, чего не хватает.
3. **iOS-проба** по образцу Android-пробы (`runtime-probes/android-account-sqlcipher-recovery/`): сценарий в dev/internal-сборке, который сам прогоняет фазы (prepare, запись, «убийство» процесса заменяется перезапуском приложения владельцем по инструкции), пишет квитанцию в лог/экран, без персональных данных.
4. **EAS-профиль** `ios-account-v2-proof` (internal distribution, отдельный bundle-флаг/ENV, флаги V2 включены только в этой сборке, указывает на прод? НЕТ — на эмулятор нельзя с iPhone; использовать только локальную область без сервера: проба проверяет хранилище, не синхронизацию). Запуск `eas build` — только после ревью конфигурации; команду выполняет сессия (кредиты разрешены OD17), ссылку на сборку и пошаговую инструкцию для владельца — в квитанцию.
5. Квитанция `docs/work/tasks/account-v2-ios-proof-receipt-2026-10-01.md`: что доказано, что нет.

## Scope

modules/account-session-v2/native/*, новая папка runtime-probes/ios-account-sqlcipher/, eas.json (только новый профиль), app.config.js (только если нужно для профиля, через ENV), тесты. Out of scope: прод-сервер, App Store, реальные данные, изменения патча expo-sqlite без отдельного решения.

## Architecture

Проба — изолированная точка входа (как Android EntryProxy-режим не подходит на iPhone — нужна отдельная сборка с env-флагом, которая открывает экран пробы).

## Security and privacy

Синтетические данные; ключ только в Keychain; квитанция без идентификаторов устройства в открытом виде (хэш).

## Technical debt

Accept temporarily: если iOS-части патча нет — iPhone остаётся на старой системе до доработки (честно в отчёте).

## Verification

Тесты адаптера/пробы, ревью конфигурации EAS до запуска, независимое ревью, квитанция с результатом от владельца.

## Rollback

Новый профиль EAS и проба изолированы; iOS-адаптер за проверкой платформы.
