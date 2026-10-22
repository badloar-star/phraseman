# Сценарий одного захода на эмуляторе (~10 минут)

Governance-ID: TG-129541404BB6
Status: Plan (без правок кода)
Owner: 6 · СВЕРКА, по просьбе координатора 22.10

## Outcome
За один заход, пока владелец держит закрытой Opera, снять: звук во всех режимах на коде 72f72a94e + 25888c669, «Все ошибки → Очистить», пересъёмку Главной и Диалогов (567585366, a1a099133, 6fdcd15dd) в тёмной и светлой темах.

## Scope
Только съёмка и проверка. Plus не покупать, аккаунт №1 не трогать, пароли не вводить, «Выйти» из ступени и «Удалить» не нажимать.

## Architecture
Скрипты уже лежат в `C:/Temp/claude/`: `sverka_up2.sh` (эмулятор 2 ГБ, подмена кучи 384m, ожидание free ≥ 2,5 ГБ три замера, запуск приложения), `sverka_ram_guard2.sh` (сторож: гасит при free < 800 МБ два замера подряд), `emu_lock.sh` (замок). Склейки: `C:/Temp/claude/png/parity/{shot_phone2.cjs,side.py,sheet.py}`. Результаты — `C:/Temp/claude/png/parity/r3/`.

## Security and privacy
Данных не собирается; микрофон приложению в эмуляторе уже выдан (слово владельца 21.10) — не менять.

## Technical debt
Нет.

## Verification
Каждый шаг пишет снимок и (для звука) строки лога; отчёт координатору после каждого пункта.

## Rollback
Эмулятор погасить (`adb -s emulator-5554 emu kill`), замок отпустить.

---

## 0. Перед стартом (2 минуты)
1. Владелец закрыл Opera. Свободно ≥ 6 ГБ: `powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024"`.
2. Metro на 8081 жив с лимитом 3 ГБ: `curl -s http://localhost:8081/status` → `packager-status:running` (если нет — `npx cross-env NODE_OPTIONS=--max-old-space-size=3072 expo start --port 8081 --max-workers 2`, до этого взять слот светофора).
3. Прогреть бандл: `curl -s -o /dev/null "http://localhost:8081/index.bundle?platform=android&dev=true&minify=false&app=app.phraseman&modulesOnly=false&runModule=true"` (≈10 с).
4. Замок и подъём: `bash /c/Temp/claude/emu_lock.sh acquire "6 СВЕРКА: заход"`; `bash /c/Temp/claude/sverka_up2.sh` (≈2,5 мин).
5. **Ссылки открывать только так** (одинарные кавычки внутри двойных, иначе `&` обрезает параметры):
   `adb -s emulator-5554 shell "am start -a android.intent.action.VIEW -d 'phraseman://<маршрут>?a=1&b=2' app.phraseman"`.
6. Снимок: `adb -s emulator-5554 exec-out screencap -p > файл.png`; никогда не ставить `| tail`/`>` в одну команду с `adb shell`.

## 1. Звук (главное, 4 минуты)
Журнал: `adb -s emulator-5554 logcat -c` перед нажатием; потом `adb -s emulator-5554 logcat -d -s ReactNativeJS:V | grep -E "speak:enter|V2-AUDIO-TTS"`. Ожидаем для каждого нажатия: `speak:enter` → `phase":"request"` → `start` → `done`, `voice":"system_default"`, `language":"en-US"` (это TTS, не запись).

