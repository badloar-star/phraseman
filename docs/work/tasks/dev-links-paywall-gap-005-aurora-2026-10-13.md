# Task packet: DEV_LINKS paywall-gap-005 — тема «Аврора» (образец приведён Макетами 13.10 ~18:05)

Governance-ID: TG-81E0CB2A0179
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Макеты привели образец paywall-gap-005 к коду: единый пейвол Plus (D115) с контекстом no_energy, выбран «Месяц». В реестре: страница класса A — снимать в «Авроре» (theme=grad_aurora&level=1, таблица Тем). Добавляем тему в ссылку строки; остальное — как было (контекст no_energy, тап по плитке «Месяц»).

## Scope

In scope: `scripts/dev_links_r1_steps_errfix.py` (одна правка) и 1 строка `DEV_LINKS_R1.md`.
Out of scope: другие строки пейвола (если понадобится — по списку Тем отдельно).

## Architecture

`set_param('paywall-gap-005', 'theme', 'grad_aurora')` и `set_param(..., 'level', '1')`. Генерация копией генератора в scratch, перенос строки поверх HEAD.

## Security and privacy

Тема — подмена в памяти dev-сборки.

## Technical debt

- Тема в памяти переживает переход к следующей строке без перезапуска приложения — Сверка перезапускает приложение между пачками.

## Verification

Сторож prod_write зелёный; дифф — 1 строка.

## Rollback

`git revert` коммита.
