# Task packet: немые catch в peekLinkedAuthFromCurrentUser / peekAccountCreatedAtMs — лог причины (только лог)

Governance-ID: TG-B38D36A6F459
Status: In progress (координатор 10.10, отметка ревью «Авторизации»: ни одного немого catch)
Owner: сессия 1 · ЯДРО

## Outcome

Два синхронных peek в app/auth_provider.ts глушили исключение без следа. Теперь catch пишет причину через уже
принятый в файле identityTrace ('[AUTH-PEEK]', код ошибки без uid). Возвращаемое значение (null) и поведение
экрана «Аккаунт» не меняются.

## Scope

app/auth_provider.ts — две ветки catch.

## Architecture

Не меняется.

## Security and privacy

В лог идёт только код ошибки (identityErrorCode), без uid и данных провайдера.

## Technical debt

Других немых catch в app/auth_provider.ts этой правкой не ищу — только два, отмеченные ревью «Авторизации»;
полный обход файла — отдельная задача PM-229, если сессия 5 её откроет.

## Verification

Синтаксис; сторожа auth_* и account_authority_legacy_callsite_guard (identityTrace — не вызов из переписи).

## Rollback

git revert коммита.
