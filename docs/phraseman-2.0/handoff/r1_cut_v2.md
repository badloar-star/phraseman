# Патч r1_cut_v2 — Learning V2 НЕ входит в стор-сборку R1 (решение владельца, «Утром решить» №1)

Файл: `C:/Temp/claude/r1_cut_v2.patch` (10 файлов, 195 строк). Собран против HEAD `d65c4fbff`, ложится и на `ee66126df`
(`git apply --check` — OK и для индекса HEAD, и для рабочего дерева). НЕ закоммичен и НЕ наложен.

## Что меняется (частичный обратный ход caafa92ab)
1. `router.ctx.js` — стор-ветка снова режет ВСЕ маршруты Learning V2 (`(?!(?:.*learning[_-]v2.*)\.tsx?$)`), как до 11.10.
2. `app/(tabs)/lessons.tsx` — вход в курс `LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = !IS_STORE_RELEASE && (…как сейчас…)`:
   в стор-сборке входа нет; в dev/preview — как сейчас (столько, сколько выпущено, или дев-сборка).
3. `scripts/release_precheck.mjs` — гейтам V2 передаётся `EXPO_PUBLIC_STORE_RELEASE=1` (precheck проверяет стор-сборку;
   без флага гейты не видят выреза и остаются строгими).
4. `scripts/store_route_reachability.mjs` — разрешённое исключение: переход Обучение → занятие V2 закрыт константой из п.2.
5. Сторожа (6 файлов тестов) — под правило «курс вырезан из стор-сборки».
Заглушка наград сессии V2 НЕ возвращается: настоящий модуль с 11.10 экспортирует ~15 имён против 2 у старой заглушки —
её возврат сломал бы вызовы; занятия V2 в стор-сборке не запускаются, наград нет.

## Что пропадает у человека (стор-сборка)
- Вкладка/чип курса Learning V2 («Новые уроки») в «Обучении». **Сегодня её и так нет**: выпущено 0 занятий
  (`LEARNING_V2_HAS_RELEASED_SESSIONS_V1 = false`), вход уже скрыт. То есть видимого изменения на сегодня — нет.
- Если Codex выпустит занятия до сборки — они в R1 НЕ появятся (курс вырезан целиком). Вернуть — обратный патч.
- Старые уроки, Карточки, Диалоги, Шпиль, Главная — без изменений.
- В бандле перестают быть маршрутами 11 экранов V2 (курс, занятие, интро, плеер, дев-экраны).

## Что даёт
- Гейты precheck «исходник = выпуск = копия V2» и «озвучка V2» → громкий ПРОПУСК (было 🔴).
- Красным остаётся только «Приложение = макет» (решение «Утром решить» №2: `--release=r1`, коммит ee66126df).
- Попутно зеленеет сторож `tests/visual_parity_gate.test.mjs` «стор-сборка вырезает Learning V2» (красный с caafa92ab).

## Проверено на временной копии HEAD (git archive, рабочее дерево и файлы Codex не тронуты)
- `store_route_reachability`: вырезано 17, переходов 7, дыр 0 · `store_release_stubs_gate`: OK.
- `learning_v2_release_parity_gate`, `learning_v2_audio_coverage_gate` (стор): «пропущено: не входит в стор-сборку».
- `release:precheck` в копии: красный только «Приложение = макет» (в копии нет реестра; на основном — 1036/514 нарушений).
- node-тесты: show_only_released, store_release_gate_levers, release_precheck classification, store_route_reachability — 22/22.
- jest: learning_v2_release_access_contract, lessons_entry_opens_legacy_guard, store_release_learning_v2_bundle_exclusion — 20/20.

## Как наложить после «да» владельца
```bash
git apply --check C:/Temp/claude/r1_cut_v2.patch
git apply C:/Temp/claude/r1_cut_v2.patch
```
Затем commit_locked с этими 10 путями; tsc по `app/(tabs)/lessons.tsx` и сторожа выше. Если `--check` не проходит —
кто-то правил эти файлы: пересобрать патч (скрипты Ядра `r1v2_*.sh/.py` в scratchpad).
