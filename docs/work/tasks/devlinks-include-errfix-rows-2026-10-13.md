# Task packet: DEV_LINKS_R1 — строки errfix без release=r1 (learn-047…050, practice-024, mistakes-panel-005/010) попадают в ссылки

Governance-ID: TG-95257AB010DB
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~09:00: «пересобери DEV_LINKS_R1 после 0cc6dea7d, там нет learn-047/048/049»)

## Outcome

`scripts/dev_links_r1_steps_errfix.py` (0cc6dea7d, a657d84e4) создаёт записи для learn-047…050, practice-024, mistakes-panel-005/010.
Но генератор (`dev_links_r1_generate.py:37`) берёт только строки реестра с `release=r1` или из `STEPS_ROBOT.INCLUDE_IDS`, а у этих строк
в реестре поля `release` нет. Поэтому ссылки молча не появлялись.

После правки они идут в `DEV_LINKS_R1.md` через `INCLUDE_IDS` — тот же механизм, что у chain7 (`dev_links_r1_steps_chain7.py:23`).
Заодно в файл попадает новый `devResult` у paywalls-009/010.

## Scope

In scope:
- одна вставка `STEPS_ROBOT.INCLUDE_IDS.update(...)` в errfix;
- перегенерация DEV_LINKS_R1 — только эти строки, поверх HEAD.

Out of scope:
- поле `release` в реестре (`visual_parity.json` — у Сверки);
- шаги самих строк.

## Architecture

`INCLUDE_IDS` — штатный механизм генератора. Реестр не трогаем.

## Security and privacy

Только ссылки dev_state (в стор-сборке вырезаны), записей в Firestore нет.

## Technical debt

- Contain: строки без `release` живут в двух местах (реестр без пометки + INCLUDE_IDS). Когда Сверка проставит `release=r1`, вставка станет лишней.

## Verification

- `apply_rows`: строки вставлены или изменены.
- Сторож `tests/dev_links_r1_prod_write_guard.test.mjs` зелёный.
- В DEV_LINKS_R1 нет чужих изменений (numstat — только эти строки).

## Rollback

git revert коммита.
