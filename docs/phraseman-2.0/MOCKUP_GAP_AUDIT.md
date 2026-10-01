# Аудит: приложение против макетов 2.0 (MOCKUP_GAP_AUDIT)

Дата: 2026-10-01. Ветка `feature/referral-roulette`. Режим: только чтение кода, ничего не запускалось.
Эталон: `docs/design/v2-app/*.html` + `spec_*.md` + `OWNER_FEEDBACK.md` + `COVERAGE.md`.
Главная (`app/(tabs)/home.tsx`) и онбординг исключены из вердиктов, замечания по ним — в конце.

## 0. Как читать и чего аудит НЕ делает

- Вердикты ставились по коду: цвета, импорты, структура блоков, тексты. Приложение на телефоне не открывалось.
- «СООТВЕТСТВУЕТ» = экран собран на токенах стекла (`liquidGlassTokens` / `useLv2Glass` / `useDialogueGlass`) и по составу блоков
  совпал с макетом, красных флагов не найдено. Построчной сверки пикселей и размеров НЕ было.
- Часть файлов прямо сейчас правит другая сессия (в `git status` не закоммичено): `components/completion/V2DoneScreen.tsx`,
  `app/flashcards/SessionResultScreen.tsx`, `app/flashcards_swipe.tsx`, `components/lessons/LessonsListGlassKit.tsx`,
  `app/medal_utils.ts`. Их вердикты могут устареть за час.
- Страниц макетов `community.html`, `profile.html`, `results.html`, `coins.html` НЕТ на диске (в `index.html` они в списке, но файлов нет;
  проверено `ls docs/design/v2-app` и `find docs`). Всё, что к ним относится, = «НЕТ МАКЕТА».

## 0.1 Корневая причина жёлтого цвета (сквозная, важнее любого одного экрана)

`components/ThemeContext.tsx:425` строит тему через `makeLiquidGlassTheme(id, DARK, variant)`
(`constants/liquidGlassThemePalette.ts:129`). Эта функция перекрашивает фон, текст, акцент и рамки,
но поле `gold`/`goldBg`/`textOnGold` берётся из базы `DARK` без изменений: `constants/theme.ts:33-36`
= `#FFC800` / `rgba(255,200,0,0.14)`. Комментарий в функции прямо говорит, что reward-цвета «remain untouched».
Итог: **каждое `t.gold` в приложении сегодня рисуется ярко-жёлтым в ЛЮБОЙ теме**, хотя владелец запретил жёлтое.
Всего таких обращений (`t.gold|theme.gold|goldBg|textOnGold`) в `app/` и `components/` — 112 строк.
Пока это не вылечено в одном месте, «чистка по экранам» будет бесконечной.
Самые заметные места: звёзды оценки на КАЖДОМ экране завершения (`components/FeedbackRatingCard.tsx:211,315`),
кольцо серии в уроке (`components/feedback/ComboRing.tsx:72,74`, вызов `app/lesson1.tsx:1054`),
молния энергии (`components/NoEnergyModal.tsx:336`), звёзды оценки приложения (`components/ReviewPromptModal.tsx:80,139,142`),
плашка «данные устарели» (`components/ui/new/OfflineDataNotice.tsx:77,80`), точки силы слова
(`app/flashcards/WordStrengthDots.tsx:15`), полка карточек (`components/flashcards/FlashcardsShelves.tsx:109,167`),
полоса лимита (`components/flashcards/CollectionLimitHeader.tsx:45`), предупреждения интро урока (`components/lesson_intro_rich.tsx:254,324,420…540`).

Предложение (решает владелец/интерфейсная сессия): в `makeLiquidGlassTheme` переопределить `gold/goldBg/textOnGold`
нейтральными токенами стекла (белый/серый, как «белые звёзды» в макете) — одной правкой уйдут все 112 мест.

## 1. Сводная таблица

Условные обозначения вердикта: СООТВЕТСТВУЕТ / ЧАСТИЧНО / СТАРЫЙ ЭКРАН / НЕТ МАКЕТА.
Если у экрана макета нет, но вёрстка уже на стекле — пишу «НЕТ МАКЕТА» (макета для сверки нет), а стиль отмечаю отдельно.

