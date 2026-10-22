# Аудит кнопок — 22.10 (Ревизор, статический, по коду)

Задача владельца: «ВСЕ КНОПКИ НАДО ПРОВЕРИТЬ» — в сценах Пика и Диалогов ничего не нажималось.
Метод: ручной разбор деревьев сцен (Пик, Диалоги, Главная, Сегодня, Сезон, оболочка вкладок, TabSlider) + скрипт по всем 740 `.tsx`
в `app/` и `components/` (TypeScript AST; `C:/Temp/claude/btnaudit/audit.cjs`). Ничего не правилось.
Ограничение скрипта: стили из импортов и вычисленные значения не видит; хит-зоны — только числовые литералы.

## Главный вывод

В коде сцен **нет слоя, который перекрывает все касания**: каждый слой над кнопками — `pointerEvents="none"`/`"box-none"`, zIndex и
elevation выше кнопок нет; TabSlider берёт только горизонтальный свайп (`activeOffsetX` 22), полноэкранные страницы без сдвига.
Значит «ничего не нажимается» — это **что сцены делают при нажатии**, а не перекрытие. Окончательно решат логи `[SCENE-TOUCH]` у
5 · ВХОД (незакоммиченные правки `app/_layout.tsx`, `app/TabSlider.tsx`, `SpireScene.tsx`, `DialogsSceneStage.tsx`,
`DialogsScenePanel.tsx`): есть строки `spire_scene`/`dialogs_scene` при тапе → касания доходят, виноват обработчик/состояние (F1–F3);
есть только `app_root`/`tab_page_N` → ищем перекрытие по тегу `target`.

## 🔴

| # | Экран | Где | Что | Чинить |
|---|---|---|---|---|
| F1 | dev-превью сцен | `app/dev_dialogs_scene_preview.tsx:40` (noop → стр. 89, 91, 92, 104); `app/dev_spire_scene_preview.tsx:46` (стр. 133, 145); `app/dev_today_scene_preview.tsx:33` | Все действия — `noop`: кнопка чуть сжимается и ничего. Ровно «ничего не нажимается». | Спросить владельца, смотрел ли он превью. Подключить реальные действия или тост с именем действия. |
| F2 | Диалоги (реальный хаб), «нет сети» | `dialogs_scene_copy.ts:235` (`ctaDisabled: true`, без круглой кнопки); `DialogsSceneStage.tsx:75` (`pressCta` → `cta:ignored`); `DialogsSceneHub.tsx:143-146` (`offline` только пишет «retry»); `:148-151` (`!next` → `no_next_dialog`) | Единственная кнопка выключена, «Повторить» ничего не делает. Офлайн решает `use_home_scene_offline.ts` по одному `isInternetReachable === false` — бывает ложно на эмуляторе/Wi-Fi с порталом. | «Повторить» = `NetInfo.refresh()` + перечит кэша каталога, кнопку не выключать; офлайн — по `isConnected===false` или подтверждённому `isInternetReachable`. |
| A1 | Карточки (свайп), занятие Learning V2 | `app/flashcards_swipe.tsx:4009, 4375`; `app/learning-v2/session/[id].tsx:1930` | Намеренная блокировка ввода `attemptsInputBlocker` (`pointerEvents="auto"`, zIndex 50/40), пока фаза попыток не `active`. Застрянет фаза — экран мёртв. | Сторож-таймаут + лог причины; проверить все выходы из фазы. |

## 🟡

