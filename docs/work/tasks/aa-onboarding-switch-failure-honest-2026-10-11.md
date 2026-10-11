# Task packet: онбординг — честный исход сбоя смены аккаунта (backup_failed, recovery_required)

Governance-ID: TG-E845F7A3BD17
Status: Planned
Owner: сессия «Авторизация»
Related: решение координатора 06:20 п.5; 8186fd68a (полки копии)

## Outcome
Смена аккаунта в онбординге (`app/onboarding_account_switch_confirm.ts`) при отказе показывает правдивый исход:
- `backup_failed` (копию прогресса не удалось записать на телефоне — не из-за чужой копии, это уже лечится полкой) → «Не получилось сохранить копию прогресса на этом телефоне. Ничего не удалено — освободи место или попробуй позже.» Без «Сменить без сохранения»: форсированный путь тоже требует копию, предлагать его — обещать то, что не сработает.
- `recovery_required` / `wipe_failed` (сбой ПОСЛЕ маркера) → «Смена началась, но не завершилась. Перезапусти приложение — восстановление продолжится.» (не «Прогресс на месте» — это неправда).
- `catch` пишет код `identityErrorCode`, не текст ошибки.

## Scope
Только `app/onboarding_account_switch_confirm.ts` (+ тест). Окна — существующая очередь кита (`enqueueThemedBlockingChoiceAlert`, тот же вид); новые строки — 9 языков через `triLang`, на «ты». Вёрстку не меняем.

## Architecture
Без изменения архитектуры: ветки текста по `reason`.

## Security and privacy
Нет новых данных; лог только кодом.

## Technical debt
- Pay now: ложный текст «Прогресс на месте» для `backup_failed` / `recovery_required` / `wipe_failed` и сырой текст ошибки в логе catch — закрыто в 1594f4b1f.
- Accept temporarily (владелец — сессия «Авторизация», пересмотр после релиза 2.0.0): копия «earn», вернувшая false без исключения, даёт `sync_failed` вместо `backup_failed`; исключение после маркера во внутреннем try даёт `unknown`. Потолок вреда — общий текст и лишний повтор, данные не теряются.

## Verification
Тест `tests/aa_release_floor_auth_ui.test.ts` (или новый `aa_onboarding_switch_failure_text.test.ts`): тексты для backup_failed / recovery_required / wipe_failed не содержат «на месте»; catch без `.message`. По одному со слотом. Храповик переводов 814. Ревью.

## Rollback
`git revert`.
Governance-ID: TG-77AC10806597 — APPROVE ревью; L-1: убран совет «освободи место» (помогает редко), коммит.
