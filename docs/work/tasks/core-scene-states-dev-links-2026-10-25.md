# Ядро · ссылки Сверки на 16 состояний «Сцены»: Главная (home-scene-001…011) и «Сегодня» (today-scene-001…005)

Governance-ID: TG-5A1B0B92C677
Status: In progress
Owner: 1 · ЯДРО (по задаче координатора 25.10 вечер)
Related epic/enabler: реестр visual_parity (строки coordinator-2026-10-25), DEV_LINKS_R1, робот parity_batch_shoot

## Outcome
Для каждой новой строки R1 у Сверки есть готовая ссылка в `docs/phraseman-2.0/DEV_LINKS_R1.md`. Робот `parity_batch_shoot`
снимает их, а не пропускает с причиной «нет_в_DEV_LINKS_R1». Таблица «строка → ссылка» лежит в docs/work/ и разослана
Сверке и Макетам.

## Scope
In scope:
- 16 строк в DEV_LINKS_R1.md (раздел «Сцена Главной и «Сегодня»») и счётчики «Итог»;
- сторож `tests/dev_links_scene_states_contract.test.mjs`;
- таблица `docs/work/scene-states-dev-links-2026-10-25.md`.

Out of scope:
- новый код приложения. Подмены уже есть: `/dev_home_scene_preview` (10 героев + Plus) и `/dev_today_scene_preview`
  (5 состояний), обе за `ENABLE_DEV_TOOLS && !IS_STORE_RELEASE`;
- подмена фактов на боевой Главной (часы, история дней) — только если координатор решит, что предпросмотр для сверки не
  годится.

## Architecture
Изменения архитектуры нет. Ссылка — `dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_*_preview?…`:
- `dev_state` даёт роботу маркер готовности;
- параметры внутри `next` кодируются `%26`, как у других строк документа.

Состояние выбирает НАСТОЯЩАЯ функция: `pickHomeSceneState` / `pickTodaySceneState` по мокам фактов. Вид — тот же
`HomeSceneView` / `TodaySceneView`, что на боевом экране.

Тема — как у эталона по умолчанию:
- Главная — «Океан» (marine), тёмное (`THEME_ID='marine'`, `AP='dark'`);
- «Сегодня» — «Сумерки» (ink), светлое (`THEME_ID='ink'`, `TH='ink'`).

Тема ставится только в памяти процесса (`dev_appearance_override`).

## Security and privacy
Записей в Firestore и хранилище нет: предпросмотр на моках, тема и оформление в памяти. Маршрутов в стор-сборке нет
(сторож `store_bundle_dev_routes_guard.test.mjs`). Персональных данных нет.

## Technical debt
DEV_LINKS_R1.md правится руками с 13.10, генератор `scripts/dev_links_r1_generate.py` отстал. Его перезапуск сотрёт
ручные строки, в том числе эти. Contain: сторож падает, если строк сцены нет. Выход — перенести правила в генератор,
когда его оживят.

## Verification
- `node --test tests/dev_links_scene_states_contract.test.mjs`:
  - 16 строк с id из реестра;
  - «уникальна: да»;
  - состояние из списка функции;
  - телефон эталона = номер в реестре;
  - plus=1 только у home-scene-011.
- Существующий `tests/dev_links_r1_contract.test.ts`: ссылки разбираются без отказов, 10 колонок.

## Rollback
Убрать раздел из DEV_LINKS_R1.md и сторож.
