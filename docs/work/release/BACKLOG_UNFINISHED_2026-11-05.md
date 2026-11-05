# Инвентарь незавершённых задач за 2 недели (с 22.10 по 05.11.2026)

Составил «8 · Моменты» по заданию координатора (05.11, ~05:55). Источники: `docs/work/OWNER_LOCKS.md`, `docs/work/release/*` (NIGHT_BACKLOG_2026-10-26, 2.0.4-plan, APP_WEIGHT_PLAN, NIGHT_RELEASE_PLAN, MORNING_REPORT_DRAFT, KNOWN_ISSUES_FINAL), `docs/work/OWNER_INBOX/DECISIONS`, `docs/work/tasks/*` (769 файлов за 14 дней), `git status`, пометки координатора.

**Как читать.** Статус «по документу» ≠ «по факту»: у большинства `docs/work/tasks/*` строка `Status: In progress` никто не обновлял, поэтому всё старше 3 дней помечено `[устарело?]` и требует сверки с git log у владельца. Пункты NIGHT_BACKLOG от 26.10 не сверялись с git: часть закрыта без отметки. `[дубль]` — то же самое записано в другом месте. Сверка с боем не делалась.

## A. Известные крупные пункты (список координатора)

| Задача | Владелец | Статус | Что блокирует | Где подробности |
|---|---|---|---|---|
| Рекорды этажей Пика (SpireFloorRecord, `spire_record_*`, `spire_achievement_client.ts`, `spire_floor_record_flag.ts`, правки `app/spire/*`) | Моменты / Ядро | осиротевшая работа в дереве, в 2.1.0 не идёт | макет PEAK-RECORD-V2 не принят владельцем; правки `SpireHomeScreen` (runtimeActive, pageScrollEnabled) не закоммичены; красные «Пик ≤ 400 строк» только из-за грязного дерева | OWNER_DECISIONS (строка про PEAK-RECORD-V2); `git status` |
| Аудио-WIP (`app/audio_session_coordinator.ts`, `modules/audio/audio_activity.ts`, `app/audio_mode_outcome_diagnostics.ts`) | автор неизвестен (Codex) | осиротел, НЕ коммитить | вызывающие и заглушки тестов не обновлены (`setManagedAudioMode` → `{outcome}`); красный `kimi_voice_capture_session_lifecycle` | KNOWN_ISSUES_2026-11-05 («Осиротевший WIP аудио») |
| Learning V2 скрыт (`LEARNING_V2_HIDDEN=true`, вход по кнопке при ≥1 эпизоде) | Learning V2 | заморожен решением владельца 04.11 | красные тесты V2-рантайма в дереве, 3135 словарей экзаменов без `en`, `PHRASEMAN_R1_HIDE_V2` не в `eas.json`, незакоммиченные правки соседей | KNOWN_ISSUES_FINAL §2; KNOWN_ISSUES_2026-11-05 («V2 заморожен») |
| Реферальная лесенка (`referral_ladder_enabled`) | Вход / Ядро | флаг выключен, UI-правки (`referral_ladder*.tsx`, `friends.tsx` `compactFriends`) осиротели | серверные правила и зеркало не выложены; макет вкладки «Друзья» не сверен; «любой урок» не учитывает прогресс es | KNOWN_ISSUES_2026-11-05 («Лесенка рефералов»); OWNER_DECISIONS (2897, 2924, 3040) |
| Облегчение приложения (96,6 МБ; Android .aab 122 МБ против 101 у 146) | Сайт (план) / Ядро / Learning V2 | план, не выполнен; приоритет №1 следующей обновы | 4 вопроса владельцу: скачивание контента после установки, какой артефакт считается «96,6 МБ», кто делает V2-часть, правка политики; замер холодного старта на слабом профиле | `APP_WEIGHT_PLAN_2026-11-05.md:144-150`; `2.0.4-plan` §7 |
| Переключение Пика на монеты (`rankBy=coins`, `promotionBonus` 100→1000) | Ядро (скрипт) / владелец | ждёт слова, «когда сборка в сторе» | включать ОДНОВРЕМЕННО обе настройки (`scripts/spire_release_switch.mjs`); «+1000» зашито в тексте тура монет; Пик B в проде включён (`PEAK_SCREEN_V2_ENABLED=true`) | `PEAK_B_SWITCH_ANALYSIS_2026-11-05.md`; `SERVER_DEPLOY_NIGHT_2026-11-05.md` |
| Ранговые гейты (`rank_gates_enabled`) и «Открытие разделов» (`section_openings_enabled`) | Вход / Дизайн / владелец (Пульт) | выключены по умолчанию в 2.1.0 | метка среза `RANK_GATES_NEW_USERS_SINCE_MS` (до неё «новых» нет и бонус +500 не выплатится); проверить явное значение флага в Пульте; E2E гейтов только с принудительным dev-флагом | `E2E_NEWBIE_STEPS_2026-11-05.md`; `docs/work/tasks/gates-off-default-2026-11-05.md` |
| Удаление аккаунта: зачистка отметок Сообщества (`pack_likes/adds/comments`, `contest_votes`) + вариант Б удаления | Ядро / Вход | код и тест в HEAD, функция НЕ выкачена | порядок: индексы → READY → функция; ключ Apple в Firebase; флаг `account_delete_variant_b_ui_enabled`; счётчики лайков не уменьшаются | `docs/work/tasks/account-delete-community-audit-2026-11-05.md`; NIGHT_BACKLOG:248-254 |
| Публикация политики конфиденциальности | владелец / Сайт | кандидат лежит в `privacy_candidate/`, не выложен | выбор редакции А или Б (§20), `npm run legal:sync`, `hosting:knowly-www` + `hosting:admin`, затем «на ревью» | `PRIVACY_POLICY_DELTA_2026-11-05.md`; MORNING_REPORT_DRAFT:42 |
| Сообщество на устройстве (плашка, лайки/комментарии в строках, сцена набора) | Сайт / Сверка | реализовано, E2E-сценарий написан, на устройстве полностью не пройден | прогон Сверки по `E2E_COMMUNITY_STEPS`; возвращённые после редизайна элементы (♥, «Создать набор», ▶, превью «Из видео», комментарии) | `E2E_COMMUNITY_STEPS_2026-11-05.md`; OWNER_DECISIONS:3066 |

