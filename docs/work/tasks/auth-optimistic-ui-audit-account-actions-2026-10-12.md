# Task packet: аудит Optimistic UI действий аккаунта + исправление отмены удаления

Governance-ID: TG-AE2707DD0768
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» по заданию координатора (12.10)
Related epic/enabler: CLAUDE.md п.10 (Optimistic UI), INBOX §AUTH-0090

## Outcome

Таблица аудита (мгновенный отклик, откат с сообщением, защита от двойного тапа, нет полноэкранного спиннера) для: смены имени, привязки Google/Apple (окно входа и онбординг), «Остаться/Сменить» в онбординге, отмены удаления (восстановления аккаунта); проверка, что «Выходим из аккаунта» появляется в кадре тапа.
Найденный пробел — отмена удаления: в онбординге своя копия предложения без логов и без защиты от сбоя запроса статуса; неудачное восстановление в онбординге и в окне входа сливалось с текстом «аккаунт ещё удаляется». Исправление: исход восстановления (`restored|declined|not_restorable|restore_failed`) с логами `[ACCOUNT-RESTORE] onboarding …`, отдельный понятный текст «Аккаунт не восстановлен. Проверь интернет и попробуй ещё раз.» на обоих экранах.

## Scope

In scope: `components/CleanOnboarding.tsx` (offerAccountRestore и два места вызова), `components/RegistrationPromptModal.tsx` (ветка restore_failed), `app/account_delete_restore_prompt.ts` (общий текст), тесты `tests/aa_release_registration_restore_prompt.test.ts`, `tests/aa_release_floor_auth_ui.test.ts`.
Out of scope: вид окон (системное окно «Восстановить аккаунт?» остаётся), серверная логика восстановления.

## Architecture

No architecture change: те же вызовы `fetchAccountDeleteStatus`/`restoreDeletedAccount`; онбординг получает исход вместо boolean.

## Security and privacy

В логах только исход и коды; без uid и почты. Новых данных нет.

## Technical debt

Accept temporarily: в онбординге остаётся своя копия текста окна (сторож паритета требует совпадения с общей функцией) — владелец сессии «5 · АВТОРИЗАЦИЯ», выход — объединить при следующей правке окна.

## Verification

`tests/aa_release_registration_restore_prompt.test.ts`, `tests/aa_release_floor_auth_ui.test.ts`, `tests/aa_auth_double_tap_contract.test.ts` — точечно со слотом.

## Rollback

Откат коммита; восстановление работает как раньше (без отдельного текста ошибки).
