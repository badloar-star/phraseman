# Task packet: строки DEV_LINKS по разбору Ядра «ссылка даёт бракованный кадр» (13.10 ~14:40)

Governance-ID: TG-1D3C72C6BCCB
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (генератор DEV_LINKS_R1); разбор журналов кадров — 1 · ЯДРО

## Outcome

Ядро разобрало журналы кадров `_runs/*/<id>.log` и предложило правки строк. Код не меняется, все testID на месте (проверено grep: `lesson1-word-option-wrong/correct`, `lesson1-check`, `ai-mistake-limit-card`, `soft-upsell-card`).

- **paywalls-008** — ссылка вела в меню урока без шагов, и кадр снимался до карточки ИИ-разбора. Теперь: `/lesson1?id=1&from=lesson_menu` плюс `free=on&lessonintro=skip&mode=a&energy=5`. Шаги: неверный ответ → проверка → ждать `#ai-mistake-limit-card`. «Лимит» ставит `ai_explain=limit` в памяти, без сервера.
- **paywalls-009/010** — кадр снимался через 3 с, до мягкого предложения: анимация наград идёт дольше. Теперь `await:#soft-upsell-card; see:#soft-upsell-card; wait:500`.
- **dialogs-032 / dialogs-gap-012** — состояние достигается, но кадр снят с открытой клавиатурой. В конец шагов добавлено `hidekb; wait:400`. Для dialogs-032 ещё `dquota=30`: пилюля квоты как в образце и как у dialogs-012.
- **settings-gap-005, dialogs-012** — ссылки уже верные, кадры устарели. Нужна только пересъёмка.

## Scope

In scope: `scripts/dev_links_r1_steps_errfix.py` (правки в конце файла) и перенос 5 строк в `docs/phraseman-2.0/DEV_LINKS_R1.md`.
Out of scope: код приложения, реестр, пересъёмка (её делает Сверка).

## Architecture

Те же помощники errfix (`set_steps`, `set_param`), для paywalls-008 — `ENTRIES.pop` + `add`. Генерация поверх HEAD только по своим id (`apply_rows.py`).

## Security and privacy

Только dev-ссылки и шаги робота. `ai_explain=limit`, `free`, `mode`, `energy`, `dquota` — подмены в памяти dev-сборки. Запись в Firestore и сеть не трогаются. Неверный ответ в уроке — обычное действие ученика на dev-аккаунте.

## Technical debt

- `await:` по карточке мягкого предложения зависит от длительности анимации наград. Если карточка не появится, робот упадёт по ожиданию и не снимет пустой кадр — это и нужно.

## Verification

- Сторож `node --test tests/dev_links_r1_prod_write_guard.test.mjs` зелёный.
- В строках DEV_LINKS видны новые шаги и параметры; дифф только по 5 строкам.

## Rollback

`git revert` коммита.