## B. Из бэклога 26.10, плана 2.0.4 и решений владельца (сжато)

| Задача | Владелец | Статус | Что блокирует | Источник |
|---|---|---|---|---|
| Стоп-условие 2.0.4: закоммитить всё из сборок 147/148 (Сообщество, конкурс, админка, rules, functions) | Codex через владельца / Ядро | `[устарело?]` — 3927 путей на 28.10, 2.1.0 собирается с HEAD | сверить, что вошло в HEAD | 2.0.4-plan:26-43, :172 |
| Сервер: rules `community_plus_until_ms`, `paywall_funnel`, indexes, `communityMonth*`, истории (`storyPollVote`, `storyAnnouncementsGet`), `hosting:admin` | Ядро / Моменты (истории) / Сайт | частично выкладывается ночью; истории помечены «НЕ выложено» | слово владельца; сверить ночной деплой (`SERVER_DEPLOY_NIGHT`) | 2.0.4-plan:82-94 |
| Android: `eas submit` даёт 403 — `.aab` грузит владелец или права сервис-ключу в Play Console | владелец | ждёт | права ключа | 2.0.4-plan:114; NIGHT_BACKLOG:163 |
| Пакет выкладки `server-deploy-pack-2026-10-26.md` (12 функций + hosting) и ротация `EMAIL_UNSUBSCRIBE_*` | владелец / Ядро | ждёт кнопки | ротации нет в пакете | NIGHT_BACKLOG:223, :256 `[устарело?]` |
| Приоритеты при нехватке лимита: ошибки из Telegram (диалоги не закрываются, «Собери фразу» из мусорных слов, правило повышения в Пике), лаги Android, макеты Codex (пейволы, приветствия, хаб «Карточки») | Ядро / Дизайн / Макеты | открыто | очередь | OWNER_DECISIONS:3054 |
| Вернуть удалённое при редизайне Сообщества (♥, «Создать набор», ▶, превью «Из видео», комментарии) | Сайт | открыто | аудит `redesign-loss-audit-2026-11-04.md` | OWNER_DECISIONS:3066 |
| Бонус новичка +500 за первое занятие | Ядро / Дизайн | реализован (`() => true`), но молчит до метки среза | `RANK_GATES_NEW_USERS_SINCE_MS` | OWNER_DECISIONS:3059; ревью кода 05.11 |
| Пик: запас энергии 5 + бонус лиги (максимум 16), финализация | Ядро | выложено ночью по списку деплоя `[проверить факт]` | слово + кнопка | OWNER_DECISIONS:3066 |
| Темы за достижения: разбор истории премиум-сцен и иконок | Темы / Ревизор | открыто | проверка регрессии HEAD против боя | OWNER_DECISIONS:3044 |
| Сцена Главной «280 dp без героя» — перепинить сторожа; плитка Пика у премиум-тем без окраса | Дизайн / Темы | открыто | — | OWNER_DECISIONS:3058, :3063 |
| Сдвиг диалогов +1 (потолок 19): серверная часть | Ядро | отложено | следующая обнова | OWNER_DECISIONS:3062 |
| Квота CPU us-central1 (`maxScale` не трогать), доступ к Cloud Monitoring | Ядро | заблокировано | нет доступа | OWNER_DECISIONS:3065 |
| Экзамен главы v2: банки глав 1-3 урока 1, ТЗ `factory-exam-banks`; Q66 «Разбор ошибок»; сервер не знает результата | Learning V2 / Теория / Codex | открыто / ждёт решения | передача ТЗ; решение владельца; V2 заморожен | NIGHT_BACKLOG:30, :120, :190, :234 |
| Вопросы владельцу утра 26.10 (11 пунктов: Plus на узком телефоне, значок непрочитанного, тексты согласия ИИ, Founder Pass и др.) | владелец | `[устарело?]` — ответов в файлах нет | — | NIGHT_BACKLOG / owner-morning-2026-10-26.md:26-38 |
| Теория уроков 23-27 (нет сессии «Теория»), Q34, Q39, Q54 (ты/вы), Q55 | Теория / владелец | ждёт | нет ответов | NIGHT_BACKLOG:64, :109-115, :148-156 |
| 77 расхождений ты/вы в украинском переводе классики | Переводчик / Теория | ручная вычитка | автоправка не делалась | `classic_known_issues_ru_uk_2026_11_04.md` §1 |
| Голос PhraseMan: пачки строк, 66 файлов `i18n_design_zone`; подсказки курса уроков 3/8/9/10 на 7 языков | Переводчик | открыто | нет коммита | NIGHT_BACKLOG:45, :174, :255, :269, :301 |
| PARITY-GATE красный, переснять 84 кадра, settings-gap-014/-015/-026, гейт объявлений 29/432 | Сверка / Дизайн / Сайт | открыто | эмулятор, полный прогон ~1 ч | NIGHT_BACKLOG:52, :201; OWNER_DECISIONS:3024 |
| Паритет своих строк Тем: 66 строк на выбор владельца | Темы / владелец | ждёт | `parity-diff-review.html` | NIGHT_BACKLOG:215 |
| «Друзья» вместе (идеи 1,2,3,6,8) за `FRIENDS_TOGETHER_UI_ENABLED=false`; «Подарок энергии» (Q52); макет «Друзья» v2 | Моменты / владелец | ждёт ответов Q52 и макета | нет решения | NIGHT_BACKLOG:41, :59, :153 |
| Двойная подписка Android (Q8), выход/удаление «только успех» (Q24-26), 11 обращений и награды, жалобы №4/№5 | Вход / владелец | ждёт решения | нет «да» | NIGHT_BACKLOG:70-73, :119, :164, :214, :258 |
| Сайт: страница подарка на 7 языков (Q22), заявка Google OAuth (срок 12.01.2027), `legal/terms` Premium→Plus | Сайт / владелец | ждёт | вход в Google, ответ по Q22 | NIGHT_BACKLOG:86, :105, :137 |
| Единый конвейер уведомлений, характеры 12 персонажей, Crashlytics SIGABRT, `usersWriteRouter`, серверные триггеры ≈20 % чтений | Ядро | открыто | нет исполнителя/стека | NIGHT_BACKLOG:28, :43, :48, :50, :79, :107 |
| Жалобы владельца 29.10: перекос вкладок Пика `[SPIRE-TABS-SCROLL]`, наслоение заданий `[V2-STACK]`, счётчик темы `[DIALOG-THEME-PROGRESS]` | Дизайн / Моменты / Вход | открыто | журналы Сверки | OWNER_DECISIONS:3001 |
| Хозяйство: `admin_staff_*` (6 файлов), чужие правки `DialogueV2PlusTools.tsx` / `PlusMark.tsx`, `admin.zip`, `.claude/semaphore/stale.run.*`, `docs/work/release/nul`, временная папка 193 ГБ | координатор / владелец | ждёт решения о судьбе файлов | нужно решение | NIGHT_BACKLOG:42-48; `git status` |

