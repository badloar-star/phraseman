# PM-236 — Идемпотентность миграции на двух устройствах

Дата evidence: 2026-10-01  
Область: чистое ядро + синтетический in-memory порт; сервер/устройство не запускались.

## Проверенные сценарии

- Два устройства строят одинаковый dry-run: первый apply даёт 3 `applied`, повтор второго устройства — 3 `duplicate`; число сущностей и квитанций остаётся 3.
- Прерывание после первого batch: уже записанный prefix возвращает `duplicate`, оставшийся хвост применяется один раз; итоговый набор сущностей совпадает с непрерванным прогоном.
- Offline/reconnect: batch остаётся тем же, повтор после reconnect даёт только `duplicate`.
- Возврат старой версии: МОДЕЛЬ PM-235 (`compatibility.ts`, к рантайму не подключена) запрещает legacy `write` после `v2_cutover`. **В рантайме старые версии приложения сервер не блокирует** — см. поправку ниже.
- Баланс/права: `stars` остаётся `keep_in_place` и не попадает в V2 operations; community pack переносится в library entity, поэтому баланс не увеличивается, а право на набор не теряется.

## Evidence

- RED: отсутствовал корректный `MIGRATION_EXPORT_FORMAT` в фикстуре (`format_unsupported`), 3/3 сценария падали; исправлено test-only импортом константы.
- GREEN focused: `two_device_idempotency.test.ts` — 1 suite, 3/3 passed.
- Full migration: **8 suites, 190/190 passed**, exit 0.
- ESLint `src/accounts_v2_migration` — PASS.
- Functions TypeScript `npx tsc --noEmit --pretty false --incremental false` — PASS.

## Ограничения

Это не доказательство реального двухустройственного Firestore/device E2E. Не выполнялись production migration, writes, deploy, purge, backup/restore и release acceptance; эти gates остаются открытыми.

## Принято Account V2 (2026-10-01, TG-4D4949E78A5B)

- **Что доказано:** идемпотентность ЧИСТОГО ядра `applyBatch` на синтетическом in-memory порту (два устройства → `duplicate`, прерывание → только хвост, повтор после reconnect → `duplicate`); рунные/звёздные балансы — `keep_in_place`, в операции V2 не попадают.
- **Что НЕ доказано этим тестом:** Firestore-транзакции, реальный `accountsV2MigrateMine`, устройство. Частично это закрыто отдельно: серверный E2E на Firebase Emulator (квитанция `docs/work/tasks/account-v2-e2e-receipt-2026-10-01.md`, раздел 6G 12/12: повторный вход — `already_done`, потерянная отметка → `applied=0 duplicate=7`); E2E на телефоне-эмуляторе — сценарии D/E/F/H/I (в т. ч. откат 7B) **не прогнаны** (блокер эмулятора функций, Пакет 8D).
- **Поправка:** «legacy client cannot write after cutover» в тесте — проверка модели. В рантайме запрет есть только у нового клиента (выключатель 7A); старые версии приложения пишут в старое облако дальше, перенос после `done` их правки не подхватывает (E2E J). Защита — предусловие 7B (force_update + min_app_version).
- Перепрогон: `cd functions && NODE_OPTIONS=--max-old-space-size=8192 npx jest --runInBand --watchman=false src/accounts_v2_migration/two_device_idempotency.test.ts` → Tests: 3 passed, 3 total. В тест добавлен комментарий «in-memory / модель».
