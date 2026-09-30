# Task packet: ночное продолжение PM2.0 — XP-тесты на новую модель, решения за владельца через совет агентов

Governance-ID: TG-8BB19555F7A5
Status: In progress
Owner: Claude session; владелец 2026-09-30 разрешил принимать решения без него (через совет агентов) и работать без остановок

## Outcome

Тесты прогресса, которые ждут удалённые поля XP, переписаны на модель без XP с сохранением смысла (durable commit, идемпотентность, отказ mirror не валит commit, stale hydration не затирает свежий commit). Спорные решения владельца принимаются советом из нескольких агентов и фиксируются в PROGRESS.md с мотивировкой.

## Scope

In scope: `tests/personal_progress_store.test.ts`, `tests/phone_state_progress_api.test.ts`, другие тесты с удалёнными XP-полями; решения PM-052/PM-014/PM-276 и т.п. через совет агентов; PROGRESS.md/tasks.json.
Out of scope: deploy, prod-данные, платные API, пломбы MAX/App Check, удаление тестов (заблокировано защитой).

## Architecture

Код приложения не меняется ради тестов; тесты адаптируются к текущему контракту `progress_api.ts` (completeLesson/completeExam).

## Security and privacy

Не затрагивается; проверки идемпотентности и отказоустойчивости сохраняются, а не удаляются.

## Technical debt

Pay now: устаревшие XP-ожидания в тестах заменяются эквивалентными проверками.

## Verification

`npm run test:one` по каждому переписанному файлу — 0 падений; факты в PROGRESS.md.

## Rollback

Не закоммичено; прежняя версия тестов — `git show HEAD:<путь>`.