### Обучение V1 и экраны завершения

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Список уроков V1 (LRN-01) | `app/(tabs)/lessons.tsx:4450-4480`, `components/lessons/LessonsListGlass*.tsx` | learn.html A1–A17 | СООТВЕТСТВУЕТ | Карточка `.lc` и экзамен-карточки на стекле. В файле остаётся мёртвый код старых пастельных карточек (стр. 321-424, 757+) |
| Меню урока (LRN-02) | `app/lesson_menu.tsx`, `components/lessons/LessonMenuGlass.tsx` | learn.html B1–B5 | СООТВЕТСТВУЕТ | Хвост импортов `GoldBevel`/`goldTheme` (стр. 63-65) — не рисуется |
| Интро урока (LRN-11) | `app/lesson_intro_screens.tsx`, `components/lesson_intro_rich.tsx` | learn.html C1–C4 | ЧАСТИЧНО | Метки-предупреждения красятся `t.gold` (жёлтый): `lesson_intro_rich.tsx:254,324,420,468,492,504,540` |
| Урок: сборка фразы (LRN-03) | `app/lesson1.tsx` | learn.html D1–D18 | ЧАСТИЧНО | Тост медали (бронза/серебро/золото) ещё живой: `lesson1.tsx:3607-3660,3892`, `components/MedalToast.tsx`; кольцо серии жёлтое (`ComboRing.tsx:72`) |
| Итог урока (LRN-10) | `app/lesson_complete.tsx` → `components/completion/V2DoneScreen.tsx` | learn.html E1–E4 | СООТВЕТСТВУЕТ | Сделано. Мёртвый код старого итога (медаль 1382-1400, `t.gold` 1395, `ResultsSequence`) под `legacyCompletionSurfacesEnabled=false` — стоит удалить |
| Слова урока: список и тренировка (LRN-04) | `app/lesson_words.tsx` | learn.html F1–F7 | СООТВЕТСТВУЕТ | По токенам стекла чисто |
| Итог слов урока | `app/lesson_words.tsx:3121-3195` | learn.html F8 («общий экран завершения») | СТАРЫЙ ЭКРАН | Свой финал: иконка-галочка, «Все выучены», пилюля +монеты, «К уроку», «Повторить»; нет звёзд, верно/ошибок/точность, ошибок, оценки; сверху `VictoryBurst` с звуком `medal` (3201) |
| Неправильные глаголы (LRN-05) | `app/lesson_irregular_verbs.tsx` | learn.html H1–H4 | СООТВЕТСТВУЕТ | — |
| Итог глаголов («порция») | `app/lesson_irregular_verbs.tsx:1010` (+ финал `allDone`) | learn.html H5 | СТАРЫЙ ЭКРАН | Тот же самодельный финал + `VictoryBurst` вместо общего экрана |
| Тренажёр предлогов (LRN-09) | `app/preposition_drill.tsx` | learn.html I1–I3, I5 | СООТВЕТСТВУЕТ | — |
| Итог предлогов | `app/preposition_drill.tsx:690-760` | learn.html I4 | СТАРЫЙ ЭКРАН | Кнопки «Снова»/«Закрепить промахи» вручную + `VictoryBurst` (иконка кубка, звук `medal`/`chord`, конфетти 60-120) |
| Теория (LRN-06) + шпаргалка (LRN-08) | `components/theory/TheoryLessonView.tsx`, `app/hint.tsx`, `app/lesson_help.tsx` | learn.html G1–G5 | СООТВЕТСТВУЕТ | `hint.tsx` (1531 строка) на `useTheme` без прямых стеклянных токенов — не сверялся построчно; в `lesson_help.tsx` остался импорт `VictoryBurst` |
| Диагностика (LRN-14) | `app/diagnostic_test.tsx` | learn.html J1–J10 | СООТВЕТСТВУЕТ | Бейдж XP уже убран (стр. 1623). Не сверено построчно |
| Зачёт уровня: вопросы/интро (LRN-16/17) | `app/level_exam.tsx`, `components/level-exam/*` | learn.html K1–K5, K8 | СООТВЕТСТВУЕТ | В файле лежит палитра `LX` с золотом `#E8C76F` (стр. 516-523) — по поиску нигде не применяется, мёртвая |
| Итог зачёта | `app/level_exam.tsx:1190-1245`, `components/level-exam/LevelExamResult.tsx:140` | learn.html K6–K7 | ЧАСТИЧНО | Состав блоков как в макете (счёт, «№ попытки», «Что разобрать»), НО показывает картинку медали и «Золото!/Новая медаль!» (1221-1230) и текст «добейся 90% для золота» (1197-1199). Иконка `sparkles` жёлтая |
| Финальный экзамен (LRN-15) | `app/exam.tsx` | learn.html L1–L10 | СООТВЕТСТВУЕТ | Не сверено построчно |
| Сертификат: имя на награде | `components/CertificateNameModal.tsx` | learn.html L9 | СООТВЕТСТВУЕТ | — |
| Окно «Энергия закончилась» | `components/NoEnergyModal.tsx` | learn.html D17 | ЧАСТИЧНО | Молния красится `t.gold` (стр. 336) — жёлтая. Сам каркас на токенах стекла |
| Оценка «Всё было понятно?» (на всех итогах) | `components/FeedbackRatingCard.tsx` | practice.html (блок `.rate`) | ЧАСТИЧНО | Звёзды `t.gold` (211, 315) — жёлтые вместо белых |

