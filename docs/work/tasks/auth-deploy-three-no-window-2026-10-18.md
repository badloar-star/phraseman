# Task packet: authEnsureStableLink без окна вызовов в базе + выкладка трёх функций входа

Governance-ID: TG-47CBD8AF5829
Governance-ID: TG-CB5F4C377C85
Governance-ID: TG-8E60ECD0F066
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: владелец 18.10 «СРАЗУ ВЫКЛАДЫВАЙ» — только authEnsureStableLink, authStampAnonOwnership, authMergeStableAccounts. Координатор: «БЕЗ ОКНА — вход не может падать ни при каком сбое, кроме «нет сети»».

## Outcome

`authEnsureStableLink` больше не делает транзакцию окна вызовов. Вход не падает из-за таймаута или конфликта счётчика и не тратит лишнее обращение к базе. Вместо окна стоит счётчик в памяти экземпляра: без записей, отказ только при явном зацикливании одного uid на одном экземпляре.

Три функции входа выложены из чистого снимка HEAD с этим коммитом:
- в us-central1 — обновлены;
- в europe-west1 — созданы.

## Scope

- `functions/src/caller_rate_window.ts`: `enforceLocalCallerWindow` — только память, без базы.
- `functions/src/auth_identity.ts`: в `authEnsureStableLink` вместо `enforceCallerRateWindow` стоит `enforceLocalCallerWindow`.
- Отказ слияния гостя (`clientMergeContract 2`, auth_merge.ts + cloud_sync.ts) — тем же коммитом НЕ идёт. Он отдельный, после клиентских проверок. На этой выкладке его нет.
- Выкладка: `firebase deploy --only functions:authEnsureStableLink,functions:authStampAnonOwnership,functions:authMergeStableAccounts` из снимка. Ничего другого — ни правил, ни индексов, ни удалений.

## Architecture

Счётчик в памяти: ключ — scope + uid, окно 1 ч, порог 120. Порог превышен → `resource-exhausted ensure_link_rate_limited`. Ни чтений, ни записей. Холодный экземпляр начинает с нуля — это при сомнении пропуск.

## Security and privacy

uid в памяти процесса не покидает экземпляр и не пишется в базу. Защиты от фермы на IP в пути входа больше нет — это решение владельца (вход важнее). Деньги в пути входа не тратятся.

## Technical debt

- Без окна на IP ферма анонимных аккаунтов с одного адреса снова может звать привязку. Цена — только чтения Firestore, без OpenAI.
- Если это начнёт стоить заметно, решение — App-уровневый признак, но не App Check (пломба).
- Владелец Ядро.

## Verification

- Тесты `caller_rate_window`, `auth_identity*`, `auth_ensure_link_trace`, `auth_callable_regions`, `auth_merge`;
- узкий tsc;
- после выкладки — журнал запросов europe-west1 и us-central1: ошибки и время первых вызовов.

## Rollback

- Откат ревизии Cloud Run на прошлую — для us-central1 (`gcloud run services update-traffic … --to-revisions=<прошлая>=100`).
- В Европе — удалить три функции по имени и региону. Клиенты уйдут в США по not-found.
