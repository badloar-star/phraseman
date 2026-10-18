# Task packet: тексты входа из описи Сайта a6d2e2812 — «Google-аккаунт» для всех, «облако», «Something went wrong» (координатор)

Governance-ID: TG-617154E20490
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

1. П. 48 (`app/(tabs)/settings.tsx`, окно после смены аккаунта без сохранения в облако): «войди в нужный Google-аккаунт» видели и люди с Apple → «войди в нужный аккаунт», 9 языков.
2. П. 58 (`app/_layout.tsx`, «Облако сейчас недоступно…») и п. 60 (`components/DeleteAccountConfirmModal.tsx`, EN «Something went wrong») — файлы сейчас у других сессий с незакоммиченными правками: не трогаю, готовые строки — владельцам через координатора.
3. Черновик Дизайна `components/auth/sign_in_progress_copy.ts` (не закоммичен) — вычитка, правки текстом Дизайну.

## Scope

In scope: одна строка в `app/(tabs)/settings.tsx`.

Out of scope: `_layout.tsx`, `DeleteAccountConfirmModal.tsx`, `sign_in_progress_copy.ts` (чужие незакоммиченные), `auth_provider`, `account_switch_*`.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- П. 58 и 60 ждут владельцев файлов — Accept temporarily: строки готовы и переданы.

## Verification

- `babel.parseSync`; поиск тестов со старым текстом; `git diff --numstat`.

## Rollback

`git revert <коммит>`.
