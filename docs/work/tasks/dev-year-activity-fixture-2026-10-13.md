# Task packet: dev-подмена «Активность за год» (results-009) — заполненная сетка как в образце

Governance-ID: TG-034101AC2A06
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 ~10:50 — Сверка снимает results-009 с заполненной сеткой как в results.html#9

## Outcome

- `phraseman://dev_state?…&yearActivity=demo` (только __DEV__) — экран /year_activity рисует 365 дней по узору образца
  (extension.css .heatmap: клетка n кратна 17 → ярко, 7 → средне, 4 → слабо, остальные пусто) и итоги образца:
  «Фраз выучено 184», «Время практики 18 ч 42 мин». `yearActivity=off` — снять.
- Подмена живёт только в памяти процесса: AsyncStorage, статистика и облако не трогаются.

## Scope

In scope: app/dev_year_activity.ts (новый), app/dev_state_fixtures.ts (параметр), app/year_activity.tsx (2 строки: дни подмены
вместо статистики), тест tests/dev_year_activity.test.ts.
Out of scope: DEV_LINKS_R1.md (генерируется, руками не правим — ссылку с параметром передаю координатору), полоска «Год» в
«Серии и статистике».

## Architecture

No architecture change.

## Security and privacy

Только dev-сборка, только память; пользовательские данные не читаются и не пишутся.

## Technical debt

- Полоска «Год» в «Серии и статистике» подмену не видит; если Сверке понадобится и она — отдельный параметр.

## Verification

Тест: 365 дней, узор, суммы 184 и 1122 мин; babel-проверка; эмулятор — Сверка снимет results-009.

## Rollback

Откат коммита; без параметра поведение экрана прежнее.