### Learning V2

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Карта курса: главы/узлы (LV2-01) | `components/learning-v2/LearningV2ChaptersCourse.tsx`, `components/LearningV2MapNode.tsx` | learning-v2.html §1 | СООТВЕТСТВУЕТ | Не сверено построчно; `LearningV2MapNode` без токенов темы, только затемнение `rgba(0,0,0,.32)` |
| Строки уроков на вкладке V2 | `app/(tabs)/lessons.tsx:5180 → renderLessonCard → 4556 LessonCard` | learning-v2.html §1 | СТАРЫЙ ЭКРАН | Для `page==="v2"` рисуется СТАРАЯ пастельная карточка: палитры по уровням `LESSON_LEVEL_PALETTES` (стр. 321-424, A1 `#B8D6B8` и др.), `MedalDots` с картинками бронза/серебро/золото (502-530), звёзды `theme.gold` (1742). Новая `LessonsListGlassCard` включена только при `page!=="v2"` (4452-4475) |
| Шапка вкладки «Обучение» | `app/(tabs)/lessons.tsx:4715-4735, 4984` | learning-v2.html §1 | ЧАСТИЧНО | Чип валюты `RuneBalanceChip` (ассет уже монета), иконка языка `t.gold` (4984) |
| Урок V2 — обёртка (LV2-02) | `app/learning-v2/lesson/[id].tsx` | learning-v2.html §1–2 | ЧАСТИЧНО | Свой кошелёк-пилюля с `RuneGlyph color={t.gold}` (1139), подпись для скринридера «баланс рун» (1130), блок награды на `t.gold` (1181-1190, 1228), `theme.gold` у контрольной точки (489) |
| Интро сессии (LV2-07) | `app/learning_v2_session_intro.tsx` | learning-v2.html §4 | СООТВЕТСТВУЕТ | Не сверено построчно |
| Режимы практики (LV2-03/05) | `app/learning-v2/session/[id].tsx`, `app/learning_v2_direct_session_player_v1.tsx` (3848 строк) | learning-v2.html §5–6 | СООТВЕТСТВУЕТ | Золота нет; имена `rune*` — только идентификаторы. Не сверено построчно |
| Итог занятия (LV2) | `components/learning-v2/horizons/HorizonSessionResult.tsx`, `HorizonResultGlass.tsx`, `components/LearningV2SessionOutcomeSheet.tsx` | learning-v2.html §7, practice.html d7 | ЧАСТИЧНО | Состав близкий (звёзды, верно/ошибок/точность, оценка), но свой экран, а не общий `V2DoneScreen` — два разных итога в одном приложении |
| Витрины/dev (LV2-04/06) | `app/learning_v2_modes_showcase*.tsx` и др. | spec_learning_v2 §9 (не рисуется) | НЕТ МАКЕТА | Только DEV, не в сторе |

### Карточки

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Хаб, категории, мои наборы, каталог, коллекция, редактор, видео-наборы, выбор набора/режима | `app/flashcards/FlashcardsHubScreen.tsx`, `FlashcardsCategoryHub.tsx`, `app/flashcards_my_packs.tsx`, `flashcards_packs.tsx`, `flashcards_collection.tsx`, `flashcards_card_editor.tsx`, `DeckPickerSheet.tsx`, `FlashcardsTrainingModeSheet.tsx` | cards.html (все) | ЧАСТИЧНО | Каркас на стекле, но: цена набора рунным знаком `ᚱ N` на плитке каталога (`FlashcardsCategoryHub.tsx:375`); покупка набора за «руны» через старую шторку (`flashcards_collection.tsx:1318-1334`) — спек просит убрать |
| Шторка покупки набора | `app/flashcards/CardPackShardPaywallModal.tsx` | в макетах НЕ рисуется (spec_cards «удаляется») | СТАРЫЙ ЭКРАН | 1291 строка, 61 упоминание «осколков/жемчуга», знак `ᚱ` (467), `t.gold` (464-1130). Подключена в `flashcards_collection.tsx:108,1318` и dev-витрину |
| Тренировка «Свайп» | `app/flashcards_swipe.tsx` (5156 строк, уже правится другой сессией) | practice.html (Вспомни/Свайп) | ЧАСТИЧНО | Пилюля серии с `t.gold` и иконкой огня (3877-3879); подсказка/правильно красятся `t.gold`/`t.goldBg` (3973, 4076, 4087) |
| Тренировка «Блиц» | `app/flashcards_blitz_session.tsx` | practice.html (Блиц) | ЧАСТИЧНО | Акцент `#FF8A3D` (оранжевый) — стр. 108; комбо-бейдж с пламенем в нём (1397-1400); таймер в нём (1149, 1364) |
| Тренировка «Устно» | `app/flashcards_speaking_session.tsx` | practice.html (Устно) | ЧАСТИЧНО | Акцент `#22B8A8` (бирюза) — стр. 123, цвет не из эталона |
| Тренировка «Вспомни» | `app/flashcards_recall_session.tsx` | practice.html | СООТВЕТСТВУЕТ | Зелёный/красный фидбек — допустимо |
| Итог тренировки карточек | `app/flashcards/SessionResultScreen.tsx` (правится прямо сейчас) | practice.html d1–d3 | СООТВЕТСТВУЕТ | Уже на `V2DoneScreen`. Остался мёртвый `ResultRuneAward` с ассетом `themeUiAsset('rune')` (стр. 57-120) |
| Выбор голоса озвучки | `app/flashcards_voice_picker.tsx:238-244` | cards.html (нет явного раздела) | ЧАСТИЧНО | Плашка на `t.gold`/`t.goldBg` |
| Точки силы слова, полки, лимит | `app/flashcards/WordStrengthDots.tsx:15`, `components/flashcards/FlashcardsShelves.tsx`, `CollectionLimitHeader.tsx:45` | cards.html | ЧАСТИЧНО | Средний уровень/цифры красятся жёлтым `t.gold` |
| Создание набора сообщества (CARD-15) | `app/community_pack_create.tsx` | cards.html (создание) | СООТВЕТСТВУЕТ | — |

