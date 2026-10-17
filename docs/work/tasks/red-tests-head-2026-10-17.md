# Task packet: красные node-сторожа на дереве 17.10 (прогон `node --test tests/*.test.mjs tests/*.test.cjs`)

Governance-ID: TG-CE4B226D513A
Governance-ID: TG-45F62AB902EF
Governance-ID: TG-AD29CBF7A293
Status: Planned
Owner: сессия «2 · ДИЗАЙН» (список), чинят зоны владельцев
Related epic/enabler: R115

## Outcome
Список тестов, красных при прогоне 17.10 (~19:55, дерево с чужими незакоммиченными правками): 1302 теста, 1232 зелёных, 69 красных в 40 файлах. Мои изменения новых красных не добавляют: на снимок HEAD (git archive app components constants hooks config tests) применил только мои файлы — набор падающих тот же (48 из них падают и на чистом снимке, остальные — из-за чужих правок или отсутствующих в снимке каталогов). Часть красных сторожей — устаревшие хэши/слепки (например `survey_unavailable`: хэш SurveySheetModal.tsx расходится уже на HEAD; `settings_notifications`: хэш persistPrefs), часть — реальные расхождения (`privacy_settings`: чужая правка добавила ThemedArt без заглушки в сторожe; Home: сторожа notepad-арта ищут `<Image source={art}>`, карточка давно на ThemedArtLayers).

## Scope
In scope: список файлов и названий. Out of scope: правки тестов (делают владельцы зон: Макеты — паритет/макеты/эталоны/kit; Темы — ratchet цветов/типографики/обводок; Переводчик — i18n/«ты»; Ядро/Сайт — релизные гейты Learning V2).

## Architecture
No architecture change: документ-список. Полный лог прогона: `C:\Temp\claude\c1\big.log` (вне репозитория, живёт до очистки временной папки); перезапуск одного файла: `node --test tests/<файл>`.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Contain: каждая красная строка — чей-то долг; чинить пересчётом слепка только при подтверждённом намеренном изменении, не ослаблять проверку.

## Verification
`node --test tests/*.test.mjs tests/*.test.cjs` до и после; цель — число красных не растёт.

## Rollback
Откат документа.

## Красные сторожа: причина, чей файл, вердикт (прогон 17.10 ~21:00; ✅ — уже починено)

Вердикты: **устарел** — тест отстал от намеренной правки кода; **код** — сломан код; **заглушка** — в тесте нет заглушки нового импорта.

