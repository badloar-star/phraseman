# Task packet: проход по всем текстам входа, аккаунта, выхода, удаления, согласий и смены аккаунта (координатор, приоритет владельца — авторизация)

Governance-ID: TG-888B15312D9A
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

Во всех 9 языках тексты входа/аккаунта/выхода/удаления/согласий/смены аккаунта:
- без технических слов (провайдер, сервер, credential, токен, код ошибки, привязка/link, switch, синхронизация, локальный, облако, сессия);
- без английского там, где должен быть перевод;
- без пугающих и непонятных формулировок.
Найденное в словарях и моих файлах копий исправлено; чужие незакоммиченные файлы не трогаю — туда текстом владельцу файла.
Отдельно: «This phone is already linked to another account» — живёт в `app/account_switch_copy.ts` (`accountSwitchRequiredCopy`), убирает Авторизация.

## Scope

In scope: строки языковых значений в 210 файлах авторизации/аккаунта (`app/`, `components/`, `modules/`, `hooks/` по маске auth/account/sign-in/logout/registration/onboarding/consent/delete/recovery/switch/privacy_settings).

Out of scope: логика входа, файлы с чужими незакоммиченными правками (`app/auth_provider.ts` и др.), политика (только en).

## Architecture

No architecture change. Поиск — скрипт в scratchpad, производный от `sys_words.mjs`, только по списку файлов.

## Security and privacy

Не применимо: меняются только тексты.

## Technical debt

- Поиск по словам даёт ложные срабатывания (например, «связь» = интернет) — Accept: каждую находку разбираю глазами.

## Verification

- скрипт-сканер; `babel.parseSync` изменённых файлов; тесты, сверяющие изменённые строки; `git diff --numstat`.

## Rollback

`git revert <коммит>`.
