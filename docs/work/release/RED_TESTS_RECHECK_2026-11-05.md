# Перепроверка RED_TESTS (снимок 94dd47ceb) на текущем дереве — 05.11.2026

Проверял Диспетчер (13). Источник: `docs/work/release/RED_TESTS_2026-11-05_HEAD94dd47ceb.md` (311fdf6f2): 237 файлов в корне и 52 в functions.
Прогон: HEAD ~823754bef, рабочее дерево (worktree запрещён), `jest --maxWorkers=2` порциями по 40. В functions — `--watchman=false`. Файл `tests/zz_button_measure.test.ts` удалён в дереве (D), не гонялся.

## Итог
| | корень | functions |
|---|---|---|
| Было красных | 237 | 52 |
| **(а) уже зелёные** | **153** (+1 удалён) | **12** |
| (б) вероятно из-за чужого WIP | 25 | 1 |
| **(в) настоящие красные на HEAD** | **58** | **39** |

Как определялся WIP (б): тест импортирует или читает по пути файл с чужими незакоммиченными правками (`git status`, 186 путей). Это повод проверить у автора WIP, а не доказательство: тест мог быть красным и до WIP.
Как определялся владелец: все коммиты подписаны «Claude», поэтому зона берётся по последнему коммиту в тесте (сообщение коммита). Колонка «зона» — эвристика для раздачи.

По зонам (в), корень: Дизайн / сторожа 17 · Learning V2 / снимки 9 · Карточки / Наборы 7 · Ядро (Пик) 6 · Классика / Переводчик 5 · Главная / Сцены 4 · Оплата 4 · Друзья / Диалоги 3 · — 3.
По зонам (в), functions: Learning V2 / снимки 28 · Ядро (сервер) 5 · — 2 · Друзья / Диалоги 1 · Админка 1 · Дизайн / сторожа 1 · Оплата 1.