| # | Тест | Причина одной строкой | Чей | Вердикт |
|---|------|-----------------------|-----|---------|
| 1 | accent_text_on_light_card_contract | псевдоним токена заливки красит текст/значок — нужен accentText | Темы | код |
| 2 | achievement_modals_liquid_glass_source_contract | ожидание «непрозрачное досье без градиентов/hex» не выполнено | Темы/Достижения | устарел |
| 3 | action_toast_liquid_glass_source_contract | «toast surface uses translucent glass» — поверхность тоста стала другой | Темы | устарел |
| 4 | admin_message_modals_liquid_glass_source_contract | нет claimAndDismissGlobalBroadcastModal в слепке | Рассылки | устарел |
| 5 | cards_free_limit_variants_contract | регулярка `savedLimitReached = …` не находит строку (формула лимита переписана) | Карточки | устарел |
| 6 | feedback_rating_liquid_glass_source_contract | хэш защищённого `app/stable_id.ts` разошёлся | Ядро | устарел |
| 7 | flashcards_speaking_liquid_glass_source_contract | слепок deep-equal разошёлся | Карточки | устарел |
| 8 | flashcards_training_setup_liquid_glass_source_contract | слепок разметки (число 28, хэш) разошёлся | Карточки | устарел |
| 9 | friend_study_invite_liquid_glass | нет «одобренного текста» «Пять минут на английский?» | Друзья/Переводчик | устарел |
| 10 | home_last_lesson_notepad_asset_contract | искал `<Image source={art}>` — ✅ починен 121c28dd6 | Макеты/Дизайн | устарел ✅ |
| 11 | home_v2_feature_tiles_text_integrity_source_contract | искал contentFit="contain" — ✅ починен 516ca26fd | Макеты/Дизайн | устарел ✅ |
| 12 | home_v2_glass_coin_contract | нет testID home-hero-avatar-button (шапка Главной перестроена) | Макеты/Дизайн | устарел |
| 13 | home_v2_video_rail_contract | TypeError: render_cause_probe не в заглушках теста | Макеты/Дизайн | заглушка |
| 14 | i18n_design_zone_ratchet | скрипт scan_i18n_design_zone завершился с ошибкой (число текстов вне переводов растёт) | Переводчик | код |
| 15 | informal_address_ru_uk_guard | в ru/uk новые «вы/Нажмите» вне исключений | Переводчик | код |
| 16 | learning_v1_active_header_and_summary_contract | искал градиент без прозрачного слоя R69 — ✅ перепин 047099aa3 | Дизайн | устарел ✅ |
| 17 | learning_v2_mockup_readiness_evidence | нет файла content/learning-v2-course/pipeline/session_readiness.mjs | Курс V2 | код |
| 18 | learning_v2_mockup_session_quality | в макете нет встроенного JSON #session-audio-evidence | Курс V2/Макеты | устарел |
| 19 | learning_v2_release_parity_released_scope | число/состав выпущенных занятий не совпал (strict equal) | Курс V2 | устарел |
| 20 | learning_v2_release_parity_route | не нашёл `const qualityResult = validateReleaseQuality()` в скрипте | Курс V2 | устарел |
| 21 | manage_subscription_liquid_glass_source_contract | не было заглушки BackGlyph — ✅ 3b742cb2d | Дизайн | заглушка ✅ |
| 22 | manage_subscription_overlays_liquid_glass | то же + регулярка g.opaque… — ✅ | Дизайн | заглушка ✅ |
| 23 | mistake_list_detail_liquid_glass_source_contract | регулярка `g.opaque(Card\|Control\|Sheet)\|glassButtonFill(g)` не находит | Ошибки/Темы | устарел |
| 24 | moment_titles_font_cap_contract | слепок deep-equal разошёлся | Моменты | устарел |
| 25 | moments_dev_preview_release_guard | слепок deep-equal разошёлся | Моменты | устарел |
| 26 | privacy_settings_liquid_glass_source_contract | нет заглушек ThemedArt/privacyAiStateArt и значок 27 — ✅ 047099aa3 | Приватность/Дизайн | заглушка ✅ |
| 27 | release_precheck_learning_v2_failure_classification | не нашёл «ОТКАЗ: не прошло гейтов — 1» (текст релизного предпроверочного скрипта) | Курс V2/Сайт | устарел |
| 28 | render_daily_phrase_content_preview | strict equal на предпросмотре фразы дня | Фраза дня | устарел |
| 29 | review_prompt_bottom_sheet_source_contract | «rate/store actions must remain unchanged» — слепок | Отзывы | устарел |
| 30 | saved_packs_completion | strict equal в 3 случаях (завершение сохранённых паков) | Карточки | устарел |
| 31 | settings_notifications_liquid_glass | хэши persistPrefs/persistSchedule (откат на диск 15.10) — ✅ перепин 047099aa3 | Дизайн | устарел ✅ |
| 32 | shadow_style_no_container_borders | новые обводки: MomentDown.tsx, mode_feedback_v1.tsx | Моменты/Курс V2 | код |
| 33 | spire_design_layer_contract | ✅ уже зелёный (чужая правка) | Моменты | ✅ |
| 34 | store_release_gate_levers | в learning_v2_ceiling_committed_gate.mjs нет пропуска в стор-режиме | Сайт/Курс V2 | код |
| 35 | survey_unavailable_liquid_glass_source_contract | хэш SurveySheetModal.tsx (пин 12.10) — ✅ перепин 047099aa3 | Дизайн | устарел ✅ |
| 36 | theme_hardcoded_colors_ratchet | новые hex в ComboMomentLayer, LegacyBonusHero, моментах | Моменты/Темы | код |
| 37 | typography_two_sizes_ratchet | новые размеры текста вне 16/13: HomeV2FeatureTiles (2), SpireWeekMomentHost (1); моя метка этапа 12→13 — ✅ | Макеты/Моменты | код |
| 38 | update_modals_liquid_glass_source_contract | «failed store opening must restore the modal through the existing callback» | Обновления | устарел |
| 39 | v2_palette_theme_levels | strict equal в уровнях палитры тем | Темы | устарел |
| 40 | video_market_loader_error_contract | Transform failed: тест не собирает TS-исходник (синтаксис/путь) | Видео | код |

