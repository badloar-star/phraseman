# Task packet: dev-переключатели Plus/плана — только в памяти (без записи в хранилище и облако) + studyfail= / support=fail / cache=failed

Governance-ID: TG-0DC7B3BB3A50
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручению координатора (12.10, после коммита 2cb163b4f)
Related epic/enabler: R1 робот-съёмка; docs/phraseman-2.0/R1_SHOT_LIST.md («Остаётся нет пути»)

## Outcome

Dev-фикстуры `promo=ok|lifetime` (и ранее добавленная `vip=…`) писали настоящий VIP-снимок в хранилище; ключи этого снимка входят в облачную синхронизацию (`cloud_sync.ts`: `vip_*`, `isVipSnapshotStorageKey`), поэтому на вошедшем аккаунте dev-переключатель мог записать настоящий VIP в облако. Результат: VIP-снимок и план подписки (`plan=yearly|monthly|lifetime`) подменяются ТОЛЬКО в памяти процесса: экраны читают подмену, в AsyncStorage и облако ничего не пишется, лог `[DEV-STATE] promo_vip memory_only`. Плюс три недорогих переключателя: `studyfail=on` (сбой смены языка изучения), `support=fail` («Не отправилось»), `cache=failed` («Не удалось» при очистке кеша).

## Scope

In scope: новый модуль `app/dev_vip_override.ts` (в памяти, только dev); чтение подмены в `app/premium_vip_storage.ts` (чтение возвращает подмену, запись при активной подмене — пропуск с логом); `app/promo_code_entry.tsx` (`persistRedeemedPromoAccess`: при фикстуре — только память); `app/dev_state_fixtures.ts` (`vip=` теперь тоже в память; `plan=`, `studyfail=`, `support=`, `cache=`); `app/manage_subscription.tsx` и `app/(tabs)/settings.tsx` (чтение подмены плана); `app/study_languages.ts`, `app/support_report_outbox.ts`, `app/cache_reset.ts` (dev-сбои); тесты; обновление «нет пути».

Out of scope: настоящая покупка/RevenueCat, серверные поля подписки, файлы входа и аккаунта.

## Architecture

No architecture change: подмена — отдельный in-memory слой над существующим чтением снимка; при выключенной подмене (всегда в стор-сборке) поведение модуля прежнее. Запись снимка при активной подмене пропускается, чтобы производные записи (premium_guard, облачное слияние) не «закрепили» подмену в хранилище и не ушли в синхронизацию.

## Security and privacy

Снижает риск: dev-переключатель больше не пишет право на подписку в хранилище и облако. Новых данных, разрешений и сторонних сервисов нет. Тест проверяет, что при подмене в AsyncStorage ничего не пишется, а dev-ключи не входят в набор облачной синхронизации.

## Technical debt

Contain: тесты «память, не хранилище» и «стор-сборка не затронута». Accept temporarily: подмена VIP теряется при перезапуске (ссылку надо применить заново) — осознанная цена безопасности.

## Verification

Тесты: `tests/dev_vip_override.test.ts`, существующие тесты `premium_vip_storage`, промокода, `dev_state_fixtures`; срез типов; прогон Сверки.

## Rollback

Откат коммитов; подмена в памяти, данные пользователя не затрагиваются.
