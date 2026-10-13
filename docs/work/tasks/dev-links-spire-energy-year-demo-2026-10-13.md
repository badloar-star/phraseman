# Task packet: DEV_LINKS_R1 — энергия 2 у Шпиля, демо «Активности за год», spire-gap-021 вне R1 (координатор 13.10 ~11:25)

Governance-ID: TG-C5A5F4F81AD3
Status: Done — 38 строк обновлены (37 × energy=2, results-009 yearActivity=demo), spire-016 без изменений (energy=0), spire-gap-021 убрана; сторож 4/4
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Пересобранный `docs/phraseman-2.0/DEV_LINKS_R1.md`, в котором:
1. все строки `spire-*` и `spire-gap-*` открываются с `energy=2`, а `spire-016` — с `energy=0` (кадр «нет энергии»);
2. `results-009` открывается с `yearActivity=demo` (подмена Ядра 0bc13b5b7: заполненная сетка и итоги образца, только `__DEV__` и память);
3. `spire-gap-021` в DEV_LINKS_R1 не попадает.

## Scope

In scope:
- `scripts/dev_links_r1_steps_errfix.py` — правки ссылок (`set_param`) и список исключённых id;
- `scripts/dev_links_r1_generate.py` — одна строка фильтра `EXCLUDE_IDS` при отборе строк;
- `docs/phraseman-2.0/DEV_LINKS_R1.md` — перегенерация; в коммит идут только изменённые строки.

Out of scope:
- реестр `visual_parity.json` (`release` у spire-gap-021 не трогаю — это решение Сверки/Макетов);
- код приложения.

## Architecture

Правки идут в последнем модуле шагов (errfix), поверх всех модулей, как остальные исправления 13.10. Исключение сделано через
`STEPS_ROBOT.EXCLUDE_IDS`, по аналогии с `INCLUDE_IDS`. Генератор читает его через `getattr(..., set())`, поэтому старые модули работают без изменений.

## Security and privacy

Только dev-ссылки. `energy=` и `yearActivity=demo` подменяют значения в памяти, ничего не пишут в Firestore и не трогают пароли.

## Technical debt

- `spire-gap-021` остаётся в реестре с `release=r1` — гейт паритета продолжит её считать, пока Сверка/Макеты не снимут release. Это записано в отчёте координатору.
- Exclude-список живёт в errfix, а не в реестре, — со временем стоит перенести в реестр, чтобы не было двух источников.

## Verification

- генератор отрабатывает без ошибок;
- `grep` по DEV_LINKS_R1: у каждой строки spire/spire-gap есть `energy=2`, у spire-016 — `energy=0`, у results-009 — `yearActivity=demo`, spire-gap-021 отсутствует;
- `node --test tests/dev_links_r1_prod_write_guard.test.mjs` зелёный;
- numstat коммита содержит только эти строки.

## Rollback

`git revert` коммита; ссылки вернутся к прежним.
