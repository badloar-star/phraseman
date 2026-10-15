# Ц1 повтор на HEAD ≥ 5cfae3cd7 — emulator-5554, гость (после pm clear Сверки), 15.10 19:43–19:49

## (а) R70 — язык раздела ✅
| шаг | итог | кадр |
|---|---|---|
| Видео → пилюля → Español | «Испанский»; `[SECTION-LANG] video global→es, global=en` | a1_video_es.png |
| → вкладка Главная → вкладка Видео | ✅ **Professor Lingman (en)**; `video es→global reason=left_section_to=none pathname=/ tab=/(tabs)/home routeIsTab=true` | a2_home.png, a3_video_back.png |
| es → Плейлисты → плейлист → назад | ✅ остаётся «Испанский» | a4_playlist_es.png |
| es → Наборы → «+» | ✅ сразу «В моих наборах»; `[PACK-ADD] language pack=video_iwxOtAH84DQ packLanguage=es` | a5_es_pack_added.png |
🟡 «Мои наборы» в Карточках (язык en) после этого — «Наборов нет»: es-набор скрыт, ни пилюли языка, ни «показать все языки» на экране нет (b2_my_packs.png).

## (б) R60 — тренировка набора из видео ❌ окна режимов нет
| путь | журнал | экран | кадр |
|---|---|---|---|
| es-ролик → «Тренировать фразы ролика» | `[VIDEO-PACK-TRAIN] tap … cards=340 owned=true` (owned теперь верно) → `[TRAIN-INTENT] set` → **через 5,9 с** `consume` → `tap:train` → `early_tap:waiting` → `[NAV-PAINT] route=/flashcards ms=6855` → `resolved allowed waitedMs=6897` | 6 с — всё ещё экран ролика; 10 с — хаб без окна, «Мои наборы 0» (хаб en, набор es) | b1_train_from_video.png, b1b_…_6s.png, b1c_…_10s.png, b1_log.txt |
| «Мои наборы» (en) → ▶ | `set` → `autotrain-effect {train:1, deck:pack:video_cnrVN_uz7Sg}` → `consume ageMs=355` → `tap:train` → `resolved allowed 484 мс`, `[NAV-PAINT] /flashcards 530 мс` | хаб без окна режимов (3 с и 9 с) | b3_my_packs_en.png, b4_play_3s.png, b4_play_9s.png, b4_log.txt |
Строки `[TRAIN-INTENT] hub:sheet-state` в журнале **нет** ни разу: оба раза намерение забрано в `hub:autotrain-effect` (параметры дошли), а зонд sheet-state стоит только в ветке `useFocusEffect` (FlashcardsHubScreen.tsx:705).
⚡ Путь из ролика: хаб открылся за 6,9 с (NAV-PAINT 6855 мс) — тяжёлый набор 340 карточек?
🟡 Попутно: подпись набора из видео теперь «Английский · 500 карточек» (было «Автор сообщества»).