## C. Задачи 03–05.11 (`docs/work/tasks`, статус «In progress», владелец по документу)

| Задача | Сессия | Что известно |
|---|---|---|
| android-lag-relief, first-run-risks, gates-off-default, home-idle-probe, learning-v2-freeze, newcomer-restore-fix, red-tests-paywall-referral, speak-mic-and-root-hooks, view-count-and-newcomer-audit | 5 · Вход | в основном `In progress`; `night-release-since-cut` готов к срезу метки; `ux-pleasantness-wave3` — код написан, нужен коммит и проверка Сверки на чистой установке |
| approved-welcome-b3 / welcome-b3-copy-review `[дубль?]`, catalog-133-parity, dev-spire-tour-preview, peak-screen-b-rail | 2 · Дизайн | `In progress`; правило FINAL_SIGNOFF: нет тура в coins-режиме → «Пик B отложен» (тур есть) |
| packs-rev8-catalog-port, mockup_transfer_matrix, signoff_table_commit, peak-screen-mockup | 3 · Макеты | `In progress` |
| classic-full-pass-apply, classic-gloss-overrides | 10 · Переводчик | `In progress` |
| core-classic-courses-embed | 1 · Ядро | `In progress` |
| paywall-c-language-access | Learning V2 | `In progress` |
| glass-switch, ux-round2, light-accent-baseline | 4 · Темы | `In progress` |
| home-review-hint, home-scene-safe-hunks, scene-stars-svg-groups, stats-focus-series, mistake-builder-solvable-and-spire-summit-text, night-strings-check | владелец не определён | `In progress` — сверить в git log |
| MORNING_REPORT_DRAFT:38-43 — проверка новичка по записке, TestFlight «Ready to Test», отправка на ревью App Store, загрузка в Google Play, выбор редакции политики, переключатели Пульта | владелец | не сделано (ждёт готовой сборки) |

