# Хендовер: сессия «8 · Моменты» (26.10, лимит недели 95% — работа передаётся Codex)

Для агента без контекста. Репозиторий `C:\appsprojects\phraseman`, работа прямо в рабочей ветке, без веток и worktree.
Коммит — только свои пути через `bash scripts/safe_commit.sh -m <msg> --wait-window --expect путь=+N/-M … -- пути`
(rc 5/7 — повторить; новые файлы сначала `git add -N`; чужие строки в общем файле — через `--patch`).
Тяжёлые команды (jest, tsc) — через `bash .claude/semaphore/slot.sh run --wait=600 "зачем" -- <команда>`; два сторожа банков экзамена —
без слота: `npx jest tests/owner_locks_exam_episode_words_2026_10_25.test.ts tests/learning_v2_chapter_exam_v2_banks_rules.test.ts --runInBand`.

## Сделано (хэши)

**Пик открывается в последнем известном состоянии** (владелец 26.10 «Пик всегда прогружен») — коммит cb6cece7e «fix(spire): Peak opens in its last
known state…» (хэш — в `git log -1 -- app/spire/spire_load_trace.ts`):
- `app/spire/use_spire_game.ts` — `ids` и `roomLoad` стартуют из памяти процесса (`spirePeekFirstFrameIds`, `spirePeekFirstFrameRoomLoad`);
  асинхронный uid не пересоздаёт объект, сеть не запускается второй раз;
- `app/spire/spire_load_trace.ts` — эти два хелпера, строка `[SPIRE-LOAD] first_frame` (источник ids/config/week/room, reads=0),
  прогрев своей недели на Главной вместе с комнатой (`week:warm`);
- `components/spire/SpireHomeScreen.tsx:272` — без конфига и кэша — скелет под потолком 2,5 с, а не «0» и «—»;
- `components/moments/moment_coin_prewarm.ts` — expo-image лениво, сбой прогрева не роняет экран;
- тест `tests/spire_first_frame_cache_2026_10_26.test.ts`.

**Банки экзамена глав v2, уроки 12–15 (28 глав)**: e3e8a8a8a (12), 27fd223a8 (13), 8bc250c1b (14), 721648d7c (15), вопросы 14/гл.2 —
fa0b8097c, подключение `registry_l12_l15` — fa6de2cac, возврат вариантов с «a» — 2a7e8b1ab. Читабельно: `docs/work/exam-banks/l12..l15.md`.
Генератор и спецификации (вне репо): `C:\Temp\claude\m8msg\exam_gen.py`, `spec_l12..15.py`.

**Ночь 26.10 (Моменты)** — сводка владельцу `docs/work/moments-night-summary-2026-10-26.md`; ключевые: c71d37063 (сторож ворот Пика
по дереву TS), 031f122f8 (Последний шанс — листья, повышение без пустой перерисовки), 100e1c9bb (конфетти заранее), 9a0c461e1 (полоса
топ-5 по настоящей высоте строки), c2fd96c6e (тест кольца Plus по замку владельца 25.10).

## НЕ доделано

1. **Пик на устройстве не проверен.** Что сделать: открыть Пик на эмуляторе после захода на Главную; в консоли Metro найти
   `[SPIRE-LOAD] first_frame` — ожидаемо `room:"memory"`, `ids:"memory"`, `week:"memory"`, `reads:0`; на экране сразу этаж, ступень,
   подиум и активная «Играть». Совсем первый вход (без кэша) — скелет ≤ 2,5 с. Если `ids:"none"` — stableId ещё не в памяти на входе:
   прогреть `getStableId()` в `runAfterHomeFirstFrame` в `app/(tabs)/home.tsx:1380` рядом с `spire_room_warm`.
2. **Варианты с ’s / needn't / mustn't в уроках 12–15** — сторож починен (0ff4b5a25). Из уроков 12–15 такие варианты НЕ убирались
   (их не было) — делать нечего, проверено по `C:\Temp\claude\m8msg\restore_alts.txt`.
3. **№8 из аудита скорости Моментов** (`docs/work/moments-perf-2026-10-25.md`, строка 34): рубежи серии — память «показанных» вместо
   чтения AsyncStorage и предзагрузка чанка. Отложено координатором до после OTA (чужой `app/lesson_complete.tsx`, риск двойного показа).
4. **Вопросы владельцу** (не трогать до ответа): кольцо Plus в карточке этажа под башней (`components/spire/SpireFloorInfo.tsx:88`);
   вид входа «согласие» в Диалогах (consent_gate).

## Незакоммиченные файлы

Своих — нет (после коммита Пика). В рабочей копии лежат чужие правки (уроки 8–9 банков, реестры 20–23 и 27–30, строки уроков 4–7
в `docs/work/exam-banks/PROGRESS.md`) — не трогать.

## Красные тесты

`tests/spire_optimistic_ui_r1.test.ts` — починен в коммите Пика (мок `stable_id` получил `peekStableId`, вызов недели в журнале
первого кадра защищён). `tests/spire_rise_queue_p17.test.tsx` — падал с 26.10 утра из-за статического импорта expo-image
(моя a5d3a3f3e), починен там же. Прогон тестов Пика: 594/594.

## Риски

- Первый кадр берёт комнату из памяти: если кэш недели устарел (другая неделя) — `peekSpireRoom` его отбрасывает, будет скелет, затем сеть.
- Скелет при `config === null` держится до потолка 2,5 с (`use_spire_room_ceiling`); дальше — прежняя причина блокировки «Играть».
- Firestore: новых чтений нет — только память и AsyncStorage; сеть освежает как раньше (кэш 6 ч, повтор при возврате).