Мои правки новых красных не добавили; пересчёт «было 69 → стало N» — по `node --test tests/*.test.mjs tests/*.test.cjs` после коммитов владельцев.

Замечание: столбец «Чей» — по имени теста и зоне файла (предположение), «Вердикт» — по первой ошибке прогона; перед правкой проверь первую ошибку командой `node --test tests/<файл>`.

## Починено после первой версии таблицы (✅ — честная причина перепина в комментарии рядом с хэшем теста)

- №4 admin_message_modals: окно закрывается сразу, награда фоном (`closeGlobalBroadcastModalAndClaimInBackground`), сам `claimAndDismissGlobalBroadcastModal` вызывается из фонового запроса — тест ищет оба; поведение прежнее ✅
- №5 cards_free_limit_variants: лимит считается по языку набора (`savedCardsForPackLanguage`) — аудит кнопок Карточек; смысл (только Free, скрытые лимитом или счёт ≥ лимита) прежний ✅
- №7 flashcards_speaking: перепин трёх слепков (узлы 36, защищённые элементы, SpeakHoldButton/SpeakingPanel) — намеренные правки D194 (попытка голоса при РЕАЛЬНОМ старте записи), речи 15.10 (строгие слова, missingWords, язык микрофона), цифры остатка голоса ✅
- №8 flashcards_training_setup: перепин слепка (28) — единственная правка маршрута после пина: 719e4c771 (метка «последнее место» перед router.push); V2Kit — только вид (buttonFill, NavIcon) ✅
- №12 home_v2_glass_coin: сторож приведён к текущей разметке Главной (HomeV2Header/StoryAvatarSlot, стекло карточки с busy, ThemedArtLayers) — смысл «один ассет ранга монет, стекло, арт» сохранён ✅
- №13 home_v2_video_rail: уже зелёный (чужая правка заглушки) ✅
- №37 typography_two_sizes: мои нарушения (подпись этапа 12→13, плитки Главной 14/11→13/13) убраны ✅; остаётся SpireWeekMomentHost (Моменты)

## Раздача: владелец → номера тестов (по таблице выше)

| Владелец | Номера | Что делать |
|----------|--------|------------|
| Ядро | 6, 29, 38 | 6: хэш app/stable_id.ts; 29: слепок rate/store actions (отзывы); 38: «failed store opening must restore the modal» (окно обновления) |
| Темы | 1, 2, 3, 23, 39 | 1: псевдоним токена заливки красит текст → accentText; 2, 3: непрозрачный стеклянный вид достижений/тоста по-новому; 23: регулярка g.opaque…/glassButtonFill в списке ошибок; 39: уровни палитры тем |
| Вход | — | в этом прогоне красных нет |
| Сайт | 27, 34, 40 | 27: текст предпроверки «ОТКАЗ: не прошло гейтов — 1»; 34: в learning_v2_ceiling_committed_gate.mjs нет пропуска в стор-режиме; 40: video_market_loader — тест не собирает TS (Transform failed) |
| Моменты | 24, 25, 32, 36, 37 (SpireWeekMomentHost) | 24, 25: слепки кегля/dev-превью; 32: обводки в MomentDown.tsx и mode_feedback_v1.tsx; 36: hex в ComboMomentLayer, LegacyBonusHero, моментах |
| Макеты | 28, 18 | 28: render_daily_phrase_content_preview (strict equal на предпросмотре); 18: в макетах нет встроенного JSON #session-audio-evidence |
| V2 (курс и релиз) | 17, 19, 20, 30 | 17: нет content/learning-v2-course/pipeline/session_readiness.mjs; 19, 20: паритет релиза (состав выпущенных занятий, validateReleaseQuality); 30: saved_packs_completion — язык наборов (4 вместо 1) |
| Переводчик | 9, 14, 15 | 9: одобренный текст «Пять минут на английский?»; 14: scan_i18n_design_zone падает; 15: «вы/Нажмите» в ru/uk |

