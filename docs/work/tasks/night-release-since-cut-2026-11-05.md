# Ночной выпуск 2.1.0: подстановка момента среза RANK_GATES_NEW_USERS_SINCE_MS (поручение координатора 05.11)

Governance-ID: TG-8A5D3DE15E44
Status: Готово к срезу (ждёт слова «ставь» от координатора около 02:15)
Owner: «5 · ВХОД»

## Outcome

В срезе сборки 2.1.0 «новые» пользователи определяются: приветствие B-3, ранговые замки и бонус +500 работают для аккаунтов, созданных не раньше момента среза. Включение самих гейтов — Пультом после релиза.

## Scope

Одна строка в `app/rank_gates_new_user.ts` (заглушка `Number.MAX_SAFE_INTEGER` → метка среза, UTC мс). Скрипт подстановки лежит вне репозитория. Сторож `tests/rank_gates_since_release_cut_guard.test.mjs` с `RELEASE_CUT=1` должен стать зелёным.

## Architecture

Метка = время среза (мс UTC), приходит от координатора вместе с «ставь». Проверки до коммита: сторож среза с `RELEASE_CUT=1`, `tests/newcomer_restore_holes_2026_11_04.test.ts`, `tests/rank_gate_cohort_sticky*`, `tests/first_lesson_bonus*`. Коммит узкий (одна строка).

## Security and privacy

Данные не затрагиваются.

## Technical debt

Метка зашита в код; смена момента релиза — новая сборка.

## Verification

Сторож среза зелёный с `RELEASE_CUT=1`; соседние тесты когорты и бонуса зелёные.

## Rollback

Вернуть заглушку `Number.MAX_SAFE_INTEGER` (гейты отключаются, всё открыто).
