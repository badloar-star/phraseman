# Task packet: ACC-SPEED (а) прогрев функций входа из Настроек, (б) стадии authEnsureStableLink, (в) кто зовёт ensure_link; два красных теста

Governance-ID: TG-449DFD31B3B3
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 14.10 (прогон №3: холодные старты authStampAnonOwnership 8,4 с и authMergeStableAccounts 7,6 с;
authEnsureStableLink 3,3–3,6 с на тёплом и ≈35 вызовов за 5 минут)

## Outcome

(а) При открытии карточки аккаунта и окна входа в Настройках — warmAuthSignInCallables (троттл 10 мин, лог [ACC-SPEED] warm),
только если ПРОД-сервер на warmup-вызов отвечает безвредно (проверено чтением прод-ревизий); иначе — за флагом до 17.10.
(б) [AUTH-ENSURE-LINK] стадии и миллисекунды в обработчике authEnsureStableLink (functions, выкладка 17.10), без uid.
(в) Клиентский лог «кто зовёт / почему мимо кэша / поколение» — существующий [AUTH-LOOP] (EXPO_PUBLIC_AUTH_LOOP_TRACE=1)
дополняется поколением аккаунта; прогон №4 организует координатор.
Красные тесты: home_hints.test «300 идей» (280) — найти, кто убрал 20, и привести тест/каталог к факту с причиной;
legal_document_liquid_glass_source_contract — заголовок локализован (bedaa9d4d), тест под факт.

## Scope

In scope: app/cloud_sync.ts (лог), экран настроек — точка вызова прогрева (согласовать с Авторизацией, чей файл),
functions/src/auth_*ensure* (логи), тесты home_hints и legal. Out of scope: поведение входа, кэш карточки Настроек (Авторизация).

## Architecture

Прогрев — существующая функция с троттлом; новая только точка вызова. Логи — без изменения поведения.

## Security and privacy

Логи без uid/почты (хэш-префиксы и миллисекунды).

## Technical debt

Contain: патч (б′)(в′) — после данных (вероятно после R1).

## Verification

Точечные тесты прогрева/логов; тесты functions; типы; тесты home_hints и legal.

## Rollback

Убрать точку вызова прогрева; логи безвредны.
