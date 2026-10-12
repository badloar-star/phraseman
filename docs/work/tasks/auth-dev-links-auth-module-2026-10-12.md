# Task packet: свой модуль шагов робота Авторизации (auth-gap-001/002/003/008/009/010/011/012, profile-023)

Governance-ID: TG-B342C005A468
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» (координатор 12.10, triage.coverage: link_missing + core_switch без шагов)
Related epic/enabler: docs/phraseman-2.0/DEV_LINKS_R1.md, scripts/dev_links_r1_generate.py

## Outcome

Строки получают ссылку и шаги робота из НОВОГО модуля `scripts/dev_links_r1_steps_auth.py` (подключён к генератору, как `_cards2/_dialogs2/_misc2`); общий `dev_links_r1_steps.py` не трогается. Новая подмена `dev_state?switch=required` — вход отдаёт `account_switch_required` ДО сети (окно входа с кнопкой «Сменить аккаунт», auth-gap-003; по кнопке — окно «Сменить аккаунт?», auth-gap-012). auth-gap-011 («удаление не завершилось») — `unique=False`: путь требует ввести слово подтверждения кириллицей (робот не умеет) и нажать «Удалить» — при неприменённой подмене это настоящее удаление, роботу его не даём.

## Scope

In scope: `app/dev_account_state.ts` (режим `required`), `scripts/dev_links_r1_steps_auth.py` (новый), одна строка import в `scripts/dev_links_r1_generate.py`, генерация `DEV_LINKS_R1.md`, тест `tests/dev_account_state.test.ts`.
Out of scope: общий `dev_links_r1_steps.py`, настоящие вход/удаление.

## Architecture

No architecture change: режим `required` — ещё одно значение существующего `switch=` (память процесса, геттеры null вне dev / в стор-сборке, маршрут dev_state вырезан из стор-сборки). Выход/смена при нём отказывают, как при прочих режимах `switch=`.

## Security and privacy

Подмены не входят в аккаунт и не стирают данные; `delete=fail` — страховка на шагах, которые только открывают окно удаления; подтверждение удаления роботу не даётся (auth-gap-011 вручную).

## Technical debt

Contain: шаги Авторизации — в своём модуле; сторож `tests/dev_links_r1_contract.test.ts` и `tests/dev_account_state.test.ts`. Accept temporarily: auth-gap-011 снимается вручную (владелец — «5 · АВТОРИЗАЦИЯ»; выход — ASCII-слово подтверждения в dev или подмена ввода, только по решению координатора).

## Verification

`python scripts/dev_links_r1_generate.py`; `tests/dev_links_r1_contract.test.ts`; `tests/dev_account_state.test.ts`.

## Rollback

Удалить import модуля в генераторе и режим `required`; ссылки строк вернутся к «по shot list».
