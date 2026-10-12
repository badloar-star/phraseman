# Task packet: проверка метки очистки кэша Firestore — без отдельного нативного вызова на старте

Governance-ID: TG-87EDFFF70E90
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10: замер эмулятора «check ms=19/22/24 marker=0» — у каждого ~20 мс; цель ≤2 мс,
ноль отдельных нативных вызовов у тех, кто не удалял аккаунт)

## Outcome

- Метка переезжает из SecureStore (синхронное чтение ~20 мс на каждом старте) в AsyncStorage и читается В СОСТАВЕ уже существующего
  стартового multiGet `startupIdentityKeys` в app/_layout.tsx — ни одного дополнительного вызова.
- Метка пишется ПОСЛЕ проверенного стирания (verifyPostDeleteLocalWipe — граница приватности: после clear остаётся только зеркало
  замка удаления) и в конце пути возобновления удаления при старте (completePreparedAccountDeleteLocalExit, где clear делается сам).
- Обработчик метки вешается на стартовое чтение РАНЬШЕ, чем восстановление из облака (то же чтение) — clearPersistence уходит раньше
  обращений бутстрапа к Firestore. failed-precondition — метка остаётся, повтор на следующем старте; лог [ACC-MUT] firestore_cache_clear.
- app/firestore_cache_clear_boot.ts и импорт из index.js удаляются; SecureStore больше не используется.

## Scope

In scope: app/firestore_cache_clear.ts, app/auth_provider.ts (места записи метки), app/_layout.tsx (ключ в multiGet + обработчик),
index.js (снять импорт), app/firestore_cache_clear_boot.ts (удалить), tests/aa_guest_delete_deadline_and_cache.test.ts.

## Architecture

Пиггибэк на существующее чтение: стоимость проверки = 0 нативных вызовов; на JS — одна проверка Map.

## Security and privacy

Граница приватности сохранена: метка появляется только после проверки стирания. Метка не содержит данных (время + причина).

## Technical debt

- Contain: если что-то тронет Firestore раньше стартового чтения — failed-precondition, повтор на следующем старте (лог).

## Verification

Тесты: нет SecureStore-вызова и нет загрузки Firestore без метки; метка пишется после verifyPostDeleteLocalWipe и в конце пути
возобновления; ключ в startupIdentityKeys; обработчик раньше cloudHydratePromise; очистка/повтор как прежде. Сторожа удаления.

## Rollback

Откат коммита (вернётся SecureStore-вариант).
