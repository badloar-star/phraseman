# Task packet: замер clean_proof — откуда 0,9–1,6 с при входе (координатор 14.10, разбор входа №6 Ядром)

Governance-ID: TG-27A94B0AE53D
Status: In progress — замер в окно 22:30; оптимизация по фактам
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Ядро, вход №6: clean_proof 0,9–1,6 с (dirty count=23).

Предположение «читает ключи по одному» не подтвердилось. `isLocalAnonymousIdentityProvenCleanForCredentialHandoff` (`app/local_account_data.ts`) уже делает один `getAllKeys` + один `multiGet` по `accountOwnedStorageKeysFrom(keys)`. Список большой (все языки обучения × десятки видов ключей, кэши карточек, Learning V2, кастомизация), часть значений крупная.

Шаг 1 — логи. Строка `[AUTH-LINK-GOOGLE] clean_proof timing`:
- getAllKeys: мс и число ключей;
- выбрано ключей и мс фильтра;
- multiGet: мс;
- прочитано байт;
- топ-5 самых больших значений: имя через redactStorageKey + размер;
- итог в мс.

Шаг 2 — по фактам один из кандидатов:
- (а) не читать NON_AUTHORITATIVE_BOOT_KEYS;
- (б) порции и ранний выход в проде;
- (в) не читать заведомо крупные кэши, не влияющие на решение.
Сторож — «тот же результат proof на тех же данных».

## Scope

In scope: замер в `app/local_account_data.ts` (одна функция).
Out of scope: логика решения (шаг 2 — после фактов).

## Architecture

`Date.now()` вокруг шагов, размеры — длина строк значений. Без новых чтений.

## Security and privacy

Только имена ключей (через redactStorageKey) и размеры, без значений.

## Technical debt

- Строка замера — временная, снять после шага 2.

## Verification

Сверка: гость → вход №2 → строка timing.

## Rollback

`git revert`.