### Диалоги

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Хаб диалогов | `app/ai_dialog_home.tsx` → `components/DialogsTabContent.tsx:140-155` → `DialogueV2CatalogueContainer` | dialogs.html A1–A7 | СООТВЕТСТВУЕТ | Живой путь = новый V2. Старая реализация лежит в том же файле «временно» (стр. 117+, `LinearGradient`, `t.accent`) |
| Брифинг, сессия, свободный разговор (V2) | `app/dialogue_v2_briefing.tsx`, `dialogue_v2_session.tsx`, `dialogue_v2_freeform.tsx`, `components/dialogs/DialogueV2*.tsx`, `dialogs/glass/*` | dialogs.html B–C, F | СООТВЕТСТВУЕТ | Не сверено построчно. Этих файлов нет в `COVERAGE.md` (там только старые `ai_dialog_*`) |
| Итог диалога (V2) | `app/dialogue_v2_completion.tsx` | dialogs.html D1–D5 / practice.html d6 | ЧАСТИЧНО | Состав почти один в один (цели, верно/ошибок/точность, «Ошибки», «Диалог был полезен?», «Готово»/«Ещё раз»), но НЕТ строки «+N монет» (в файле 0 упоминаний монет) и экран свой, не `V2DoneScreen` |
| Старый стек диалогов | `app/ai_dialog_briefing.tsx`, `ai_dialog_session.tsx` (3815 строк), `components/AiDialogBriefingScreen.tsx`, `DialogVerdictScreen.tsx`, `DialogVictoryCelebrationHybrid.tsx`, `components/dialogs/DialogPhraseReview.tsx`, `DialogWhySheet.tsx` | в макетах «заменяет» (spec_dialogs §D) | СТАРЫЙ ЭКРАН | Рунный знак `ᚱ` в кнопке «Ещё N реплик · ᚱ…» (`ai_dialog_session.tsx:3206-3214`), в брифинге (`AiDialogBriefingScreen.tsx:301`), в окне «почему» (`DialogWhySheet.tsx:184`); `t.gold` (10 мест в сессии, 5 в брифинге, 4 в `DialogPhraseReview`); итог с «медальоном исхода» (`DialogVerdictScreen.tsx:226`), конфетти золотом (`DialogVictoryCelebrationHybrid.tsx:73,145,402`). Достижим по прямому маршруту `/ai_dialog_briefing` (`DialogsTabContent.tsx:330`) |
| Урок с Максом / компаньон | `app/ai_dialog_tutor_session.tsx`, `app/ai_companion_session.tsx`, `components/dialogs/Tutor*` | dialogs.html E, F | СООТВЕТСТВУЕТ | `ai_companion_session` на `useTheme` (2 вызова), не сверено |
| Согласие на ИИ-диалоги | `app/ai_dialog_consent_gate.tsx` | dialogs.html B | СООТВЕТСТВУЕТ | — |

### Видео

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Вкладка «Видео»: премьера, «Наборы из видео», «Новые видео» | `app/(tabs)/video.tsx` → `app/lingman_videos.tsx` | video.html (main/offline/stale) | СООТВЕТСТВУЕТ | Заголовки и порядок блоков те же (`lingman_videos.tsx:142-151`) |
| Плеер, фразы из видео, выбор канала | `components/youtube/*` | video.html (плеер, таймкоды) | СООТВЕТСТВУЕТ | `YoutubeInlinePlayer`, `YoutubeChannelPickerSheet` без токенов стекла (только `useTheme`) — не сверены |
| Плейлист (VID-02) | `app/lingman_playlist.tsx` | video.html нет такого экрана | НЕТ МАКЕТА | — |

### Ошибки, серия, достижения, статистика

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Хаб/список/детали ошибок (RES-01..03) | `app/mistakes_hub.tsx`, `mistakes_list.tsx`, `mistake_detail.tsx` | results.html (нет) | НЕТ МАКЕТА | Вёрстка на стекле, золота нет (`mistake_detail` — тон `gold` мапится на нейтральный токен) |
| Тренировка по ошибкам | `app/mistake_practice_session.tsx`, `components/mistake-practice/*` | practice.html d8 | СООТВЕТСТВУЕТ | Сам тренажёр на токенах |
| Итог тренировки по ошибкам | `components/mistake-practice/MistakeSessionFinale.tsx` | practice.html d8 «Ошибки разобраны» | СТАРЫЙ ЭКРАН | Свой финал; подпись награды — слово «рун»: `ru:'рун'`, `en:'runes'`, `vi:'rune'`, `id:'rune'`, `tr:'rün'`, `pl:'run'` (стр. 50-58; выводится в 119-120); нет звёзд/ошибок «было→стало»/оценки |
| Статистика серии (RES-05) | `app/streak_stats.tsx` (2633 строки) | results.html (нет) | НЕТ МАКЕТА | Старая «арт-поверхность»: 44 места с `GOLD_RICH`, ветки `isGoldTheme` (для темы `gold`, она отключена), янтарь `#FFB020` у оценки (408), `StatsCardArtSurface` |
| Витрина достижений (PRF-14) | `app/achievements_screen.tsx` | results.html (нет); владелец: «витрина остаётся» | НЕТ МАКЕТА | Категории красятся цветами `#FF6B35` (оранж.), `#E11D48` и др. (стр. 146-150), плашка фильтра `t.gold` (1246-1258), категория «Медали» (170) |
| Коллекционные предметы (PRF-15) | `app/collectibles_screen.tsx`, `components/CollectibleDropModal.tsx` | нет | НЕТ МАКЕТА | `SECRET_GOLD '#FBBF24'` (58), DEV-кнопка жёлтая. Модалка «карточка за закрытый раздел» всплывает поверх итога слов/предлогов (`lesson_words.tsx:3152`, `preposition_drill.tsx:757`) — решение владельца нужно |
| Тепловая карта/годовое колесо | `components/ActivityHeatmap365.tsx`, `YearWheel.tsx` | results.html (нет) | НЕТ МАКЕТА | Золотые рампы только при теме `gold` (не активна) |