## Разбор 18.10 (Темы): два красных теста — не от TTL каталогов db44eece1

- **video_market_loader_error_contract** — устарел (заглушка): communityFirestore давно (fdab41c40) тянет `hub_lifecycle_probe` (импортирует react-native с Flow-синтаксисом) и `dev_cards_state`; в тесте не было заглушек этих импортов — падал на загрузке модуля (`Unexpected "typeof"`), а не на поведении кэша. После заглушек все 6 проверок зелёные: ошибка индекса без кэша отклоняется, пустая витрина легитимна, кэш того же языка живёт, чужой язык не отдаётся, forceRemote обходит кэш — поведение при TTL 24 ч не сломано.
- **saved_packs_completion** — устарел (заглушки), не связан с каталогом: 3 падения — (1) `filterCardsByPackLanguage(cards,'en')` вернул 4 вместо 1 в тесте загрузки сохранённых (контур хранения/язык, файлы db44eece1 их не трогал), (2) `TypeError: isDevPackDraftNone is not a function` — в заглушке `dev_cards_state` нет нового экспорта, (3) `ReferenceError: STUDY_SPEECH_LOCALE is not defined` — `extract(...)` для `inferExpoSpeechLanguage` не получил новую константу. Чинить владельцу зоны «Карточки»; поведение сохранения карточки (Optimistic UI) тестом не затронуто.

## Пересчёт 18.10 (Дизайн, 23:40): было 69 → 41 → 23 → **9** из 1310

Прогон: `node --test --test-concurrency=1 tests/*.test.mjs tests/*.test.cjs` на HEAD d554d8f51+ (лог вне репозитория `C:\Temp\claude\c1\node_full4.log`), 1310 проверок, 1300 зелёных, 9 красных. Закрыто за ночь: Ядро (6, 29, 38), Темы (1, 2, 3, 23, 39 и разбор 18.10), Моменты (24, 25, 36 и `spire_moments_v3_contract` — плитка Пика больше не тянет модуль моментов, d554d8f51), Переводчик (9, 14, 15), Сайт (27, 34, 40), `saved_packs_completion` (6912c1725 — заглушки, не баг), `flashcards_swipe_access_behavior` (1e47919fc).

Оставшиеся 9 — по владельцам (первая ошибка прогона; перед правкой проверь `node --test tests/<файл>`):

