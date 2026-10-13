# Task packet: набор к решению 15.10 12:00 — план Б (V2 скрыт): патч eas.json, проверка «V2 скрыт», чек-лист владельцу (координатор 13.10 ~14:20)

Governance-ID: TG-0AE4918142EE
Status: Done — патч проверен git apply --check (не применён), скрипт: «V2 СКРЫТ» (флаг ещё не применён — предупреждение), чек-лист 10 строк
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

1. `docs/work/plan-b/eas_json_production_hide_v2.patch` — готовый патч (git apply), добавляет ровно одну строку `"PHRASEMAN_R1_HIDE_V2": "1"` в `eas.json → build.production.env`. **НЕ применяется.**
2. `scripts/plan_b_v2_hidden_check.mjs` — проверка «в выпуске V2 скрыт», только чтение. Журнал `[PLAN-B-CHECK]` по каждому пункту:
   - потолок выпущенных занятий в generated-файле = 0;
   - флаг в профиле production: есть / нет (ключ `--expect-applied` делает его обязательным);
   - обёртка `learning_v2_plan_b_gates.mjs` с `PHRASEMAN_R1_HIDE_V2=1` → строка «НЕПРИМЕНИМО», код 0;
   - маршрут `learning-v2/course` уводит в «Уроки»: `startLessonsPage` с `[V2-ROUTE] reason=ceiling0`, `LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = HAS_RELEASED || ENABLE_DEV_TOOLS`, `ENABLE_DEV_TOOLS` выключен в стор-сборке;
   - если есть экспорт `dist-store/` — в бандле есть строка `reason=ceiling0`, иначе «пропущено до дня сборки».
3. `docs/work/plan-b/CHECKLIST_15_10_V2_OWNER.md` — 10 строк простыми словами для владельца.

## Scope

In scope: три новых файла.
Out of scope: применение патча, сборка, выкладка, правки кода приложения и гейтов.

## Architecture

Скрипт — Node ESM без зависимостей, только чтение файлов и запуск существующей обёртки гейтов. Итог: код 0 — всё ок; 1 — есть отказ (с причиной в журнале).

## Security and privacy

Ничего не пишет и не выкладывает, ключей не читает.

## Technical debt

- Проверка маршрута статическая, по исходнику. Живая проверка возможна только на стор-сборке (на dev-эмуляторе раздел V2 открыт всегда, ENABLE_DEV_TOOLS).

## Verification

- `node scripts/plan_b_v2_hidden_check.mjs` на текущем HEAD: всё ок, кроме «флаг ещё не применён»;
- `git apply --check` патча проходит.

## Rollback

Удалить файлы.
