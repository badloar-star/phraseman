# Task packet: dev_state?account=support_only — настоящий «Выйти» только на аккаунте №3 «Phraseman Support»

Governance-ID: TG-EF9B6F108426
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10 ~19:05, п.A: «№1 никогда, №2 не трогаем; вход в №3 только выбором аккаунта»)
Related epic/enabler: съёмка R1 profile-028 («Выходим…») / profile-029 («Не удалось выйти»); у гостя кнопки «Выйти» нет (linkedAuth)

## Outcome

`account=support_only`: до ЛЮБОГО шага ссылки проверяется текущий пользователь Firebase Auth. Проходит только вошедший через Google
аккаунт с именем профиля «Phraseman Support» (без хранения почты/uid в коде; в лог — маска почты `sup…@домен(длина)`). Иначе —
`[DEV-STATE] refused account_support_only …`, ни одного шага, без перехода на next.
profile-028 — настоящий выход на №3 (без подмены logout). profile-029 — неудача выхода настоящим выходом не воспроизводится,
поэтому остаётся logout=fail + account=support_only (двойная защита).

## Scope

In scope: app/dev_state_account_guard.ts (чистая проверка), app/dev_state_fixtures.ts (параметр, от HEAD под замком),
scripts/dev_links_r1_steps_auth.py (profile-028/029), тест. Out of scope: само приложение, пароли (не вводятся никогда).

## Architecture

Как guest=required: ранний выход applyDevState до шагов. Проверка — по профилю Firebase Auth текущего пользователя.

## Security and privacy

Почта и uid в коде не хранятся; в журнал — только маска. Ошибка опознания ведёт к ОТКАЗУ (безопасная сторона).
Настоящий выход №3: данные синхронизируются и стираются на устройстве, аккаунт на сервере цел; повторный вход — выбором аккаунта,
появилось поле пароля — стоп (правило координатора, в заметке шага).

## Technical debt

- Contain: имя профиля «Phraseman Support» — константа dev-проверки; сменят имя — ссылка начнёт отказывать (безопасно).

## Verification

Тест: №3 проходит; аноним, другой Google-аккаунт, Apple, без имени — отказ; маска без полной почты; проверка до первого шага.

## Rollback

Откат коммита.