### Монеты, ранги, Plus, магазин

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Кошелёк (PAY-02) | `app/runes_wallet.tsx`, `components/RuneBalanceChip.tsx` | coins.html (нет) | НЕТ МАКЕТА | Вёрстка на старом `useTheme` без токенов стекла, файл/маршрут/имена остались «runes»; ассет уже монета |
| Ранг монеты | `app/coin_rank.tsx` | coins.html (нет) | НЕТ МАКЕТА | На стекле. Нет в `COVERAGE.md` |
| Церемония ранга (PAY-05) | `components/level_up/*` | coins.html (нет) | НЕТ МАКЕТА | На стекле (`LevelUpMintCeremony`) |
| Магазин (PAY-04) | `app/shop.tsx` | нет | НЕТ МАКЕТА | Старый: 25 жёстких hex (`#A78BFA`, `#8B6FE8`), валюта `'runes'` на `t.gold` (185, 571), `RuneGlyph`, жемчуг. Достижим только из DEV-центра (`app/_layout.tsx:2891`) |
| Магазин осколков (PAY-03) | `app/shards_shop.tsx` | нет | НЕТ МАКЕТА | 6-строчный шим |
| Пейволл Plus (PAY-06/07) | `app/premium_modal.tsx` → `components/paywall/PaywallPlusScreen.tsx` | coins.html (нет) | НЕТ МАКЕТА | Единый пейвол «Честный пробный период», цвета из токенов стекла (`paywallShared.tsx:76-96`). Пейволов A–G уже нет |
| Управление подпиской, значок Plus | `app/manage_subscription.tsx`, `components/PlusBadge.tsx` | нет | НЕТ МАКЕТА | `PlusBadge` умеет золотой градиент `GOLD_RICH` (стр. 23, 73-75, 142) для темы `gold` — не активен |
| Награда-модалки (празднования) | `components/RewardModalBackdrop.tsx`, `PremiumCelebrationModal.tsx`, `FirstPurchaseSealCelebration.tsx` | нет | НЕТ МАКЕТА | `RewardModalBackdrop` содержит `#F59E0B` и ветки `gold` (177-249) |
| Глобальные наградные хосты | `app/_layout.tsx:3232` `DailyJourneyProductionModalHost`, `:3242` `GlobalShardsEarnedHost` | — (по COVERAGE «удаляются») | СТАРЫЙ ЭКРАН | Всплывающие слои «Дневной путь» и «получено жемчуга» всё ещё смонтированы глобально |
| «Восстановить попытку» | `components/session_attempts/SessionAttemptsRecoveryModal.tsx` + `app/session_attempts/session_attempts_copy.ts:29,44` | нет | СТАРЫЙ ЭКРАН | Кнопка «Восстановить · 25 рун» (ru/uk) — слово «руна» видно пользователю |

### Профиль, настройки, аккаунт

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Вкладка «Настройки» (PRF-01) | `app/(tabs)/settings.tsx` | profile.html (нет) | НЕТ МАКЕТА | На стекле (4 места токенов) |
| Аккаунт, язык, уведомления, образование, приватность, поддержка, опрос, промокод | `app/account_details.tsx`, `settings_language.tsx`, `settings_notifications.tsx`, `settings_edu.tsx`, `privacy_settings.tsx`, `support_report.tsx`, `survey_screen.tsx`, `promo_code_entry.tsx` | profile.html (нет) | НЕТ МАКЕТА | Все на токенах стекла, красных флагов нет |
| Темы (PRF-06) | `app/settings_themes.tsx` | profile.html (нет) | НЕТ МАКЕТА | 37 обращений к токенам стекла — самый «новый» из настроек |
| Реферальная рулетка (PRF-12) | `app/referrals.tsx`, `components/roulette_win_modal.tsx`, `referral_how_sheet.tsx` | нет | НЕТ МАКЕТА | `referrals.tsx` без токенов стекла (только `useTheme`) |
| Профиль чужого игрока | `components/PlayerProfileModal.tsx` | community.html (нет) | НЕТ МАКЕТА | `GoldRing` вокруг монеты (стр. 48, 279) |
| Окна аккаунта (ник, выход, удаление) | `components/account/*`, `DeleteAccountConfirmModal.tsx` | system.html «Подтверждение удаления» | СООТВЕТСТВУЕТ | На токенах стекла |

### Сообщество, Друзья, Шпиль

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Вкладка «Сообщество» | `app/(tabs)/community.tsx` (переключатель Друзья/Шпиль/Наборы) | community.html (нет), spire.html | НЕТ МАКЕТА | `V2SegmentedControl`; «Шпиль» виден только по флагу `useSpireTabEnabled` |
| Шпиль: башня, ступень, итоги | `components/spire/*` (17 файлов) | spire.html | СООТВЕТСТВУЕТ | Строился по макету (свой `useSpirePalette`); токенов темы нет сознательно. Не сверено построчно; за флагом |
| Друзья | `app/(tabs)/friends.tsx`, `components/friends_together/*` | community.html (нет) | НЕТ МАКЕТА | `useTheme` без V2-палитры; рун/золота нет. Всего 2362 строки |
| Наборы сообщества | `app/flashcards_packs.tsx` | cards.html | СООТВЕТСТВУЕТ | См. строку «Карточки» |
| Лига/Арена | `app/club_screen.tsx` и др. | — | СООТВЕТСТВУЕТ (удалены) | Файлов нет; `components/league/` каталог ещё на диске, но роутов нет |