| № | Режим | Как открыть | Что делать | Ожидаемо |
|---|---|---|---|---|
| 1 | sound_contrast | `phraseman://learning_v2_modes_showcase_run/sound_contrast` | тап по динамику в карточке-варианте (значок 🔊, не «♪») дважды подряд | оба раза `speak:enter`; значок динамика; кнопка не disabled |
| 2 | scripted_repeat | `…/showcase_run/scripted_repeat_compare` | большая круглая кнопка; нажать во время звучания | значок динамика (не «pause»); повтор перезапускает фразу; disabled только во время записи голоса |
| 3 | listen_choose, listen_build_dictation, context_gap_grammar, phrase_builder | `…/showcase_run/<family>` (либо эпизод 8: Уроки → Глава 1 → dev-замок → Проверка главы → «Начать всё равно») | по 2 нажатия | как выше; уже подтверждено на коде до 72f72a94e — подтвердить на новом |
| 4 | свернул → развернул | в любом режиме | нажать, `adb -s emulator-5554 shell input keyevent KEYCODE_HOME`, подождать 3 с, `adb shell monkey -p app.phraseman -c android.intent.category.LAUNCHER 1`, нажать динамик | звук снова есть (`speak:enter`, `done`) |
| 5 | длинная фраза | режим с длинной фразой (теория: `phraseman://dev_learning_v2_theory?lesson=1&session=1&theme=marine`, пример `She is upstairs.`; или `I am not hungry. I want to read.`) | нажать, считать время | `phase:"done"` через 1,5–3 с, а не через ~0,5 с (не обрывается) |
| 6 | «карман слов», медленное воспроизведение | в занятии: тап по слову (карман) / значок «медленно» | по 1 нажатию | то же логом; значок динамика |

Критерии: ✔ иконка = динамик, ✔ звук по логу, ✔ повтор перезапускает, ✔ после сворачивания звук есть, ✔ фраза не обрывается. Отчёт координатору по каждому режиму: «ок / не ок + цитата лога».

## 2. «Все ошибки → Очистить» (2 минуты)
Нужны ошибки в данных: `phraseman://dev_state?...` с фикстурой ошибок (`dev_mistakes_seed`; параметры взять из `app/dev_state_fixtures.ts`), либо пройти задание неверно в эпизоде. Затем Главная → «Мои ошибки» → «Все ошибки» → меню «⋯» → «Очистить все ошибки»: (1) подтверждение; (2) после подтверждения список пуст и тост «Вернуть»; (3) тап «Вернуть» → ошибки на месте. Снимки каждого шага (r3/err_1…4.png). Не нажимать «Очистить» повторно после тоста.

## 3. Пересъёмка Главной и Диалогов (3 минуты)
Сначала один раз: `phraseman://dev_state?theme=marine&level=1` (Максимум).
Главная (`dev_home_scene_preview`), по 8 с на кадр, тёмная и светлая:
- `…?state=streak_risk&theme=marine&appearance=dark` и `=light` — «До полуночи 2 ч 20 мин» разрывается между фразой и временем; чипы шапки в одну строку; огонёк без «Сегодня ещё нет» (после 6fdcd15dd чип «Серия» + пустой/зажжённый огонёк);
- `state=continue`, `state=newbie`, `state=day_done`, `state=offline` — те же проверки; герой на 36 dp ниже шапки;
- на ширине 411 dp (эмулятор) и 360 dp: `adb -s emulator-5554 shell wm size 1080x2400` (411) → `wm size 960x2133` (≈360 dp); вернуть `wm size reset`.
Диалоги (`dev_dialogs_scene_preview`): `state=first`, `state=day_done`, тёмная и светлая — герой не заходит на заголовок.
Каждый снимок → `r3/<экран>_<состояние>_<тема>_<dp>.png`; склейки макет | эмулятор (`shot_phone2.cjs` + `side.py`).

## 4. Светлый проход (если хватит времени, 2 минуты)
Главная (3–4 героя), Диалоги (first, day_done), «Сегодня» (`dev_today_scene_preview?state=day&theme=light`), Пик (`dev_spire_scene_preview?state=day&theme=marine&appearance=light`) + одна не-marine тема (`theme=twilight` / «Сумерки») для сравнения с эталоном.

## 5. Завершение
`adb -s emulator-5554 emu kill`; `bash /c/Temp/claude/emu_lock.sh release`; отчёт: что совпало / что нет / кому чинить.

## Если эмулятор погас (сторож)
Не снижать порог; записать из `C:/Temp/claude/sverka_ram_guard.log` строки перед гашением (свободно, топ процессов) и сообщить координатору; продолжить с места по таблице.