## D. Незакоммиченная работа в дереве (кандидаты в сироты, 253 изменённых + 320 неотслеживаемых путей)

| Область | Файлы | Вероятный владелец |
|---|---|---|
| Пик / рекорды | `app/spire/spire_achievement_client.ts`, `spire_floor_record_flag.ts`, `components/spire/SpireFloorRecord.tsx`, `SpireRecordAttempt.tsx`, `spire_record_*`, `SpireAchievementUpgrade.tsx`, `assets/images/spire-achievements/`, правки `app/spire/*`, `SpireHomeScreen.tsx` | Моменты / Ядро |
| Завершение классики | `app/classic_completion_*.ts` | Ядро / Переводчик |
| Профильная карточка | `app/profile_card_showcase_store.ts`, `components/profile-card/*` | Дизайн / Темы |
| Достижения | `app/activity_achievement_sources.ts`, правки `app/achievement*.ts` | Макеты / Ядро |
| Аудио | `app/audio_mode_outcome_diagnostics.ts`, `audio_session_coordinator.ts`, `assets/audio/learning-v2/es-professor-v4-*`, `speaking_*` | Learning V2 / Ядро |
| Рефералы | `referral_ladder*.tsx`, `friends.tsx`, `REFERRAL-CLASSIC-OPTIONS.md` | Вход / Дизайн |
| Пейвол | `app/paywall_funnel.ts`, `paywall_purchase.ts`, `premium_theme_*` | Learning V2 / Вход |
| Learning V2 | ~25 файлов `app/learning_v2_*`, `LEARNING_V2_DISABLED.md` | Learning V2 |
| Истории / dev | `components/stories/templates/{frames_ladder,story_disc}.tsx`, `dev_home_scene_special_preview_fixtures.ts` | Дизайн |
| Мусор | `admin.zip`, `.claude/semaphore/stale.run.*`, `docs/work/archive/orphan-2026-10-19/…`, `docs/work/release/nul` | не задача: решить, удалять ли |

## E. Дубли и устаревшее (не делать повторно)

