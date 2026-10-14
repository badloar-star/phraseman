# Task packet: прогрев функций входа обычным fetch — мимо однопоточной очереди RNFirebase (ступенька прогона №5)

Governance-ID: TG-5CC18D292886
Governance-ID: TG-14E5A6646700 (продолжение: правка warmAuthSignInCallables и тесты; ключ welcomeBack в очереди окон по просьбе Авторизации, D193)
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: ACC-SPEED, прогон №5 (evidence/acc_speed_r5), решение координатора 14.10 (пункт 1)

## Outcome

Факт (Cloud Run requests 20:12–20:13 UTC): клиент запускает три прогрева одновременно, а сервер получает их по одному —
authEnsureStableLink(warm) ответил за 9 мс, authStampAnonOwnership холодно 8,39 с, authMergeStableAccounts пришёл только после
ответа предыдущего (9,2 с). Причина: firebase.json `android_task_executor_maximum_pool_size: 0` → RNFirebase functions
выполняет все callable на одном потоке через Tasks.await. Прогрев занимал эту очередь, и реальные вызовы входа ждали за пингами
(stamp 9,6 с у клиента против 3,66 с на сервере). Починка: прогрев шлётся обычным fetch на адрес callable с телом
{data:{warmup:true}} — мимо нативной очереди; три прогрева идут параллельно и не держат вход.

## Scope

In scope: новый `app/auth_warm_fetch.ts` (один прогрев: fetch, таймаут 10 с, исход в лог [WARM-FETCH]), `app/cloud_sync.ts`
(warmAuthSignInCallables зовёт его), тесты `tests/auth_warm_fetch.test.ts`, `tests/auth_signin_warmup_contract.test.ts`.
Out of scope: `android_task_executor_maximum_pool_size` НЕ трогаем (инвариант утечки потоков Firestore, AGENTS.md);
вызовы пути входа через fetch — отдельной задачей под флагом.

## Architecture

POST https://us-central1-<projectId>.cloudfunctions.net/<name>, Content-Type application/json, тело {data:{warmup:true}},
без токена (warmup-ветка сервера стоит до auth-чека и до Firestore). Таймаут 10 с через AbortController; любой исход —
одна строка [WARM-FETCH] fn, outcome (warm_ok / warm_ok_rejected 401/403 / http_error / timeout / failed / skip), code, ms.
Никогда не бросает и ничего не ждёт на пути входа (fire-and-forget). Троттл 10 мин прежний.

## Security and privacy

В запросе нет токена и данных человека — только {warmup:true}. Политика не меняется.

## Technical debt

Contain: адрес функций собирается из projectId и региона us-central1 (как getFunctions(getApp(), 'us-central1')).

## Verification

Тесты: три имени уходят параллельно (fetch зовётся 3 раза до любого ответа); 200 → warm_ok; 401/403 → warm_ok_rejected;
500 → http_error; таймаут → timeout; сеть упала → failed; нет projectId → skip; функция не бросает. Сторож контракта
прогрева обновлён. После выкладки — прогон №6 Сверки: прогревы приходят на сервер одновременно.

## Rollback

Вернуть вызов через callable() в warmAuthSignInCallables.