### Системные окна

| Экран | Файлы | Макет | Вердикт | Главные разрывы |
|---|---|---|---|---|
| Нет сети, «снова в сети» | `components/OfflineBanner.tsx` | system.html | СООТВЕТСТВУЕТ | — |
| «Данные могут быть устаревшими» | `components/ui/new/OfflineDataNotice.tsx` | system.html | ЧАСТИЧНО | Жёлтая плашка: `t.goldBg` фон, `t.gold` иконка (77, 80) |
| Обновление / технические работы / восстановление / краш / «не найдено» | `ForceUpdateGate`, `UpdateModal`, `MaintenanceGate`, `PhoneStateRecoveryScreen`, `ErrorBoundary`, `app/+not-found.tsx` | system.html | СООТВЕТСТВУЕТ | `+not-found` — тихий редирект на Главную; в макете есть экран «Такой страницы нет» — не совпадает |
| Что нового, сообщения команды, входящие, разрешение уведомлений | `ReleaseNotesModal`, `GlobalBroadcastModal`, `PersonalAdminMessageModal`, `AppMessagesInbox`, `NotificationPermissionModal` | system.html | СООТВЕТСТВУЕТ | `AppMessagesInbox` 1810 строк, не сверен построчно |
| Оценить приложение | `components/ReviewPromptModal.tsx` | system.html «Оценить приложение» | ЧАСТИЧНО | Без токенов стекла, звёзды `t.gold` (139-142), акцент `#C3B7FF` (80) |
| Оплата не прошла | `components/BillingIssueToastHost.tsx` | system.html | НЕ ПРОВЕРЕНО | Нет ни `useTheme`, ни стекла — стили приходят откуда-то ещё; вердикта нет |
| Подтверждения/выбор/«Вернуть» | `ThemedConfirmModal`, `ThemedChoiceModal`, `components/ui/new/UndoSnackbar.tsx` | system.html | СООТВЕТСТВУЕТ | `UndoSnackbar` только на `useTheme` (нейтральный после перекраски) |
| Уведомление о смене ранга | `components/RankChangeBanner.tsx:321` | system.html «Обогнал/Уступил в списке» | ЧАСТИЧНО | Акцент «вниз» `t.gold` |
| Таббар | `app/(tabs)/_layout.tsx` | system.html (таббар) | СООТВЕТСТВУЕТ | Пять вкладок, «капсула» уже ехала; в 357 только упоминание «без gold/olive веток» |

## 2. Худшие нарушители (в порядке вероятности, что пользователь это увидит)

1. **Итоги слов, неправильных глаголов и предлогов** — `app/lesson_words.tsx:3121-3195`, `app/lesson_irregular_verbs.tsx` (финал `allDone`), `app/preposition_drill.tsx:690-760`.
   Каждый режим рисует свой маленький финал + `VictoryBurst` (кубок/конфетти/звук `medal`) вместо общего экрана `V2DoneScreen`. Это самые частые экраны после урока.
2. **Жёлтый цвет на уровне темы** (раздел 0.1): `constants/theme.ts:33` + `ThemeContext.tsx:425`. 112 мест, включая звёзды оценки на всех итогах и кольцо серии в уроке.
3. **Тост медали в уроке** — `app/lesson1.tsx:3607-3660,3892` + `components/MedalToast.tsx` (картинки бронза/серебро/золото, золотая палитра `#F2C44A`, `#D08C4A`). По спеку learn.html «тост медали — удалено».
4. **Итог зачёта уровня** — `app/level_exam.tsx:1197-1230`: медаль и «Золото!», текст «до золота».
5. **Список уроков Learning V2** — `app/(tabs)/lessons.tsx:4556` + 321-424, 502-530, 1742: старая пастельная карточка с медалями вместо стеклянной карточки `.lc`. Это та вкладка «Обучение», куда пользователь заходит первой.
6. **Итог «Работа над ошибками»** — `components/mistake-practice/MistakeSessionFinale.tsx:50-58,119-120`: слово «рун/runes/rün» в награде.
7. **Карточки: рунный ценник и покупка** — `app/flashcards/FlashcardsCategoryHub.tsx:375` («автор · ᚱ N»), `app/flashcards_collection.tsx:1318-1334`, `app/flashcards/CardPackShardPaywallModal.tsx` (1291 строка, осколки, знак `ᚱ`, `t.gold`).
8. **Цвета тренировок карточек** — Блиц оранжевый `#FF8A3D` (`flashcards_blitz_session.tsx:108`), Устно бирюзовый `#22B8A8` (`flashcards_speaking_session.tsx:123`), Свайп жёлтая пилюля серии (`flashcards_swipe.tsx:3877`).
9. **Старый стек диалогов, пока достижим** — `app/ai_dialog_briefing.tsx`, `ai_dialog_session.tsx` (знак `ᚱ` на кнопке покупки реплик 3206-3214, `t.gold`, «медальон исхода» в `DialogVerdictScreen.tsx:226`).
10. **Глобальные наградные слои** — `app/_layout.tsx:3232` (Дневной путь), `:3242` (жемчуг получен) — всплывают поверх любого экрана.
11. **Кошелёк и магазин** — `app/runes_wallet.tsx` (имена «runes», без токенов стекла), `app/shop.tsx` (25 жёстких hex, фиолетовый жемчуг, DEV-вход).
12. **Урок V2 — обёртка** — `app/learning-v2/lesson/[id].tsx:1130-1228`: жёлтые награды, «баланс рун» для скринридера.
13. **Мелочи жёлтого**: `ReviewPromptModal`, `OfflineDataNotice`, `NoEnergyModal` (молния), `RankChangeBanner`, `DialogPhraseReview`.

