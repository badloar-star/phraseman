# Ц1 итоговый повтор — HEAD c7b8e2fc0 (≥ 150e4ca7e, 8573d191d, 97640319f), emulator-5554, аккаунт №2, 15.10 19:05–19:14

## (г) Настройки — строки «Размер шрифта» нет ✅
g1_settings_top.png, g2_settings_mid.png: «Обучение» = Настройки обучения, Уведомления, Темы, Тактильный отклик.

## (а) R70 — локальный язык раздела
| шаг | итог | кадр |
|---|---|---|
| Видео → пилюля → Español | ✅ «Испанский», ролики испанские; `[SECTION-LANG] video global→es, global=en` | a1_video_es.png |
| → Главная → снова «Видео» | ❌ **осталось ES**, сброса нет | a2_home.png, a3_video_back.png |
| Карточки → «Сообщество» → пилюля → Español | ✅ «Язык наборов: Español», испанский набор; `cards global→es` | a6_cards_lang_sheet.png, a7_cards_catalog_es.png |
| «Мои наборы» внутри Карточек | пилюли нет, показан английский набор ролика | a8_my_packs_inside.png |
| уход из Карточек и возврат | ✅ «Язык наборов: English»; `cards es→global reason=left_section_to=video` | a10_catalog_back.png |
| Настройки | ✅ «Язык изучения: English» | a11_settings_en.png |

Журнал объясняет «Видео»: `[SECTION-LANG] video es→global reason=left_section_to=cards` — сброс Видео случается **только при входе в Карточки**, а уход на Главную (`/home`) трекер не видит. И Карточки сбросились с `left_section_to=video`, хотя я ушёл на Главную → вкладку «Видео». Вывод: `usePathname()` в app/(tabs)/_layout.tsx:818 не меняется при переключении вкладок (вкладки — пейджер одного маршрута), поэтому `trackSectionPathname` видит только push-экраны разделов.

## (б) R60 — тренировка набора из видео
| путь | журнал | экран | кадр |
|---|---|---|---|
| ролик → «Тренировать фразы ролика» | `[VIDEO-PACK-TRAIN] tap … cards=50 owned=false` → `[TRAIN-INTENT] set/consume deck=pack:video_OHxgJuazJO0 count=50` → `[FC-TRAIN-ENTRY] tap:train` → `early_tap:resolved allowed` | ❌ хаб Карточек **без окна режимов** | b1_after_train_from_video.png, b1_rn_log.txt |
| «Мои наборы» → ▶ | `[TRAIN-INTENT] set/consume` → `tap:train` → `resolved allowed (465 мс)` | ❌ то же — окна нет | b2_after_play_my_packs.png, b2_rn_log.txt |
🟡 `owned=false` в `[VIDEO-PACK-TRAIN]` при добавленном наборе (packId `video:OHx…` против `video_OHx…`).

## (в) R08/R71 — карта V2 и запуск занятия
| шаг | итог | кадр |
|---|---|---|
| «Обучение» → «Новые уроки» | ✅ **карта V2 открывается сразу** (R08 починен) | c1_v2_map.png |
| тап «Занятие 1» | ✅ окно занятия за **126 мс** (`[LEARNING-V2-PERF] tap→modal=126ms, material/audio prewarmed`) | c3_session_1s.png |
| «Начать» → первое задание | ✅ **~1 с** (`[NAV-PAINT] route=/learning-v2/session/… ms=981`; было 13 с) — «Новое слово · here» | c5_session_first_frame_2s.png |
🟡 На экране занятия видна плашка «DEV · К УСТНО» (только dev-сборка — проверить, что в стор-сборке её нет).

## (д) Пик — spire_packs после правил Storage (19:08), холодный старт 19:15
| шаг | журнал [SPIRE] pack | экран | кадр |
|---|---|---|---|
| язык обучения en → Сообщество → Пик | `нужен lang=en tier=0 week=2026-W42` → `скачиваем spire_packs/en/0/2026-W42.json` → **`сеть ok hash=sp1_Q76d… этажей=15 байт=1496336 за 1807мс`** | ✅ комната недели, башня, «Этаж 1», «Играть»; надписи «Задания этой недели ещё готовятся» нет | d1_spire_en.png |
| Настройки → язык изучения Español → Пик | `нужен lang=es …` → `скачиваем spire_packs/es/0/2026-W42.json` → **`сеть ok hash=sp1_wK0m… этажей=15 байт=1405892 за 1856мс`** | ✅ своя испанская комната (mint_owl, juno, salt_and_pine), башня, «Играть»; надписи нет | d2_settings_es.png, d3_spire_es.png |

403 больше нет: оба пакета пришли из сети. Язык обучения после проверки возвращён на English.
🟡 Пакет недели ~1,4–1,5 МБ и ~1,8 с на каждый язык — при смене языка скачивается заново (кэш на диске по языку есть, но первый раз — полная загрузка).
