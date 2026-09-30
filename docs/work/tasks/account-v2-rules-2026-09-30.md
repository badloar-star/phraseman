# Task packet: Account V2 — правила Firestore для accounts_v2/**

Governance-ID: TG-831C22D22486
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

Коллекция `accounts_v2/**` полностью закрыта для клиентов И для браузерной админки: пишет и читает только сервер через Admin SDK (callable из 3A-srv). Админский catch-all `match /{collection}/{document=**}` не должен открывать её (исключение в списке + явный deny). Сторож-тест по тексту правил ловит регресс.

## Scope

In scope: firestore.rules — одна строка в списке исключений админского catch-all и один блок `match /accounts_v2/{document=**}` с `if false`; новый тест-сторож functions/src/accounts_v2_adapter/rules_guard.test.ts. Out of scope: деплой правил, эмулятор, прочие правила (файл правят другие сессии — трогаю только эти две точки).

## Architecture

Клиент получает свои данные только через callable (будущий read-endpoint), прямого чтения нет — это совпадает с моделью, где состояние лежит JSON-строками и сверяется сервером.

## Security and privacy

Закрывает прямую запись/чтение чужих и своих данных accounts_v2, в т.ч. браузерной админкой (она могла бы сломать инварианты отпечатков).

## Technical debt

Accept temporarily: эмулятор-тест правил (functions/src/*_rules.emulator.test.ts) — отдельно, требует запуска эмулятора.

## Verification

Сторож-тест по тексту firestore.rules; jest src/accounts_v2_; ревью.

## Rollback

Удалить добавленный блок и строку исключения.
