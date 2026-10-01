# Task packet: Account V2 — Пакет 6B: клиентская интеграция за выключенным флагом

Governance-ID: TG-A6379E356AFC
Status: Done (SPEC+SECURITY APPROVE; 2×P2 до включения флага)
Owner: Claude session (Account V2, /loop)

## Outcome

Клиентская часть Account V2 подключена в приложение, но выключена, пока сервер не включит `config/accounts_v2.syncEnabled` (и пока не включён клиентский флаг):
1. Реальный транспорт: `createAccountSyncDispatchPort(outbox.wireBatch, send)` → вызов `accountsV2SyncApply` (httpsCallable), разбор ответа/ошибок: `accounts_v2_disabled` = «сервер выключен» → прекратить отправку до следующего запуска, пакет НЕ в карантин; `rate_limited`/`resource-exhausted` → пауза retryAfterMs.
2. Клиентский флаг (по умолчанию OFF): пока выключен — ни outbox-записи, ни сетевых вызовов, ни чтений; включение — только владелец (Пульт/remote config проекта, по образцу существующих флагов; найти существующий механизм и использовать его).
3. Удаление аккаунта: при подтверждении удаления клиент генерирует ключ (base64url, 32 байта, crypto-стойкий), кладёт его в SecureStore и отправляет `accountsV2Deletion {operationId, capability}` в `accountDeleteEnqueue`; `account_deletion_detach` вызывается синхронно ДО сети; защёлка `isDetached` переживает перезапуск (персист до стирания); автоповтор стирания области после `close_failed` при следующем запуске. Без уведомлений об удалении (правило владельца).
4. Жизненный цикл: outbox/runner стартуют после входа (uid известен) и только при включённом флаге; при выходе/смене аккаунта — останавливаются и закрывают область (нет перекрёстного доступа). Без влияния на холодный старт: ленивый импорт, никаких работ на первом кадре (Performance Bible).
5. Логи с единым префиксом `[ACCOUNT-V2]` на ранних выходах и catch.

## Scope

In scope: modules/account-session-v2/* (новые адаптеры), минимальные точки подключения в app/ (провайдер авторизации/корневой layout/экран удаления — найти текущие), тесты tests/account_*_v2*. Out of scope: включение флагов, UI-экраны (кроме невидимой проводки), миграция данных, деплой.

## Architecture

Все новые пути за одним `isAccountsV2ClientEnabled()`; при OFF — модули даже не импортируются в горячем пути (ленивый require). Удаление V2 встраивается в существующий поток удаления, не заменяя его.

## Security and privacy

Ключ удаления только в SecureStore, в логах — только коды. Privacy policy: новых данных не собираем (синхронизация тех же уроков/карточек); проверить owner-rules.

## Technical debt

Accept temporarily: UI конфликтов/карантина — позже; iOS-нативные доказательства — вне.

## Verification

RED→GREEN, `npm run test:one` по одному файлу (включая существующие тесты затронутых app-файлов), tsc точечно, eslint, perf-сторожа (`tests/perf_freeze_contract.test.ts`, `tests/layout_stability_contract.test.ts`), независимое ревью. Эмулятор — через очередь, если нужно.

## Rollback

Копия `.tmp_pkg6b_backup/`; флаг OFF.

## СРОЧНО (сборка Android падает)
- `declare readonly code` в account_sync.ts:160, account_sync_outbox_records.ts:32, native/account_sqlite_lease_binding.ts:9, native/account_sqlite_scope_connection.ts:44 ломает бандлер (Babel без allowDeclareFields). Заменить на обычное поле + присваивание в конструкторе; сторож-тест: в modules/account-session-v2 нет `declare` у полей классов.

## Ревью (SPEC+SECURITY APPROVE). До включения флага закрыть:
- P2 account_v2_client_session.ts:302 / account_detach_latch.ts:267-279: испорченная защёлка навсегда выключает V2 на устройстве (iOS Keychain переживает переустановку) — сбрасывать запись после первого отказа с логом.
- P2 account_v2_client_session.ts:327-330: пока хранилище null, uid копятся (до 16) → при подключении хранилища resumePendingErase стирает несуществующие области — проверить, что это без ошибки.
- P3 _layout.tsx:1095 флаг не в зависимостях эффекта (поздний «Пульт» / живое выключение); client_session :186-190/:378 залипание sending=false при мгновенном расхождении uid; auth_provider.ts:879 повтор после перезапуска не передаёт accountsV2Deletion; быстрая фаза удаления до +1 с при включённом флаге.

## Ремонт №1 — APPROVE (SPEC+SECURITY). Хвосты к шагу «подключение хранилища»:
- P2: перед reset() испорченной защёлки сохранить факт незаконченной дочистки (пройти resumePendingErase по всем найденным областям, сбрасывать только после).
- P3: ключ V2 под постоянным именем, не удаляется и не привязан к замку удаления — привязать к operationId и чистить после завершения; перезапуск остановленной сессии на каждом возврате в приложение.
