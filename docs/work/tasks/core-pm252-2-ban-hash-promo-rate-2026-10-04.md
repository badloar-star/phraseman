# Task packet: PM-252 — проверка хеша бана при входе + лимит попыток promoCodeRedeem

Governance-ID: TG-CD5DDF2E3ED5
Governance-ID: TG-A7BA9CA259CA
Status: In progress
Owner: Ядро; решение координатора 04.10 (ответ на 3a3486319, п.2) и PM-252 п.2

## Outcome
1. Бан переживает удаление аккаунта и повторную регистрацию: при удалении забаненного аккаунта в
   `banned_identity_hashes` пишется хеш uid И хеш каждого email аккаунта (uid после пересоздания новый —
   хеш одного uid повторную регистрацию не ловил бы). При входе через Google/Apple (`authEnsureStableLink`)
   сервер читает ОДИН документ по id (хеш email из токена); при совпадении — тот же бан на новый аккаунт
   (`banned_users/{stableUid}` + `users.banned`), лог `[BAN-HASH]`.
2. `promoCodeRedeem`: не больше 5 попыток за 10 минут на uid и отдельно на IP, дальше пауза до конца окна,
   ответ `resource-exhausted promo_rate_limited`, лог `[PROMO-RATE]`.

## Scope
functions/src/banned_identity_hash.ts (новый), functions/src/account_delete.ts (replaceBanWithHash), app/promo_code_client.ts + app/promo_code_entry.tsx (статус rate_limited, лог [PROMO-REDEEM] вместо немого catch), firestore.indexes.json (TTL),
functions/src/auth_identity.ts (вызов после привязки), functions/src/promo_codes.ts, тесты к ним.

## Architecture
Проверка бана — после успешной привязки, чтение одного документа по id, без запросов по коллекции; сбой
проверки не ломает вход (логируется). Лимит промокодов — документ-счётчик с окном в `promo_redeem_rate_limits`
в транзакции, id = хеш (`uid:`/`ip:`), поле `expireAt` для TTL.

## Security and privacy
Email и IP хранятся только как sha256-хеш. Строка политики про хеш бана уже у координатора; для лимита
промокодов хранится только хеш IP/uid максимум сутки — укладывается в раздел про защиту от злоупотреблений.

## Technical debt
sha256 без секретной соли: email известного человека можно сверить перебором. Соль-секрет требует нового
секрета в окружении функций — отмечено координатору, не делаем без решения.

## Verification
Юнит-тесты: хеш email пишется при удалении, совпадение при входе ставит бан, несовпадение — 1 чтение и
ничего; лимит: 5 попыток проходят, 6-я — отказ, новое окно — снова можно; IP-лимит отдельно. tsc functions.

## Rollback
Откат коммита. Документы хешей и счётчиков безвредны, счётчики уходят по TTL.
