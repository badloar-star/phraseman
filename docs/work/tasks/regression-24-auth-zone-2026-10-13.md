# Task packet: №24 — вечерняя регрессия jest по зоне Авторизации и подписки после 15:00 (координатор 13.10 ~17:35)

Governance-ID: TG-2CE07AD996DA
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Прогнать тесты зоны после всех правок дня:
- 4a850d2b6, c1404c474, 21e9dbd74, 69bb4c1f7, eac42c3e0, 329097451, 9c7850a10;
- чужие правки, задевшие зону (392e534f1, 5a8ae576c и др.).

Красное — разобрать: моё — чинить; чужое — владельцу строкой; устаревший сторож — перепин по diff с причиной.

Набор — файлы `tests/` с именами про auth / account / premium / subscription / logout / restore / registration / signout / settings_poll / support_report / dev_links (256 jest и 18 node --test).

## Итог прогона (17:33–17:44, HEAD 7bdfd6962)

Jest: 255 наборов, ≈3750 тестов; красных 2 набора (3 теста). node --test: 18 файлов, красных 2.
- `dev_links_r1_dialogs011_contract` — устарел. dc9b10b85 (12.10 19:26) осознанно добавил `&dev_dialog_send=ok` к dialogs-011: сторож prod_write, старт сессии не уходит в прод. Тест ждал точную строку `'plus=off&energy=0'`. Перепин: ждём `'plus=off&energy=0&dev_dialog_send=ok'`, смысл прежний — настоящий ноль энергии без `dev_energy_fail`.
- `settings_notifications_liquid_glass` (2) — хэш `persistPrefs` сменился только комментарием `// i18n-ok` (Макеты 3321a8ce1, базлайн непереведённых строк). Перепин с причиной.
- `settings_effective_theme_label_contract` — падает на загрузке: esbuild не трансформирует `react-native/index.js` (`Unexpected "typeof"`). Окружение харнесса, файл Тем (последняя правка 10.10) — владельцу строкой.
- `learning_v2_authored_sessions_reach_the_player` (2) — зона Learning V2 / Codex — владельцу строкой.

## Scope

In scope: запуск и разбор; два перепина устаревших сторожей зоны (`tests/dev_links_r1_dialogs011_contract.test.ts`, `tests/settings_notifications_liquid_glass.test.mjs`).
Out of scope: полный сюит (запрещён правилом машины).

## Architecture

Скрипт в scratchpad:
- node --test для `.mjs` — без слота, они лёгкие;
- jest частями по 40 файлов, `--runInBand --watchman=false`, `--max-old-space-size=8192`;
- слот светофора на каждую часть — слот протухает через 15 мин.

Итог — в `z24_result.txt` в scratchpad.

## Security and privacy

Только локальный прогон тестов.

## Technical debt

- Набор отбирается по имени файла: тест зоны с «чужим» именем (например, про онбординг) сюда не попадёт. Онбординг-сторожа восстановления (`aa_release_*`) гонялись точечно при 329097451.

## Verification

Итоговая сводка «зелёные / красные» с причинами — координатору.

## Rollback

Не требуется: ничего не меняется.