## (в) Настоящие красные — корень (58)
| тест | зона | последний коммит теста | первое падение |
|---|---|---|---|
| tests/flashcards_speaking_quota_unavailable_behavior.test.ts | Дизайн / сторожа | 29128ef22 feat(nav): Back wave 12 — eight Practice screens on the shar | unavailable quota is retryable with the same receipt and never double-consumes :: TypeError: Cannot read properties of u |
| tests/flashcards_training_target_language_behavior.test.ts | Дизайн / сторожа | 29128ef22 feat(nav): Back wave 12 — eight Practice screens on the shar |  :: TypeError: Cannot read properties of undefined (reading 'OS') |
| tests/flashcards_recall_pending_start_behavior.test.ts | Дизайн / сторожа | 29128ef22 feat(nav): Back wave 12 — eight Practice screens on the shar |  :: TypeError: Cannot read properties of undefined (reading 'OS') |
| tests/classic_theory_drills_contract.test.ts | Классика / Переводчик | 537e3d084 feat(classic): новый формат теории «как для ребёнка» (plain: | it: every drill has one plain instruction, first drill of a section has a sample, no technical blocks :: - Expected - 1 |
| tests/dialogs_chain7_fixes_contract.test.ts | Друзья / Диалоги | 6765d7bc5 feat(dialogs): перенос хаба Диалогов по макету v4 (владелец  | заливка плитки, значок, подписи и значок Plus — токены dialogsHubTokens, без hex и без обводок :: Expected substring: "b |
| tests/cards_pack_opt_ui_gaps_contract.test.ts | Карточки / Наборы | 6cbdab013 fix(cards): карточки набора — замок на удаление, сообщения п | «Добавить себе»: лайк не обгоняет запись, откат добавления не отменяется чужим действием :: Expected substring: "[OPT-UI |
| tests/audio_player_arbiter_guard.test.ts | Дизайн / сторожа | e2137389a test: красные тесты зон Learning V2 и звука актуализированы  | allowlist не устаревает: каждая запись реально без арбитра и с непустой причиной :: Received: undefined |
| tests/flashcards_entry_fail_open_contract.test.ts | Ядро (Пик) | d3780d189 test(speaking): сторож «Устно» — законные сдвиги эталонов (л | локальный старт объявлен ДО защищённого блока, иначе catch его не увидит :: Expected pattern: /let swipeLocalStart[\s\S] |
| tests/community_root_tabs.test.tsx | Главная / Сцены | 23d50f571 test(home): охранные тесты под ранговые гейты — мок use_rank |  :: TypeError: Cannot read properties of undefined (reading 'OS') |
| tests/dev_spire_rank_by.test.ts | Ядро (Пик) | b6b6c613d feat(spire): D190 клиент — «Все участники» в режиме монет де | стор-заглушка: подмены нет; хук игры берёт подмену поверх конфига :: Expected pattern: /const rankBy: SpireRankBy = devR |
| tests/app_messages_read_persistence_ui_contract.test.ts | Друзья / Диалоги | d7f171eef perf(inbox): открытая шторка сообщений читает сеть не чаще р | keeps unread dots outside the text flow so inbox rows stay centered :: Expected substring: "{message.unread ? <View poin |
| tests/classic_data_no_english_source_guard.test.ts | Ядро (Пик) | be9d586e0 test(release): сторожа живого Пика B и данных курсов без анг | es / theory.json :: - Expected - 1 |
| tests/button_fill_sweep_guard.test.ts | Дизайн / сторожа | c0ab59ae4 test(buttons): известное расхождение 7 кнопок на opaqueContr | число кнопок с opaqueControl в style не выше потолка :: > 54 \| if (all.length > CEILING) throw new Error(`кнопок с o |
| tests/coral_theme_removal_guard.test.ts | Дизайн / сторожа | af7d97b80 test(red-sweep): сторожа удалённых фич сняты, 18 сторожей по | resolves any stored theme through the whitelist with a graphite fallback :: Expected pattern: /export function resolveLi |
| tests/flashcards_rev8_catalog_contract.test.ts | Карточки / Наборы | b1c17565a feat(cards): списки наборов rev8 — компактные строки «Из вид | uses one shared compact row in all catalog surfaces :: Expected substring: "duration={duration}" |
| tests/dev_dialog_feedback_fixture.test.ts | Друзья / Диалоги | 337e0e9be feat(dev): dev_dialog_feedback=sent — карточка отзыва итога  | карточка отзыва открывается «отправленной» только для диалога и ничего не отправляет сама :: Expected substring: "if (st |
| tests/english_ui_enable_preflight.test.ts | Классика / Переводчик | 97f63a0bd test(i18n): предполётка включения английского интерфейса (па | there are ZERO language dictionaries without an English key (baseline and live scan) :: undefined |
| tests/cards_set_header_safe_area_contract.test.ts | Карточки / Наборы | 0f2b1b5b0 fix(cards): шапка экрана набора не уходит под строку состоян | нет родного SafeAreaView, корень берёт отступы из стабильных insets :: Expected substring: "paddingTop: insets.top, padd |
| tests/android_clipping_crash_guard.test.ts | Learning V2 / снимки | ad0c7ed1d checkpoint: save workspace for mac handoff | keeps app-owned virtualized lists out of ReactClippingViewManager :: - Expected - 1 |
| tests/classic_lesson_topics_fresh.test.ts | Learning V2 / снимки | be7dd6d79 feat(classic): тема урока в списке и меню уроков fr/es/de/it | app/classic_lesson_topics.gen.ts matches theory.json (run: node scripts/gen_classic_lesson_topics.cjs) :: - Expected -  |
| tests/account_provision_lock_android_runtime_entrypoint.test.ts | Дизайн / сторожа | a91e96a31 test(account-v2): provision-lock — договор обезличенного отк | aggregate cleanup attempts package restore, Android restore, APK recheck, source check, and temp deletion independently  |
| tests/learning_v2_mode_feedback_lane.test.tsx | Дизайн / сторожа | 9544a228d test(env): заглушки react-native с Platform у двух тестов; d | scripted repeat i14 renders the shared authored feedback lane :: TypeError: Cannot read properties of undefined (reading |
| tests/learning_v2_scripted_repeat_player_lifecycle.test.tsx | Learning V2 / снимки | 055c8c934 fix(lesson): окно «Выйти из урока?» снято — «назад» сразу вы |  :: TypeError: (0 , course_local_progress_v1_1.learningV2LanguageScopedStorageKeyV1) is not a function |
| tests/learning_v2_session_intro_feedback_behavior.test.tsx | Карточки / Наборы | a82a3b220 feat: include current app updates and community contest in i | intro shows only concise error feedback after wrong answers and no analysis after a correct answer :: undefined |
| tests/lesson_exit_sheet_contract.test.tsx | Дизайн / сторожа | 078617ada test: lesson_exit_sheet и lesson_1_intro_screen под текущий  | lesson1 сохраняет ответы и место после каждого ответа и восстанавливает место при входе (условие снятия окна) :: Expecte |
| tests/modal_theme_hardcode_guard.test.ts | Дизайн / сторожа | 78499c31f fix(colors): rank window and locked-sheet scrim on theme tok | новых жёстких цветов в модалах нет: счёт по файлу не выше потолка :: - Expected - 1 |
| tests/lesson_words_training_queue_guard.test.ts | Оплата | 703287796 fix(learn): аудит R58 🟡 — замок двойного тапа на входах «Об | waits for stored progress before mounting vocabulary training :: Expected substring: "const [wordProgressReady, setWordP |
| tests/lessons_tabs_memory.test.ts | Дизайн / сторожа | 078617ada test: lesson_exit_sheet и lesson_1_intro_screen под текущий  | стартовая страница всегда Classic после решения владельца; журнал [LESSONS-TABS] сохраняет причину :: Expected substring |
| tests/mistake_practice_review_prepare.test.ts | — | 43b60a3c8 feat(mistakes): «Повторить исправленные» — экран и хранение  | экран: pool из маршрута, review в журнал, цена повтора в копилке :: Expected substring: "const firstCompletion = input.r |
| tests/lesson_first_try_counts.test.ts | Дизайн / сторожа | e2137389a test: красные тесты зон Learning V2 и звука актуализированы  | экран итога берёт счёт из модуля первых попыток; балл и звёзды — по итоговому прогрессу :: Expected substring: "setLesso |
| tests/light_accent_graphics_ratchet.test.ts | Дизайн / сторожа | 524ee6c6f test(theme): храповик на сырые accentBorder/accentText в app | в файле нет новых мест сверх базовой линии :: - Expected - 1 |
| tests/lesson_was_perfect_first_try.test.ts | Дизайн / сторожа | e2137389a test: красные тесты зон Learning V2 и звука актуализированы  | решение m09 строится из счёта первых попыток, а не из wasPerfect :: Expected pattern: /lessonFirstTryCountsFromProgress\ |
| tests/moments_perf_leaves_2026_10_26.test.ts | Главная / Сцены | 9a0c461e1 fix(moments): promotion top-5 zone uses the measured row hei | №7 конфетти: частицы ставятся заранее невидимыми (до залпа), на залпе только стартует прогресс; reduceMotion — без части |
| tests/lesson_menu_trace_contract.test.ts | Оплата | 6ddbd5f6d feat(plus): дополнительный язык классического курса — Plus д | обработчики старта: вход, ранние выходы с причиной, навигация :: Expected: 2 |
| tests/i18n_missing_en_fallback.test.ts | Классика / Переводчик | 1d0187b88 test(i18n): сторож незащищённых чтений словаря по языку без  | scan_direct_lang_index finds no new unguarded reads :: undefined |
| tests/hybrid_button_layout_contract.test.ts | Learning V2 / снимки | efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий | direct text buttons style the animated content layer explicitly :: - Expected - 1 |
| tests/paywall_purchase_failure_ui_contract.test.ts | Дизайн / сторожа | 2af8e107f docs(sverka): кадры и журналы R1 12.10 — evpart_13 | флаг purchaseInvoked ставится ВНУТРИ обёртки, прямо перед purchasePackage :: Expected: < -1 |
| tests/spire_position_moments_contract.test.tsx | Ядро (Пик) | 78ece6a39 fix(spire): единица в Пике — этаж на 9 языках: склонение/сок | итоговый кадр: «Ты в топ-5», «Ты» на 5-м месте, +10 монет, кнопки зовут колбэки :: undefined |
| tests/phrase_workshop_wiring_2026_10_25.test.ts | Классика / Переводчик | 99ea06049 fix(classic): никаких заглушек в курсах fr/es/de/it; теория  | никаких зачётов старого курса: разблокировка, ошибки, «последний урок», медали, аналитика уроков :: Expected substring:  |
| tests/spire_position_moments_triggers.test.ts | Ядро (Пик) | 939c1f2c5 fix(spire): place is measured in STEPS everywhere in the wee | тексты: ступени склоняются, монеты — как было :: Expected: "на 1 ступень" |
| tests/screen_back_content_below_contract.test.ts | Дизайн / сторожа | 99abc00dc feat(nav): True/False on one shared Back/close; mistake deta | экран с общей кнопкой резервирует под неё место :: - Expected - 1 |
| tests/test_runner_coverage_contract.test.ts | Learning V2 / снимки | 54308265a refactor(learning-v2): remove the dead recorded-audio tail ( | каждая запись testMatch без шаблона указывает на существующий файл :: - Expected - 1 |
| tests/paywall_purchase_activation_contract.test.ts | Оплата | 047082609 test(paywall): сторожа восстановления покупок под потолок ож | shared A/B/C purchase hook persists CustomerInfo metadata and emits activation :: Expected substring: "return Purchases. |
| tests/optimistic_ui_audit_r1_contract.test.ts | Карточки / Наборы | bbd479b74 fix(packs): #12 — комментарии к набору: «Отправить» и реакци | comment reactions, pins, deletes and hides roll back and tell the user :: Expected pattern: /togglePackCommentReaction\( |
| tests/paywall_c_native_render.test.tsx | Оплата | 32e96110a feat(paywall): нативный пейвол C — один путь рендера для все |  :: Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax |
| tests/owner_locks_announcements_2026_10_28.test.ts | Главная / Сцены | 5de36ea7e fix(stories): announcements captions — day-count verb agreem | гейт: results.json снят с текущего макета, порог = замок, 432 кадра, 0 расхождений, 0 пропусков, геометрия по testID ±2  |
| tests/pack_rows_likes_comments_visible.test.ts | Карточки / Наборы | 50591eb6a fix(packs): чип слов растёт при крупном шрифте (minHeight 38 | «Мои наборы»: круглая ▶ «Тренировать» в строке; «Из видео»: крупные карточки; Сообщество: «+» создать набор и лупа :: Ex |
| tests/v2done_top_fade_and_repeat.test.ts | Learning V2 / снимки | 58b094a3b fix(lesson-complete): 🟡 «Итог урока» — под заголовком тольк | подпись под «Урок пройден» — только тема урока, как в эталоне m10 (координатор 15.10); «Урок N» лишь запасной вариант бе |
| tests/today_scene_wiring_contract.test.ts | Главная / Сцены | 723c84038 test: актуализация устаревших сторожей-исходников под текущи | кнопка «назад» на сцене берёт цвет верха сцены — круг и значок по её яркости (4 · ТЕМЫ, back_on_scene) :: Expected subst |
| tests/source_guard_eol_normalized_contract.test.ts | Learning V2 / снимки | a2f943bde test/fix: разбор красных (без V2/gustav/Карточек) — раннер . | source guards that compare multiline text read files through normalizeEol/readSource :: - Expected - 1 |
| tests/scroll_inertia_contract.test.ts | — | 50eea79a4 feat: cut push cron reads, seal feedback collections, drop t | requires explicit sharp deceleration on every ordinary app scroll surface :: - Expected - 1 |
| tests/number_noun_pairs_guard.test.ts | Классика / Переводчик | 768a01af2 fix(i18n): согласование «+N скрыто» и системный проход по ск | в экранах R1 нет склейки «число + слово» вне помощника склонения (сканер) :: - Expected - 1 |
| tests/season_shared_modal.test.tsx | Learning V2 / снимки | 3a6cc6572 test(learning-v2): repin 7 more stale contracts - Spanish is | available exam uses shared sheet, preserves price, facts and each action :: undefined |
| tests/themed_art_guard.test.ts | Дизайн / сторожа | d189f9e10 chore(art): удалены мёртвые .glow.webp прежнего стиля (3 фай | в репозитории (assets/images/v2art) нет ни одного отвергнутого файла :: - Expected - 1 |
| tests/video_pack_owned_from_local_ids.test.ts | Карточки / Наборы | b09b57b42 fix(cards): аудит #14/#15 — набор ролика уже добавлен не пре | строки видео-наборов и экран ролика берут owned из локальных id, а не зашитое false :: Expected pattern: not /<Community |
| tests/native_intent_v2_session_link.test.ts | Learning V2 / снимки | a57a28c97 fix(v2): битая %-последовательность в ссылке на занятие не р | неканонический id → карта курса, а не «Сессия недоступна» :: Expected: "/learning-v2/course" |
| tests/spire_all_members_profile.test.tsx | Ядро (Пик) | a6361c04b fix: open profile cards from all Spire participants |  :: TypeError: Cannot read properties of undefined (reading 'create') |
| tests/progress_preservation_owner_lock_2026_11_04.test.ts | — | 3eaf064ad docs(locks): замок 04.11 — прогресс старого курса не пропада | число удалений ключей хранилища не выросло ни в одном файле и не появилось в новых :: - Expected - 1 |

## (б) Вероятно из-за чужого WIP — корень (25)
| тест | незакоммиченные файлы, которые он читает | последний коммит |
|---|---|---|
| tests/classic_courses_pack_2026_11_04.test.ts | modules/classic-courses/manifest.json | c9fc7b59b feat: словарь уроков 1–6 из слов-форм (по одному р |
| tests/admin_revenue_analytics_contract.test.ts | admin/v2/legacy.html, components/CleanOnboarding.tsx, components/paywall/PaywallPlusScreen.tsx | a75d8ee22 feat(admin): control panel switch for the «Не могу |
| tests/button_audit_design_fixes_contract.test.ts | app/flashcards/FlashcardsHubScreen.tsx | 99abc00dc feat(nav): True/False on one shared Back/close; mi |
| tests/friends_profiles_batch_long_ttl.test.ts | components/spire/SpireHomeScreen.tsx | 24619137c perf(friends): Firebase-экономия — профили друзей  |
| tests/daily_poll_card_contract.test.ts | app/(tabs)/friends.tsx | a882a1427 test(red): пейвол, достижимость кнопок, опрос дня, |
| tests/friends_ladder_empty_2026_10_29.test.tsx | app/(tabs)/friends.tsx | b9f898423 feat(friends): «Как это работает» — пять строк пра |
| tests/admin_legacy_detailed_analytics_contract.test.ts | admin/v2/legacy.html | 96c32bb97 checkpoint: снимок общего дерева по команде владел |
| tests/admin_video_pack_title_contract.test.ts | admin/v2/legacy.html | d7bde78f6 feat(admin): автоназвание наборов из видео — 2–3 с |
| tests/home_scene_special_wiring.test.ts | app/(tabs)/home.tsx, components/home/v2/scene/HomeScene.tsx | f7935cd1d fix(copy): Home special scenes in the PhraseMan vo |
| tests/home_survey_sheet_contract.test.ts | app/(tabs)/_layout.tsx, app/(tabs)/home.tsx | 99adcd778 feat(home): строка «Попробуй Plus бесплатно» в «Се |
| tests/home_poll_v2_contract.test.ts | admin/v2/legacy.html, app/(tabs)/home.tsx | 99adcd778 feat(home): строка «Попробуй Plus бесплатно» в «Се |
| tests/learning_v2_locale_gate.test.ts | app/(tabs)/home.tsx | 05cf3a61b feat(learning-v2): R92 — курс V2 только на языке и |
| tests/level_spin_star_callable_retired.test.ts | app/(tabs)/_layout.tsx, firestore.rules | 4d1c8004b test: Revisor's 05:00 full-run reds in the Core zo |
| tests/max_removed_contract.test.ts | functions/src/account_delete.ts, functions/src/index.ts | 996173bc8 chore(max): шаг 5 — админка без MAX; functions-adm |
| tests/learning_v2_system_tts_only.test.ts | app/(tabs)/_layout.tsx | 72f72a94e feat(learning-v2): только голос телефона — занятия |
| tests/home_first_frame_defer_2026_10_22.test.ts | app/(tabs)/_layout.tsx, components/home/v2/scene/HomeScene.tsx | 0d836a476 perf(home): theme glow spots and the scene hero mo |
| tests/spire_reject_rollback.test.ts | components/spire/SpireHomeScreen.tsx | 2f48406f2 test: ночная регрессия — красные зоны Дизайна: dev |
| tests/safe_top_one_canvas_contract.test.ts | app/(tabs)/_layout.tsx, components/home/v2/scene/HomeScene.tsx | 1e1613865 feat(scene): Home and Dialogs draw the approved sc |
| tests/scenes_edge_cases_2026_10_22.test.ts | components/home/v2/scene/HomeScene.tsx | c324cdb53 test(home): scenes edge cases follow the hero-fade |
| tests/scene_shadow_and_stars_contract.test.ts | components/home/v2/scene/HomeScene.tsx | d5e22b877 perf(scene): статичные звёзды SceneBackdrop — ≤5 P |
| tests/premium_theme_remote_packs.test.ts | components/home/v2/scene/HomeScene.tsx, firestore.rules | a50cfbf18 feat(themes): Codex premium themes package + 4-THE |
| tests/skeleton_geom_log.test.ts | app/(tabs)/friends.tsx | 21c0a936a feat(video,cards,dialogs,friends): журнал [SKELETO |
| tests/render_test_registry_contract.test.ts | jest.rntl.config.cjs | d4c10f643 test(guard): рендер-тест обязан быть в обоих места |
| tests/youtube_connect_once_contract.test.ts | admin/v2/legacy.html | 906b220c7 fix(admin-youtube): сверка канала по YouTube-id (л |
| tests/youtube_transcript_browser_only.test.ts | admin/v2/legacy.html | 2b2f5cacc feat(admin): расшифровка из YouTube без серверного |

## functions — (в) настоящие красные (39)
Пять файлов не компилируются (TS2741/TS2322: в типах появилось обязательное поле, например `en` в `learningOutcomeByLocale`, а фикстуры тестов старые). Это одна причина в Learning V2 content_factory.
| тест | тип | зона | последний коммит | первое падение |
|---|---|---|---|---|
| functions/src/content_factory/v2_canonical_generation_plan.test.ts |  | Learning V2 / снимки | 54308265a refactor(learning-v2): remove the dead recorded-audio tail ( | is not imported by the live second-queue callable path :: ● pure canonical V2 generation plan › is not importe |
| functions/src/learning_v2/firestore_progress_event_store.integration.test.ts |  | Learning V2 / снимки | 4792f3e59 checkpoint Arena MAX Learning V2 cards and Jarvis work | resolves the server-published session-set and rejects client slot substitution before writes :: > 105 \| thro |
| functions/src/content_factory/v2_required_session_publication.test.ts |  | Learning V2 / снимки | 4792f3e59 checkpoint Arena MAX Learning V2 cards and Jarvis work | publishes only the session-set pinned by the approved release/season/episode chain :: > 105 \| throw new Erro |
| functions/src/content_factory/v2_generator_owner_e2e_seam_v1.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | connects canonical plan, manual import, preview, synthetic confirmation and A→B→A repository rollback :: > 209 |
| functions/src/support_inbox_triage.test.ts |  | Ядро (сервер) | fb1c86ff5 fix(openai): migrate retiring text and image models | bulk archive terminalizes prepared mail, Telegram review, pending job and owner alert :: TypeError: Cannot rea |
| functions/src/user_ideas.test.ts |  | Learning V2 / снимки | 0217c4a21 chore(снимок): полный коммит рабочего дерева по приказу влад | refuses a non-admin caller :: - Expected - 1 |
| functions/src/content_factory/v2_course_released_session_adapter_v2.test.ts | TS-компиляция | Learning V2 / снимки | 68f4ef973 chore: consolidate all Mac-side work for handoff to Windows | (suite) :: src/content_factory/v2_course_released_session_adapter_v2.test.ts:153:5 - error TS2741: Property 'e |
| functions/src/content_factory/v2_unified_course_release_repository_v3.test.ts | TS-компиляция | Learning V2 / снимки | 68f4ef973 chore: consolidate all Mac-side work for handoff to Windows | (suite) :: src/content_factory/v2_unified_course_release_repository_v3.test.ts:66:5 - error TS2741: Property ' |
| functions/src/content_factory/v2_unified_course_release_v3.test.ts | TS-компиляция | Learning V2 / снимки | 68f4ef973 chore: consolidate all Mac-side work for handoff to Windows | (suite) :: src/content_factory/v2_unified_course_release_v3.test.ts:64:5 - error TS2741: Property 'en' is miss |
| functions/src/content_factory/v2_unified_course_release_v1.test.ts |  | — | 689a29414 fix(motion): кнопка «Объяснить» в тосте коуча больше не раст | binds all 32 owner episodes and every runtime projection into one canonical root :: > 209 \| throw new Error( |
| functions/src/content_factory/v2_unified_course_release_v2.test.ts |  | Learning V2 / снимки | 68f4ef973 chore: consolidate all Mac-side work for handoff to Windows | binds exactly 32 owner lessons and 1792 direct session coordinates :: > 154 \| throw new Error("learning_v2_c |
| functions/src/content_factory/v2_course_released_session_adapter_v3.test.ts | TS-компиляция | Learning V2 / снимки | 68f4ef973 chore: consolidate all Mac-side work for handoff to Windows | (suite) :: src/content_factory/v2_course_released_session_adapter_v3.test.ts:104:5 - error TS2322: Type '{ int |
| functions/src/content_factory/v2_unified_course_release_repository_v1.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | persists A and B, atomically rolls back to exact A bytes, and reads one active join :: > 209 \| throw new Err |
| functions/src/content_factory/v2_unified_course_release_repository_v2.test.ts |  | Learning V2 / снимки | 68f4ef973 chore: consolidate all Mac-side work for handoff to Windows | persists A and B, rolls back to exact A and cold-loads one active root :: > 154 \| throw new Error("learning_ |
| functions/src/content_factory/v2_e1_compilation_worker.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | compiles the queued job into an artifact, succeeds stages and replays idempotently :: > 178 \| throw new Er |
| functions/src/content_factory/v2_activity_released_session_callable_v1.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | requires Auth/App Check and returns only the checked learner package :: Expected: true |
| functions/src/content_factory/v2_episode_localization_release_index_v1.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | binds eight ordered locale indexes and all twelve distinct session generation inputs per locale :: Expected le |
| functions/src/learning_v2/activity_released_session_submission_callable_v2.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | rebinds identity, evaluates against active package+sidecar and stores settled economy :: Expected: true |
| functions/src/record_age_consent_snapshot.test.ts |  | — | 95eec1717 SAFETY: preserve main-worktree worktree before unified integ | uses strict App Check and canonical resolver options and is exported from index :: Expected pattern: /recordAg |
| functions/src/jarvis/learning_metrics.test.ts |  | Learning V2 / снимки | efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий | progress writer prepares metrics before spin reads and commits them only after all reads :: Expected: > 38055 |
| functions/src/content_factory/v2_unified_course_release_confirmation_readback_v1.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | reads all exact generations with bounded concurrency and returns authority-none preflight :: > 209 \| throw n |
| functions/src/jarvis/legacy_agent_rules_guard.test.ts |  | Learning V2 / снимки | e7eb7d316 chore: preserve complete project snapshot | the legacy admin catch-all still excludes every retired agent root :: Expected substring: "collection != 'agen |
| functions/src/content_factory/v2_episode_content_qa.test.ts |  | Learning V2 / снимки | 4792f3e59 checkpoint Arena MAX Learning V2 cards and Jarvis work | passes a well-formed compiled unit :: Expected: true |
| functions/src/dialogue_v2_opening_line.test.ts |  | Друзья / Диалоги | a1b97ba76 feat(dialogues-v2): первая реплика персонажа — content.openi | the provider transport puts the opening as the first assistant turn, before any learner text :: - Expected -  |
| functions/src/learning_v2/activity_released_session_completion_callable_v1.test.ts | TS-компиляция | Learning V2 / снимки | 68f4ef973 chore: consolidate all Mac-side work for handoff to Windows | (suite) :: src/learning_v2/activity_released_session_completion_callable_v1.test.ts:92:7 - error TS2322: Type  |
| functions/src/content_factory/v2_unified_course_release_activation_v1.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | binds all 32 exact owner confirmations without granting activation authority :: > 209 \| throw new Error(`v2_ |
| functions/src/content_factory/v2_content_compilation.test.ts |  | Learning V2 / снимки | 4792f3e59 checkpoint Arena MAX Learning V2 cards and Jarvis work | compiles only when the resolved profile body matches the pinned hash :: > 178 \| throw new Error(`episode_c |
| functions/src/content_factory/v2_course_active_catalog_callable_v1.test.ts |  | Learning V2 / снимки | 68f4ef973 chore: consolidate all Mac-side work for handoff to Windows | maps non-HTTP resolver errors to a generic unavailable response :: - Expected - 1 |
| functions/src/pm230_admin_callable_guard.test.ts |  | Админка | 9082014f7 test(security): PM-230 A2 — сторож формы firestore.rules и п | каждый admin*-эндпоинт проверяет права сам или через перечисленный обработчик :: - Expected - 1 |
| functions/src/content_factory/v2_activity_auxiliary_session_callable_v1.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | requires Auth and App Check outside an explicit demo emulator :: Expected: true |
| functions/src/dialogue_ai_language_source_contract.test.ts |  | Дизайн / сторожа | bf95cb1c9 test: сторожа под правила 2.0 (D97, D111, D121-D124), home — | validates review targets before identity, evidence, rate-limit, and provider work :: Expected: > 0 |
| functions/src/support_repository_context_artifact.test.ts |  | Learning V2 / снимки | 1c450880c chore(wip): restore complete Mac snapshot after referral rou | records the app release and an integrity hash over exactly emitted chunks :: Expected: "2.1.0" |
| functions/src/gift_access.test.ts |  | Оплата | f34bf2ed1 fix: reconcile paid Plus access across server gates | uses authenticated stable identity, App Check and no caller-owned identity or timestamps :: Expected substring |
| functions/src/resend_secret_contract.test.ts |  | Ядро (сервер) | db402696b release: подготовка к релизу 1.6.0 (build 104) | binds the secret to every deployed runtime that can send through Resend :: Expected substring: "secrets: [RESE |
| functions/src/jarvis/jarvis_money_writer_index_contract.test.ts |  | Ядро (сервер) | 33636dd55 feat(2.0): D136-D140 удаление квестов, коллекций, подарков и | Firestore has exact composites for the fail-closed money queries :: - Expected - 0 |
| functions/src/coin_exchange_wallet_reward.test.ts |  | Learning V2 / снимки | 4792f3e59 checkpoint Arena MAX Learning V2 cards and Jarvis work | is deterministic and fails closed on a conflicting protected envelope :: Expected substring: "coin_exchange_wa |
| functions/src/learning_v2_access_production_callable.test.ts |  | Ядро (сервер) | a36ad0450 feat(security): App Check запломбирован навсегда — решение в | keeps App Check and the production export wired :: Expected substring: "export { finalizeLearningV2AccessPurch |
| functions/src/arena_target_profile_path.test.ts |  | Ядро (сервер) | 6c02e4088 release: prepare 1.6.22 build 128 | (suite) ::  |
| functions/src/gift_perk_producers_contract.test.ts |  | Learning V2 / снимки | efe19ae9d chore: общий снимок PhraseMan 2.0 — работа нескольких сессий | keeps new authority callables in both selective deployment commands :: Received has value: undefined |

## functions — (б) вероятно из-за WIP (1)
- functions/src/pm229_server_silent_catch.test.ts ← functions/src/account_delete.ts
Незакоммиченные в functions: `index.ts`, `account_delete.ts`, `spire_*` и новые `spire_floor_record_*`, `paywall_receipt_attribution*`. Тесты, которые сверяют экспорт из `index.ts`, могут меняться вместе с ними.

## Добавлено координатором
- `tests/home_v2_video_rail_contract.test.cjs` (node --test): 6/7. Красный: «Home header renders stats left…» — `TypeError: Cannot read properties of undefined (reading 'useScaledTextStyles')`. Шапка `components/home/v2/HomeV2Header.tsx` начала звать `useScaledTextStyles` в df1ef506e (04.11, «fix(home-scene): безопасные хунки сцены…»), а стенд теста этот хук не подставляет. Владелец — **Главная / Сцены** (df1ef506e): добавить заглушку в стенд. Последний коммит теста — 9549b3d6e.
- `tests/spire_scene_contract.test.ts` и `tests/spire_single_scroll_owner_contract.test.ts`: оба теста сами незакоммичены. Это новый контракт шапки Сообщества (общая шапка поверх всех разделов, peakSceneTopHex, без useSpireSceneHeaderTint) внутри идущей переделки Пика с чужим WIP в SpireScene и SpireTower. Владелец — автор этих тестов (Ядро). Подробности отправлены координатору.
