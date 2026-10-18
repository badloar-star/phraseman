# Патчи для Авторизации: «ни один вход без ошибки» (готовые, не закоммичены в код)

Governance-ID: TG-1DB4D7B517E1
Governance-ID: TG-3F86054CB98D
Governance-ID: TG-E6D1DAA0A4BE
Governance-ID: TG-11F5B76C2FB6
Governance-ID: TG-FAD218EB5C1B
Governance-ID: TG-48338643F197
Status: In progress
Owner: Ядро (сессия 1) готовит; применяет «5 · АВТОРИЗАЦИЯ»
Related epic/enabler: правило владельца «ни один вход/выход без ошибки, кроме «нет сети»». Координатор 18.10. Разбор Дизайна — docs/work/tasks/sign-in-refusals-audit-2026-10-18.md.

## Outcome

Готовые патчи (`git apply`) с проверками. Каждый убирает одну причину видимой ошибки входа.

## Scope

| № | Причина | Патч | Файлы |
|---|---|---|---|
| 5 | `restore_failed` — «Аккаунт не восстановлен» | `05_restore_retry.patch` | `app/account_delete_restore_prompt.ts` (+ тест) |
| 6 | `account_delete_pending`, `not_restorable` — общая карточка | `06_delete_pending_outcomes.patch` | `app/account_delete_restore_prompt.ts` — новые исходы `lock_released` / `status_unavailable`; `components/RegistrationPromptModal.tsx` — описание правки (файл сейчас правит Авторизация) |
| 4 | `local_progress_not_uploaded` | `04_presync_retry.md` | `app/auth_provider.ts` — описание и код вставки (файл у Авторизации, M в дереве) |
| 3 | `local_progress_backup_blocked` | `03_backup_blocked.md` | разбор причин и что автоматизировать при старте |

## Architecture

- Повторы только тихие, только на сетевые причины, с паузами 0,7 с и 1,8 с. Ошибки сервера по существу (`not_restorable`, `missing`) не повторяются.
- Каждый шаг и исход пишется в журнал `[ACCOUNT-RESTORE]`.

## Security and privacy

Новых данных нет. Восстановление идемпотентно: заявка на удаление не теряется при повторе.

## Technical debt

Пункты 4 и 3 — описания с кодом вставки, а не `git apply`: `auth_provider.ts` сейчас изменён в дереве другой сессией. Владелец — Авторизация.

## Verification

Тест к патчу 5/6: `tests/account_delete_restore_prompt_retry.test.ts` — лежит в этой папке, Авторизация копирует его в `tests/`.

## Rollback

Не применять патч или сделать `git apply -R`.
