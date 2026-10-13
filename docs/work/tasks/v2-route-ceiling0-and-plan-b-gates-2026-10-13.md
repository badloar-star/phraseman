# Task packet: маршрут V2 при нулевом потолке не открывается; обёртка гейтов №3/№4 для плана Б

Governance-ID: TG-56420AEA5088
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 ~11:45; docs/phraseman-2.0/R1_PLAN_B_HIDE_V2.md

## Outcome

- app/(tabs)/lessons.tsx `startLessonsPage`: если курс V2 открыть нельзя (потолок выпущенных занятий 0 и не dev-сборка), вкладка
  V2 не открывается ни из памяти, ни по прямой ссылке `learning-v2/course` (initialPage="v2") — человек попадает в список
  уроков; журнал [V2-ROUTE] reason=ceiling0. Правильно независимо от решения 15.10.
- scripts/learning_v2_plan_b_gates.mjs: без PHRASEMAN_R1_HIDE_V2 запускает гейты №3/№4 как сейчас; с PHRASEMAN_R1_HIDE_V2=1 при
  потолке 0 — «НЕПРИМЕНИМО», при потолке > 0 — ОТКАЗ. Подключена в scripts/release_precheck.mjs и package.json
  eas-build-post-install вместо двух прямых вызовов. Режим НЕ включён (eas.json не меняется).

## Scope

In scope: lessons.tsx (одна функция, только свой хунк), новый скрипт, release_precheck.mjs, package.json (одна строка).
Out of scope: код Codex, eas.json, генерация потолка.

## Architecture

No architecture change.

## Security and privacy

Нет данных.

## Technical debt

- Включение плана Б (env в eas.json) — по решению 15.10 12:00.

## Verification

Обёртка без env = прежний результат гейтов (оба красные сейчас — так и должно остаться); с env и потолком 0 — НЕПРИМЕНИМО;
babel-проверка lessons.tsx; тест-контракт обёртки.

## Rollback

Откат коммитов: precheck и post-install снова зовут гейты напрямую.