Оговорка по пункту 1 и по `SessionResultScreen`: другая сессия сейчас переводит итоги на `V2DoneScreen`;
`app/flashcards/SessionResultScreen.tsx` уже переведён (не закоммичен), `lesson_complete.tsx` закоммичен (`f94416f9f`).
Слова/глаголы/предлоги/ошибки/Learning V2 в этой работе не затронуты.

## 3. Доказательства по экранам со статусом ЧАСТИЧНО / СТАРЫЙ ЭКРАН

Формат: файл:строка — что в коде — что в макете.

### Итоги (общий экран `V2DoneScreen`: заголовок, подпись, 3 звезды, верно/ошибок/точность, монеты, ошибки, «Всё было понятно?», главная кнопка и тихая ссылка)

- `app/lesson_words.tsx:3121-3195` — самодельный блок: иконка-галочка 61x61 (`checkmark-done-outline`), текст `ws.allLearned`, строка `learnedOf`, пилюля `+N` с `coin_rank_00.webp`, `PracticeCta` «К уроку», ссылка «Повторить» с подтверждением; ниже `VictoryBurst heroIcon="library" celebrateSound="medal"` (3201-3207). Макет F8: «общий экран завершения “Слова урока · 24 слова”» — как у всех режимов, с оценкой и комментарием.
- `app/lesson_irregular_verbs.tsx:241-479, 1010` — финал порции и `VictoryBurst`. Макет H5: общий экран, кнопка «Следующая порция».
- `app/preposition_drill.tsx:690-760` — ручные кнопки «Снова»/«Закрепить промахи» (`restartAll`/`restartWrong`) + `VictoryBurst` с кубком и 60-120 конфетти. Макет I4: общий экран + «Закрепить промахи».
- `components/mistake-practice/MistakeSessionFinale.tsx:39-58,119-120,175-184` — свои «perfect/done», `copy.runes`, кнопки «more/done». Макет practice.html d8: «Ошибки разобраны · Мои ошибки · 6 карточек», блок «было → стало», «Повторить ошибки».
- `components/learning-v2/horizons/HorizonSessionResult.tsx:81-111` — свой набор (звёзды, подписи, `FeedbackRatingCard`), монеты через `runeAmount`; не `V2DoneScreen`. Макет: тот же общий экран (practice.html d7, spec_learning_v2 §7.1-7.5).
- `app/dialogue_v2_completion.tsx:61-285` — свой экран, нет строки монет (в файле нет слов «coin/монет»). Макет dialogs.html D1–D5: «+30 монет» анимированно.
- `app/level_exam.tsx:1197-1230` — картинка медали `MEDAL_IMAGES_EXAM` (стр. 66-69), «Золото!/Новая медаль!»; макет K6–K7: без медалей.

### Урок и энергия

- `app/lesson1.tsx:3892` — `<MedalToast>`; `app/lesson1.tsx:3659-3660` — `showMedalToast` при смене порога. Макет D (spec_learn «Удалено в 2.0»): «Медали (бронза/серебро/золото), тост медали → звёзды 1–3 (D36)».
- `app/lesson1.tsx:1054` + `components/feedback/ComboRing.tsx:72-74` — кольцо комбо при серии ≥ уровня 1 жёлтое. Макет `.combo`: белое кольцо `#E9E9EB`.
- `components/NoEnergyModal.tsx:336` — `themeColor={t.gold}`.

### Learning V2 / вкладка «Обучение»

- `app/(tabs)/lessons.tsx:4452-4475` — при `page!=="v2"` новая `LessonsListGlassCard`; для V2 проваливается к 4556 `<LessonCard>`. Старая карточка использует `LESSON_LEVEL_PALETTES` (321-424), `MedalDots` (510), `scaleHex` затемнение и т.д.
- `app/(tabs)/lessons.tsx:1740-1742` — звёзды на узле карты: `theme.gold` / `theme.textMuted`. Макет: белые звёзды `.st3 .i {color:#fff}`.

### Карточки

- `app/flashcards/FlashcardsCategoryHub.tsx:243,375` — `communityPackPriceRunes(pack)` → «имя · ᚱ N». spec_cards «Сводка: что относится к 2.0-удалению»: цена на плитках каталога убирается.
- `app/flashcards_collection.tsx:1318-1334` — `CardPackShardPaywallModal currency="runes"`, `buyCommunityPackLocally`. Там же комментарий владельца 17.09 «покупка за руны». Решение D15/D57: заменить.
- `app/flashcards_swipe.tsx:3877-3879,3973,4076,4087` — `t.gold`/`t.goldBg`.
- `app/flashcards_blitz_session.tsx:107-113,1149,1227,1360,1397-1400` — `ACCENT '#FF8A3D'`, плотные зелёный/красный `#185C3A`/`#702B35`.
- `app/flashcards_speaking_session.tsx:122-123` — `ACCENT '#22B8A8'`.

