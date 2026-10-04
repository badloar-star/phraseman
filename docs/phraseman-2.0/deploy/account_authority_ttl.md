# Account Authority 2.0 — TTL-политики Firestore (документ развёртывания)

Статус: **НЕ включено.** Включение — только по команде координатора, вместе с
rollout AA (этап S3 раунд 2, H-S3-1).

## Почему не в firestore.indexes.json
`npm run firestore:rules` деплоит и правила, и индексы. Запись TTL в
`firestore.indexes.json` включила бы удаление записей AA при первом же чужом
деплое правил — без решения координатора. Сторож
`functions/src/account_authority/s3_delete_rules_ttl.test.ts` проверяет, что
TTL на коллекциях AA в `firestore.indexes.json` нет.

## Что включать
Поле `expireAt` (Timestamp; 90 дней от последнего использования, D-AA4).
`expireAt: null` (аренда удаляемого/удалённого аккаунта) TTL не трогает.

| Группа коллекций | Поле |
|---|---|
| `account_authority_accounts_v1` | `expireAt` |
| `account_authority_retired_sessions_v1` (подколлекция аренды) | `expireAt` |
| `account_authority_installation_bindings_v1` | `expireAt` |
| `account_authority_installation_binding_tokens_v1` | `expireAt` |
| `account_authority_installation_binding_quota_v1` | `expireAt` |

**Без TTL (намеренно):** `account_authority_principals_v1` (якорь личности,
§AA-9 (2), удаляется вместе с аккаунтом) и `account_authority_delete_jobs_v1`
(квитанция удаления живёт по контракту, истечение — плановый sweep).

Список в коде: `AA_TTL_COLLECTION_GROUPS` в
`functions/src/account_authority/account_authority_collections.ts`.

## Команды (выполняет координатор при rollout)
```bash
gcloud firestore fields ttls update expireAt --collection-group=account_authority_accounts_v1 --enable-ttl --project=phraseman-ea0b3
gcloud firestore fields ttls update expireAt --collection-group=account_authority_retired_sessions_v1 --enable-ttl --project=phraseman-ea0b3
gcloud firestore fields ttls update expireAt --collection-group=account_authority_installation_bindings_v1 --enable-ttl --project=phraseman-ea0b3
gcloud firestore fields ttls update expireAt --collection-group=account_authority_installation_binding_tokens_v1 --enable-ttl --project=phraseman-ea0b3
gcloud firestore fields ttls update expireAt --collection-group=account_authority_installation_binding_quota_v1 --enable-ttl --project=phraseman-ea0b3
```
Проверка: `gcloud firestore fields ttls list --project=phraseman-ea0b3`.

## Когда
Вместе с включением `rolloutEnabled` callable AA (S8 и далее), после
security-ревью. Откат: те же команды с `--disable-ttl`.

## Осиротевший `acct-…` после перепривязки (S3 раунд 3, L-2)
Сценарий: uid вошёл без якоря → получил новый аккаунт `acct-X`
(`accountSource: new_account`); позже у uid появился якорь `auth_links` →
принципал перепривязан на stableId S (`accountSource: rebound`), аренда на
`acct-X` освобождена в той же транзакции. После этого на `acct-X` ведёт
ничто: принципал смотрит на S, а в документе аренды `acct-X` субъект (хеш uid)
лежит только в журнале квитанций (массив карт) — `activeLease` уже `null`.

Старое удаление аккаунта S такой `acct-X` **не находит** и не стирает.
Почему не ищем запросом: Firestore не умеет `where` по полю внутри массива
карт (`receiptLedger.entries[].firebaseAuthUid`), а отдельного индексируемого
поля с субъектом в освобождённой аренде нет. Добавить обратную ссылку
(«был acct-X») в принципал — это смена схемы принципала S2a и всех путей его
перезаписи (создание, anchor_confirmed, rebound) ради записи, в которой нет
ни данных ученика, ни сырого uid. Риск для работающего входа выше пользы.
Более дешёвый путь на будущее (если понадобится чистить без ожидания TTL):
писать в документ аренды индексируемое поле верхнего уровня с хешем субъекта
— это смена схемы аренды, но пути входа и принципал она не трогает.

Что с ним происходит: освобождение аренды при перепривязке переписывает
документ `acct-X` с `expireAt` = +90 дней (lifecycle `active`), отметка сессии
тоже несёт `expireAt`. Поэтому **после включения TTL** `acct-X` и его отметки
удаляются автоматически через ≤ 90 дней (+ до суток задержки TTL). До
включения TTL такой документ лежит бессрочно — включать TTL вместе с rollout
обязательно. Содержимое: accountId `acct-…`, хеши uid/провайдера в квитанциях
(живут ≤ 60 минут по смыслу, но физически остаются в документе), id устройства
привязки, ревизии и время.

## Политика конфиденциальности (S10)
Дополнительно к тексту ниже: служебные записи входа, которые после смены
способа входа больше ни к чему не привязаны, удаляются автоматически не
позднее чем через 90 дней после последнего использования.

Записи AA хранятся до 90 дней после последнего использования; удаляются
вместе с аккаунтом; сырой uid временно лежит в задаче удаления
(`account_authority_delete_jobs_v1.pendingAuthUid`) до освобождения учётной
записи входа и сразу стирается.