- `adminGrantAccess` (разбор до проверки прав) — закрыто 99637a1a6; флаг `learning_chapter_exam_v2_enabled=true` в DEFAULT_FLAGS — в OTA3 стоит `false` (NIGHT_BACKLOG:14, :93, :233, :327).
- `account-restore-by-provider-identity` — отменён, владелец выбрал вариант Б; `NIGHT_RELEASE_PLAN` «критерии не выпускать» заменены лесенкой.
- Дубли: оптимизации бандла 10,3 МБ (NIGHT_BACKLOG:83, :169 = 2.0.4-plan §7); Android .aab/iOS на ревью (NIGHT_BACKLOG:69 = MORNING_REPORT_DRAFT:40-41); заявка Google OAuth (NIGHT_BACKLOG:137 = :149); `chapter-exam-v2-*` (≈11 файлов), `copy-before-after-*` (5), `account-delete-*` (6) — серии одной темы.
- `_revizor_backup_fulldeploy` (2 ГБ) — срок «~28.10» прошёл, нужно «да» владельца на удаление.
- `OWNER_LOCKS.md` — журнал замков, открытых задач в нём нет.

## F. Кому что передано (раздача простаивающим сессиям)

- **1 · Ядро:** выкладка функции удаления после READY индексов; переключение Пика (coins+1000 вместе); `PHRASEMAN_R1_HIDE_V2=1` в `eas.json`; `.codex-tmp-*` в `.easignore`; серверная часть сдвига диалогов; квота CPU/Cloud Monitoring; Crashlytics/`usersWriteRouter`; судьба `firestore.rules` WIP.
- **2 · Дизайн:** список преимуществ под липкой кнопкой пейвола (отступ/прокрутка); `paywall-fine` 13→15; цвета/кнопки `opaqueControl`; жалобы 29.10 (перекос вкладок Пика); сцена «280 dp».
- **3 · Макеты:** PEAK-RECORD-V2 (принят ли макет); `mockup_transfer_matrix`; хаб «Карточки»; макет «Друзья» v2.
- **4 · Темы:** контраст кнопок на светлом низу тёмной сцены; история премиум-сцен и иконок; паритет 66 строк; `light-accent-baseline`.
- **5 · Вход:** метка среза; значение `rank_gates_enabled` в Пульте; реферальная лесенка; вариант Б удаления и ключ Apple; Q8/Q24-26; ответы на 11 обращений.
- **6 · Сверка / 7 · Эмулятор:** PARITY-GATE и 84 кадра; гейт объявлений 29/432; E2E по сценариям (Peak B, Community, Newbie, Classic); кадр скелетона пейвола; id dark ×1,3.
- **9 · Сайт:** публикация политики; страница подарка (Q22); Google OAuth; возврат элементов Сообщества; плашка «Сообщество».
- **10 · Переводчик:** 77 ты/вы в uk; пачки голоса PhraseMan; подсказки уроков 3/8/9/10; 66 файлов `i18n_design_zone`.
- **11 · Ревизор:** итоговый прогон на финальном HEAD; красные тесты после коммитов соседей; список сирот в дереве.
- **12 · Теория:** уроки 23-27, Q34/Q39/Q54/Q55.
- **Learning V2:** коммит своих незакоммиченных правок; `generated_release`; банки экзамена; пейвол-доступ языков.
  - **ОТКЛОНЕНО (вердикт координатора 05.11):** слой 02.11 «V2 отключён у всех» (~25 файлов `app/learning_v2_*`, `docs/v2/LEARNING_V2_DISABLED.md`, 7 тестов `learning_v2_full_off_*`) противоречит решению владельца 04.11 (V2 виден тем, у кого ≥1 пройденное занятие). Не коммитится и не удаляется из дерева; сохранён патчем `docs/work/patches/learning_v2_full_off_2026-11-02.patch`.
  - **Закрыто:** paywall-c-language-access (9a819e28b). Аудио-WIP «исход смены режима» доведён (тесты зелёные); в сборку 150 — только после зелёного Ревизора и E2E на эмуляторе.
- **8 · Моменты (я):** рекорды этажей (ждут макета), «Друзья вместе» (ждут Q52), ошибки админки по Пику/Сообществу/Моментам (ждём `ADMIN_ERRORS_2026-11-05.md` от Ядра).
- **Владелец:** все пункты «ждёт решения» в разделах A-B (политика А/Б, права Android-ключа, ответы на Q-вопросы, судьба сирот).