| # | Экран | Где | Что | Чинить |
|---|---|---|---|---|
| F3 | Пик (сцена) | `components/spire/scene/SpireScene.tsx:190-202, 203`; `SpireScenePodium.tsx:56` | Почти ничего не нажимается по замыслу: единственная кнопка «Все участники» `disabled={searching \|\| room.count===0}` — мертва при загрузке/пустой комнате; моё место и пьедестал — простые `View`. | Вся панель / моё место / пьедестал открывают «Всех участников»; при загрузке — состояние загрузки, не тихое `disabled`. |
| F4 | Пик, шапка | `spire_scene_header.tsx:70` (`pointerEvents="none"`), `community.tsx:158` | Энергия выглядит кнопкой, но это не `EnergyBar`; правый слот шапки на Пике пуст. | Настоящий `EnergyBar` в `headerRight` на Пике. |
| F5 | Пик, вкладки шапки | `spire_scene_header.tsx:70` vs `community.tsx:132` | Нарисованные поверх вкладки выше настоящих на ~topInset/2 (iPhone 24–30 dp, Android 12–20): тап у верхнего края подписи может промахнуться. | `paddingTop: 12 + topInset` у слоя. |
| F6 | Пик, офлайн | `SpireScene.tsx:180-185` | Плашка «нет сети» абсолютная поверх верха башни, без `pointerEvents` — глотает тапы по верхним этажам. | `pointerEvents="none"`. |
| F7 | Сезон (новичок + длинное название/крупный шрифт) | `components/learning-v2/season/SeasonCourseView.tsx:170` поверх `:160` | Блок текста `heroBody` (абсолютный) может накрыть плашку «Урок N». | `pointerEvents="box-none"` на `heroBody` или `zIndex:1` у `heroTop`. |
| C1 | Карточки, список сохранённых | `app/flashcards/FlashcardListItem.tsx:811, 814` | Кнопки «играть» и «меню» 31×31 без `hitSlop`. | `hitSlop` до 44. |
| C2 | Уроки; ИИ-компаньон; плейлист; словарь V2; редактор набора | `app/(tabs)/lessons.tsx:5478, 5519` (40×40); `app/ai_companion_session.tsx:401` (40); `app/lingman_playlist.tsx:158` (42); `components/learning-v2/LearningV2DictionaryV2.tsx:399` (h 40); `app/community_packs/PackEditorV2.tsx:58` (h 42) | Меньше 44 без `hitSlop`. | `hitSlop`. |
| A2 | разные | `app/(tabs)/lessons.tsx:2074`; `app/(tabs)/_layout.tsx:411`; `app/community_packs/UgcPackEditorCardPreview.tsx:197, 218, 261, 282`; `PackEditorV2.tsx:305`; `app/flashcards/PackOpenFailedView.tsx:25`; `app/pack_opening.tsx:291, 330`; `app/shop.tsx:200`; `components/AppMessagesInbox.tsx:1206`; `components/DailyPhraseCard.tsx:772`; `components/dialogs/DialogueIncomingCall.tsx:146`; `components/DialogVerdictScreen.tsx:196`; `components/DialogVictoryCelebrationHybrid.tsx:360`; `components/level_up/LevelUpMintCeremony.tsx:298`; `components/learning-v2/LearningV2VoiceHeadsupSheet.tsx:173`; `components/learning-v2/horizons/HorizonResultGlass.tsx:96`; `components/completion/V2DoneChain.tsx:203`; `components/settings/SettingsGroup.tsx:150`; `components/stories/StoryViewer.tsx:228`; `components/theme/ThemedArt.tsx:51`; `app/flashcards/PackVideoHero.tsx:107` | 24 абсолютных слоя после других элементов без `pointerEvents` — скорее всего безвредны, но надо глянуть на телефоне. | Где слой декоративный — `pointerEvents="none"`. |

## ⚪ проверено, в порядке

- Модальные затемнения поверх кнопок — намеренные и условные: `app/lesson_complete.tsx:449, 1948`, `app/shop.tsx:411, 524`,
  `app/streak_stats.tsx:2413`, `app/_layout.tsx:4003, 4026`, `components/account/GlassInlineAlert.tsx:28`,
  `components/learning-v2/LearningV2WordPocketOverlayV1.tsx:82`, `components/learning-v2/season/SeasonExpandedCard.tsx:68`,
  `app/learning-v2/session/[id].tsx:1768`.
- Кнопки без действия — только заглушки: `app/lesson1.tsx:4080` (скелет загрузки), `components/ExamResultPreviewAdminModal.tsx:448`
  (админ-превью), `components/ReportUserModal.tsx:357` (гасит тап по панели — паттерн), `components/DailyPhraseCard.tsx:393`
  (role=text), dev-витрина. `disabled={true}` литералом и обработчиков «только console.log» нет.
- Пик: градиент сцены, ореол, затемнение, слой соперников и маркер башни — `none`; док `box-none`; панель `marginTop:-22` внутри
  внешнего `View`; модалки — настоящие `Modal`.
- Диалоги: фон, ореол, затемнение, герой — `none`; панель с `marginTop:-22` переопределена `panelInset` (16) — наложения нет.
- Главная/Сегодня: верх `box-none`, герой `none`; нахлёст панели под нижним отступом 44 — кнопки и чипы свободны.
- Оболочка вкладок: `HomeSceneStatusStrip` и `TopFadeMask` — `none`; `markTouchForPremount` и `tapLatencyCaptureHandler` возвращают
  `false`.

## Порядок починки (5 · ВХОД)

1. Логи `[SCENE-TOUCH]` у владельца → подтвердить F1/F2 против перекрытия.
2. F2 (Диалоги офлайн) и F1 (превью) — именно то, что видел владелец.
3. F6, F5, F7 — по одной строке `pointerEvents`/отступа.
4. F3/F4 — продуктовое решение: что на Пике должно нажиматься.
5. C1–C2 `hitSlop`; A2 — проверка на телефоне.