| Владелец | Тест | Что красное | Вердикт |
|---|---|---|---|
| Карточки / LABEL-FIT | cards_hub_large_font_contract | нет `lineHeight: lh(19)` — строки хаба после R109 / 893db7388 | устарел (перепин под новые строки) |
| Карточки / LABEL-FIT | flashcards_my_packs_review_p1_contract | нет регулярки `accessibilityLabel={t.count === '' ? t.title : …}` — у плитки добавлена единица (`t.unit`) | устарел (перепин) |
| Карточки | flashcards_deck_picker_liquid_glass_source_contract | хэш «до-правочных» контрактов DeckPickerSheet изменился | проверить: последняя правка файла — 05198c295 (14.10, цвет кнопок, №35); значок «назад» в нём не менялся. Хэш последнего return листа разошёлся → перепин с причиной, если правка намеренная |
| Макеты | cards_section_locked | изменён зафиксированный макет `cards-section-extra.js`: первым — 2ad48d298 (R109, слово владельца 17.10 «Цифры будут СПРАВА от иконки»), хэш не пересчитали; затем 4e71be616 (зазор 8 этой строки по коду 0b974b1d9) | ✅ перепин с причиной 18.10 (Макеты): иных изменений с 15.10 нет (SHA-256 на 4 ревизиях), слово владельца дописано в CARDS_LOCKED.md, хэш пересчитан штатным скриптом; 5/5 |
| Макеты / Фраза дня | render_daily_phrase_content_preview | strict equal на предпросмотре фразы дня (старый №28) | устарел |
| Темы | action_toast_liquid_glass_source_contract | `ActionToast.tsx` больше не содержит `glass.card` (7247ff99d) | устарел (перепин на новый токен) |
| Темы / Ошибки | mistake_list_detail_liquid_glass_source_contract | нет `g.opaqueCard/Control/Sheet` и `glassButtonFill(g)` в списке/детали ошибок | проверить код: нужна ли непрозрачная заливка |
| Курс V2 | shadow_style_no_container_borders | новая обводка `modules/learning-v2/modes/mode_feedback_v1.tsx` | код (убрать обводку или пометить «shadow-ok: причина») |
| Моменты | theme_hardcoded_colors_ratchet | 3 захардкоженных цвета в `components/legacy_bonus/LegacyBonusHero.tsx` | код (токены темы или «theme-exempt») |

Мои сироты закрыты: у Дизайна красных не осталось.

## Сайт 18.10 ~00:30: 9 → 4 (взяты строки, чьих владельцев этой ночью нет: Карточки, Ошибки, Фраза дня)

Метод: чинить причину, сторож не ослаблять; где тест просто отстал от одобренной правки — перепин под код с проверкой, что смысл
сторожа сохранён (а где можно — усилен).

| Тест | Почему был красным | Что сделано |
|---|---|---|
| cards_hub_large_font_contract | R109 (0b974b1d9) перенёс число плитки вправо от иконки: строка `lh(19)` ушла, появились `lh(28)` и `lh(30)`; масштабирование не сломано | список под текущую разметку + **новая** проверка: каждая строка `<Text … style=…>` хаба идёт через `lh()` (≥ 8 подписей) |
| flashcards_my_packs_review_p1_contract | 799956929 добавил единицу для скринридера (`t.unit`: «Из видео. наборов: 6») | регулярка с единицей; правило «неизвестное число не озвучивается» сохранено |
| flashcards_deck_picker_liquid_glass_source_contract | пин `b0e5…` не совпадал ни с одной закоммиченной версией DeckPickerSheet (05198c295~1 → fc19…, 05198c295 = HEAD → 367a…) — снят с незакоммиченной копии | перепин на 367a… ; diff 05198c295 в разметке — ровно две замены `opaqueControl → buttonFill` (как и сказано в комментарии пина) |
| mistake_list_detail_liquid_glass_source_contract | №35 (05198c295) заменил в списке `g.opaqueControl` на `g.buttonFill` | `g.buttonFill` принят как непрозрачный (#RRGGBB, ≥ 1,6:1 к фону, текст ≥ 4,6:1); **добавлен** запрет полупрозрачного `glassFill` |
| render_daily_phrase_content_preview | source-bank.json (es) обновлён 11.10 (146f889c2), REVIEW_PREVIEW.md не пересобран с 30.09 | превью пересобрано тем же рендером `scripts/render_daily_phrase_content_preview.mjs` (детерминированно, 176/176) |

Остались 4 — у владельцев, активных этой ночью или с решением владельца: `cards_section_locked` (Макеты, фиксация макета),
`action_toast_liquid_glass_source_contract` (Темы), `shadow_style_no_container_borders` (Курс V2, обводка в mode_feedback_v1),
`theme_hardcoded_colors_ratchet` (LegacyBonusHero у Моментов).