### Диалоги (старый стек)

- `app/ai_dialog_session.tsx:3206-3214` — «Ещё N реплик · ᚱ{цена}» на 9 языках; `2693-2745,3203,3272` — `t.gold`, `t.goldBg`.
- `components/AiDialogBriefingScreen.tsx:288-303` — плашка покупки на `t.goldBg`/`t.gold`, текст `ᚱ {formatRunes(...)}`.
- `components/dialogs/DialogWhySheet.tsx:184,195` — `ᚱ ${gate.priceRunes}`, `t.gold`.
- `components/DialogVerdictScreen.tsx:226-242` — «медальон исхода» со свечением; `components/DialogVictoryCelebrationHybrid.tsx:73,145,402` — золотое конфетти и значок.

### Прочее

- `app/learning-v2/lesson/[id].tsx:489,1130,1139,1181-1190,1228` — см. выше.
- `components/ReviewPromptModal.tsx:80,139,142`; `components/ui/new/OfflineDataNotice.tsx:77,80`; `components/RankChangeBanner.tsx:321`.
- `app/session_attempts/session_attempts_copy.ts:29,44` — «Восстановить · 25 рун» (отображается в `SessionAttemptsRecoveryModal.tsx:124,130`).
- Глобальные хосты: `app/_layout.tsx:3232,3242`.

## 4. НЕТ МАКЕТА — нужно решение владельца

Нет страниц макета (в `index.html` перечислены, файлов нет): **community.html, profile.html, results.html, coins.html**.
Без них нельзя ответить «соответствует ли». Что остаётся без эталона:

1. **Результаты** (results.html): хаб/список/детали ошибок, статистика серии `streak_stats.tsx`, витрина достижений (владелец: «витрина остаётся»), коллекционные предметы, годовое колесо/тепловая карта.
2. **Монеты/Plus** (coins.html): кошелёк `runes_wallet.tsx`, ранг монеты `coin_rank.tsx`, церемония ранга, пейволл Plus, управление подпиской, значок Plus, награда-модалки, магазин `shop.tsx`/`shards_shop.tsx`.
3. **Профиль/настройки** (profile.html): все `settings_*`, аккаунт, приватность, поддержка, опрос, промокод, темы, реферальная рулетка.
4. **Сообщество** (community.html): вкладка «Сообщество», «Друзья», визитка игрока, приглашения друга.
5. Нет эталона даже внутри существующих страниц: `app/lingman_playlist.tsx` (VID-02), страница «Такой страницы нет» реализована как тихий редирект на Главную (`app/+not-found.tsx`), хотя в system.html это отдельный экран.
6. Открытые вопросы, из-за которых экран нельзя считать «старым» или «новым»: `CollectibleDropModal` («карточка за закрытый раздел» поверх итогов), `level_exam` (в реестре unknown), `StreakRevive` (файла уже нет), `shop`/`shards_shop`.
7. `components/league/*`, `components/boon_hero/*`, `components/daily_journey/*` и др. по COVERAGE «удаляются» — файлы ещё на диске; сами маршруты уже исчезли, но два глобальных хоста (раздел 2, п.10) всё ещё смонтированы.

## 5. Файлы, которых нет в COVERAGE.md, но которые видит пользователь

- `app/coin_rank.tsx` — экран ранга монеты (на стекле).
- `app/dialogue_v2_briefing.tsx`, `dialogue_v2_session.tsx`, `dialogue_v2_completion.tsx`, `dialogue_v2_freeform.tsx`, `dialogue_v2_memory.tsx` и `components/dialogs/DialogueV2*.tsx`, `dialogs/glass/*` — новая живая версия диалогов.
- `app/flashcards/SessionResultScreen.tsx` — вынесен в `COVERAGE` только как «общий итог», сам файл не описан.
- `app/flashcards_truefalse_session.tsx` — шим 7 строк («Правда/ложь» в practice.html).
- `app/voice_equalizer.tsx` (268 строк, без токенов темы) — к какому макету относится, неясно; не проверено.
- `app/hint.tsx` — теория старого движка (G4), 1531 строка, `useTheme` без стеклянных токенов — не сверен.
- `components/spire/*` — вынесены в `COVERAGE` как «новый экран не создан», а он уже есть (17 файлов, `SpireHomeScreen`).

## 6. Замечания по Главной и онбордингу (вердикт не меняю)

- `app/(tabs)/home.tsx` (4665 строк): 57 упоминаний слов «gold», 64 «rune», 66 «shard/pearl» — в основном идентификаторы и логика; видимые золотые куски нужно смотреть на экране. `DayRings` использует `t.gold` (3 места), `home.tsx` — 5 мест.
- `components/CleanOnboarding.tsx` (5461 строка): 1 «gold», 2 старых компонента награды — вне работы по указанию владельца.

## 7. Итоговые счётчики (по строкам таблиц раздела 1)

- СООТВЕТСТВУЕТ: 33
- ЧАСТИЧНО: 18
- СТАРЫЙ ЭКРАН: 9
- НЕТ МАКЕТА: 22
- НЕ ПРОВЕРЕНО: 1 (`BillingIssueToastHost`)
Всего строк в таблицах: 83 (строка может объединять несколько файлов одного экрана).
