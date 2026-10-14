# Task packet: authRecoveryHint — снять мёртвую проверку App Check, заменить лимитом и ответом без почты (выкладка 17.10 словом владельца)

Governance-ID: TG-81673D4C6FBB
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 14.10; пломба App Check 2026-08-17; подсказка восстановления (инцидент 2026-07-21)

## Outcome

Подсказка «каким аккаунтом входить» снова работает: `request.app` (App Check, клиент удалён — всегда пусто) больше не требуется.
Защита от перебора: обязательный вход (как было) + лимит 5 в час на uid и на IP (фиксированное окно, документы по хэшу) +
ответ только с типом входа (Google/Apple), без почты и идентификаторов. Связка «вызывающий ↔ stableId» проверяется до чтения
профиля, как раньше. Лог [AUTH-RECOVERY-HINT] на каждом выходе. Плюс: подсказки Главной «arena» и «Английский не кусается»
— задача после R1 в registries/tasks.json (до людей не доходят: published-документа в проде нет, клиент их не читает).

## Scope

In scope: functions/src/auth_identity.ts (authRecoveryHint + помощники), functions/src/auth_identity_recovery_hint.test.ts,
firestore.rules (закрыть auth_recovery_hint_rate_limits), docs/phraseman-2.0/registries/tasks.json.
Out of scope: клиент (уже показывает «привязан к аккаунту Google — выбери его при входе», если почты нет); выкладка.

## Architecture

Счётчики в окне — как auth_recovery.ts (транзакция, merge). Ответ — publicRecoveryHint(buildRecoveryHintFromUserData(...)).

## Security and privacy

Почта (даже маскированная) больше не покидает сервер в этой функции; uid/IP в документах лимита только хэшем. Политику не меняет
(меньше данных наружу).

## Technical debt

Contain: выкладка — только словом владельца 17.10 (вопрос в утреннем отчёте координатора).

## Verification

Тесты: без входа — отказ без чтений; лимит uid и IP — отказ; ответ без почты; связка mismatch/missing — нейтрально без чтения
профиля; логи на выходах. Типы functions.

## Rollback

Вернуть прежний обработчик (одна правка) — подсказка снова будет всегда отказывать.
