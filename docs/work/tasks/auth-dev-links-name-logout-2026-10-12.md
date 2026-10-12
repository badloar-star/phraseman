# Task packet: ссылки робота для окна имени и выхода/удаления (profile-003, 028…030, settings-gap-024…026, 031…033)

Governance-ID: TG-C4E79F73ADAF
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/DEV_LINKS_R1.md, R1_SHOT_LIST_ACCOUNT_SETTINGS.md (G-A02, G-A10, G-A11), макеты profile.html, settings-gaps-states.html

## Outcome

Робот съёмки снимает кадры окна имени и критических действий аккаунта без реального выхода и удаления:
- `dev_state?namecheck=checking|available|taken|error|none` — ответ проверки занятости имени в памяти процесса; сервер не вызывается.
- `dev_state?logout=hold` — выход «выполняется» держится (кадр profile-028), затем отказ; стирание недостижимо.
- Шаги в `scripts/dev_links_r1_steps.py` по testID: `account-change-name`, `nickname-input`, `nickname-save`, `account-logout-button`, `account-delete-button`.

## Scope

In scope: `app/dev_account_state.ts`, `app/dev_state_fixtures.ts` (парсинг `namecheck`), `components/account/NicknameEditModal.tsx` (одна точка подмены), `scripts/dev_links_r1_steps.py`, `docs/phraseman-2.0/DEV_LINKS_R1.md` (генерация), `tests/dev_account_state.test.ts`.
Out of scope: реальный выход/удаление, бронь имени на сервере (сохранение имени роботом не нажимается для состояний проверки), серверная логика имён.

## Architecture

No architecture change: те же флаги в памяти, что `logout=`/`delete=`/`switch=`; подмена стоит ДО сетевого вызова и читается геттером, который вне dev всегда null.

## Security and privacy

Только `__DEV__ && !IS_STORE_RELEASE`. `logout=hold` отказывает до резервации замка, синхронизации и стирания (как `logout=fail`). `namecheck` не пишет и не читает сеть. Персональные данные не затрагиваются.

## Technical debt

Contain: dev-фикстуры живут в одном модуле, сторож — `tests/dev_account_state.test.ts` (стор-сборка → null).

## Verification

`tests/dev_account_state.test.ts`, `tests/dev_links_r1_contract.test.ts`, `tests/account_modals_liquid_glass_source_contract.test.mjs` — точечно со слотом. Робот: кадры строк по DEV_LINKS_R1.md.

## Rollback

Откат коммита; ссылки без новых параметров работают как раньше.
