# Хвост коммитов без ✅ Ревизора, 21–26.10 (приложение к NIGHT_BACKLOG_2026-10-26.md)

Источник: `git log --since=2026-10-21 -- . ':!docs'` минус хэши, записанные в ведомостях Ревизора (OTA_READY_LEDGER, revizor-status-2026-10-22, OTA_FLAG_SNAPSHOT, OTA_COMPAT_AUDIT, REVIZOR_VERDICT, сверка отсрочки) и вердикты вечера 25.10. Зона — по scope заголовка (автоматически; «назначить» — scope не распознан).

## А. После сборки 2.0.2 (009c40c97..HEAD) — едут в OTA

| Коммит | Когда | Зона | Заголовок |
|---|---|---|---|
| `a06701f33` | 25.10 20:16 | координатор: назначить | docs(dev-links): 16 scene states for Sverka - Home home-scene-001..011, Today today-scene-001..005 |
| `709872d53` | 25.10 20:09 | 4 · Темы | docs(themes): Settings, Cards and packs, Friends contrast across 174 theme combos |
| `da40bb689` | 25.10 20:05 | 4 · Темы | docs(themes): speaking panel remeasured with the sheet mTheme override |
| `84a97fbd5` | 25.10 20:00 | 4 · Темы | docs(themes): classic lesson contrast across 174 theme combos (static pair analysis) |
| `e78b3e32c` | 25.10 19:54 | 4 · Темы | docs(themes): home scene contrast reads colours from HOME_SCENE_INK (5c94a294c) - 0 violations |
| `efbcf6f17` | 25.10 19:52 | 4 · Темы | docs(themes): speaking panel and delete variant B (on code) contrast across 174 theme combos |
| `b5a22eebb` | 25.10 19:21 | 4 · Темы | docs(themes): census of colour literals outside theme tokens across app, components, modules |
| `13ea0d2ca` | 25.10 19:18 | координатор: назначить | docs(legal): privacy — "Where available in the app," before the immediate-deletion sentence until variant B ships (Revizor on 7868dd51c) |
| `ec8389176` | 25.10 19:16 | 10 · Переводчик | fix(copy): Home day scene and daily tasks in the PhraseMan voice, 9 languages |
| `771f2caf8` | 25.10 19:14 | координатор: назначить | chore(revizor): ota_final_check.sh — one-command final OTA check on the build hash (app tsc, flags vs snapshot baseline, runtime 2.0.2, dev strings, dist identity) |
| `14738071f` | 25.10 19:07 | Learning V2 | fix(learning-v2): chapter exam opens only for interface languages with course texts (ru/uk) |
| `939c1f2c5` | 25.10 19:03 | 8 · Моменты | fix(spire): place is measured in STEPS everywhere in the week room; coins only as the reward |
| `8bd8aea17` | 25.10 18:25 | 4 · Темы | docs(themes): home special scenes remeasured on the lightest art zone under text |
| `c843a230a` | 25.10 18:12 | 4 · Темы | docs(themes): paywall M header measured on the worst edge of its gradient |
| `55d8d4f9f` | 25.10 18:03 | 4 · Темы | docs(themes): contrast across 174 theme combos for paywall M context panels and account delete variant B |
| `e8fd151c5` | 25.10 16:18 | 10 · Переводчик | fix(i18n): paywall review — plus_server_refused translations follow the ru mockup line; phrase_workshop uk "вислів", tr "ifade" |
| `80b362457` | 25.10 16:17 | Learning V2 | feat(learning-v2): wire exam v2 banks for lesson 1 chapters 1 and 3 (owner approved); factory task for the rest |
| `644de3379` | 25.10 16:06 | 4 · Темы | docs(themes): Learning V2 session contrast audit in all themes; fixes measured [THEMES] |
| `c3c499de2` | 25.10 16:00 | Learning V2 | feat(learning-v2): exam v2 banks for lesson 1 chapters 1 and 3 (not wired) + owner reading file |
| `8a71d4c6b` | 25.10 15:48 | 1 · Ядро / 5 · Вход | fix(guards): as-any ratchet counts what goes into the commit (git index), not the working tree |
| `2e2ed45c4` | 25.10 15:46 | 4 · Темы | docs(themes): Season + regular Home and Cards + Dialogs contrast audits in all themes; fixes measured [THEMES] |
| `ccdbbc553` | 25.10 15:35 | 10 · Переводчик | fix(i18n-uk): "фраза" -> "вислів" in Phrase workshop title and home special scenes |
| `d7fc0074e` | 25.10 15:33 | Learning V2 | fix(learning-v2): exam cooldown lifted by topic review syncs to other devices |
| `300071e1d` | 25.10 15:32 | 10 · Переводчик | fix(i18n): Phrase workshop copy review — tr "İfade atölyesi", pl "nieco później", strings approved |
| `d71db87d3` | 25.10 15:31 | 8 · Моменты | fix(moments): gold frame without outline, streak toast as the reference, special scene kicker full white |
| `b00c6fe88` | 25.10 15:27 | 4 · Темы | docs(themes): Peak contrast audit in all themes - off-scene screens clean, scene text and my-row glass fail; fixes measured [THEMES] |
| `aa2bbfc3e` | 25.10 15:20 | 2 · Дизайн | feat(workshop): «Мастерская фраз» — подключение за флагом: кнопка у пройденного урока, экран старого урока на банке V2 без зачётов старого курса, итог, Plus-гейт (шаг 3) |
| `2dbf1ed8a` | 25.10 15:20 | 2 · Дизайн | feat(workshop): «Мастерская фраз» — флаг, модель состояния входа и адаптер банка в формат старого движка (шаг 2, за флагом, UI ещё нет) |
| `3e3414750` | 25.10 15:19 | Learning V2 | feat(learning-v2): локальный банк фраз урока — копится при показе «Сборки фразы» (основа режима после урока; владелец 25.10, координатор) |
| `6870fe4ab` | 25.10 15:11 | 4 · Темы | docs(themes): paywall Plus colour map on theme tokens ahead of mockups, contrast in all 174 theme combos [THEMES] |
| `89c8f67fe` | 25.10 15:08 | 2 · Дизайн | feat(dialogs): opening-line translations for scenario dialogs — 304 lines into 9 UI languages |
| `0025793f7` | 25.10 15:06 | 4 · Темы | docs(themes): exam v2 + phrase workshop colour map, special Home scenes contrast audit; measure scripts in scripts/ [THEMES] |
| `f68fbca38` | 25.10 14:43 | 2 · Дизайн | docs(design): Home scene redesign, five directions drawn from scratch on Amethyst (object, horizon, aurora, frosted glass, corona); recolour variants removed [THEMES] |
| `6836e1cc4` | 25.10 14:33 | координатор: назначить | docs(claude): Bash paths with forward slashes only (owner 25.10) |
| `be3c2a3f0` | 25.10 13:05 | координатор: назначить | docs(support): replies batch 25.10 — 20 drafts (16 refreshed to "fixed in 2.0.2, please update", 4 new), Plus via Telegram bot |
| `825894865` | 25.10 12:35 | 1 · Ядро / 5 · Вход | chore(boot): [BOOTSPLASH] native-splash log — system scheme, the native splash colour it implies (app.json), saved app appearance, mismatch |
| `5469199f0` | 25.10 12:19 | 1 · Ядро / 5 · Вход | fix(deploy): live-vs-HEAD check strips comments inside export { } — false STOP on supportInboxOnNewMail |
| `73c7afe54` | 25.10 12:09 | 4 · Темы | test(theme-motion): webgl flag guard checks the cloud list, not key order |
| `ba81e6a55` | 25.10 11:48 | координатор: назначить | docs(claude): owner rule — Plus purchase questions → Telegram bot |
| `cac5344d6` | 25.10 11:09 | координатор: назначить | docs(etalon): цвета текста вступления — утверждённый вариант «Максимум и подложка» в замке одобренных (владелец 25.10) |
| `4376512bf` | 25.10 09:28 | 1 · Ядро / 5 · Вход | fix(release): Learning V2 parity gate — scope ratchet floor (>= 1509 sessions, lessons l01–l27; a lesson dropped from catalog and all copies no longer passes) and TTS text completeness (every audio target needs one non-empty text, TTS_TEXT_MISSING blocks; 18311/18311 today) |

## Б. До сборки 2.0.2, код (кроме контента Learning V2 и документов) — уже в сборке 144

| Коммит | Когда | Зона | Заголовок |
|---|---|---|---|
| `b5678317d` | 25.10 09:00 | 2 · Дизайн | fix(home): the [TEXT-OUTSIDE] sheet guard resets by key on reopen; its test renders for real |
| `00350686d` | 25.10 08:51 | 8 · Моменты | fix(spire): трасса закрытия итога — вне components/spire/moments (блокер precheck spire_moments_v3_contract) |
| `95f999713` | 25.10 08:47 | координатор: назначить | fix(feedback): «Отправить» видимо активна/неактивна (0,4 → 1, 150 мс), [RATING-SUBMIT] идёт в logcat, dev-сброс seen=feedback — замечания Сверки к 3ef047d85 |
| `5c3cc8c0f` | 25.10 08:45 | 8 · Моменты | fix(spire): whole top on Peak — header layer and scene draw ONE backdrop from the screen top; no flat band under the tabs (owner lock 25.10) |
| `a0a8607fe` | 25.10 08:36 | 2 · Дизайн | diag(home): [TEXT-OUTSIDE] guard around the Home poll and survey sheets |
| `59c4fab01` | 25.10 08:04 | 10 · Переводчик | fix(l10n): rating placeholder - warmer ru/uk ('and' instead of 'then', no passive), id informal -mu |
| `26a893a73` | 25.10 07:45 | 2 · Дизайн | fix(dialogs): текст плашки «Нет связи» в свободном разговоре — glass.text вместо secondary (контраст 4,25 → 12,07) |
| `5482e1f3c` | 25.10 07:32 | 2 · Дизайн | test(home-scene): baked scene backdrops checked for the 23 regular themes; premium ones generated after release (table is not read at runtime — shaders draw the scene) |
| `d8196ecd5` | 25.10 07:32 | 8 · Моменты | chore(spire): [SPIRE-AFTER-ROUND] трасса закрытия окна итога — «Время вышло» висит после «В раздел Пик» |
| `5e3a8dabe` | 25.10 07:30 | 4 · Темы | test(themes): surface-tone guards measure the 23 regular themes, premium themes by their own contract (OWNER_DECISIONS 25.10 «тон поверхностей — вариант 2») |
| `8ee024097` | 25.10 07:30 | координатор: назначить | fix(typography): DialogueV2PlusTools — подпись плитки 13/16 → 13/17 по шкале V2_TYPE (храповик typography_store_surface) |
| `3e278380a` | 25.10 07:20 | координатор: назначить | fix(ratchets): график светлой темы на accentGraphic, заготовка межстрочного 13/17, метки токенов сцены — красные храповики Ревизора 25.10 |
| `9cc17d13d` | 25.10 07:18 | 10 · Переводчик | fix(l10n): coins-saving toast - natural en, 'again' in es/pt-BR/tr, id without double 'lagi' |
| `24da8e99d` | 25.10 07:15 | Learning V2 | fix(lessons): coin pill shows the last displayed number from cache on cold start (no «—» frame); trusted value replaces it after hydration from the same Core source, no jump; «—» only without any progress snapshot |
| `eed18ada2` | 25.10 07:15 | Learning V2 | fix(learning-v2, mistakes): raw ** markup stripped at task-prompt entry (situation, goal label, exam review); delete polish per Design audit 0936a7510 — undo reinserts the row at its index, haptics only on «Удалить», hide locally deleted on focus before reload, busy is a toast not silence, failedOne for a single mistake |
| `241de4871` | 25.10 07:15 | 2 · Дизайн | fix(paywall): selected plan row text readable in dark Olive — inks are pushed toward pure white in dark (4.59), toward theme text in light as before |
| `593616f07` | 25.10 07:11 | координатор: назначить | test(guard): repin app/debug-logger.ts hash in feedback_rating_liquid_glass_source_contract after f31847e07 (build number in crash reports); feedback delivery path untouched |
| `3f245cab6` | 25.10 07:08 | координатор: назначить | test(red): 8 устаревших контрактов зоны Дизайна обновлены под принятые решения; кнопки масштаба сняты из шагов dev-ссылок — красные Ревизора 25.10 |
| `c94bc54fa` | 25.10 07:08 | 4 · Темы | fix(themes): theme screen premium detail rows on the two text sizes (13/16, D145); palette node guards count 29 themes (1566 contrast checks) |
| `beef90af0` | 25.10 07:07 | 8 · Моменты | fix(stories): слайд объявления без рамок и мелкого текста; журнал просмотра без русских литералов; шкала шрифтов тестового экрана — красные Ревизора 25.10 |
| `f838e9af1` | 25.10 07:07 | координатор: назначить | fix(scroll): быстрая остановка прокрутки decelerationRate="fast" в 16 списках — красный scroll_inertia_contract Ревизора |
| `f31847e07` | 25.10 07:04 | координатор: назначить | fix(diagnostics): app_errors buildNumber from the build config (ios.buildNumber / android.versionCode) when the native value is empty — no new native dependency; was 'unknown' for everyone |
| `a39b01be7` | 25.10 07:03 | 4 · Темы | fix(themes): 29 visible themes in guards; premium tab-bar icon and red «Delete» readable — accentBright to ≥ 3.2 on its pill, danger fill stays red on warm sheets |
| `334eb3462` | 25.10 07:01 | 8 · Моменты | fix(spire): [PEAK-COINS] поздний сбой записи ступени тоже снимает показанные монеты |
| `a2a3505ef` | 25.10 07:00 | 2 · Дизайн | fix(dialogs): the open conversation's "No connection" bar uses short one-line copy |
| `3b2d18705` | 25.10 07:00 | 1 · Ядро / 5 · Вход | feat(functions): card pack AI check and translation on gpt-4.1. Wrong-language text is its own finding, and a reason that quotes words not in the card is never shown as an error. Admin d2 contract follows the live admin |
| `66af64c74` | 25.10 06:56 | координатор: назначить | test(red): 6 устаревших исходниковых контрактов Дизайна обновлены под принятые решения — красные node --test Ревизора 25.10 |
| `80d7c4264` | 25.10 06:53 | координатор: назначить | test(motion): фон объявления в истории — в списке разрешённых вечных циклов с причиной (красный Ревизора) |
| `a882a1427` | 25.10 06:51 | координатор: назначить | test(red): пейвол, достижимость кнопок, опрос дня, память диалогов — контракты обновлены под утверждённую вёрстку, смысл проверок не ослаблен |
| `3556f9e9d` | 25.10 06:47 | 8 · Моменты | fix(spire): [PEAK-PERF] замер кадров молчит без requestAnimationFrame — красный Ревизора m06 |
| `dd5023d6c` | 25.10 06:41 | координатор: назначить | test(sound): красные sound_director / sound_service Ревизора — тесты прежнего пути снова проверяют свой путь |
| `200852c29` | 25.10 06:39 | 10 · Переводчик | test(l10n): owner chose 'Find the mistake' - old-names guard now catches 'Find the odd one out' in 9 languages; mockup state label updated |
| `7e01ccec9` | 25.10 06:38 | координатор: назначить | test: five stale contracts from the 25.10 full run follow the current code |
| `821bf241c` | 25.10 06:35 | 10 · Переводчик | fix(l10n): three translator reds from the 05:00 full run - no 'Spire' in the Titanium theme copy, friends guard skips the fallback JSX prop, lesson menu guard expects the non-breaking space |
| `5da438a90` | 25.10 05:54 | 4 · Темы | test(themes): live_theme_contract counts 29 visible themes (23 + 6 premium); night contrast grid re-run on the 6 premium themes — all pass |
| `728cb0552` | 25.10 05:48 | 2 · Дизайн | fix(dialogs): "You can say…" hints go compact while the goal card is folded |
| `b25b4037c` | 24.10 22:15 | 10 · Переводчик | fix(l10n): Season exam state captions - pl 'zdawać', id 'Lulus ujian', tr informal 'geçtin' |
| `80badbacf` | 24.10 22:00 | 8 · Моменты | perf(spire): [PEAK-CLOSE] журнал медленного диска при записи ступени, неделя после записи — сразу в память |
| `47263719d` | 24.10 21:31 | 4 · Темы | fix(themes): premium main button readable — gradient follows the collection accent, ink picked by worst contrast over accent and gradient; accentGraphic keeps accent case |
| `7de4a2a01` | 24.10 21:30 | 8 · Моменты | fix(stories): тап короче удержания (190 мс против 220) и прогрев просмотра после первых взаимодействий — аудит Optimistic UI 24.10 |
| `981cd8090` | 24.10 21:30 | 8 · Моменты | feat(season): chapter exam matches chapter-exam-season.html — kicker, «Позже», pause and passed captions |
| `264e59902` | 24.10 21:19 | 8 · Моменты | fix(spire): find_oddity options shown with a capital first letter — a lowercase wrong option gave the answer away in 13 cloud tasks (data fix after release); cloud pool template «Найдите фразу, которую нужно исправить.» known; [SPIRE-ODDITY-CASE] only when changed; answers still checked by index |
| `4aacaa50d` | 24.10 21:19 | координатор: назначить | chore(types): exclude docs/work/archive from the app typecheck |
| `9ea877dfe` | 24.10 21:18 | 1 · Ядро / 5 · Вход | perf(functions): freeform dialogue — whole CPU, 300-token replies, cut at the last sentence |
| `1f349a786` | 24.10 21:17 | 1 · Ядро / 5 · Вход | fix(account): the personal inbox copy is wiped on sign-out and deletion; wipe guards know the theme entitlements key |
| `8e8cf96c0` | 24.10 21:16 | 4 · Темы | fix(themes): premium theme motion logs why the storm plate failed to load ([PREMIUM-THEME-MOTION]), behaviour unchanged |
| `ba77bddb4` | 24.10 21:04 | 4 · Темы | fix(themes): «Удалить» red keeps ≥ 4.8 on the sheet — bad token also checked against opaqueSheet, guard at 4.5 |
| `386d13703` | 24.10 21:03 | 2 · Дизайн | fix(dialogs): the goal card folds smoothly on focus and leaves a one-line goal strip |
| `3813f45a7` | 24.10 21:02 | 8 · Моменты | fix(season): при «Уменьшить движение» замок не трясётся, а коротко подсвечивается |
| `3e434dc42` | 24.10 21:01 | 2 · Дизайн | feat(dialogs): тесный режим подсказок «Можно сказать…» — при открытой клавиатуре без строки-подписи, фраза до 2 строк, смысл 1 строка |
| `3f484c43c` | 24.10 21:00 | 10 · Переводчик | fix(l10n): Season exam caption - natural en/pt-BR/vi/id wording (ru from the mockup untouched) |
| `da7db7cc6` | 24.10 20:50 | координатор: назначить | chore(guard): as-any ratchet baseline 181 → 169 (73 files) — lock in the decrease so it cannot silently grow back |
| `6a9e44e16` | 24.10 20:49 | 8 · Моменты | feat(season): exam card caption gets «Сдать экзамен» and «Сдашь — откроется глава N · 12 вопросов, сдать от 10» |
| `05e95c7e2` | 24.10 20:48 | 8 · Моменты | fix(stories): объявления — кэш на телефоне и запрос раз в 6 часов вместо опроса каждую минуту; немые catch получили причину |
| `2b9d12218` | 24.10 20:46 | 8 · Моменты | fix(season): у закрытого экзамена — та же плашка замка справа сверху, трясётся она, кубок остаётся эмблемой |
| `9e5bb001e` | 24.10 20:46 | 1 · Ядро / 5 · Вход | fix(functions): commit the source of the live story announcement functions (deployed 23.10 from the tree) |
| `ff1a4d373` | 24.10 20:42 | координатор: назначить | feat(guard): silent-catch guard on ADDED staged lines (catch {}, comment-only bodies, .catch arrows without a logger) — warning only, exit 0, --strict later by owner word; wired into pre-commit after tracked imports; verified on e9fa41f24 (3) and a50cfbf18 (1) |
| `325019db5` | 24.10 20:38 | 10 · Переводчик | fix(rules): story announcement collections closed to clients and excluded from the generic admin rule (live since 23.10) |
| `5bf850a28` | 24.10 20:34 | координатор: назначить | fix(scenes): status bar icon style follows the brightness of the scene top (Themes' sceneStatusBarStyle) |
| `e9fa41f24` | 24.10 20:33 | 8 · Моменты | feat(stories): объявления администратора в историях (клиент, 5169f85d6) + пауза анимации объявления при удержании, объявление не короче 10 с |
| `2d126a346` | 24.10 20:33 | 4 · Темы | feat(themes): statusBarIconsOnScene(sceneTop) — light or dark status-bar icons by scene brightness, for the Mockups scene status-bar hook |
| `00b98ad20` | 24.10 20:32 | 8 · Моменты | fix(season): закрытый экзамен на тап трясёт печать — замок владельца «вибрирует и замочек трясётся» |
| `9e847d7fc` | 24.10 20:32 | 8 · Моменты | fix(stories): слайд истории — 10 секунд (было 2,4), журнал [STORIES] «почему кольцо горит или нет»; замок владельца 24.10 на 10 с, удержание = пауза, тапы по краям, свайп вниз |
| `c39e8d2ea` | 24.10 20:31 | 10 · Переводчик | fix(l10n): say hint 'Nice to meet you' in French uses tu like its neighbours |
| `369dfab6a` | 24.10 20:30 | 10 · Переводчик | fix(rules): premium-theme entitlements are server-only and the video-watch journal is closed to clients (premium part only; stories rules stay out) |
| `a345e1f56` | 24.10 20:30 | координатор: назначить | fix(mistakes): Spire mistakes show the short phrase meaning (quoted text of the question) instead of the whole question, or no meaning line; [MISTAKES-MEANING] logs the field source |
| `70af8ef55` | 24.10 20:21 | 1 · Ядро / 5 · Вход | fix(admin): commit the live legacy admin (deployed from the tree 24.10 18:50Z) with normalized line endings + 16 support replies |
| `462683435` | 24.10 20:20 | координатор: назначить | fix(scenes): light status bar icons while a dark scene sits under the clock (Home, Today, Season cover) |
| `cbb60a289` | 24.10 20:18 | 2 · Дизайн | feat(dialogs): "You can say…" hints above the input in both dialog screens |
| `847e421bb` | 24.10 20:17 | 8 · Моменты | feat(season): the episode window shows the real task count from the course's light index |
| `2639862fc` | 24.10 20:17 | координатор: назначить | feat(mistakes): delete a single mistake — long press a waiting row → «Удалить», «Удалить» in the card; same journal path as clear-all ('hidden', synced, not resurrected), row vanishes at once, toast «Ошибка удалена · Вернуть» restores; [MISTAKES-DELETE]; owner lock test |
| `064b41341` | 24.10 20:15 | координатор: назначить | feat(guard): relative imports must resolve to files in git — HEAD scan in seconds, pre-commit on changed files |
| `d3c86c1e8` | 24.10 20:06 | 10 · Переводчик | fix(i18n): untranslated scanner treats status-bar and story-hold reasons as log text |
| `952a8614f` | 24.10 20:05 | 2 · Дизайн | feat(dialogs): local "what you could say" hint set; test: freeform transport expects the opening turn |
| `2400b1929` | 24.10 20:05 | 2 · Дизайн | fix(dialogs): a message in the wrong language gets a gentle nudge, not "I don't understand" |
| `462293c5b` | 24.10 20:03 | 8 · Моменты | fix(today): «Пройти урок» opens the Season hub (Lessons tab) when the Season is on |
| `2713b36e9` | 24.10 20:02 | 4 · Темы | perf(themes): premium-theme entitlements cached on the phone per owner — server at most once a day and on entering Themes; offline keeps earned themes |
| `a546f91bc` | 24.10 19:53 | 2 · Дизайн | fix(home): the scene's Continue is never dead — without Lessons it opens the first available section |
| `731c1f278` | 24.10 19:52 | 2 · Дизайн | fix(dialogs): turn error texts follow the u31 mockup — no connection vs service down |
| `c0029b09d` | 24.10 19:52 | 10 · Переводчик | fix(l10n): Peak task heading "Find the mistake" in 9 languages instead of "odd one out" |
| `15d7faf14` | 24.10 19:51 | 8 · Моменты | fix(spire): ступень — счётчик «k / 10» вынесен из прокрутки в нижнюю полосу (его перечёркивала полоса жестов, а «Правильно + Дальше» вставали поверх); журнал [SPIRE-STEP-OVERLAP] и тест раскладки |
| `be79fa7da` | 24.10 19:48 | 8 · Моменты | fix(stories): theme-unlock mark drawn as SVG (no container borders) — Moments change, premium-theme part only |
| `a50cfbf18` | 24.10 19:47 | 4 · Темы | feat(themes): Codex premium themes package + 4-THEMES contrast fixes (themes are not sold; olive hidden until an achievement) |
| `4575fc513` | 24.10 19:46 | 2 · Дизайн | fix(dialogs): open conversation dots watchdog — never stuck even when the server answered |
| `51a731aed` | 24.10 19:45 | 8 · Моменты | feat(season): chapter exam card gets its Start button with ⚡1 and the Plus line, as in the approved mockup |
| `879806376` | 24.10 19:35 | 10 · Переводчик | fix(l10n): lesson-together reward line without "вам" — owner lock "interface on ty" green |
| `d0f67cfb7` | 24.10 19:34 | 8 · Моменты | fix(season): one counting rule for the episode window and the Home scene, with [SEASON-COUNT] logs |
| `093b2fffa` | 24.10 19:30 | координатор: назначить | feat(tabbar): capsule shadow is the baked cutout mask in every theme; elevation removed |
| `1d1231d5b` | 24.10 19:28 | 2 · Дизайн | test(cards): cards-007 guard follows the one card face after slider removal |
| `163ef53f1` | 24.10 19:25 | 10 · Переводчик | fix(i18n): locale scanners skip a file deleted in the tree instead of crashing |
| `a022a03a1` | 24.10 19:06 | 2 · Дизайн | test(home): repin PM-203 speech guard to two calls after the Speak button was removed |
| `0ace9f5c7` | 24.10 18:32 | 4 · Темы | fix(themes): success/error text and icons use semanticInk (goodText/badText, 4.55+) across 22 files; raw good/bad as text ratchet |
| `44181976c` | 24.10 18:29 | координатор: назначить | test(gustav): шлюз французского в Диалогах — главная передаёт headerSlot (сцена или прежняя шапка), шаблон теста обновлён |
| `512626953` | 24.10 18:23 | 10 · Переводчик | fix(i18n): locale checks green before the store build — plural tables and same-string spreads are not dictionaries, if-narrowed lang reads are guarded |
| `553e24cb2` | 24.10 18:19 | 2 · Дизайн | feat(home): Today panel shows the «pair streak with <name>» row behind the friends-together flag |
| `3fa8f96df` | 24.10 18:17 | 2 · Дизайн | feat(friends): «Урок вместе» — ряд «Занятие вместе · +2» в финале у друга и строка «приглашение закончилось в полночь» |
| `f25582a4e` | 24.10 18:05 | 2 · Дизайн | feat(friends): «Урок вместе» — статусы «открыт / прошёл / закрыт» в выборе друзей по маскам курса друга |
| `b26dccd29` | 24.10 16:46 | 2 · Дизайн | fix(home): plate shadow masks stretch to the plate instead of keeping the file size |
| `75ffa391a` | 24.10 16:45 | 10 · Переводчик | fix(i18n): «Пять отправлено» на испанском — «Choque enviado», влезает в кнопку на 360 dp |
| `ac8adb14e` | 24.10 16:45 | координатор: назначить | feat(tabbar): capsule shadow from the baked cutout mask behind a dev link, stretched to the capsule |
| `2fea0b9b1` | 23.10 06:47 | 2 · Дизайн | feat(nav): Back wave 17 — hint and statistics on the shared button |
| `7590b0075` | 23.10 06:47 | 2 · Дизайн | feat(friends): «Урок вместе» — +2 «вместе» начисляет телефон, сервер только отмечает «выполнено» |
| `fe7c7a64e` | 23.10 06:47 | 2 · Дизайн | feat(friends): «Дуэль на 5 фраз» — итог и лимит «три в день» решает телефон |
| `1da903c7a` | 23.10 06:46 | 2 · Дизайн | perf(home): Phrase of the day on the scene casts its shadow from the baked cutout mask instead of a blurred boxShadow |
| `685d56865` | 23.10 06:46 | координатор: назначить | feat(words): экран «Слова» по макету words-lesson-course (владелец 22.10 «переносить как в макете») + нижнее затухание списка темы Диалогов |
| `50ddf2231` | 22.10 20:23 | 2 · Дизайн | feat(nav): Back wave 16 — coins wallet, coin rank, rank catalog and shop on the shared button |
| `0eacd6632` | 22.10 20:22 | координатор: назначить | fix(coin-wallet): legacy report rewards without promotionEligibility are accepted as excluded_compensation |
| `24aee8725` | 22.10 20:21 | 4 · Темы | fix(themes): "done" ink on soft-green pill readable in light themes (semanticInk); new-screens contrast guard; literal ratchet covers the new 22.10 screens |
| `ffbf7d7f7` | 22.10 20:20 | координатор: назначить | fix(theory): visible-text guard; Learning V2 header without hardcoded A1; lessons 1 and 3 session maps; grammar terms from task feedback introduced in theory (ru, uk) |
| `ba45e9009` | 22.10 20:19 | 2 · Дизайн | feat(friends): «Фраза дня вдвоём» — карточка на месте «Опроса дня» за выключателем «Вместе» (идея 8, экран) |
| `619c187e5` | 22.10 20:18 | 2 · Дизайн | fix(home): Today panel ticks on the scene take their ring colours, as on the Today screen |
| `d739a0bd5` | 22.10 20:17 | 2 · Дизайн | feat(nav): Back wave 15 — the shared exam header on one shared button |
| `cebe1bbe1` | 22.10 20:15 | 10 · Переводчик | fix(l10n): AI dialogue consent names both modes; speech goes to OpenAI as text, voice recording stays on the phone |
| `39b84d2df` | 22.10 20:09 | 4 · Темы | test(themes): ThemeContext render-budget guard; theme tone guards read sources through normalizeEol |
| `bc6bf6018` | 22.10 20:09 | координатор: назначить | fix(semaphore): one-at-a-time gate around slot capture — no rollback storms; GO/status count confirmed slots only |
| `f2b4726f1` | 22.10 20:09 | 8 · Моменты | test(spire): tower theme test reads sources with CRLF normalized (EOL guard) |
| `25942d543` | 22.10 20:07 | 2 · Дизайн | feat(friends): pushes and feed lines in 9 languages; 30-day TTL field on Friends receipts; EOL-safe source guards |
| `0d836a476` | 22.10 20:02 | 2 · Дизайн | perf(home): theme glow spots and the scene hero mount from the second frame with the same fade-in |
| `eedd3b5a8` | 22.10 20:01 | 2 · Дизайн | feat(friends): «Фраза дня вдвоём» — запись моего ответа и ответы друзей тем же профилем (идея 8, данные) |
| `b33599146` | 22.10 20:00 | 2 · Дизайн | feat(friends): «Моя неделя» — своя неделя глазами друзей, кто дал пять, переключатель «Показывать друзьям» (идея 6, шаг 3) |
| `059fb7214` | 22.10 19:58 | координатор: назначить | test: Revizor reds — sheet header close counts as the hybrid press, auth guard reads normalized source |
| `d626d73ce` | 22.10 19:46 | 10 · Переводчик | fix(i18n): дуэль — «Скажи по-английски» на индонезийском «Katakan dalam bahasa Inggris» |
| `a246a18c9` | 22.10 19:34 | 10 · Переводчик | test(l10n): informal address guard sees Learning V2 interface; course voice excluded by rule |
| `7cd198406` | 22.10 19:31 | 10 · Переводчик | fix(l10n): dialogs hub v4 and words switch copy — informal address in empty states, pt/vi/id/es wording |
| `4c27219e8` | 22.10 19:19 | координатор: назначить | test(locks): progress v2 owner lock row (open ≠ completed, never lost) + placement test and progress v2 guards in KNOWN_GUARDS |
| `d890433fd` | 22.10 19:15 | 4 · Темы | feat(themes): Dialogs hub v4 colour tokens — world tile track, switcher rail, compact rows (lock/done/rank), screen head, note, fade; contrast guard over all themes |
| `151d0e4bf` | 22.10 19:15 | 8 · Моменты | test(season): season_pure_phase1 matches the exam flag truth — on in dev, off in the store until Sverka's verdict; start button off |
| `fc9a79a1c` | 22.10 19:02 | 2 · Дизайн | feat(friends): «Итоги недели» — лента карточек, «Дать пять» сразу, «Позвать», шторка «Неделя · {имя}» (идея 6, шаг 2) |
| `397006405` | 22.10 19:02 | 2 · Дизайн | fix(nav): content starts below the Back button and never slides under it |
| `ca78ea083` | 22.10 19:01 | 4 · Темы | feat(themes): theme list opens scrolled to the selected theme (once, no animation, no extra re-renders) |
| `1033b97f9` | 22.10 19:00 | координатор: назначить | fix(coin-wallet): legacy Daily Journey grants without promotionEligibility count as gameplay; LV2 course progress keeps in place |
| `1645fabbe` | 22.10 19:00 | 2 · Дизайн | fix(home): «Тебя не было N дней» — по заходам в приложение, а не по урокам (замок владельца «По заходам») |
| `652953424` | 22.10 18:49 | 2 · Дизайн | feat(friends): server stores, phone decides — lesson together via the wallet, shared duels survive deletion de-identified |
| `7125e983d` | 22.10 18:49 | 8 · Моменты | fix(spire): owner locks 22.10 — full nick in the top-3, no promotion line, no ring around my coin on the tower |
| `45cf9fbdc` | 22.10 18:49 | 8 · Моменты | feat(season): правки владельца 22.10 по хабу урока — «Старый курс», замки справа, пустые звёзды, без кикера, закрытый эпизод без модала, компактный заголовок, без книжки словаря |
| `7d5dceb94` | 22.10 18:48 | 4 · Темы | feat(themes): back/close button on scenes — circle and glyph chosen by scene brightness (sceneTop); owner-lock marks |
| `573a206ad` | 22.10 18:46 | 10 · Переводчик | fix(l10n): genderless home welcome in es and pt-BR |
| `4d5c86137` | 22.10 18:44 | 2 · Дизайн | test(cards): repin speaking AST guard — 7ac005ecf added useEffect#14 (quota auto-retry instead of error screen), other 36 nodes unchanged |
| `d2e49b760` | 22.10 18:43 | координатор: назначить | test: owner-locks guards always run — test:cjs in test:all; meta guard resolves *_gate.ts guards |
| `c84f4a33d` | 22.10 18:42 | 10 · Переводчик | test(l10n): informal address guard — plural-to-two pattern, dev showcase file, owner-locked phrase |
| `61c93be14` | 22.10 18:19 | координатор: назначить | revert(theory): drop right/wrong color swap (e548256e1) — cancelled by coordinator, 4 · ТЕМЫ fix it in makeLiquidGlassTheme; mark theory owner locks |
| `1e578f04e` | 22.10 18:18 | 2 · Дизайн | perf(home): scene hero from 512 px copies of the owner's 1024 art |
| `60f169487` | 22.10 18:18 | координатор: назначить | test(locks): замки владельца МОМЕНТОВ — искры без сдвига тона, свои палитры визиток, металл рангов |
| `916556300` | 22.10 18:18 | 10 · Переводчик | fix(l10n): home "away N days" in id means not opening the app, not skipping class |
| `0384c6db1` | 22.10 18:17 | 4 · Темы | fix(themes): human theme/appearance/intensity choice releases dev overrides — themes switch again |
| `809278a9f` | 22.10 18:16 | координатор: назначить | fix(tabbar): icon-only tab bar in every mode, scene included (owner lock 22.10) |
| `543114f8e` | 22.10 18:15 | 1 · Ядро / 5 · Вход | test(accounts-v2): root field census knows three new legitimate fields (inboxRev, legacyBonusConvertedV1, flashcardPagesRev_<lang>) |
| `29128ef22` | 22.10 18:15 | 2 · Дизайн | feat(nav): Back wave 12 — eight Practice screens on the shared button |
| `2fc390683` | 22.10 18:01 | координатор: назначить | test(video): floor for the play circle - density at least 45 percent and the icon at least 3:1 over a white frame in every theme |
| `4e6896eb1` | 22.10 18:01 | координатор: назначить | feat(perf): shadow masks with the plate cut out for the translucent Phrase of the day and tab bar capsule, with guard (alpha 0 under the plate) |
| `549ec6b63` | 22.10 18:00 | 2 · Дизайн | feat(nav): Back waves 9-11 — rest of Settings, Results and Dialogs on the shared button |
| `e80580a2b` | 22.10 16:30 | 10 · Переводчик | feat(l10n): названия 56 эпизодов урока 6 на 8 языках (черновик 12 · ТЕОРИИ) — в модуль переводов |
| `0cc795465` | 22.10 16:20 | 10 · Переводчик | fix(l10n): «Урок вместе», приглашение у друга — занятие tr «oturum», vi «Buổi» (как в lesson_together_copy) |
| `e548256e1` | 22.10 16:18 | координатор: назначить | fix(theory): right/wrong colors from the current theme (glass.good / glass.bad), not old cinemaThemes tokens |
| `d434efbaa` | 22.10 16:16 | 10 · Переводчик | fix(l10n): названия эпизодов 3.45 «У прилавка» и 3.53 «Материал» на 8 языках (переименование 420ae2b01) |
| `20976fbf6` | 22.10 16:15 | координатор: назначить | fix(titles): [HELPER-TITLE] trace of the helper-title counter (logs only) |
| `72b752969` | 22.10 16:14 | 4 · Темы | chore(theme): ratchet for the OLD theme (t.correct / t.wrong / t.accent / t.textMuted ...) in screens - usage never grows, new files use current-theme tokens only |
| `61b4a8fcc` | 22.10 16:05 | 8 · Моменты | fix(season): HUD не налезает на кикер и заголовок обложки; бейдж числа слов у книги — в цвете темы |
| `810ed7cd3` | 22.10 16:04 | 4 · Темы | chore(theme): color-literal baseline lowered to 248 after the theme-law replacements |
| `c3feccb6e` | 22.10 16:04 | 8 · Моменты | fix(moments): плашка «Встречайте 2.0» на токенах темы, отдельная палитра арта моментов удалена |
| `dee47469f` | 22.10 16:02 | 10 · Переводчик | feat(l10n): названия 168 эпизодов уроков 1–3 на 8 языках — отдельный модуль вне Codex-зоны, откат к «Эпизод N» |
| `a747acdb3` | 22.10 16:02 | 2 · Дизайн | feat(nav): Back wave 5 — Mistakes hub, list and detail on ScreenBackButton |
| `17a7af053` | 22.10 16:01 | 8 · Моменты | feat(season): star tones for episode ratings - filled and empty are shades of the current theme |
| `ce081c88f` | 22.10 16:01 | 10 · Переводчик | fix(l10n): хаб урока — подписи плиток на 8 языках проверены по ширине, id метка «Дальше» → «Lanjut» |
| `95dfc2b09` | 22.10 15:52 | 8 · Моменты | feat(season): хаб урока по макету lesson-hub-final — три плитки «Все главы / Все уроки / Классический курс», полноэкранные списки вместо веера «Вся глава» |
| `669ea66a3` | 22.10 15:47 | 2 · Дизайн | feat(nav): Back wave 4 — Spire sub-views full screen with ScreenBackButton |
| `94e521fc6` | 22.10 15:46 | 8 · Моменты | feat(season): neighbouring episode cards differ clearly in lightness and saturation inside the theme hue |
| `0e57c7f7a` | 22.10 15:45 | 8 · Моменты | fix(moments): цвета моментов только из текущей темы — без единого зашитого цвета, даже с пометкой theme-exempt |
| `062e55d74` | 22.10 15:02 | 8 · Моменты | fix(season): no texture on episode cards, lesson cover and expanded card - the big translucent chapter glyph is removed, plain theme gradient |
| `5a498ec68` | 22.10 15:01 | 2 · Дизайн | fix(friends): ключ повтора дуэли всегда в форме сервера — 21 символ, случайная часть добита до 8 знаков |
| `fe8b36e3d` | 22.10 15:01 | 2 · Дизайн | fix(friends): карточки «Финал занятия» по шкале D145 — заголовок 16/21, подпись 13/18 |
| `3637a87de` | 22.10 15:00 | 2 · Дизайн | fix(home): tab labels use the 13/17 size of the D145 scale (was 11 from the mockup) |
| `a36bd4984` | 22.10 14:48 | 2 · Дизайн | fix(home): long hero title uses 26/32 so it stays on one line at 360-390 and the phrase card stays above the bar |
| `683888948` | 22.10 14:48 | координатор: назначить | fix(coins): [COIN-WALLET] logs on the receipt (ack) path and post-commit exits |
| `767196a6f` | 22.10 14:47 | 8 · Моменты | feat(today): Today scene rings, start button and task rows match scenes-compact v2 |
| `7da8080f0` | 22.10 14:46 | 2 · Дизайн | feat(friends): отказ от дуэли без сети не теряется — та же очередь досылки и тот же requestId, что у ходов |
| `4e0028d9d` | 22.10 14:46 | координатор: назначить | chore(touch): remove the temporary [SCENE-TOUCH] trace from the root, tab pages and Dialogs |
| `4a75c20f8` | 22.10 14:46 | координатор: назначить | fix(ui): Cards hub and Video saved row use V2Pressable (audit 22.10); audit table for Cards and Video |
| `c7dab6cc6` | 22.10 14:45 | 2 · Дизайн | fix(home): hero of the scene Home has no secondary chips (cards review, theory, words) - only the main button |
| `ad8753df5` | 22.10 14:45 | 2 · Дизайн | fix(home): active tab label uses accent text on light themes; contrast audit for scene Home (Today card, tiles, phrase, tab labels) |
| `97bd2f135` | 22.10 14:18 | 10 · Переводчик | fix(l10n): карточка прошлых уроков id/tr на «ты», «Пересдать через N мин» uk «за {m} хв» |
| `cd5f4a972` | 22.10 14:15 | 2 · Дизайн | chore(home): [HOME-FIT] log of planned vs actual scene height to chase the cut phrase card at 390 |
| `546499de6` | 22.10 14:15 | координатор: назначить | fix(energy): [ENERGY-CHIP] logs — where the Home chip's first value comes from and why it shows a dash |
| `fc0eb5e52` | 22.10 14:08 | координатор: назначить | fix(guard): D83 probe allows the intro_arena art picture (illustration name, not Arena code) |
| `89515f3c9` | 22.10 14:04 | 8 · Моменты | feat(today): poll of the day lives on the Today screen |
| `162275405` | 22.10 14:04 | 2 · Дизайн | feat(friends): дуэль у друга — щит со сроком, «Принять / Отказаться», ход в ответ, итог у вызвавшего (идея 3, за выключателем) |
| `9f6f56bce` | 22.10 14:04 | 2 · Дизайн | feat(home): scene Home to the bit per home4 - tiles with inner caption, one-row header, phrase of the day without translation, tab labels, scene height fit (all behind the scene flag) |
| `041a32d1c` | 22.10 14:03 | координатор: назначить | fix(scroll): wrap Fragment child before gesture detector so Android no longer warns about collapsable |
| `7e1a95e57` | 22.10 14:03 | 8 · Моменты | feat(season): card "Your earlier lessons" under the course cover for users with classic-course progress |
| `540414446` | 22.10 14:02 | 2 · Дизайн | fix(dialogs): "no network" no longer blocks Dialogs, "Retry" works, dev scene previews navigate, briefing clears the clock |
| `3548df46f` | 22.10 13:59 | 1 · Ядро / 5 · Вход | fix(admin): replies 7 and 9 promise the "Can't speak" button instead of asking to press it |
| `ba8a5ebd4` | 22.10 13:46 | 10 · Переводчик | feat(l10n): экзамен главы — «от N верных» на 9 языках с согласованием по числу (вместо «10 чтобы сдать») |
| `4d2d57e93` | 22.10 13:46 | 10 · Переводчик | feat(l10n): итог экзамена главы на 9 языках — вычитка черновиков Learning V2, нейтральное «Твой ответ», uk апостроф |
| `366de369b` | 22.10 13:45 | 8 · Моменты | feat(today): Today scene at 46 % (scenes-compact variant 2) |
| `3c68a67b8` | 22.10 13:45 | 2 · Дизайн | feat(home): Главная по снимку Сверки home3 и scenes-compact в.2 — белая карточка «Сегодня · N из M», три строки, плитки по порядку, «Фраза дня» с картинкой |
| `2fd9302db` | 22.10 13:44 | 1 · Ядро / 5 · Вход | feat(admin): prepared replies for 11 support reports of 22.10 12:32Z |
| `f0560d23e` | 22.10 13:34 | 8 · Моменты | feat(season): окно экзамена в раскрытой карте — факты, цена ⚡1 для Free, «С Plus экзамен бесплатный»; кнопки на экран Learning V2 за флагом запуска |
| `055c8c934` | 22.10 13:34 | Learning V2 | fix(lesson): окно «Выйти из урока?» снято — «назад» сразу выходит, место урока и эпизода сохраняется |
| `52140c087` | 22.10 13:33 | координатор: назначить | chore(touch): [SCENE-TOUCH] trace of who receives a touch (dev only) |
| `caee9ff85` | 22.10 13:31 | координатор: назначить | test(motion): allow the sign-in dots loop with its reason |
| `2a8478e1b` | 22.10 13:30 | 2 · Дизайн | feat(home): survey campaigns are back in the Today row, before the V2 poll |
| `a4447480a` | 22.10 13:30 | координатор: назначить | fix(press): отклик нажатия на кнопках «Сезона», карточках видео и теории; сторож новых экранов |
| `dcb615550` | 22.10 13:30 | 1 · Ядро / 5 · Вход | chore(admin): remove the site level-test funnel block — adminEnglishTestAnalytics no longer exists |
| `097af859b` | 22.10 13:27 | 1 · Ядро / 5 · Вход | feat(site): phone = the approved Home as real markup (scenes-compact variant 2), not a screenshot |
| `ed1111664` | 22.10 13:26 | координатор: назначить | test(contrast): сторож читаемости — Главная, вариант 2 (плашки на подложке 50 %, строки «Сегодня», «Фраза дня», подписи плиток, значок места Пика); промахов нет |
| `301e36d50` | 22.10 13:16 | 8 · Моменты | feat(spire): Peak scene at 46 % with the week room panel below; Community full-bleed |
| `c1d6870a7` | 22.10 13:15 | 2 · Дизайн | fix(home): scene bottom radius 32 as in scenes-compact (was 36) |
| `881740df6` | 22.10 13:15 | 10 · Переводчик | fix(l10n): экзамен главы на Главной как в «Сезоне» (tr Ünite, vi bài thi, pt-BR exame, pl), артикль в «до полуночи» es/pt-BR |
| `6b1c1fc68` | 22.10 13:15 | Learning V2 | perf(learning-v2): хранилище звёзд берёт порядок занятий из общего кэша хранилища прогресса — топология курса не строится второй раз на открытии «Уроков» (⚡ Ревизора 22.10) |
| `8e6885855` | 22.10 13:07 | координатор: назначить | test(contrast): сторож читаемости расширен — дуэль друзей, пейвол Plus, палитра онбординга и экран выбора языка (промахов нет) |
| `8b0689a9c` | 22.10 13:06 | 1 · Ядро / 5 · Вход | chore(functions): remove exports of 39 unused functions (owner 22.10, no deploy) |
| `fe62a217d` | 22.10 13:05 | координатор: назначить | feat(inbox): team windows on Home only after 48 h in the app |
| `19a062ced` | 22.10 13:03 | 2 · Дизайн | fix(dialogs): аудит контраста — галочка «пройдено» читается на заливке good (было 2,34–2,69:1 в 10 светлых градиентных темах); сторож панели и карточек «Диалогов» |
| `10965418c` | 22.10 13:00 | 2 · Дизайн | test(home): coin contract slices from renderHomeV2Header; video rail test flattens array style like StyleSheet.flatten (after 567585366) |
| `ff4ed0542` | 22.10 12:59 | 8 · Моменты | test(season): сторож контраста заданий №23 расширен на тёмную тему (15 пар × 23 темы × 3 уровня, 0 промахов) |
| `14a853b3a` | 22.10 12:52 | 1 · Ядро / 5 · Вход | feat(site): phone mockup = the approved Home (scenes-compact, variant 2), dark and light |
| `f740de010` | 22.10 12:51 | 2 · Дизайн | test(paywall): D187 checks that an exhausted dialog never reopens the paywall by itself |
| `726eb0f5b` | 22.10 12:50 | 8 · Моменты | fix(season): HUD шапки обложки в светлой теме — на плите цвета карточки темы (энергия без капсулы лежала на градиенте, ≈2,5–3:1) |
| `52b242cb6` | 22.10 12:48 | 10 · Переводчик | fix(l10n): задания №23 — короткие заголовки en/es/id (одна строка на 360), дубль подписи «Скажите по-английски» убран |
| `ca212f7c0` | 22.10 12:47 | координатор: назначить | perf(inbox): a missing inboxRev is version 0 - personal copy kept for a day |
| `9ac75e3fd` | 22.10 12:46 | координатор: назначить | chore(reads): [READS-AUDIT] whole-session read totals on every background |
| `8922e9ca5` | 22.10 12:46 | 2 · Дизайн | feat(dialogs): Dialogs scene at 46 % of the screen (variant 2 of scenes-compact.html) |
| `6e8642ede` | 22.10 12:46 | 8 · Моменты | fix(season): аудит контраста светлой темы — пилюля «Урок N» тёмным стеклом (было 3,69–4,26:1), сторож Сезона и заданий №23 |
| `bef7c9246` | 22.10 12:45 | координатор: назначить | perf(mistake-practice): события пишутся без предварительного чтения; событие без языка отбрасывается (Ревизор 22.10) |
| `da70e2b31` | 22.10 12:35 | координатор: назначить | fix(content): урок 31 без нечестных ловушок после глаголов восприятия, урок 30 принимает оба артикля; тесты на оба урока |
| `6eeeb1107` | 22.10 12:35 | 8 · Моменты | feat(season): чипы «Слова / Теория» внутри обложки (scenes-compact, вариант 2); длинный заголовок 26/32 |
| `341976904` | 22.10 12:34 | 1 · Ядро / 5 · Вход | fix(site): video promo card glow — same smoke as the support form (no grey patch in light mode) |
| `8dd28b5dc` | 22.10 12:30 | 8 · Моменты | feat(season): обложка «Сезона» — 46 % высоты от самого верха экрана, без полосы под часами (scenes-compact, вариант 2; схема eab9aa35d) |
| `0452f6607` | 22.10 12:23 | 1 · Ядро / 5 · Вход | fix(site): one name — Plus instead of Premium (thanks page, FAQ, footer) |
| `22cda3f02` | 22.10 12:22 | координатор: назначить | test(layout): lock edge-to-edge so modals keep covering the clock zone |
| `bfc46c89b` | 22.10 12:00 | 2 · Дизайн | feat(friends): плитка «Дуэль» в шторке друга → шторка вызова → экран хода (идея 3, за выключателем) |
| `f0e4a373d` | 22.10 11:32 | 2 · Дизайн | feat(friends): экран хода дуэли и итог полным экраном, ход без сети ждёт на телефоне (идея 3, за выключателем) |
| `eab9aa35d` | 22.10 11:30 | координатор: назначить | fix(layout): the status-bar zone is part of the screen canvas (no off-colour strip) |
| `e387589f1` | 22.10 11:30 | 2 · Дизайн | feat(friends): «Дуэль на 5 фраз» — фразы из пройденного курса на телефоне (идея 3, за выключателем) |
| `4028323ad` | 22.10 11:17 | координатор: назначить | test(audio): сторож тишины проверяет занятие под «только TTS» — речь через общий useAudio и остановка на выходе (после 72f72a94e) |
| `c033247ea` | 22.10 11:16 | 2 · Дизайн | fix(home): four-button ribbon without the dark edge band |
| `9c03c5bff` | 22.10 11:15 | 8 · Моменты | feat(season): экзамен главы в «Сезоне» — флаг (dev вкл, выпуск выкл), колода с опциями, сданные экзамены из локального хранилища |
| `a6c8de7dd` | 22.10 11:15 | 8 · Моменты | fix(spire): Peak scene grid without overlaps, 13 on top, play icon left, font scale 1.3 |
| `54308265a` | 22.10 11:15 | Learning V2 | refactor(learning-v2): remove the dead recorded-audio tail (TTS only) |
| `47a4ebea8` | 22.10 11:15 | координатор: назначить | fix(content): обращения №24 и №28 — урок 30 принимает «the woman», урок 31 без ловушек found/finding после saw |
| `8b363fa2d` | 22.10 11:09 | 1 · Ядро / 5 · Вход | fix(admin): Plus panel result row grows with wrapped content |
| `6bc3da7c1` | 22.10 11:06 | 1 · Ядро / 5 · Вход | fix(admin): Plus panel result row wraps at narrow width |
| `5a9be81d2` | 22.10 11:03 | 8 · Моменты | fix(today): «Сегодня» на крупном шрифте и в длинных языках — межстрочный растёт, кнопка и подпись переносятся, кольца вписаны в слот |
| `3ee52517e` | 22.10 11:01 | 1 · Ядро / 5 · Вход | feat(admin): «Новый курс» filter in «Ошибки контента» |
| `cf21076f9` | 22.10 11:00 | 8 · Моменты | feat(season): «Обучение — способ 2» (Сезон + карусель) подключён во вкладку «Уроки» на реальных данных, под флагом (Ф4) |
| `6729ea487` | 22.10 11:00 | 2 · Дизайн | chore(home): [SAFE-TOP] facts for the off-colour strip above the clock |
| `241fec79d` | 22.10 10:48 | координатор: назначить | fix(support): скрипт ответов поднимает users.inboxRev, как adminReplyToReport (Ревизор 🔴1) |
| `a4c9b19ff` | 22.10 10:32 | 1 · Ядро / 5 · Вход | fix(functions): сборка — тип параметра catch в cleanupExpiredAppMessagesCron (TS7006 из e2db2ac4b) |
| `5dca9374a` | 22.10 10:30 | координатор: назначить | fix(scenes): Home and Dialogs scenes hold up at system font 1.3 and long labels; edge-case report for four scenes |
| `f98d5d148` | 22.10 10:19 | координатор: назначить | fix(inbox): reset the hide flag on every transaction attempt |
| `b9467f968` | 22.10 10:18 | координатор: назначить | fix(onboarding): меню языка — галочка сразу, при сбое откат на прежний язык, сообщение на 9 языках и журнал [ONB-LANG-MENU] (🟡 Ревизора 22.10) |
| `d4e482844` | 22.10 10:17 | 10 · Переводчик | fix(l10n): «Дуэль на 5 фраз» — «не тратит энергию» вместо «нет энергии», tr «düello», id «main duluan», pl без рода |
| `6fcb59156` | 22.10 10:17 | 2 · Дизайн | fix(dialogs): кнопка «Диалогов» в 10 светлых градиентных темах — тон текста темы вместо слившейся заливки (форма ≥ 3:1, подпись ≥ 4,5) |
| `6aeade04c` | 22.10 10:16 | 2 · Дизайн | feat(friends): «Урок вместе» — «Начать занятие» открывает то же занятие, награда «вместе» после засчитывания (идея 2, за выключателем) |
| `e2db2ac4b` | 22.10 10:16 | 1 · Ядро / 5 · Вход | feat(site-promo): заявки «Акция с видео» без почты и без resolvedUid уходят через 90 дней после конца акции |
| `ec3e62c04` | 22.10 10:15 | 1 · Ядро / 5 · Вход | feat(site): phone mockup shows the real Home with a scene (emulator shots) |
| `38f472d20` | 22.10 10:04 | 1 · Ядро / 5 · Вход | fix(plus-ring): дозапись isPlus — постранично без потолка 2000 и верный счётчик «без изменений» (Ревизор 🟡(а)) |
| `0da1b69a7` | 22.10 10:03 | 8 · Моменты | fix(season): "Whole chapter / Words / Theory" as plain text without plates; Plus avatar in the preview header |
| `e7f37e012` | 22.10 10:03 | 8 · Моменты | fix(season): no "Chapter exam" card while the exam is switched off; preview data matches the reference |
| `680974d97` | 22.10 10:02 | 1 · Ядро / 5 · Вход | chore(release): drop recorded-audio generators and gates (TTS only) |
| `e767ef202` | 22.10 10:02 | координатор: назначить | fix(scenes): граничные пары контраста закрыты — подложка «Нет сети»/чипов 14 % и тёплая строка #FFD9D0 (Главная, «Сегодня»); сторож без исключений; вариант кнопки «Диалогов» |
| `74b488a48` | 22.10 10:01 | Learning V2 | refactor(learning-v2): remove recorded lesson audio from the app (TTS only) |
| `8f2b2326e` | 22.10 10:01 | 1 · Ядро / 5 · Вход | feat(admin): mark the video-promo entry in the Plus grant transaction (resolvedUid) |
| `47a048d8b` | 22.10 10:00 | 8 · Моменты | feat(spire): Peak scrolling fades the Community header colour like Home |
| `279b98a3e` | 22.10 09:59 | 1 · Ядро / 5 · Вход | fix(site): «Акция с видео» — английский естественнее и теплее (caption, Couldn’t send it), смысл условий не менялся |
| `d4fb962fc` | 22.10 09:49 | 1 · Ядро / 5 · Вход | feat(account-delete): заявки «Акция с видео» уходят по promo.resolvedUid — никогда по имени |
| `867096b0d` | 22.10 09:45 | 8 · Моменты | feat(today-scene): заголовок «Сегодня» (9 языков), плитка и лента цветом темы «Максимум», карточка «История» с «N полных дней»; лента в dev-превью (замечания Сверки, владелец «точно как на макетах») |
| `113c55ca5` | 22.10 09:45 | 8 · Моменты | refactor(spire): Peak scene behind one strip, flag-off identity, title extracted |
| `effa48638` | 22.10 09:45 | 1 · Ядро / 5 · Вход | feat(site): «Акция с видео» — two years of Plus for a video, form on /contact/ |
| `f6acf01ee` | 22.10 09:34 | координатор: назначить | feat(onboarding): меню языка интерфейса на приветствии (владелец 22.10: включаем, исключение из заморозки 12.10) |
| `7369bf476` | 22.10 09:32 | 2 · Дизайн | refactor(home-scene): remove the old accent-only scene tokens |
| `6fdcd15dd` | 22.10 09:32 | 2 · Дизайн | fix(home): streak chip without "Not yet today" text, only an empty or lit flame; Today scene midnight title breaks between phrase and time |
| `a1a099133` | 22.10 09:31 | 2 · Дизайн | fix(dialogs-scene): hero lives in the free space between header and text, never crosses the title |
| `567585366` | 22.10 09:31 | 2 · Дизайн | fix(home-scene): header chips fit on one line, midnight title breaks between phrase and time, hero pinned to the header |
| `e475b31cf` | 22.10 09:31 | 10 · Переводчик | fix(l10n): «Очистить все ошибки» — tr без двусмысленного «tekrardan», es одним глаголом «borrar» |
| `43bec03cd` | 22.10 09:31 | координатор: назначить | fix(types): рамки-индикаторы вместо boxShadow inset (тип стиля его не принимает) — PaywallPlanRows (радио и кромка тарифа), TodaySceneView; разрешённый список импортёров колец дня |
| `b4590a94c` | 22.10 09:30 | 2 · Дизайн | feat(friends): «Дуэль на 5 фраз» — правила и план с контрактом сервера (идея 3, за выключателем) |
| `979646dd1` | 22.10 09:30 | координатор: назначить | fix(inbox): own read, reaction, vote and hide survive restart when inboxRev is unchanged |
| `dd4ebb8a8` | 22.10 09:19 | координатор: назначить | feat(mistakes): "Clear all mistakes" in the all-mistakes list menu with confirmation |
| `4642d1761` | 22.10 09:19 | координатор: назначить | feat(mistakes): clear-all data layer - one batch of hidden events, undo by restored events |
| `a3d58ff57` | 22.10 09:16 | 2 · Дизайн | chore(friends): убрана мёртвая строка offlineSaved («Нет сети · список сохранён») в pair_copy |
| `dde005f5b` | 22.10 09:16 | 2 · Дизайн | feat(friends): «Урок вместе» у друга — маркер, окно приглашения с занятием и номера урока в приглашении (идея 2, за выключателем) |
| `1efb79375` | 22.10 09:15 | 1 · Ядро / 5 · Вход | feat(site): giftDeliveryEnabled on — gift by email or link |
| `4709384a8` | 22.10 09:15 | 8 · Моменты | feat(spire): Community tabs and status strip on the Peak scene colour |
| `0f5a2ca89` | 22.10 09:15 | 1 · Ядро / 5 · Вход | feat(admin): «Выдать Plus любому профилю» — search by name/email/UID, calendar terms, optimistic |
| `26d2a8b0b` | 22.10 09:05 | 8 · Моменты | fix(spire): fail moment keeps the Again bubble below the hearts at any system text size; register 19.10 RNTL tests (restored work) |
| `9de6be219` | 22.10 09:02 | 10 · Переводчик | fix(l10n): «Урок вместе» — шторка честно говорит «с каждым другом — раз в день» на 9 языках |
| `a1d40fff9` | 22.10 09:01 | 8 · Моменты | fix(today): подпись «N из 3» ленты истории 13/17 вместо 10 (сторож типографики D145, «шрифт < 13») |
| `735052c46` | 22.10 09:01 | 8 · Моменты | feat(spire): Peak v2 scene on the Peak screen behind the flag |
| `8d08417f7` | 22.10 09:01 | 2 · Дизайн | fix(paywall): PaywallPlanRows — кромка выбранного тарифа и кольцо радио внутренней тенью вместо толстой рамки (сторож типографики D145); вид тот же |
| `48fae0501` | 22.10 09:01 | 8 · Моменты | fix(today-scene): «Сегодня» на шкале шрифтов 16/13 (D145, как Главная в bd1ba46cd) — подписи 13/17, строки и кнопка 16/21; кружок-индикатор без толстой рамки |
| `cedaa4255` | 22.10 09:01 | 10 · Переводчик | fix(l10n): «Урок вместе» — занятие vi «Buổi», tr «Oturum», es на «ustedes»; замечания к полосе «Нет сети» |
| `e8c0b48bb` | 22.10 09:00 | 8 · Моменты | fix(spire): keep the tower window style line the window-height guard reads |
| `3f05fd1a2` | 22.10 09:00 | 1 · Ядро / 5 · Вход | fix(account): жёсткий HEX из комментария убран — сторож цветов экранов зелёный (цвет в коде уже g.bad темы) |
| `3bb32f502` | 22.10 09:00 | 2 · Дизайн | refactor(cards): gallery without dead code left after the zoom slider and pinch removal |
| `ce32c624c` | 22.10 08:51 | 10 · Переводчик | test(rules): guard that users/{uid} update keeps passing flashcardPagesRev_* fields (question 27) |
| `1b7a6f987` | 22.10 08:51 | координатор: назначить | perf(messages): personal messages are re-read only when users.inboxRev grows (question 27, step 3) |
| `4ee8c2585` | 22.10 08:50 | 2 · Дизайн | feat(home): poll lives in the Today row and a sheet, strictly optimistic (restored work of 19.10) |
| `d342eb73a` | 22.10 08:50 | координатор: назначить | test(scenes): аудит контраста сцен по 23 темам (уровень «Максимум», тёмное/светлое, день/вечер) — сторож и таблица |
| `276eef4d9` | 22.10 08:50 | 2 · Дизайн | feat(friends): «Урок вместе» — выбор друзей и кнопка в финале занятия, клиент к серверу ЯДРА (идея 2, за выключателем) |
| `823ca20e6` | 22.10 08:49 | координатор: назначить | fix(polls): набор опроса p2-053 про ползунок размера карточек снят с показа |
| `8c2a5ce21` | 22.10 08:49 | 1 · Ядро / 5 · Вход | feat(admin): Plus for any profile and any term — exact end date, 100-year cap, ring at once |
| `5f9a37825` | 22.10 08:49 | 2 · Дизайн | feat(friends): полоса «Нет сети · список сохранён в ЧЧ:ММ» над списком друзей (идея 1, за выключателем) |
| `9f1110997` | 22.10 08:49 | 2 · Дизайн | test(friends): сторож пустого списка принимает testID кнопки в любых кавычках |
| `69c5169f2` | 22.10 08:49 | 10 · Переводчик | fix(l10n): learning-v2 — турецкая подпись кнопки звука «Dinle: …» |
| `0fa88e9ce` | 22.10 08:48 | 2 · Дизайн | fix(friends): шкала 16/13 (D145) в шторке пары, «Позвать», визитке и огне строки — храповик типографики |
| `57778fe75` | 22.10 08:47 | 2 · Дизайн | test(cards): тесты галереи под решение «только нормальный вид» (шаг 0, без ползунка и щипка) |
| `c83690658` | 22.10 08:47 | 8 · Моменты | feat(spire): Peak v2 scene components behind a flag, dev route for parity |
| `3b60cfdf4` | 22.10 08:46 | 2 · Дизайн | feat(cards): «Карточки» — убраны ползунок масштаба и щипок, шаг сетки всегда 0 («только нормальный вид») |
| `5755b2f94` | 22.10 08:46 | 2 · Дизайн | perf(flashcards): pages are read on restore only when their revision changed, or once a day (question 27) |
| `f3e4462fe` | 22.10 08:45 | 1 · Ядро / 5 · Вход | feat(functions): every server write to user_messages bumps users.inboxRev (question 27, no deploy) |
| `bd1ba46cd` | 22.10 08:30 | 2 · Дизайн | fix(home-scene): scene captions and button on the 16/13 type scale |
| `11b7e2e34` | 22.10 08:30 | 8 · Моменты | feat(today): лента истории дней «Сегодня» — токены темы вместо жёстких цветов, даты и подписи на 9 языках (зачем: 22.10 владелец — восстановить работу 19.10) |
| `46fda29c6` | 22.10 08:18 | 1 · Ядро / 5 · Вход | fix(plus): голубой конец значка #5F90DB — белый ромб ≥ 3:1 по всей диагонали (вариант A, решение координатора 22.10); вид сохранён |
| `c45c95c67` | 22.10 08:18 | 2 · Дизайн | feat(dialogs): «Сцена» Диалогов и верх листа согласия — токены уровня «Максимум» при любом положении ползунка яркости |
| `5cbf514bf` | 22.10 08:17 | 2 · Дизайн | feat(friends): окно вехи «Серия вдвоём — 7/30/100» на вкладке «Друзья» через общую очередь окон (идея 1, за выключателем) |
| `1799b9803` | 22.10 08:17 | 2 · Дизайн | refactor(friends): один сборщик пар из снимка «Вместе» — Главная, финал занятия, веха |
| `a67d736e5` | 22.10 08:16 | координатор: назначить | fix(store): cut dev preview routes out of the store bundle |
| `9800f7808` | 22.10 08:15 | 8 · Моменты | feat(today): сцена «Сегодня» красится токенами темы уровня «Максимум» (homeSceneTokensForTheme) при любом положении ползунка |
| `24bc05745` | 22.10 08:15 | 2 · Дизайн | chore(friends): удалён неиспользуемый PremiumGoldUserName (золотое имя убрано у друзей, владелец 22.10) |
| `e3d1bdc36` | 22.10 08:15 | 2 · Дизайн | fix(home-scene): scene always drawn with the max theme level |
| `e8db72cc8` | 22.10 08:02 | координатор: назначить | perf(startup): broadcast and Home survey call the server only when their version changes (question 27) |
| `a9d95506f` | 22.10 08:00 | 2 · Дизайн | fix(home-scene): scene colours from theme tokens as in the locked etalon |
| `3246ee43e` | 22.10 08:00 | 10 · Переводчик | fix(l10n): «Диалоги» — живее «всё открытое пройдено» (en/es/pl), pt-BR «rank» вместо «nível» |
| `1a247db5f` | 22.10 07:49 | 2 · Дизайн | feat(friends): friendsGetProfiles отдаёт isPlus и plusUntilMs — кольцо Plus у друзей из batch |
| `8ce263b5f` | 22.10 07:46 | 2 · Дизайн | feat(home-scene): dev route /dev_home_scene_preview with all ten hero states |
| `dcc314113` | 22.10 07:46 | 8 · Моменты | fix(spire): «край зоны» — последний в маленькой комнате больше не получает пуш «почти повышение» |
| `649f85d6a` | 22.10 07:45 | 2 · Дизайн | fix(friends): визитка — тип FriendCardStatsData напрямую из pair_card_stats (tsc на HEAD) |
| `d156df4ff` | 22.10 07:45 | 2 · Дизайн | feat(dialogs): «Сцена» Диалогов — карточки диалогов под сценой с фильтром миров и честное «нет открытых диалогов» (за флагом DIALOGS_SCENE_V2_ENABLED) |
| `5959c14d7` | 22.10 07:45 | 2 · Дизайн | feat(friends): золотое имя убрано из карточек поиска и заявок друзей (владелец 22.10) — Plus виден кольцом у аватара |
| `a84ff7cf3` | 22.10 07:45 | 1 · Ядро / 5 · Вход | feat(plus): кольцо Plus в светлых темах затемнённое (владелец 22.10, №17) — PLUS_RING_COLORS_LIGHT, выбор по теме |
| `34afbe924` | 22.10 07:36 | 10 · Переводчик | feat(l10n): пустой раздел сообщений с юмором — «Новостей нет — значит, всё работает» на 9 языках (владелец 22.10) |
| `78bf20d85` | 22.10 07:34 | 10 · Переводчик | fix(l10n): «Друзья» — tr «günlük seri», «сегодня» в строке «ещё без занятия» на en/es/pt-BR/id/tr |
| `4b9f71abc` | 22.10 07:32 | 2 · Дизайн | feat(dialogs): «Сцена» Диалогов — отметка «сегодня диалог засчитан» (day_done) и голосовой лимит Free в строке состояния «лимит» |
| `79ce07cbe` | 22.10 07:31 | координатор: назначить | test(payments): revenuecat_transfer_phase2 снова компилируется — снят кейс удалённого возврата жемчуга |
| `48a578629` | 22.10 07:31 | 2 · Дизайн | feat(dialogs): верх листа «Включить AI-диалоги?» — вариант «в» «живой мини-диалог» за флагом DIALOGS_SCENE_V2_ENABLED |
| `12d655ef6` | 22.10 07:31 | 10 · Переводчик | fix(l10n): «Сегодня» (Сцена) — pl «karty», en «Peak», «урок» вместо «сессии», id «Runtunan», tr «kaldı» |
| `8e79881ea` | 22.10 07:30 | 2 · Дизайн | feat(friends): финал занятия — карточки «Серия вдвоём» и «Позвать» (идея 1, за выключателем) |
| `64a30403a` | 22.10 07:30 | 2 · Дизайн | feat(friends): визитка друга — дни серии · этаж Пика · дней вдвоём (идея 1, за выключателем) |
| `b3d0ed3e4` | 22.10 07:30 | 8 · Моменты | feat(today): «Сегодня» в стиле «Сцена», вариант A — экран, флаг (dev вкл / релиз выкл), dev-вход /dev_today_scene_preview |
| `7f0362b3d` | 22.10 07:21 | 2 · Дизайн | fix(friends): очередь «Позвать» без сети привязана к аккаунту — чужой зов не уходит (Ревизор 🔴) |
| `e6fc0317e` | 22.10 07:18 | 1 · Ядро / 5 · Вход | chore(release): Android versionCode 143 — сторож требует равенства с iOS buildNumber (2.0.1/143) |
| `13ea0162f` | 22.10 07:17 | 10 · Переводчик | fix(l10n): «Друзья» — tr «o da çalıştı» (гармония частицы), en тост «nudge them» |
| `50b0b6251` | 22.10 07:16 | координатор: назначить | fix(gift): refund within 5 business days in the cancel email and screen |
| `c6f517af4` | 22.10 07:15 | 2 · Дизайн | feat(dialogs): «Сцена» подключена в боевой хаб «Диалоги» за флагом DIALOGS_SCENE_V2_ENABLED — настоящие данные и действия, без второго чтения каталога |
| `7ef6fae1f` | 22.10 07:15 | координатор: назначить | chore(art): два цветных слоя в известный долг сторожа — порог ужесточён 22.10, ждут перерисовки Codex |
| `dc5e1ed82` | 22.10 07:15 | 8 · Моменты | feat(today): «Сегодня» в стиле «Сцена», вариант A — решение о состоянии и тексты на 9 языках (без экрана) |
| `dc64b9822` | 22.10 07:05 | 10 · Переводчик | fix(l10n): «Сцена» Диалогов — pl «karty», en «conversation partner» и «voice replies a day» |
| `213594003` | 22.10 07:02 | 2 · Дизайн | feat(friends): вкладка «Друзья» — шторка 2.0, огонь и «Позвать» в строках, очередь без сети (за выключателем) |
| `49677b5c4` | 22.10 06:20 | 1 · Ядро / 5 · Вход | feat(plus): кольцо у чужих по isPlus + plusUntilMs с запасом 72 ч (правило Ядра cbdecef56), без отката на isPremium |
| `4033c5948` | 22.10 06:17 | 2 · Дизайн | fix(friends): метки друга в журналах, тексты Переводчика, кольцо «сегодня» — shadow-ok |
| `8ce234788` | 22.10 06:17 | 2 · Дизайн | feat(home): tint the status strip above the Home Scene |
| `317f64e71` | 22.10 06:16 | координатор: назначить | feat(art): 18 сцен Главной и Диалогов в реестре темизированного арта + 56 картинок Codex (ai_off, cards*, continue, today… и сцены); бандл картинок +1870 КБ |
| `fce7a7cc2` | 22.10 06:16 | 1 · Ядро / 5 · Вход | fix(functions): серия вдвоём в зове — только при включённом «Вместе»; короткие метки uid в журналах |
| `f71e173c9` | 22.10 06:15 | 10 · Переводчик | fix(l10n): шторка теории — en «Test yourself», tr «Kendini sına», pt-BR без рода, vi «bài tập» |
| `0d8cea3ef` | 22.10 06:15 | 2 · Дизайн | feat(dialogs): «Диалоги» в стиле «Сцена» (вариант A) — состояния, вёрстка, dev-вход /dev_dialogs_scene_preview, за флагом DIALOGS_SCENE_V2_ENABLED |
| `7f3c3a605` | 21.10 22:15 | 2 · Дизайн | feat(home): wire the Scene into Home behind a dev-only flag |
| `16467cb3d` | 21.10 22:04 | 2 · Дизайн | test(paywall): два сторожа перенацелены на PaywallPlanRows — тест устарел структурно после 1359f5244, поведение не менялось |
| `94059b82c` | 21.10 22:03 | 10 · Переводчик | fix(l10n): словарь V2 — естественные строки на pl/id/tr/es/pt-BR (сохранение без сети, тост, подписи диктора) |
| `bd56321bb` | 21.10 22:03 | координатор: назначить | fix(alerts): безопасность ИИ с версий 1.x тоже приходит сразу (вариант к вопросу 19 владельца, Ревизор 22.10) |
| `74515b687` | 21.10 22:02 | 2 · Дизайн | fix(friends): "friend event already handled" mark is kept per owner, so account A cannot hide B's events |
| `85d6f02cf` | 21.10 22:02 | координатор: назначить | fix(style): PaywallPlanRows — метки shadow-ok у кольца радио и кромки выбранной строки (сторож «Тень» считал их обводкой контейнера) |
| `30829bf0b` | 21.10 22:01 | 1 · Ядро / 5 · Вход | fix(auth): switching account offline keeps everything and says "Connection lost" (owner rule 18.10, matrix B8) |
| `ce10c8b63` | 21.10 22:01 | 10 · Переводчик | fix(l10n): экран «Обучение» — vi «bài tập» для задания, en «Start somewhere else» |
| `4f33676dc` | 21.10 22:01 | 1 · Ядро / 5 · Вход | fix(functions): пуш «серия вдвоём» только при включённом «Вместе» (ревью Ядра 90db69ba4) |
| `cbdecef56` | 21.10 22:01 | 1 · Ядро / 5 · Вход | feat(plus-ring): public_profiles.isPlus/plusUntilMs — кольцо Plus без вводного доступа и без погасания при продлении |
| `22bed6f00` | 21.10 22:00 | 1 · Ядро / 5 · Вход | fix(premium): foreground cache branch drops the Plus cache when the access listener is not live |
| `48ee851bd` | 21.10 21:52 | 1 · Ядро / 5 · Вход | fix(site): /g/ and thanks — translated header/footer, equal store buttons |
| `12a746edd` | 21.10 21:51 | 1 · Ядро / 5 · Вход | fix(site): gift page — phrase follows language, readable subtitles, short EN copy |
| `5ed269c98` | 21.10 21:49 | 2 · Дизайн | feat(home): add Scene building blocks for the approved Home A |
| `3c45d2b0c` | 21.10 21:49 | 2 · Дизайн | fix(friends): a friend event already cached by Home or the bell drops the 30-min friends cache |
| `0ed3377dd` | 21.10 21:47 | координатор: назначить | perf(reads): ban check and daily phrase stop re-reading "no document" answers (№45 step 6) |
| `bb43e4fe9` | 21.10 21:46 | координатор: назначить | perf(notifications): Home bell probes for new items at most once per 5 min (№45 step 6) |
| `efb06783f` | 21.10 21:46 | 2 · Дизайн | perf(friends): repair cleanup runs once a day and reads only what it may delete (№45 step 6) |
| `bae288570` | 21.10 21:46 | координатор: назначить | fix(alerts): деньги и безопасность ИИ не уходят в недельную сводку (Ревизор 21.10, на «да» владельца) |
| `e0a0c971e` | 21.10 21:46 | 1 · Ядро / 5 · Вход | perf(auth): account card takes the linked provider from the signed-in session (№45 step 6) |
| `71a93e367` | 21.10 21:45 | 2 · Дизайн | feat(design): плитка ответа и блок разбора заданий V2 — вид эталона экзамена (общие токены) |
| `286a45bc7` | 21.10 21:45 | 1 · Ядро / 5 · Вход | fix(account): wipe and carry new Learning V2 phone keys with the account |
| `d64240633` | 21.10 21:35 | координатор: назначить | fix(gift): refund list by query, cancel email once, sandbox payments silent |
| `586248557` | 21.10 21:34 | 1 · Ядро / 5 · Вход | perf(premium): returning from background reads the cloud at most once per 6 h (№45 step 6) |
| `b5d1957f5` | 21.10 21:31 | 2 · Дизайн | feat(design): общие токены плиток ответов и блока разбора по эталону экзамена (chapter-exam-season.html) |
| `a02d64a0a` | 21.10 21:30 | 8 · Моменты | fix(spire): кольцо Plus у живых соседей — сервер пишет members.<uid>.isPremium (владелец 21.10, «Plus виден другим») |
| `17e26d73c` | 21.10 21:30 | 2 · Дизайн | perf(friends): friends list and requests cached 30 min; tab focus probes notifications head instead of reading the full list (№45 step 6) |
| `11bbac243` | 21.10 21:30 | координатор: назначить | fix(gift): owner alert, admin «к возврату», buyer email on gift cancel; no cancel after expiry |
| `4c59efa86` | 21.10 21:18 | 2 · Дизайн | feat(design): кольцо Plus у аватара — один общий компонент и 7 мест (реестр №6) |
| `67ba33af2` | 21.10 21:17 | координатор: назначить | feat(gift): Plus gift via website — server, /g/ link rule, English copy |
| `e04ab15d1` | 21.10 21:17 | 2 · Дизайн | fix(dialogs): microphone in Dialogues works like in lessons (no Android 12-and-below block) |
| `58a4b9f35` | 21.10 21:17 | 2 · Дизайн | feat(design): общая оболочка заданий V2 (шапка, HUD, название, подвал) + «Найди пары» с одним заголовком + dev-превью «Собери перевод» (заполнено / ошибка) |
| `b13aac24e` | 21.10 21:16 | 1 · Ядро / 5 · Вход | feat(plus): полноэкранная заставка Plus при запуске, раз в 14 дней (№35, владелец 21.10; эталон plus-launch-etalon.html) |
| `04fd38b66` | 21.10 21:00 | координатор: назначить | fix(perf): lite mode switch re-renders open screens; add daily parity report |
| `c0bfb85b7` | 21.10 20:45 | координатор: назначить | feat(perf): lite mode for weak phones (RAM < 3 GB or manual switch in Settings) |
| `90db69ba4` | 21.10 20:45 | 2 · Дизайн | feat(friends): pair streak core and streak-aware nudge push (idea 1, part 1) |
| `7d4fa4fef` | 21.10 20:42 | 1 · Ядро / 5 · Вход | refactor(site): drop «по нику» gift delivery (owner 21.10) |
| `585dcf878` | 21.10 20:41 | 1 · Ядро / 5 · Вход | feat(site): gift Plus delivery modes — email, link, nick (behind switch) |
| `3d487dfc1` | 21.10 20:40 | координатор: назначить | chore(coins): backfill dry run checks real ledger prepare; Super Sunday multiplier like the course (Reviewer notes on b3ac3348d) |
| `b3ac3348d` | 21.10 20:37 | координатор: назначить | chore(coins): one-off backfill script for Learning V2 session coins earned before the bridge (dry by default) |
| `40ecaaa65` | 21.10 20:33 | координатор: назначить | fix(build): commit missing dependencies of b0d445474 so build 142 compiles from HEAD |
| `df3d5dec2` | 21.10 20:31 | 10 · Переводчик | fix(l10n): Пик «Собери перевод» — uk/pl подсказки перестановки звучат естественно |
| `4269259ee` | 21.10 20:30 | координатор: назначить | fix(video): подробные логи [VIDEO-REMINDER] по цепочке «Напомнить» (баг тестера 21.10, iPhone: «Не удалось поставить напоминание») |
| `65d11f1ab` | 21.10 20:30 | координатор: назначить | chore(sound): drop temporary [SOUND-AUDIT] audio_mode trace |
| `5450b02a8` | 21.10 20:30 | координатор: назначить | feat(alerts): Telegram — сразу только важное и коротко, остальное в недельную сводку (№48, владелец 21.10) |
| `56587085d` | 21.10 20:20 | 2 · Дизайн | feat(design): перенос эталонов 21.10 — «Найди пары» (слова 36 % + переводы) и Пик «Собери перевод» (ячейки + «Проверить») |
| `4c9a16546` | 21.10 20:19 | координатор: назначить | fix(content): транскрипции у всех фраз дня и уроков; испанская сборка урока 3 |
| `11906059b` | 21.10 20:02 | координатор: назначить | perf(mistakes): journal appends only new chunks; audio tables warm after map (weak Android) |
| `5a412ea83` | 21.10 19:31 | 1 · Ядро / 5 · Вход | perf(functions): cache admin analytics snapshot and trends for 6 hours |
| `0982714fa` | 21.10 19:31 | 1 · Ядро / 5 · Вход | fix(functions): mistake sync drops foreign-language events instead of rejecting batch |
| `e17f58267` | 21.10 19:30 | координатор: назначить | fix(transcription): словарь закрывает неверные транскрипции из репортов #6 #7 #25 #26 |
| `22001d33e` | 21.10 19:16 | 8 · Моменты | fix(spire): rooms fill regardless of join day; sparse rooms refresh every 30 min |

## В. До сборки 2.0.2, контент Learning V2 и документы с кодом — только автоматический скан

| Коммит | Когда | Зона | Заголовок |
|---|---|---|---|
| `14dd45fd9` | 25.10 08:15 | координатор: назначить | docs(legal): privacy §5 — special themes unlock by achievements, special conditions or an active Phraseman Plus subscription |
| `d6eddaeb6` | 25.10 07:36 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 05.11-14+16 |
| `3315af50e` | 25.10 07:07 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 05.17-21 |
| `21d288663` | 24.10 23:34 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 05.22-33 |
| `24215c939` | 24.10 23:30 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 05.34+36-37 |
| `91a773989` | 24.10 23:19 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 05.38-50 |
| `2161c7645` | 24.10 23:15 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 05.51-53 |
| `4e9a0c89e` | 24.10 23:03 | Learning V2 | fix(learning-v2): clarify grammar contexts and sentence assembly in chapters five and six |
| `0a5a9ad00` | 24.10 23:00 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 06.20-38 |
| `02ccbaf43` | 24.10 22:45 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 06.38-44 |
| `8001e0b6c` | 24.10 22:34 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 06.45-54 |
| `f025317e1` | 24.10 22:30 | Learning V2 | fix(learning-v2): clarify grammar and situations in intros 06.55-07.09 |
| `e42a08ad3` | 24.10 22:19 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 07.10-50 |
| `ca2e821c1` | 24.10 22:15 | Learning V2 | fix(learning-v2): teach sentence assembly in selected intros 07.55-08.15 |
| `e906ebf9d` | 24.10 22:00 | Learning V2 | fix(learning-v2): teach sentence assembly in intros 08.18-24 |
| `8df769edc` | 24.10 21:50 | Learning V2 | fix(learning-v2): teach sentence assembly in intros 08.25-41 |
| `74efee470` | 24.10 21:45 | Learning V2 | fix(learning-v2): teach sentence assembly in intros 08.42-09.35 |
| `f9c3546bf` | 24.10 21:30 | Learning V2 | fix(learning-v2): teach sentence assembly in intros 09.36-10.04 |
| `45d369923` | 24.10 21:02 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 10.05-20 |
| `30b1c0e13` | 24.10 20:52 | Learning V2 | test(learning-v2): поведение удержания микрофона — SpeakHoldButton: нажал → старт записи, отпустил → стоп; без устройства речи / без остатка попыток старта нет |
| `17e859e46` | 24.10 20:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 10.21-34 |
| `c4f7aaf80` | 24.10 20:33 | Learning V2 | fix(learning-v2): a passed chapter exam OPENS the skipped chapter sessions (progress v2 open, no completion, no stars) instead of completing them — owner lock «open ≠ completed»; store.complete also refused out-of-chain sessions, so the chapter never opened |
| `9f33e7ff1` | 24.10 20:32 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 10.35-50 |
| `c8d64ad23` | 24.10 20:24 | координатор: назначить | docs(owner-locks): lock 24.10 «ошибки можно удалять» — registry row + KNOWN_GUARDS (own hunks only) |
| `e6e052400` | 24.10 20:21 | Learning V2 | test(learning-v2): гейт hold-to-talk обновлён под реальную проводку — удержание в «Скажи вслух» идёт через SpeakHoldButton (onHoldStart → startVoiceHold → holdActive) |
| `03a2c182d` | 24.10 20:16 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 10.51-56 |
| `af51c41b2` | 24.10 20:04 | Learning V2 | feat(learning-v2): task count per session in the light course index (same builder as the player, word cards excluded; changed content shows no number instead of a wrong one) — for the episode window '0 tasks' |
| `2ebda86c4` | 24.10 20:01 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 11.01-16 |
| `2353c2214` | 24.10 20:00 | координатор: назначить | docs(legal): privacy §5 — special themes unlocked by achievements |
| `2e438ac8b` | 24.10 19:51 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 11.17-47 |
| `64f9d8f46` | 24.10 19:32 | Learning V2 | feat(learning-v2): экран теста «Не хочу с начала» по макету (chapter-exam-season, раздел 6) — старт, вопрос с карточкой темы и точками попыток, «Ещё 2 вопроса», итог «Открыто до урока N»; за флагом (выключен) |
| `1cca877ce` | 24.10 19:23 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapters 11.48-56 and 12.01-25 |
| `90c13ffa8` | 24.10 18:46 | координатор: назначить | docs(legal): privacy dated October 24, 2026 for the release package |
| `83f5568ad` | 24.10 18:42 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 12.26-37 |
| `179a8edf7` | 24.10 18:21 | Learning V2 | fix(learning-v2): «Скажи вслух» — подпись под микрофоном «Удерживай и говори» по макету, мёртвая строка holdMicrophone убрана; пометки замка у двух сторожей |
| `882eec362` | 24.10 18:04 | 2 · Дизайн | docs(friends): дуэль — серверный лимит «три в день» остаётся защитой друга (комментарии) |
| `9eca67384` | 24.10 18:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 12.38-41 |
| `ddf842151` | 24.10 17:49 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 12.42-52 |
| `0e23574fe` | 24.10 17:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 12.53-56 |
| `d86a6cb8f` | 24.10 17:34 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 13.01-07 |
| `bd1bdb209` | 24.10 17:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 13.08-12 |
| `7d3bfcfde` | 24.10 17:20 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 13.13-23 |
| `593385f6b` | 24.10 17:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 13.24-27 |
| `fded72424` | 24.10 17:05 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 13.28-42 |
| `131865c61` | 24.10 17:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 13.43-56 |
| `7277d701e` | 24.10 16:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 14.01-06 |
| `f3c170bbd` | 24.10 16:34 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 14.07-20 |
| `034a7d571` | 24.10 16:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 14.21-23 |
| `082085f34` | 24.10 16:20 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 14.24-38 |
| `657f37bde` | 24.10 16:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 14.39-41 |
| `104c56a1f` | 24.10 16:03 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 14.42-56 and 15.01-02 |
| `7b92e2127` | 24.10 16:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 15.03-05 |
| `a33b10321` | 24.10 15:48 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 15.06-13 |
| `618c6ebe7` | 24.10 15:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 15.14-17 |
| `c79ee8a44` | 24.10 15:34 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 15.18-33 |
| `2cf146fd4` | 24.10 15:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 15.34-46 |
| `fe0eb71a7` | 24.10 15:17 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 15.47-56 |
| `ed36e1675` | 24.10 15:05 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 16.01-07 |
| `f059b88e3` | 24.10 14:51 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 16.08-22 |
| `44ac75602` | 24.10 14:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 16.23-26 |
| `6ea46eb31` | 24.10 14:33 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 16.27-37 |
| `87c1024cf` | 24.10 14:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 16.38-41 |
| `d0f9d9981` | 24.10 14:19 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 16.42-53 |
| `4fc917e34` | 24.10 14:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 16.54-56 |
| `5f26f0ced` | 24.10 14:06 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 17.01-03 |
| `ac2af4797` | 24.10 14:03 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 17.04-17 |
| `f308d7ff7` | 24.10 14:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 17.18-21 |
| `31af00175` | 24.10 13:50 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 17.22-37 |
| `d34cc38db` | 24.10 13:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 17.38-41 |
| `8eaed4187` | 24.10 13:33 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapters 17.42-56 and 18.01-03 |
| `16963a572` | 24.10 13:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 18.04-08 |
| `9c3242565` | 24.10 13:21 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 18.09-23 |
| `4141330cd` | 24.10 13:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 18.24-27 |
| `416cf3d22` | 24.10 13:04 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 18.28-44 |
| `a5bebf36f` | 24.10 13:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 18.45-56 |
| `aaced06a4` | 24.10 12:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 19.01-07 |
| `eb2e3807b` | 24.10 12:34 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 19.08-20 |
| `a4022df11` | 24.10 12:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 19.21-24 |
| `fbd343056` | 24.10 12:18 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 19.25-38 |
| `2c7ce0b1e` | 24.10 12:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 19.39-42 |
| `f562dee1d` | 24.10 12:03 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 19.43-55 |
| `7a8becaf2` | 24.10 12:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in sessions 19.56 and 20.01-04 |
| `8a0c87a19` | 24.10 11:49 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 20.05-26 |
| `89b1fd0f6` | 24.10 11:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 20.27-35 |
| `b9f864f6c` | 24.10 11:35 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 20.36-56 |
| `2a7707cef` | 24.10 11:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 21.01-05 |
| `a15825984` | 24.10 11:18 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 21.06-23 |
| `6961c430d` | 24.10 11:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter 21.24-44 |
| `c3d48ae6f` | 24.10 11:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapters 21.45-56 and 22.01-03 |
| `d577de91f` | 24.10 10:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-two 04-26 |
| `a683add0c` | 24.10 10:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-two 27-45 |
| `b8a3187cd` | 24.10 10:16 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-two 46-56 |
| `40fdc3e8c` | 24.10 10:01 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-three 01-19 |
| `02b086a70` | 24.10 09:50 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-three 20-52 |
| `933a58b64` | 24.10 09:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-three 53-56 and twenty-four 56 |
| `e1417de66` | 24.10 09:33 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-four 01-20 |
| `064a58478` | 24.10 09:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-four 21-26 |
| `c499f6848` | 24.10 09:18 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-four 27-47 |
| `9543bbb3a` | 24.10 09:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-four 48-55 |
| `947519247` | 24.10 09:05 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-five 01-14 |
| `725ef48e6` | 24.10 09:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-five 15-38 |
| `437a34bad` | 24.10 08:46 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-five 39-56 |
| `cd76de7f6` | 24.10 08:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-six 01-07 |
| `ca3124bc4` | 24.10 08:19 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-six 08-23 |
| `9b98764a3` | 24.10 08:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-six 24-26 |
| `399015a24` | 24.10 08:03 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-six 27-35 |
| `96b73a07e` | 24.10 08:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-six 36-56 |
| `e8a7739d4` | 24.10 07:45 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-seven 01-04 |
| `19deb95f3` | 24.10 07:33 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-seven 05-16 |
| `675c417a6` | 24.10 07:30 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-seven 17-20 |
| `0851336a9` | 24.10 07:18 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-seven 21-35 |
| `086e10de8` | 24.10 07:15 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-seven 36-39 |
| `bc082acf7` | 24.10 07:03 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-seven 40-45 |
| `f1da81bf7` | 24.10 07:00 | Learning V2 | fix(learning-v2): teach one grammar point per intro in chapter twenty-seven 46-53 |
| `c15eb3a2a` | 24.10 06:30 | Learning V2 | fix(learning-v2): vary tasks within episodes 13.33 and 13.34 |
| `7e40cd24a` | 24.10 06:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions fifty-one and fifty-two |
| `290a74635` | 24.10 06:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions forty-nine and fifty |
| `8fbbae785` | 24.10 05:50 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions forty-seven and forty-eight |
| `274f06874` | 24.10 05:45 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session forty-six |
| `f741a098a` | 24.10 05:33 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions forty-four and forty-five |
| `132a1f7ad` | 24.10 05:30 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session forty-three |
| `8e8feace2` | 24.10 05:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session forty-two |
| `6d4c50d09` | 24.10 05:03 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session forty-one |
| `2db32d716` | 24.10 05:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session forty |
| `5e1f84c54` | 24.10 04:48 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions thirty-eight and thirty-nine |
| `fe89d6d47` | 24.10 04:45 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session thirty-seven |
| `fa08c97ab` | 24.10 04:33 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session thirty-six |
| `facb5c232` | 24.10 04:30 | Learning V2 | fix(learning-v2): vary tasks within episode 13.22 |
| `cd3b5f9d9` | 24.10 04:19 | Learning V2 | fix(learning-v2): add episode 27.35 and vary tasks in 13.32 |
| `58e1eaf05` | 24.10 04:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session thirty-four |
| `bc440c050` | 24.10 04:03 | Learning V2 | fix(learning-v2): add episode 27.33 and vary tasks in 13.31 |
| `6eb9b5fa5` | 24.10 04:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven session thirty-two |
| `ff3fc9c18` | 24.10 03:45 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions thirty and thirty-one |
| `0ebb37b6d` | 24.10 03:36 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions twenty-seven through twenty-nine |
| `31c270598` | 24.10 03:30 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions twenty-five and twenty-six |
| `6738cb5e3` | 24.10 03:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions twenty-three and twenty-four |
| `c7c27e459` | 24.10 03:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions twenty through twenty-two |
| `9f989d34d` | 24.10 02:47 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions seventeen through nineteen |
| `0b146731c` | 24.10 02:30 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions fifteen and sixteen |
| `b340e8fb6` | 24.10 02:03 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions thirteen and fourteen |
| `88e00f67c` | 24.10 01:45 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions eleven and twelve |
| `be89fbd4c` | 24.10 01:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions nine and ten |
| `002c82e3d` | 24.10 01:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions seven and eight |
| `97c317ba5` | 24.10 00:30 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions five and six |
| `7c8c6fe68` | 24.10 00:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions three and four |
| `78f896040` | 24.10 00:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-seven sessions one and two |
| `63a09be52` | 23.10 23:36 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions fifty-four through fifty-six |
| `ca1a5cac8` | 23.10 23:19 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions fifty-one through fifty-three |
| `6563a6b7e` | 23.10 23:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions forty-seven through fifty |
| `20215e1ce` | 23.10 22:45 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions forty-five and forty-six |
| `6ff728799` | 23.10 22:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions forty-four and allow literal paperclip translations |
| `a30cab93a` | 23.10 21:45 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions forty-three |
| `23002de51` | 23.10 21:18 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions forty-one and forty-two |
| `3742c3a6c` | 23.10 20:30 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions thirty-nine and forty |
| `a41b4ee8f` | 23.10 20:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions thirty-seven and thirty-eight |
| `069635995` | 23.10 20:02 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions thirty-five and thirty-six |
| `3c5552943` | 23.10 20:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions thirty-four |
| `4eaf2d42e` | 23.10 19:48 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions thirty-three and recognize dependent copular clauses |
| `7ea50d632` | 23.10 19:45 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions thirty-two |
| `519ef0d3a` | 23.10 19:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions thirty and thirty-one |
| `a754d93af` | 23.10 19:05 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions twenty-eight and twenty-nine |
| `e4e4a64dd` | 23.10 18:49 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions twenty-five through twenty-seven |
| `d942d9819` | 23.10 18:45 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions twenty-three and twenty-four |
| `893b372e0` | 23.10 18:20 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions twenty through twenty-two |
| `da5bf5b81` | 23.10 18:15 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions eighteen and nineteen |
| `32621ad90` | 23.10 18:00 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions fifteen through seventeen |
| `ba5622ed9` | 23.10 17:48 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions thirteen and fourteen |
| `5e7831832` | 23.10 17:18 | Learning V2 | fix(learning-v2): add varied chapter twenty-six sessions ten through twelve |
| `b0505d976` | 23.10 17:15 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes fifty-two through fifty-six practice |
| `81c2b004d` | 23.10 17:00 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes forty-nine through fifty-one practice |
| `4821829c5` | 23.10 16:49 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes forty-four through forty-eight practice |
| `8db671adf` | 23.10 16:45 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes forty through forty-three practice |
| `ac2b509e4` | 23.10 16:34 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes thirty-four through thirty-nine practice |
| `87c9fd682` | 23.10 16:30 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes twenty-eight through thirty-three practice |
| `ae0aa591a` | 23.10 16:15 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes twenty-five through twenty-seven practice |
| `e270915de` | 23.10 16:03 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes nineteen through twenty-four practice |
| `ca35cdf12` | 23.10 16:00 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes sixteen through eighteen practice |
| `f39c0bb2c` | 23.10 15:49 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes ten through fifteen practice |
| `98b7fc889` | 23.10 15:45 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes seven through nine practice |
| `c23904363` | 23.10 15:30 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes four through six practice |
| `85b08f368` | 23.10 15:18 | Learning V2 | fix(learning-v2): vary chapter twenty-five episodes one through three practice |
| `59295caa9` | 23.10 15:15 | Learning V2 | fix(learning-v2): vary chapter twenty-six episodes four through six practice |
| `12e6d6b51` | 23.10 15:00 | Learning V2 | fix(learning-v2): vary chapter twenty-six episodes one through three practice |
| `947b40df1` | 23.10 14:49 | Learning V2 | fix(learning-v2): vary chapter twenty-six episodes seven and eight practice |
| `3f2182c86` | 23.10 14:45 | Learning V2 | fix(learning-v2): write chapter twenty-six sessions seven through nine with varied episode practice |
| `7353b4949` | 23.10 14:30 | Learning V2 | fix(learning-v2): write chapter twenty-six sessions four through six |
| `76fc4dae9` | 23.10 14:15 | Learning V2 | fix(learning-v2): write chapter twenty-six sessions one through three |
| `1eec22259` | 23.10 14:00 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions fifty-one through fifty-six |
| `cedc32eaf` | 23.10 13:50 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions forty-seven through fifty |
| `e2dd0f433` | 23.10 13:45 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions forty-four through forty-six |
| `8ec38bd7a` | 23.10 13:30 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions forty-one through forty-three |
| `f5618cae1` | 23.10 13:20 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions thirty-seven through forty |
| `ed648a8ab` | 23.10 13:15 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions thirty-four through thirty-six |
| `840637bff` | 23.10 13:03 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions thirty-one through thirty-three |
| `00c64407d` | 23.10 13:00 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions twenty-eight through thirty |
| `6ba8053a1` | 23.10 12:47 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions twenty-five through twenty-seven |
| `00fdb6cf4` | 23.10 12:45 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions twenty-three and twenty-four |
| `0cd45d77c` | 23.10 12:32 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions twenty through twenty-two |
| `cdeef15b2` | 23.10 12:30 | Learning V2 | fix(learning-v2): add sessions eighteen nineteen and repair card translations |
| `876347838` | 23.10 12:18 | Learning V2 | fix(learning-v2): repair session nine and transfer chapter twenty-five through seventeen |
| `13563003b` | 23.10 12:11 | Learning V2 | fix(learning-v2): write chapter twenty-five session fifteen |
| `8c3329403` | 23.10 12:10 | Learning V2 | fix(learning-v2): write chapter twenty-five sessions twelve through fourteen |
| `8b9fbb3b8` | 23.10 12:05 | Learning V2 | fix(learning-v2): remove country vocabulary from four more chapter twenty-four sessions |
| `c00055632` | 23.10 12:01 | Learning V2 | fix(learning-v2): replace countries in lesson twenty-four sessions five and six |
| `565e128af` | 23.10 11:47 | Learning V2 | fix(learning-v2): replace session seven countries and save following sessions |
| `74de180f3` | 23.10 11:45 | Learning V2 | fix(learning-v2): add lesson twenty-five everyday sessions six to seven |
| `5c350755f` | 23.10 11:33 | Learning V2 | fix(learning-v2): add lesson twenty-five everyday sessions three to five |
| `9727e2c8f` | 23.10 11:30 | Learning V2 | fix(learning-v2): add lesson twenty-five everyday sessions one to two |
| `5cbadbe08` | 23.10 11:18 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions fifty-two to fifty-six |
| `a07900abf` | 23.10 11:15 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions forty-nine to fifty-one |
| `67aebbccf` | 23.10 11:04 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions forty-four to forty-eight |
| `3407a8863` | 23.10 11:00 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions forty-two to forty-three |
| `087ffc793` | 23.10 10:47 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions forty to forty-one |
| `7684505ca` | 23.10 10:45 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions thirty-seven to thirty-nine |
| `013712762` | 23.10 10:32 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions thirty-three to thirty-six |
| `847d9540d` | 23.10 10:30 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions thirty-one to thirty-two |
| `c4bcb8a70` | 23.10 10:17 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions twenty-seven to thirty |
| `d3d74bb01` | 23.10 10:15 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions twenty-five to twenty-six |
| `5f4e6e3d2` | 23.10 10:03 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions twenty-two to twenty-four |
| `cd06c2184` | 23.10 10:00 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions twenty to twenty-one |
| `37ec38048` | 23.10 09:48 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions seventeen to nineteen |
| `8b44eb421` | 23.10 09:45 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions thirteen to sixteen |
| `bfd0e50d7` | 23.10 09:32 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions eleven to twelve |
| `794321d8f` | 23.10 09:30 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions eight to ten |
| `958089845` | 23.10 09:18 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions five to seven |
| `5fd2b2bc9` | 23.10 09:15 | Learning V2 | fix(learning-v2): add lesson twenty-four everyday sessions one to four |
| `51b2591cc` | 23.10 09:00 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions fifty-one to fifty-six |
| `0cd67a415` | 23.10 08:45 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions forty-five to fifty |
| `32239a4f6` | 23.10 08:30 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions thirty-nine to forty-four |
| `1fb6077ac` | 23.10 08:15 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions thirty-four to thirty-eight |
| `6b56bf72d` | 23.10 08:04 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions thirty-one to thirty-three |
| `d708d9af7` | 23.10 08:00 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions twenty-seven to thirty |
| `7e6c4e0f6` | 23.10 07:50 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions twenty-five to twenty-six |
| `39c0bdef2` | 23.10 07:46 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions twenty-two to twenty-four |
| `9e551a3f5` | 23.10 07:34 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions seventeen to twenty-one |
| `eb085131b` | 23.10 07:30 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions thirteen to sixteen |
| `d69c0d132` | 23.10 07:18 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions seven to twelve |
| `261cb791f` | 23.10 07:15 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions five to six |
| `cd26c98f5` | 23.10 07:02 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions three to four |
| `36ed9cc57` | 23.10 07:00 | Learning V2 | fix(learning-v2): add lesson twenty-three everyday sessions one to two |
| `c62bb76fd` | 23.10 06:50 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions fifty-five to fifty-six |
| `72ef7a510` | 23.10 06:48 | Learning V2 | fix(learning-v2): type check green — «open» state in the lessons icon map, map node type, node paint and chapters course (playable like current) |
| `cbf70be61` | 23.10 06:46 | Learning V2 | fix(learning-v2): theory lessons 14, 18, 22 — grammar term tips in 7 languages (part 2 of 2) |
| `89038d530` | 23.10 06:45 | Learning V2 | fix(learning-v2): theory lessons 1, 3, 4, 9 — grammar term tips in en, es, pt-BR, vi, id, tr, pl (part 1 of 2) |
| `d77a34b74` | 22.10 20:17 | координатор: назначить | docs(legal): privacy §5 — shared phrase of the day answer seen by friends |
| `a6d7c2d75` | 22.10 20:16 | Learning V2 | fix(learning-v2): swipe-down closes the chapter exam sheet and the dictionary lessons sheet (SheetSwipeClose, same path as backdrop) — sheet_handle_implies_swipe green |
| `a6634f636` | 22.10 20:06 | Learning V2 | fix(learning-v2): lesson 11 theory — no mention of did before lesson 13 (7 languages) |
| `bdeda39ea` | 22.10 19:18 | Learning V2 | fix(learning-v2): theory lessons 20-22 (part 4 of 4) — English words glossed in en, es, pt-BR, vi, id, tr, pl; lesson 5 our/their example |
| `2fdc91ac4` | 22.10 19:17 | Learning V2 | fix(learning-v2): theory lessons 17-19 (part 3 of 4) — English words glossed in en, es, pt-BR, vi, id, tr, pl; lesson 5 our/their example |
| `ba609aa40` | 22.10 19:16 | Learning V2 | fix(learning-v2): theory lessons 7-12 (part 2 of 4) — English words glossed in en, es, pt-BR, vi, id, tr, pl; lesson 5 our/their example |
| `e7db69bd7` | 22.10 19:16 | Learning V2 | fix(learning-v2): theory lessons 4-6 (part 1 of 4) — English words glossed in en, es, pt-BR, vi, id, tr, pl; lesson 5 our/their example |
| `7ccbfe79c` | 22.10 19:15 | Learning V2 | fix(learning-v2): lesson 22 title without the service note; guard — no owner/slot/TODO notes in visible lesson and episode titles |
| `cdbd3c0e3` | 22.10 19:06 | координатор: назначить | docs(legal): privacy §5 — weekly friend summary and the "Show my week to friends" switch |
| `84d5b73d0` | 22.10 19:01 | Learning V2 | feat(learning-v2): progress v2 part c — map/season state «open» (playable, not completed), lessons tab passes opened, newcomer accounts for placement, player stops retrying a logical rejection ([LV2-PROGRESS]) |
| `8a94fee11` | 22.10 19:00 | Learning V2 | fix(learning-v2): lessons 19-22 theory — English terms translated (ru, uk); lesson 21-22 session maps: 21.27 -> to, 21.42 -> want you to, 22.37 -> to (purpose) |
| `06976722e` | 22.10 18:47 | Learning V2 | fix(learning-v2): lessons 17-18 theory — English terms translated (ru, uk); lessons 15-18 session maps already match the real sessions |
| `4ae393a54` | 22.10 18:45 | Learning V2 | fix(learning-v2): lessons 11-14 theory — session maps follow the real sessions; irregular verbs translated in lesson 12 (ru, uk) |
| `6e070033f` | 22.10 18:11 | Learning V2 | test(learning-v2): owner locks — «Не хочу с начала» once per account and placement test №10 rules; registry row in OWNER_LOCKS.md |
| `a6e393404` | 22.10 18:01 | Learning V2 | fix(learning-v2): lessons 7-10 theory — session maps follow the real sessions; English terms translated (ru, uk) |
| `bd1aedefa` | 22.10 18:00 | Learning V2 | feat(learning-v2): placement test engine (№10) — one question per lesson, +2 after a miss, 2 of 3 credits, stop at first miss; packet with the opened-layer fork |
| `23ea25b5c` | 22.10 17:30 | Learning V2 | feat(learning-v2): app copy of lesson 1 — uk situations + 9 new ru situations |
| `ac97b3dad` | 22.10 17:29 | Learning V2 | feat(learning-v2): lesson 3 release rebuilt — uk listen-choose situations (Translator c751dbc61, 8 «стоїть»→«чекає» for the prompt splitter) + 9 new ru situations for sound-changed tasks (Theory c094b42cc) |
| `61314cdc1` | 22.10 17:28 | Learning V2 | feat(learning-v2): lesson 3 factory source — uk listen-choose situations (Translator c751dbc61, 8 «стоїть»→«чекає» for the prompt splitter) + 9 new ru situations for sound-changed tasks (Theory c094b42cc) |
| `a0ef4ac76` | 22.10 17:26 | Learning V2 | feat(learning-v2): lesson 2 release rebuilt — uk listen-choose situations (Translator c751dbc61, 8 «стоїть»→«чекає» for the prompt splitter) + 9 new ru situations for sound-changed tasks (Theory c094b42cc) |
| `baa37024a` | 22.10 17:25 | Learning V2 | feat(learning-v2): lesson 2 factory source — uk listen-choose situations (Translator c751dbc61, 8 «стоїть»→«чекає» for the prompt splitter) + 9 new ru situations for sound-changed tasks (Theory c094b42cc) |
| `e38d512a0` | 22.10 16:33 | Learning V2 | feat(learning-v2): app copy of lesson 3 — situations + 7 of 12 new-word hole fixes |
| `d07d51ca5` | 22.10 16:32 | Learning V2 | feat(learning-v2): app copy of lesson 2 — situations + 7 of 12 new-word hole fixes |
| `62072c33b` | 22.10 16:30 | Learning V2 | feat(learning-v2): app copy of lesson 1 — situations + 7 of 12 new-word hole fixes; hole gate down to 5 (await audio), transfer-pending list |
| `4a4941a56` | 22.10 16:24 | Learning V2 | feat(learning-v2): lesson 3 release rebuilt — listen-choose situations after Theory review (fd901feb7) + new-word hole fixes (Theory 38241ac98) |
| `9c11eed3d` | 22.10 16:23 | Learning V2 | feat(learning-v2): lesson 1 release rebuilt — listen-choose situations after Theory review (fd901feb7) + new-word hole fixes (Theory 38241ac98) |
| `24ed27421` | 22.10 16:22 | Learning V2 | feat(learning-v2): lesson 3 factory source — listen-choose situations after Theory review (fd901feb7) + new-word hole fixes (Theory 38241ac98) |
| `7f0ebc767` | 22.10 16:17 | Learning V2 | feat(learning-v2): lesson 2 factory source — listen-choose situations after Theory review (fd901feb7) + new-word hole fixes (Theory 38241ac98) |
| `e4d205af3` | 22.10 16:05 | Learning V2 | feat(learning-v2): l06/s40 hole fix (invitation on the table) — factory source and release; app transfer awaits audio |
| `4477322d8` | 22.10 15:51 | Learning V2 | feat(learning-v2): lesson 2 release rebuilt — listen-choose situations after Theory review (fd901feb7) + new-word hole fixes (Theory 38241ac98) |
| `1f51ac5ec` | 22.10 15:30 | Learning V2 | feat(learning-v2): episode titles of lessons 1-3 from Theory's approved table (168, at most two words); title gate frozen at 0 |
| `efd34295c` | 22.10 15:05 | Learning V2 | chore(learning-v2): скрипт применения новых названий эпизодов (правило владельца «≤ 2 слов») — синхронно колонка «Момент сцены» плана курса и session_titles_v1.generated.ts, только уроки 1–3, пробный прогон по умолчанию, отказ на урок вне 1–3, > 2 слов, двоеточие и латиницу; ждёт одобренной таблицы 12 · ТЕОРИЯ |
| `ec4b2985a` | 22.10 15:00 | Learning V2 | test(learning-v2): сторож «название эпизода ≤ 2 слов» (правило владельца 22.10) — храповик по числу нарушителей, 149 из 168, может только уменьшаться; экзамен главы: зачёркнутый неверный ответ в разборе — цвет ошибки текущей темы (g.bad) вместо фиксированного коричневого (закон «цвета только из темы») |
| `20747cbe1` | 22.10 14:47 | Learning V2 | test(learning-v2): сторож «новое слово объявлено до фразы» для БОЕВОГО курса (factory_native generated_release, 1230 занятий, 4923 слова): карточка есть и стоит раньше первой фразы; 12 найденных дыр заморожены списком, он может только сокращаться. Архивный S1 по решению координатора (вариант б): убрана унаследованная фраза «I am fine» и висячая пара fine — fine вводится в S2; сторож архива зелёный, соседние архивные сторожа без новых находок |
| `d2f2af47f` | 22.10 14:31 | Learning V2 | fix(learning-v2): кольцо звука по журналу Сверки — ждёт голос, конец по длине onStart→onDone, без прыжков от пересчёта |
| `79881bde6` | 22.10 14:31 | Learning V2 | test(learning-v2): guard — every theory section is opened by at least one episode |
| `0c6c569dc` | 22.10 14:30 | Learning V2 | test(learning-v2): три мёртвых mp3-контракта перенацелены на «только голос телефона» (слово владельца 22.10, 72f72a94e): плеер не зовёт resolve*AudioV1 и не готовит записи, карточка слова звучит new-word:; разбор ошибок экзамена — общий глиф «назад» (back_glyph_contract); таблица 1:1 экзамена — раздел «Где в коде» (файл:строка) |
| `98a59e0db` | 22.10 14:30 | координатор: назначить | docs(theory): урок 3 · 15 en/es/pt-BR — «Books are heavy.» шестой строкой (ловушка родного языка, решение 12 · ТЕОРИИ), данные пересобраны |
| `51651dfd4` | 22.10 14:21 | Learning V2 | feat(learning-v2): New word - own dark card face, outlined task icons, header spacing (Sverka 22.10, registry 23) |
| `6955a7903` | 22.10 14:20 | Learning V2 | fix(learning-v2): theory session map — 24 sections now opened by a matching episode (lessons 1-7, 9-13, 16); ready patch to enable the episode Theory button after Sverka sign-off |
| `24b0f18fc` | 22.10 14:05 | Learning V2 | feat(learning-v2): экзамен главы, шаг 3 — итог «X из 12» (кубок, точки, «Глава N+1 открыта» с обложкой, провал с числом ошибок и паузой час) и разбор ошибок (твой ответ, правильный ответ из вердикта проверки только после конца, повтор эпизода); +40 монет за первую сдачу — плашка только после подтверждения кошелька; правки Ревизора: на экзамене только вердикт без разбора, пауза час проверяется в подготовке; цвета шторки — токены темы |
| `88db49d84` | 22.10 14:01 | Learning V2 | fix(learning-v2): кольцо кнопки фразы идёт по настоящей речи голоса — без медленного начала и рывка в конце |
| `a9c43b863` | 22.10 13:47 | Learning V2 | feat(learning-v2): экзамен главы, шаг 2 — экран вопросов: шапка «Экзамен · n / 12» с прогрессом, тело — общий роутер режимов (схема №23), подвал «Проверить» / «Дальше», одна попытка на вопрос, 1 энергия при первом вопросе (Plus бесплатно), запись попытки и зачёт эпизодов после 12-го |
| `23f6c43a5` | 22.10 13:31 | Learning V2 | fix(learning-v2): task parity fixes 22.10 - page margins 20, dark flat "Got it" button in New word |
| `bed3debbf` | 22.10 13:05 | Learning V2 | fix(learning-v2): task theme tokens - mark the three 1px hairline rims of mockup 23 for the borders guard |
| `a452bd121` | 22.10 13:01 | Learning V2 | feat(learning-v2): звёзды эпизодов синхронизируются с облаком — строка цифр 0–3 по порядку курса (≤ 1792 байт), лучшая звезда по каждому эпизоду, локальные звёзды переносятся и стираются с аккаунтом; техдолг Ревизора записан в пакет |
| `c024f02b5` | 22.10 13:00 | Learning V2 | fix(learning-v2): theory sheet 1:1 with lesson-theory.html variant A — sheet shadow, formula in rows, 1px example divider, line heights 19/21, --solid for active tab and playing icon, #B5651D for wrong; contract test |
| `817474a71` | 22.10 12:49 | Learning V2 | feat(learning-v2): прогресс курса и экзамены глав синхронизируются с облаком — число пройденных подряд и компактные записи экзаменов в SYNC_KEYS, слияние без потерь (максимум / «сдан» побеждает), ключи переносятся и стираются с аккаунтом; журнал [V2-PROGRESS-SYNC] (координатор 22.10, вариант А) |
| `6adba598a` | 22.10 12:45 | Learning V2 | feat(learning-v2): экзамен главы — вопросы в виде плеера (сборка занятий: те же id и плитки) и проверка ответа по капсулам, как в занятии; журнал [CHAPTER-EXAM] |
| `de2bfde9f` | 22.10 12:45 | Learning V2 | fix(learning-v2): интро урока как «Ситуация / Скажи так / Почему» — текст для разбора берётся из строк экрана (адаптер кладёт текст в lines, не в textRU); журнал [V2-INTRO-PARTS] (🔴 Сверки 22.10) |
| `0a35b070d` | 22.10 12:35 | Learning V2 | fix(learning-v2): New word - the paragraph under the card is gone (matches the Proposed column) |
| `931e775ba` | 22.10 12:30 | координатор: назначить | docs+feat(learning-v2): theory lesson 10 — one formula line (usually vs now) in 9 languages; rebuilt theory data |
| `323220c98` | 22.10 11:33 | Learning V2 | feat(learning-v2): Find pairs - timer fill is the mockup control token; table sections 7-8 (intro, Find pairs) |
| `e67f3673b` | 22.10 11:30 | Learning V2 | fix(learning-v2): цель «Собери фразу» — смысл из кавычек текста задания, подпись-повтор заголовка → «Скажите по-английски» (localizedMeaning в выпуске равен тексту задания) |
| `500e5a4dc` | 22.10 11:30 | Learning V2 | feat(learning-v2): New word shows the translation at once; intro as Situation / Say it like this / Why |
| `7bd1e403b` | 22.10 11:30 | Learning V2 | feat(learning-v2): task bodies by the "Proposed" column - what to do, situation card, goal; five modes |
| `470406078` | 22.10 11:15 | Learning V2 | feat(learning-v2): поля макета №23 одним правилом для всех заданий — что сделать / ситуация / цель без склеек, интро «Скажи так», у нового слова только перевод (решения владельца 22.10); сравнение «макет  |
| `c7fc02a15` | 22.10 11:03 | Learning V2 | feat(learning-v2): экзамен главы, шаг 1 — движок (12 вопросов из заданий главы, сдал при 10/12, пересдача через час, энергия 1/Plus и входной тест бесплатно, зачёт эпизодов без звёзд), хранение результата, опции колоды Сезона; журнал [CHAPTER-EXAM] |
| `41d1f271d` | 22.10 10:32 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions fifty-three and fifty-four (брошенная с 05:16 пачка доведена: источники, выпуск, копия приложения, манифест, потолок 1230) |
| `108fcb805` | 22.10 10:31 | Learning V2 | feat(learning-v2): жалоба в каждом задании нового курса для всех — урок, эпизод и тип задания, одна жалоба на задание (реестр №9, владелец 21.10) |
| `3603a1504` | 22.10 10:19 | Learning V2 | test(learning-v2): guard against audio download coming back (TTS only) |
| `3e7db2f39` | 22.10 10:03 | Learning V2 | feat(learning-v2): событие learning_v2_session_credited после принятого засчитывания, помощник id документа inbox для ЯДРА, запуск занятия по номерам урок/занятие для 8 · МОМЕНТЫ; сторож рубильника V2 догнал прогрев 19.10 |
| `35110450e` | 22.10 09:45 | Learning V2 | fix(learning-v2): theory section tabs wrap instead of running off the edge; dictionary train button gets the play icon, chips row no longer squeezed |
| `25888c669` | 22.10 09:35 | Learning V2 | fix(learning-v2): корень приложения больше не сеет записи Learning V2 после кадра Главной; локальное превью курса снимает заставку; сторож экзаменов знает тихий повтор восстановления 18.10 |
| `a5df557a8` | 22.10 09:30 | координатор: назначить | docs(legal): privacy and terms v4 — proofreading, 16+ everywhere |
| `331874951` | 22.10 08:48 | 2 · Дизайн | docs(dialogs): комментарий про картинки героя «Диалогов» — файлы уже в реестре, заглушка лишь запасной путь |
| `d3d8c36d4` | 22.10 08:48 | Learning V2 | fix(learning-v2): every lesson audio button is a speaker and can always be pressed again |
| `cdc3fdce7` | 22.10 08:45 | Learning V2 | fix(learning-v2): theory examples read cleanly by phone TTS (lessons 1, 2, 5: no arrows, slashes, ellipses or dashes in spoken phrases); rebuilt theory data |
| `98d28baaa` | 22.10 08:32 | 10 · Переводчик | docs(l10n): лента «Сегодня» — озвучка дня на es/pt-BR/tr в естественном порядке слов |
| `43c586115` | 22.10 08:30 | координатор: назначить | docs+feat(learning-v2): theory review fixes for lessons 15-22 (id aku instead of saya, vi quy dinh, tr one wording, don't mind, en quotes, last-section titles); rebuilt theory data |
| `1287acfb6` | 22.10 08:20 | Learning V2 | test(learning-v2): horizons result checks follow the redesigned result screen (18/18) |
| `3ea39f80c` | 22.10 08:19 | координатор: назначить | docs: lock the approved Peak v2 etalon, variant V2 |
| `018debae7` | 22.10 08:16 | Learning V2 | fix(learning-v2): player lifecycle test mocks catch up; Horizons session filter keeps row type narrowing |
| `260ed6999` | 22.10 08:15 | Learning V2 | feat(learning-v2): orphan 19.10, owner OK 22.10: shared audio replay button for all task modes |
| `80fa257b9` | 22.10 08:01 | координатор: назначить | docs+feat(learning-v2): theory lesson 22 in 8 languages; session map for lesson 22 (s1-54); rebuilt theory data |
| `f2e478486` | 22.10 07:48 | координатор: назначить | docs: lock the approved Home Scene states etalon |
| `15823e78a` | 22.10 07:47 | координатор: назначить | docs+feat(learning-v2): theory lesson 21 in 8 languages; session map for lesson 21; rebuilt theory data |
| `078a6a9db` | 22.10 07:46 | Learning V2 | fix(learning-v2): Horizons shows only the expanded lesson's sessions; horizons test mocks catch up |
| `e051c7b99` | 22.10 07:33 | координатор: назначить | docs+feat(learning-v2): theory lesson 20 in 8 languages; session maps 15-20 moved to the shared json; rebuilt theory data |
| `0116b37c9` | 22.10 07:30 | Learning V2 | fix(learning-v2): factory_native generated — typed rows, no TS2590 (Codex out of tokens, owner OK 22.10) |
| `cd3658991` | 22.10 07:20 | координатор: назначить | docs(legal): privacy v3 — gift without nickname, Friends, polls, Plus ring, shared streak |
| `144c7f159` | 22.10 07:16 | координатор: назначить | docs+feat(learning-v2): theory lesson 19 in 8 languages; rebuilt theory data |
| `afc35c653` | 22.10 07:10 | Learning V2 | fix(learning-v2): factory_native generator emits explicitly typed rows (TS2590 union too complex) |
| `0eab006c2` | 22.10 07:06 | координатор: назначить | docs: lock the approved Today etalon, concept A Scene |
| `be143207d` | 22.10 07:05 | Learning V2 | fix(learning-v2): theory session map — lesson 2 s41-48 and lesson 5 s11-16 open the right section; lesson 19 RU data |
| `e2b42d380` | 22.10 06:30 | координатор: назначить | docs+feat(learning-v2): theory lesson 18 in 8 languages; rebuilt theory data |
| `48febc1f1` | 22.10 06:18 | координатор: назначить | docs+feat(learning-v2): theory lesson 17 in 8 languages; session maps for lessons 15-17; rebuilt theory data |
| `259f170d2` | 22.10 06:16 | Learning V2 | feat(learning-v2): theory opens on the right section for every session of lessons 1-14 |
| `8b6d88169` | 22.10 05:15 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions forty-nine to fifty-two |
| `2828a5489` | 22.10 05:04 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions forty-five to forty-eight |
| `bec59ac7d` | 22.10 05:00 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions forty-one to forty-four |
| `effc46ee0` | 22.10 04:49 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions thirty-seven to forty |
| `7da45890e` | 22.10 04:45 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions thirty-three to thirty-six |
| `af24722f8` | 22.10 04:34 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions twenty-nine to thirty-two |
| `5cac5c950` | 22.10 04:30 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions twenty-five to twenty-eight |
| `a0b6a7f48` | 22.10 04:15 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions twenty-one to twenty-four |
| `f5bde2122` | 22.10 04:03 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions seventeen to twenty |
| `de6b64f78` | 22.10 04:00 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions thirteen to sixteen |
| `1fc08ccb3` | 22.10 03:48 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions eleven to twelve |
| `cd0fed218` | 22.10 03:45 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions nine to ten |
| `bfe97cad8` | 22.10 03:33 | Learning V2 | fix(learning-v2): include reused calculate audio in runtime index |
| `8e1e582f2` | 22.10 03:31 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions five to eight |
| `d410ca647` | 22.10 03:20 | Learning V2 | fix(learning-v2): add lesson twenty-two everyday sessions one to four |
| `05a22acff` | 22.10 03:15 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions fifty-three to fifty-six |
| `e332b7a94` | 22.10 03:04 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions forty-nine to fifty-two |
| `6a6abc8c5` | 22.10 03:00 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions forty-five to forty-eight |
| `978c93417` | 22.10 02:49 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions forty-one to forty-four |
| `05f884e28` | 22.10 02:45 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions thirty-seven to forty |
| `78a3c3c07` | 22.10 02:36 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions twenty-nine to thirty-six |
| `8a5314c30` | 22.10 02:30 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions twenty-five to twenty-eight |
| `1c1937919` | 22.10 02:15 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions twenty-one to twenty-four |
| `d86335e61` | 22.10 02:00 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions seventeen to twenty |
| `6306c1d99` | 22.10 01:49 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions nine to sixteen |
| `f063285b4` | 22.10 01:45 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions five to eight |
| `87df77764` | 22.10 01:30 | Learning V2 | fix(learning-v2): add lesson twenty-one everyday sessions one to four |
| `7f5e4f126` | 22.10 01:06 | Learning V2 | fix(learning-v2): add lesson twenty practical everyday sessions forty-nine to fifty-six |
| `044b872a8` | 22.10 01:00 | Learning V2 | fix(learning-v2): add lesson twenty practical everyday sessions forty-one to forty-eight |
| `4626a7d7d` | 22.10 00:45 | Learning V2 | fix(learning-v2): add lesson twenty practical everyday sessions thirty-three to forty |
| `97b8c47ce` | 22.10 00:34 | Learning V2 | fix(learning-v2): add lesson twenty practical everyday sessions twenty-five to thirty-two |
| `c8dbe4da9` | 22.10 00:30 | Learning V2 | fix(learning-v2): add lesson twenty practical everyday sessions seventeen to twenty-four |
| `be1d783a0` | 22.10 00:15 | Learning V2 | fix(learning-v2): add lesson twenty practical everyday sessions nine to sixteen |
| `50e4c3ed4` | 22.10 00:05 | Learning V2 | fix(learning-v2): add lesson twenty practical everyday sessions five to eight |
| `092d02c78` | 22.10 00:00 | Learning V2 | fix(learning-v2): add lesson twenty practical everyday sessions one to four |
| `f6beb994c` | 21.10 23:49 | Learning V2 | fix(learning-v2): add lesson nineteen practical everyday sessions forty-nine to fifty-six |
| `82f64a7ce` | 21.10 23:45 | Learning V2 | fix(learning-v2): add lesson nineteen practical everyday sessions forty-one to forty-eight |
| `bfbf59276` | 21.10 23:34 | Learning V2 | fix(learning-v2): add lesson nineteen practical everyday sessions thirty-three to forty |
| `6ece7d4bd` | 21.10 23:30 | Learning V2 | fix(learning-v2): add lesson nineteen practical everyday sessions twenty-five to thirty-two |
| `f8a5c9de3` | 21.10 23:18 | Learning V2 | fix(learning-v2): add lesson nineteen practical everyday sessions seventeen to twenty-four |
| `8ea709d50` | 21.10 23:15 | Learning V2 | fix(learning-v2): add lesson nineteen practical everyday sessions nine to sixteen |
| `b1df4c96e` | 21.10 23:03 | Learning V2 | fix(learning-v2): add lesson nineteen practical everyday sessions one to eight |
| `2a56231e7` | 21.10 23:00 | Learning V2 | fix(learning-v2): add lesson eighteen practical everyday sessions forty-nine to fifty-six |
| `32938cde8` | 21.10 22:48 | Learning V2 | fix(learning-v2): add lesson eighteen practical everyday sessions forty-one to forty-eight |
| `daf882667` | 21.10 22:45 | Learning V2 | fix(learning-v2): add lesson eighteen practical everyday sessions thirty-three to forty |
| `ea9408c75` | 21.10 22:33 | Learning V2 | fix(learning-v2): add lesson eighteen practical everyday sessions twenty-five to thirty-two |
| `ab2cb0358` | 21.10 22:30 | Learning V2 | fix(learning-v2): add lesson eighteen practical everyday sessions seventeen to twenty-four |
| `a544e8351` | 21.10 22:20 | Learning V2 | fix(learning-v2): add lesson eighteen practical everyday sessions nine to sixteen |
| `971bff4dd` | 21.10 22:16 | Learning V2 | fix(learning-v2): add lesson eighteen practical everyday sessions one to eight |
| `0e2cd8e05` | 21.10 22:02 | Learning V2 | fix(learning-v2): add lesson seventeen practical everyday sessions fifty-two to fifty-six |
| `f802b329a` | 21.10 22:00 | Learning V2 | feat(learning-v2): «Обучение» способ 2 — фаза 3 (раскрытая карта, «Вся глава» веером, экзамен за флагом) + dev-вход /dev_season_preview |
| `aa44d54fd` | 21.10 21:48 | Learning V2 | fix(learning-v2): add lesson seventeen practical everyday sessions forty-three to fifty-one |
| `1821f9889` | 21.10 21:45 | Learning V2 | feat(learning-v2): экран «Обучение» «Сезон и карусель карт» — фазы 1–2 (модель колоды, цвета глав, карусель, обложка; пока не подключено) |
| `7e15fdc7e` | 21.10 21:31 | Learning V2 | feat(learning-v2): шапка, HUD и подвал плеера по одобренному макету заданий (вердикт «Сверки» 21.10) |
| `ee4fe0b8f` | 21.10 21:21 | координатор: назначить | docs: lock the approved chapter exam etalon on way 2 |
| `69aeaff8d` | 21.10 21:18 | Learning V2 | feat(learning-v2): episode exit confirm + resume from task N of M, voice no-heart/skip, can't-speak mode, Episode wording on 9 langs, rune bridge ordinal guard |
| `1a5982190` | 21.10 21:16 | Learning V2 | fix(learning-v2): add lesson seventeen practical quantity sessions thirty-four to forty-two |
| `621f71e93` | 21.10 20:46 | Learning V2 | fix(learning-v2): add lesson seventeen practical vocabulary sessions twenty-five to thirty-three |
| `9e9e23b0b` | 21.10 20:46 | координатор: назначить | docs: lock the approved Home etalon, concept A Scene |
| `99f1d4037` | 21.10 20:45 | 2 · Дизайн | docs(design): gift Plus mockups without «по нику» (owner 21.10) |
| `810d48b36` | 21.10 20:37 | координатор: назначить | docs: lock the approved Learn screen etalon, season with card carousel |
| `65c7ae8e2` | 21.10 20:35 | Learning V2 | fix(learning-v2): «Продолжить без таймера» в «Найди пары» больше не сбрасывает собранные пары + журнал [V2-PAIRS] |
| `6245584a9` | 21.10 20:16 | Learning V2 | fix(learning-v2): author English seventeen sessions twenty-five to thirty-three |
| `d0de09a65` | 21.10 19:46 | Learning V2 | fix(learning-v2): replace niche craft vocabulary with everyday errands |
| `f9828e4fc` | 21.10 19:16 | Learning V2 | fix(learning-v2): add lesson seventeen few and little sessions seventeen to twenty-four |
| `51d955586` | 21.10 19:10 | координатор: назначить | docs: lock etalons approved by owner on 21.10 |
| `02d7897f3` | 21.10 19:00 | Learning V2 | fix(learning-v2): итог занятия — функции 60 с вместо 15 (№47, владелец 21.10) |
| `55edb62c2` | 21.10 19:00 | Learning V2 | fix(learning-v2): add lesson seventeen much and many sessions nine to sixteen |
| `e39649981` | 21.10 18:50 | Learning V2 | fix(learning-v2): add lesson seventeen count nouns sessions one to eight |
| `d7fb6cb47` | 21.10 18:45 | Learning V2 | fix(learning-v2): add lesson sixteen future contrasts sessions forty-nine to fifty-six |
| `c2d8e7984` | 21.10 18:34 | Learning V2 | fix(learning-v2): add lesson sixteen future contrasts sessions forty-one to forty-eight |
| `f179dd8b6` | 21.10 18:30 | Learning V2 | fix(learning-v2): add lesson sixteen future contrasts sessions thirty-seven to forty |
| `a5d49035a` | 21.10 18:15 | Learning V2 | fix(learning-v2): add lesson sixteen future contrasts sessions thirty-three to thirty-six |
| `36b667490` | 21.10 18:03 | Learning V2 | fix(learning-v2): add lesson sixteen offers sessions twenty-eight to thirty-two |
| `4873725ba` | 21.10 18:00 | Learning V2 | fix(learning-v2): add lesson sixteen offers sessions twenty-six to twenty-seven |
| `77bab7d7f` | 21.10 17:48 | Learning V2 | fix(learning-v2): add lesson sixteen promises and offers sessions twenty to twenty-five |
| `5f283cf66` | 21.10 17:45 | Learning V2 | fix(learning-v2): add lesson sixteen promises sessions seventeen to nineteen |
| `57122be39` | 21.10 17:33 | Learning V2 | fix(learning-v2): add lesson sixteen predictions sessions nine to sixteen |
| `44790dc54` | 21.10 17:30 | Learning V2 | fix(learning-v2): add lesson sixteen predictions sessions seven to eight |
| `228a3bd70` | 21.10 17:18 | Learning V2 | fix(learning-v2): add lesson sixteen predictions sessions four to six |
| `cd0d145e8` | 21.10 17:15 | Learning V2 | fix(learning-v2): add lesson sixteen predictions sessions one to three |
| `d274502dc` | 21.10 17:04 | Learning V2 | fix(learning-v2): publish complete lesson fifteen with device audio fallback |
| `4de3b37ba` | 21.10 17:02 | Learning V2 | fix(learning-v2): add lesson fifteen sessions forty-one to fifty-six |
| `896288f6c` | 21.10 16:48 | Learning V2 | fix(learning-v2): add everyday lesson fifteen sessions thirty-three to forty |
| `367c2373d` | 21.10 16:45 | Learning V2 | fix(learning-v2): add everyday lesson fifteen sessions twenty-five to thirty-two |
| `1088ed2a5` | 21.10 16:33 | Learning V2 | fix(learning-v2): add everyday lesson fifteen sessions twenty-one to twenty-four |
| `3487e99cb` | 21.10 16:30 | Learning V2 | fix(learning-v2): add everyday lesson fifteen sessions thirteen to twenty |
| `65e23e2fd` | 21.10 16:20 | Learning V2 | fix(learning-v2): add everyday lesson fifteen sessions five to twelve |
| `02b02e856` | 21.10 16:15 | Learning V2 | fix(learning-v2): add everyday lesson fifteen sessions one to four |
| `0c82bbeb9` | 21.10 16:00 | Learning V2 | fix(learning-v2): publish complete lesson fourteen in native course |
| `afef94acc` | 21.10 15:56 | Learning V2 | fix(learning-v2): add lesson fourteen sessions forty-one to fifty-six |
| `deaf13789` | 21.10 15:45 | Learning V2 | fix(learning-v2): add everyday lesson fourteen sessions thirty-three to forty |
| `0ec38686e` | 21.10 15:30 | Learning V2 | fix(learning-v2): add everyday lesson fourteen sessions twenty-five to thirty-two |
| `f31fa27fb` | 21.10 15:20 | Learning V2 | fix(learning-v2): add everyday lesson fourteen sessions twenty-one to twenty-four |
| `2f0a65f5f` | 21.10 15:15 | Learning V2 | fix(learning-v2): add everyday lesson fourteen sessions thirteen to twenty |
| `b4c34e77d` | 21.10 15:00 | Learning V2 | fix(learning-v2): add everyday lesson fourteen sessions five to twelve |
| `74c36954b` | 21.10 14:50 | Learning V2 | fix(learning-v2): add everyday lesson fourteen sessions one to four |
| `0237e39f9` | 21.10 14:45 | Learning V2 | fix(learning-v2): finish everyday lesson thirteen sessions forty nine to fifty six |
| `c12b14b52` | 21.10 14:35 | Learning V2 | fix(learning-v2): add everyday lesson thirteen sessions forty five to forty eight |
| `e0c32b295` | 21.10 14:31 | Learning V2 | fix(learning-v2): remove specialist IT vocabulary from lesson eight and add everyday sessions |
| `e4b7c7c13` | 21.10 14:15 | Learning V2 | fix(learning-v2): add everyday lesson thirteen sessions thirty seven to forty |
| `cde519522` | 21.10 14:02 | Learning V2 | fix(learning-v2): add everyday lesson thirteen sessions twenty nine to thirty six |
| `bc1442231` | 21.10 14:00 | Learning V2 | fix(learning-v2): add everyday lesson thirteen sessions twenty five to twenty eight |
| `51c95383d` | 21.10 13:49 | Learning V2 | fix(learning-v2): publish lesson thirteen through session twenty four |
| `f58e16285` | 21.10 13:48 | Learning V2 | fix(learning-v2): add lesson thirteen sessions thirteen to twenty four sources |
| `6384ba912` | 21.10 13:45 | Learning V2 | fix(learning-v2): add everyday lesson thirteen sessions nine to twelve |
| `2d8a194b6` | 21.10 13:35 | Learning V2 | fix(learning-v2): add everyday lesson thirteen sessions five to eight |
| `154ad7bc2` | 21.10 13:32 | Learning V2 | fix(learning-v2): add everyday lesson thirteen sessions one to four |
| `72cff94b1` | 21.10 13:30 | Learning V2 | fix(learning-v2): add everyday lesson twelve sessions forty nine to fifty six |
| `a727ad8b2` | 21.10 13:17 | Learning V2 | fix(learning-v2): add everyday lesson twelve sessions forty one to forty eight |
| `f9fcd1611` | 21.10 13:15 | Learning V2 | fix(learning-v2): add everyday lesson twelve sessions thirty five to forty |
| `34485247c` | 21.10 13:02 | Learning V2 | fix(learning-v2): add everyday lesson twelve sessions twenty five to thirty four |
| `c451e4f02` | 21.10 13:00 | Learning V2 | fix(learning-v2): add everyday lesson twelve sessions nineteen to twenty four |
| `f1a3cde41` | 21.10 12:47 | Learning V2 | fix(learning-v2): add everyday lesson twelve sessions thirteen to eighteen |
| `17772da4e` | 21.10 12:45 | Learning V2 | fix(learning-v2): add everyday lesson twelve sessions nine to twelve |
| `e71beb7df` | 21.10 12:35 | Learning V2 | fix(learning-v2): add everyday lesson twelve sessions five to eight |
| `3f8247065` | 21.10 12:30 | Learning V2 | fix(learning-v2): start everyday lesson twelve with regular past |
| `2a23ed258` | 21.10 12:17 | Learning V2 | fix(learning-v2): add everyday sessions finish everyday lesson eleven |
| `406a05cf0` | 21.10 12:15 | Learning V2 | fix(learning-v2): add everyday sessions forty-nine to fifty-two |
| `09644fd71` | 21.10 12:02 | Learning V2 | fix(learning-v2): add everyday sessions forty-five to forty-eight |
| `0b61a5b52` | 21.10 12:00 | Learning V2 | fix(learning-v2): add everyday sessions forty-one to forty-four |
| `bd8566262` | 21.10 11:46 | Learning V2 | fix(learning-v2): add everyday sessions thirty-seven to forty |
| `716bc566b` | 21.10 11:45 | Learning V2 | fix(learning-v2): add everyday sessions thirty-four to thirty-six |
| `8eb69092d` | 21.10 11:32 | Learning V2 | fix(learning-v2): add everyday sessions twenty-nine to thirty-three |
| `2d0dd0dcc` | 21.10 11:30 | Learning V2 | fix(learning-v2): add everyday baby items appearance and snacks sessions |
| `bbadf07ea` | 21.10 11:17 | Learning V2 | fix(learning-v2): add everyday sessions twenty-one to twenty-five |
| `b6d0d99bd` | 21.10 11:15 | Learning V2 | fix(learning-v2): add everyday groceries and city sessions eighteen to twenty |
| `4873bbfe1` | 21.10 11:02 | Learning V2 | fix(learning-v2): introduce there was and there were with everyday household words |
| `85bf2186f` | 21.10 11:00 | Learning V2 | fix(learning-v2): add everyday past be sessions thirteen to sixteen |
| `9762a8bdc` | 21.10 10:47 | Learning V2 | fix(learning-v2): add breakfast past be practice |
| `b1b3bfde8` | 21.10 10:45 | Learning V2 | fix(learning-v2): add everyday past be sessions seven to eleven |
| `863b44bf6` | 21.10 10:34 | Learning V2 | fix(learning-v2): add everyday past be sessions four to six |
| `e92084293` | 21.10 10:30 | Learning V2 | fix(learning-v2): finish everyday lesson 10 and start past be lessons |
| `3fe5161a7` | 21.10 10:15 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `f1872e761` | 21.10 10:03 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `35e15b7c4` | 21.10 10:00 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `540c00aac` | 21.10 09:47 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `31d8339ff` | 21.10 09:45 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `058d0eaaf` | 21.10 09:32 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `ca920aa76` | 21.10 09:30 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `9dabd0657` | 21.10 09:17 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `1b9e3eeb2` | 21.10 09:15 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `22ec4520b` | 21.10 09:02 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `d9d9a6f84` | 21.10 09:00 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `93c47419b` | 21.10 08:47 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `43951da7c` | 21.10 08:45 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `0467e5274` | 21.10 08:31 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `bbd2fe4bd` | 21.10 08:30 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `96e81027f` | 21.10 08:18 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `89d2eb344` | 21.10 08:15 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `2e00f26f8` | 21.10 08:01 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `b74a03424` | 21.10 08:00 | Learning V2 | fix(learning-v2): replace jargon with everyday situations and device speech |
| `100aa1eb5` | 21.10 07:46 | Learning V2 | fix(learning-v2): replace IT lessons with everyday vocabulary |
| `44d0d10cd` | 21.10 07:15 | Learning V2 | feat(learning-v2): transfer L10 S55 with device speech fallback |
| `232161159` | 21.10 07:09 | Learning V2 | feat(learning-v2): revise L10 S55 with four new word cards each |
| `2d00cb6f3` | 21.10 06:45 | Learning V2 | feat(learning-v2): transfer L10 S54 with device speech fallback |
| `d126dd209` | 21.10 06:38 | Learning V2 | feat(learning-v2): revise L10 S54 with four new word cards each |
| `6af65cfe8` | 21.10 06:15 | Learning V2 | feat(learning-v2): transfer L10 S53 with device speech fallback |
| `aea3aeb3d` | 21.10 06:08 | Learning V2 | feat(learning-v2): revise L10 S53 with four new word cards each |
| `8a7e161e6` | 21.10 05:45 | Learning V2 | feat(learning-v2): transfer L10 S52 with device speech fallback |
| `6f32ef925` | 21.10 05:37 | Learning V2 | feat(learning-v2): revise L10 S52 with four new word cards each |
| `7f902178a` | 21.10 05:15 | Learning V2 | feat(learning-v2): transfer L10 S51 with device speech fallback |
| `e47fc8685` | 21.10 05:08 | Learning V2 | feat(learning-v2): revise L10 S51 with four new word cards each |
| `cf28a8072` | 21.10 04:45 | Learning V2 | feat(learning-v2): transfer L10 S50 with device speech fallback |
| `14902c8ac` | 21.10 04:37 | Learning V2 | feat(learning-v2): revise L10 S50 with four new word cards each |
| `1d3637c22` | 21.10 04:15 | Learning V2 | feat(learning-v2): transfer L10 S49 with device speech fallback |
| `ef8be314d` | 21.10 04:08 | Learning V2 | feat(learning-v2): revise L10 S49 with four new word cards each |
| `5bf5510fa` | 21.10 03:45 | Learning V2 | feat(learning-v2): transfer L10 S48 with device speech fallback |
| `3673c8888` | 21.10 03:38 | Learning V2 | feat(learning-v2): revise L10 S48 with four new word cards each |
| `9563ab1ab` | 21.10 03:15 | Learning V2 | feat(learning-v2): transfer L10 S47 with device speech fallback |
| `105bca2ad` | 21.10 03:08 | Learning V2 | feat(learning-v2): revise L10 S47 with four new word cards each |
| `3d472c32f` | 21.10 02:45 | Learning V2 | feat(learning-v2): transfer L10 S46 with device speech fallback |
| `e4c64ae4f` | 21.10 02:39 | Learning V2 | feat(learning-v2): revise L10 S46 with four new word cards each |
| `966d0d986` | 21.10 02:15 | Learning V2 | feat(learning-v2): transfer L10 S45 with device speech fallback |
| `5c343aa24` | 21.10 02:08 | Learning V2 | feat(learning-v2): revise L10 S45 with four new word cards each |
| `9500801dc` | 21.10 01:45 | Learning V2 | feat(learning-v2): transfer L10 S44 with device speech fallback |
| `8b366ae67` | 21.10 01:37 | Learning V2 | feat(learning-v2): revise L10 S44 with four new word cards each |
| `3c2af7489` | 21.10 01:15 | Learning V2 | feat(learning-v2): transfer L10 S43 with device speech fallback |
| `ad311cfea` | 21.10 01:13 | Learning V2 | feat(learning-v2): revise L10 S43 with four new word cards each |
| `197647193` | 21.10 00:45 | Learning V2 | feat(learning-v2): transfer L10 S42 with device speech fallback |
| `cc63c0b6c` | 21.10 00:37 | Learning V2 | feat(learning-v2): revise L10 S42 with four new word cards each |
| `0d7dcc0f9` | 21.10 00:15 | Learning V2 | feat(learning-v2): transfer L10 S41 with device speech fallback |
| `44da1c610` | 21.10 00:09 | Learning V2 | feat(learning-v2): revise L10 S41 with four new word cards each |
